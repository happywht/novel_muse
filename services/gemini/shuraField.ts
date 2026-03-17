import { Character, WorldSetting, CreativeSettings, PlotNode } from "../../types";
import {
    safeParseAiJson, AiPlotNodeArraySchema
} from "../schemas";
import {
    executeModelTask, getInstructionWithSettings
} from "./core";
import { formatContext, filterRelevantSettings, formatEntityLookupTable } from "./helpers";

export interface ConflictScenario {
    type: 'CONFRONTATION' | 'CLIMAX' | 'TWIST';
    participants: string[]; // 角色ID数组
    stakes: string; // 赌注/冲突核心
    intensity: number; // 1-10强度等级
}

/**
 * Generate a multi-character conflict scenario (Shura Field)
 * 修罗场生成器：基于角色设定和情节上下文，生成高密度多角色冲突场景
 */
export const generateConflictScenario = async (
    selectedCharacters: Character[],
    plotContext: string,
    genre: string,
    allCharacters: Character[],
    worldSettings: WorldSetting[],
    settings?: CreativeSettings,
    locationId?: string,
    intensityLevel: number = 7
): Promise<{
    scenario: ConflictScenario;
    plotNode: PlotNode;
}> => {
    // 如果没有选择角色，抛出错误
    if (!selectedCharacters || selectedCharacters.length < 2) {
        throw new Error("修罗场生成至少需要选择2个角色");
    }

    // 构建角色上下文
    let charContext = "【修罗场参与者档案】\n";
    selectedCharacters.forEach((c, idx) => {
        charContext += `${idx + 1}. ${c.name} (${c.role})\n`;
        charContext += `   性格: ${c.description.slice(0, 200)}${c.description.length > 200 ? '...' : ''}\n`;
        if (c.relationships) {
            charContext += `   关系网络: ${c.relationships}\n`;
        }
        // 分析与其他参与者的关系
        const relationshipsWithOthers = allCharacters.filter(other => 
            other.id !== c.id && selectedCharacters.find(sc => sc.id === other.id)
        );
        if (relationshipsWithOthers.length > 0) {
            charContext += `   与其他参与者的潜在冲突点: ${relationshipsWithOthers.map(other => other.name).join(', ')}\n`;
        }
        charContext += "\n";
    });

    // 获取相关世界观设定
    const queryContext = `${plotContext} ${selectedCharacters.map(c => c.name).join(' ')}`;
    const relevantSettings = filterRelevantSettings(worldSettings, queryContext, 10);

    let worldContext = "";
    if (relevantSettings.length > 0) {
        worldContext = "【场景世界观约束】\n";
        relevantSettings.forEach(setting => {
            worldContext += `- ${setting.title}: ${setting.content.slice(0, 300)}${setting.content.length > 300 ? '...' : ''}\n`;
        });
    }

    // 特定地点的上下文
    let locationContext = "";
    if (locationId) {
        const location = worldSettings.find(w => w.id === locationId);
        if (location) {
            locationContext = `【场景地点: ${location.title}】\n${location.content.slice(0, 400)}${location.content.length > 400 ? '...' : ''}\n\n`;
        }
    }

    const instruction = getInstructionWithSettings('shura_field', settings);

    const prompt = `
你是一位顶级的小说冲突场景设计师，擅长设计多角色博弈、对峙和修罗场。

${charContext}
${locationContext}
${worldContext}
【情节背景】:
${plotContext}

任务要求：
1. 设计一场 ${selectedCharacters.length} 个角色之间的高密度冲突场景。
2. 冲突强度等级: ${intensityLevel}/10 (${intensityLevel >= 8 ? '生死对决' : intensityLevel >= 6 ? '激烈对峙' : intensityLevel >= 4 ? '暗流涌动' : '微妙博弈'})
3. 每个角色必须有明确的目标、动机和秘密（或隐藏信息）。
4. 冲突必须层层递进，有至少3次博弈或反转。
5. 结局必须出人意料但符合角色人设。
6. 必须明确标注：冲突核心赌注（stake）、冲突类型、强度等级。

冲突类型定义：
- CONFRONTATION: 正面对峙、争吵、辩论或谈判
- CLIMAX: 高潮性冲突，决定性时刻
- TWIST: 反转性冲突，真相揭露或背叛

请直接输出符合以下 JSON 格式的单情节节点：
{
  "title": "情节标题（突出冲突核心）",
  "content": "详细的多角色冲突场景描述，包括：\n   - 开场氛围与角色入场\n   - 各方立场与目标\n   - 第一次博弈/交锋\n   - 第二次博弈/反转\n   - 第三次博弈/高潮\n   - 结局与后续影响",
  "beatTag": "CLIMAX" | "PLOT_POINT_2" | "MIDPOINT",
  "relatedCharacters": [${selectedCharacters.map(c => `"${c.id}"`).join(', ')}],
  "relatedLocations": [${locationId ? `"${locationId}"` : ''}],
  "conflictScenario": {
    "type": "CONFRONTATION" | "CLIMAX" | "TWIST",
    "participants": [${selectedCharacters.map(c => `"${c.id}"`).join(', ')}],
    "stakes": "冲突的核心赌注（如：王位继承权、商业控制权、爱情归属、家族荣誉、生存机会等）",
    "intensity": ${intensityLevel}
  }
}

禁止包含任何开场白或解释文字，只输出JSON。
    `;

    try {
        const responseText = await executeModelTask(
            'generateConflictScenario',
            instruction,
            prompt,
            'gemini-3-pro-preview',
            settings?.creativity || 0.8,
            AiPlotNodeArraySchema,
            4096
        );

        // AI返回的是数组，但我们只需要第一个元素
        const result = safeParseAiJson(responseText, AiPlotNodeArraySchema, "Conflict Scenario Generation") || [];

        if (result.length === 0) {
            throw new Error("AI未能生成有效的修罗场场景");
        }

        const rawNode = result[0];

        // 确保conflictScenario数据完整，所有字段都必须有值
        const conflictScenario: ConflictScenario = {
            type: rawNode.conflictScenario?.type || 'CONFRONTATION',
            participants: rawNode.conflictScenario?.participants || selectedCharacters.map(c => c.id),
            stakes: rawNode.conflictScenario?.stakes || '未知赌注',
            intensity: rawNode.conflictScenario?.intensity || intensityLevel
        };

        // 构建完整的 PlotNode 对象
        const plotNode: PlotNode = {
            id: Date.now().toString() + Math.random(),
            title: rawNode.title,
            content: rawNode.content || '',
            order: 0,
            beatTag: rawNode.beatTag,
            relatedCharacters: rawNode.relatedCharacters,
            relatedLocations: rawNode.relatedLocations,
            conflictScenario
        };

        return {
            scenario: conflictScenario,
            plotNode
        };

    } catch (error) {
        console.error("修罗场生成错误:", error);
        throw error;
    }
};

/**
 * Analyze existing plot node and enhance it with conflict scenario
 * 分析现有情节节点，增强其修罗场元数据
 */
export const enhanceWithConflictScenario = async (
    node: PlotNode,
    allCharacters: Character[],
    worldSettings: WorldSetting[],
    settings?: CreativeSettings
): Promise<PlotNode> => {
    // 如果已经有conflictScenario，直接返回
    if (node.conflictScenario) {
        return node;
    }

    // 如果没有relatedCharacters或数量小于2，无法生成修罗场
    if (!node.relatedCharacters || node.relatedCharacters.length < 2) {
        return node;
    }

    const selectedCharacters = allCharacters.filter(c => 
        node.relatedCharacters?.includes(c.id)
    );

    // 调用修罗场生成器
    const { plotNode } = await generateConflictScenario(
        selectedCharacters,
        node.content,
        '未知类型',
        allCharacters,
        worldSettings,
        settings,
        node.relatedLocations?.[0]
    );

    // 保留原有数据，只添加conflictScenario
    return {
        ...node,
        conflictScenario: plotNode.conflictScenario
    };
};
