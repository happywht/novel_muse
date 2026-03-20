import {
    Character, WorldSetting, CreativeSettings, Echo, PlotNode,
    Chapter, KnowledgeTriple, LogicConflict
} from "../../types";
import {
    executeModelTask, getInstructionWithSettings, getModelName
} from "./core";
import { formatContext } from "./helpers";
import { API_BASE } from "../apiService";
import { buildPromptContent } from "../../config/prompts";

/**
 * Deep plot auditing for logic and pacing
 */
export const analyzePlot = async (premise: string, currentPlot: string, characters: Character[], worldSettings: WorldSetting[], settings?: CreativeSettings, echoes: Echo[] = []): Promise<string> => {
    const instruction = getInstructionWithSettings('plot_analysis', settings);
    const contextStr = formatContext(characters, worldSettings, echoes);

    // 使用buildPromptContent构建prompt，支持项目级自定义
    const basePrompt = buildPromptContent('audit_plot', undefined, settings);
    const prompt = `${basePrompt}

【核心梗概】: ${premise}

${contextStr}

【当前剧情大纲】:
${currentPlot}

请使用 Markdown 格式输出。请确保报告包含一个明确的“可操作建议列表”，以便后续自动修复程序调用。`;

    try {
        return await executeModelTask(
            'analyzePlot',
            instruction,
            prompt,
            'gemini-3-pro-preview',
            0.1,
            undefined,
            2048
        ) || "无法分析剧情。";
    } catch (error) {
        console.error("Gemini Plot Analysis Error:", error);
        throw error;
    }
};

/**
 * Audit chapter plan against node goals
 */
export const auditChapterPlan = async (
    genre: string,
    targetNode: PlotNode,
    chapters: Chapter[],
    characters: Character[],
    worldSettings: WorldSetting[],
    settings?: CreativeSettings
): Promise<{
    isAligned: boolean;
    issues: { type: 'GAP' | 'DRIFT' | 'CONTRADICTION'; description: string; suggestion: string }[]
}> => {
    const contextStr = formatContext(characters, worldSettings);
    const chaptersText = chapters.map((c, i) => `[第 ${i + 1} 章: ${c.title}]\n概要: ${c.summary}\n节拍: ${c.beats?.map(b => `- [${b.type}] ${b.description}`).join('\n')}`).join('\n\n');

    const prompt = `
    你是一个严谨的剧情质量审计员。
    你的任务是核对【章节规划】是否忠实地落实了所属的【情节节点】要求，并指出是否存在“离题（Drift）”或“过度偏离”的情况。
    
    小说类型: ${genre}
    
    ${contextStr}
    
    【所属情节节点目标】:
    标题: ${targetNode.title}
    核心内容: ${targetNode.content}
    
    【当前的章节规划列表】:
    ${chaptersText}
    
    审计任务：
    1. **对齐性检查 (Align)**：章节规划是否完成了情节节点设定的所有核心目标？
    2. **偏差识别 (Drift)**：是否有章节引入了与主线毫无关系的废戏，或偏离了节点设定的角色动机？
    3. **逻辑矛盾 (Contradiction)**：章节之间是否有逻辑硬伤？
    
    **重要输出格式要求**：
    你必须返回一个 JSON 对象：
    {
      "isAligned": true/false,
      "issues": [
        { "type": "GAP/DRIFT/CONTRADICTION", "description": "问题描述", "suggestion": "修改建议" },
        ...
      ]
    }
    禁止包含任何开场白或解释文字。
    `;

    try {
        const responseText = await executeModelTask(
            'auditChapterPlan',
            '',
            prompt,
            await getModelName('pro'),
            0.1,
            true, // Enable JSON mode
            2048
        );

        const parsed = JSON.parse(responseText || '{}');
        return {
            isAligned: parsed.isAligned ?? true,
            issues: parsed.issues ?? []
        };
    } catch (e) {
        console.error("Chapter Audit Error:", e);
        return { isAligned: true, issues: [] };
    }
};

/**
 * Extract knowledge triples from content
 */
export const extractKnowledgeTriples = async (
    content: string
): Promise<KnowledgeTriple[]> => {
    const prompt = `
你是一位精通逻辑分析的小说编辑。你的任务是从给定的【正文内容】中提取核心的人物位置、人物关系和重大事实三元组，并评估关系的强度与趋势。

【提取要求】：
1. 重点提取“A 在 B 地”、“A 与 B 是 C 关系”、“A 拥有 B 物品”等事实。
2. 保持 Subject 和 Object 为简短的名称（如角色名、地点名）。
3. Relation 尽量使用简亮词汇（如：“位于”、“在”、“仇恨”、“爱”、“拥有”）。
4. **新增量化评价**：
   - **weight**: 数值 0-100，代表关系的强度或事实的重要性。例如，“深爱”为 95，“点头之交”为 20。
   - **trajectory**: 趋势分析，取值范围：["rising", "falling", "stable"]。
   - **isForeshadowing**: 布尔值。如果该事实/关系是一个**伏笔**或未解的悬念（如：获得了神秘道具、听到了莫名巨响、立下了未完成的契约），请设为 true。
   - **status**: 伏笔初始状态，取值：["OPEN", "RESOLVED", "ABANDONED"]。默认为 "OPEN"。

【格式要求】：
必须返回一个纯 JSON 数组，格式如下：
[
  {"subject": "角色A", "relation": "位于", "object": "地点B", "weight": 100, "trajectory": "stable", "isForeshadowing": false, "status": "OPEN"},
  {"subject": "余烬", "relation": "持有", "object": "锈迹斑斑的铜匙", "weight": 70, "trajectory": "stable", "isForeshadowing": true, "status": "OPEN"}
]

正文内容：
${content.slice(0, 5000)}
    `;

    try {
        const responseText = await executeModelTask(
            'extractKnowledgeTriples',
            '',
            prompt,
            await getModelName('flash'),
            0.1
        );

        const match = responseText.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
        return [];
    } catch (error) {
        console.error("Failed to extract triples:", error);
        return [];
    }
};

/**
 * Verify logic conflicts via backend API
 */
export const verifyLogicConflicts = async (
    projectId: string,
    triples: KnowledgeTriple[]
): Promise<LogicConflict[]> => {
    if (triples.length === 0) return [];

    try {
        const response = await fetch(`${API_BASE}/graph/verify-logic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, triples })
        });

        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Failed to verify logic conflicts:", error);
        return [];
    }
};
