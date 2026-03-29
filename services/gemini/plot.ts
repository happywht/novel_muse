import { Type } from '@google/genai';
import { Character, WorldSetting, CreativeSettings, Echo, PlotNode, Chapter } from '../../types';
import {
  safeParseAiJson,
  AiPlotNodeArraySchema,
  AiPlotRhythmArraySchema as SchemaPlotRhythm,
  AiChapterOutlineArraySchema,
} from '../schemas';
import { getAIClient, executeModelTask, getInstructionWithSettings, getModelName } from './core';
import { formatContext, filterRelevantSettings, formatEntityLookupTable } from './helpers';
import { getDisplayRelationships } from '../../utils/characterRelations';
import { buildPromptContent, getPlotWeavingInstruction } from '../../config/prompts';
import { renderUserPromptBlocks } from '../../config/templates/defaults';

export interface PlotRhythmPoint {
  beat: string;
  tension: number;
  description: string;
}

/**
 * Graph context structure for plot generation
 */
export interface GraphContext {
  characterRelationships: Array<{
    subject: string;
    relation: string;
    object: string;
    weight?: number;
  }>;
  plotLineage?: {
    predecessors: any[];
    successors: any[];
  };
}

/**
 * Generate plot outline from context and premise
 */
export const generatePlotFromContext = async (
  premise: string,
  genre: string,
  characters: Character[],
  worldSettings: WorldSetting[],
  settings?: CreativeSettings,
  template?: string,
  echoes: Echo[] = [],
  graphContext?: GraphContext
): Promise<PlotNode[]> => {
  const queryContext = `${premise} ${template || ''} ${characters.map((c) => c.name).join(' ')}`;
  const relevantSettings = filterRelevantSettings(worldSettings, queryContext, 15);

  let contextStr = '【登场角色 (Cast)】\n';
  if (characters.length > 0) {
    characters.forEach((c) => {
      const charEchoes = echoes
        .filter((e) => e.targetId === c.id && e.status === 'ACCEPTED')
        .sort((a, b) => a.timestamp - b.timestamp);
      const displayRels = getDisplayRelationships(c.structuredRelations) || c.relationships || '';
      contextStr += `- ${c.name} (${c.role}): ${c.description}${displayRels ? ` (关系: ${displayRels})` : ''}\n`;
      if (charEchoes.length > 0) {
        contextStr += `  ⚡ [当前状态变更]: ${charEchoes.map((e) => e.description).join('; ')}\n`;
      }
    });
  } else {
    contextStr += '尚未设定。\n';
  }

  contextStr += '\n【高相关度世界观法则 (Deep Lore Context)】\n';
  if (relevantSettings.length > 0) {
    const categories = Array.from(new Set(relevantSettings.map((w) => w.category)));
    categories.forEach((cat) => {
      const items = relevantSettings.filter((w) => w.category === cat);
      if (items.length > 0) {
        contextStr += `[${cat}]:\n`;
        items.forEach(
          (w) =>
            (contextStr += `  - ${w.title}: ${w.content.slice(0, 500)}${w.content.length > 500 ? '...' : ''}\n`)
        );
      }
    });
  } else {
    contextStr += '无特别约束设定。\n';
  }

  // Build graph context section
  let graphContextSection = '';
  if (graphContext?.characterRelationships?.length) {
    graphContextSection = `
【角色关系图谱 (来自知识库)】:
${graphContext.characterRelationships
  .map(
    (r) =>
      `- ${r.subject} --[${r.relation}]--> ${r.object}${r.weight ? ` (强度: ${r.weight})` : ''}`
  )
  .join('\n')}
`;
    console.log(
      '[Plot Generation] Using graph context with',
      graphContext.characterRelationships.length,
      'relationships'
    );
  }

  const lookupTable = formatEntityLookupTable(characters, relevantSettings);
  const instruction = getPlotWeavingInstruction(undefined, settings);

  // 使用 buildPromptContent 构建用户提示内容,支持项目级自定义
  const baseUserPrompt = buildPromptContent('plot_weaving_user', undefined, settings);

  let taskRequirement = `
  任务要求：
  1. 结合人物的性格缺陷和目标，设计引发剧情的激励事件。
  2. 利用【高相关度世界观法则】制造专属设定的障碍、谜题和转折。
  3. 确保角色关系随着剧情推进而发生变化。
  4. **整合【当前状态变更】**：剧情发展必须考虑角色当前的状态（如伤病、道具、已发生的事件）。
  5. **结构化元数据**：为每个情节点分配一个叙事标签（beatTag），并精准关联涉及的实体 ID。
     **严格约束**：beatTag只能从以下枚举值中选择，不能自定义其他值：INCITING_INCIDENT, PLOT_POINT_1, MIDPOINT, PLOT_POINT_2, CLIMAX, RESOLUTION, OTHER
  6. **修罗场识别**：对于涉及2个或以上角色正面冲突、对峙或博弈的情节，自动识别为"冲突场景"，
     明确标注冲突类型（CONFRONTATION对峙/CLIMAX高潮/TWIST反转）、参与角色、冲突核心赌注和强度等级（1-10）。`;

  if (template) {
    taskRequirement += `\n\n【关键要求】请严格按照以下经典故事结构模版进行填充 and 创作：\n${template}`;
  } else {
    taskRequirement += `\n\n请生成一个包含 "起、承、转、合" 或 "分章/分幕" 结构的详细大纲。`;
  }

  const prompt = `${baseUserPrompt}

  小说类型: ${genre}
  核心梗概: ${premise}

  ${contextStr}

  ${graphContextSection}

  【实体表 (Entity Mapping Table)】:
  ${lookupTable}

  ${taskRequirement}

  请直接输出大纲内容。

  **重要输出格式要求**：
  你必须返回一个符合以下 JSON 结构的数组：
  [
    {
      "title": "情节标题",
      "content": "该情节点的详细描述...",
      "beatTag": "INCITING_INCIDENT" | "PLOT_POINT_1" | "MIDPOINT" | "PLOT_POINT_2" | "CLIMAX" | "RESOLUTION" | "OTHER",
      "relatedCharacters": ["ID1", "ID2"],
      "relatedLocations": ["ID3"],
      "conflictScenario": {
        "type": "CONFRONTATION" | "CLIMAX" | "TWIST" | null,
        "participants": ["角色ID1", "角色ID2"],
        "stakes": "冲突的核心赌注（如：王位、爱情、复仇、生存等）",
        "intensity": 7
      }
    },
    ...
  ]
  如果情节不涉及多角色冲突，conflictScenario字段可省略或为null。
  禁止包含任何开场白或解释文字。
  `;

  // Prepare template data
  const templateData = {
    premise,
    genre,
    contextStr,
    relevantSettings,
    graphContext,
    lookupTable,
    template,
  };

  try {
    const responseText = await executeModelTask(
      'generatePlot',
      instruction,
      prompt,
      'gemini-3-pro-preview',
      0.6,
      AiPlotNodeArraySchema,
      4096,
      { templateId: 'generate_plot', templateData }
    );

    const result = safeParseAiJson(responseText, AiPlotNodeArraySchema, 'Plot Generation') || [];
    return result.map((p: any, index: number) => ({
      ...p,
      id: Date.now().toString() + Math.random(),
      order: index,
    })) as PlotNode[];
  } catch (error) {
    console.error('Gemini Plot Generation Error:', error);
    throw error;
  }
};

/**
 * Rewrite plot based on feedback
 */
export const rewritePlot = async (
  currentPlot: string,
  directive: string,
  genre: string,
  characters: Character[],
  worldSettings: WorldSetting[],
  settings?: CreativeSettings,
  echoes: Echo[] = []
): Promise<PlotNode[]> => {
  const contextStr = formatContext(characters, worldSettings, echoes);
  const lookupTable = formatEntityLookupTable(characters, worldSettings);
  const instruction = getInstructionWithSettings('plot_rewrite', settings);

  // 使用buildPromptContent构建prompt，支持项目级自定义
  const basePrompt = buildPromptContent('plot_rewrite_user', undefined, settings);
  const prompt = `${basePrompt}

小说类型: ${genre}
${contextStr}
【实体表 (Entity Mapping Table)】: ${lookupTable}
【当前剧情大纲】: ${currentPlot}
【修改指令/诊断反馈】: ${directive}

任务要求：
1. **精准落实指令**：针对指令（或诊断反馈）指出需要修复的地方进行精准修改。
2. **最小变动原则**：禁止进行无关的重写，保持原有文字、结构和逻辑不变。
3. **元数据对齐**：保留或根据新情节更新 beatTag, relatedCharacters, relatedLocations 等元数据字段。
4. **保持连贯性**：修改后的剧情必须与角色设定和世界观保持高度的一致性。

**重要输出格式要求**：
你必须返回一个符合以下 JSON 结构的数组：
[
  {
    "title": "情节标题",
    "content": "该情节点的详细描述...",
    "beatTag": "...",
    "relatedCharacters": ["ID1"],
    "relatedLocations": ["ID2"]
  },
  ...
]
禁止包含任何开场白或解释文字。
`;

  // Prepare template data
  const templateData = { genre, contextStr, lookupTable, currentPlot, directive };

  try {
    const responseText = await executeModelTask(
      'rewritePlot',
      instruction,
      prompt,
      'gemini-3-pro-preview',
      0.3,
      AiPlotNodeArraySchema,
      4096,
      { templateId: 'rewrite_plot', templateData }
    );

    const result = safeParseAiJson(responseText, AiPlotNodeArraySchema, 'Plot Rewrite') || [];
    return result.map((p: any, index: number) => ({
      ...p,
      id: Date.now().toString() + Math.random(),
      order: index,
    })) as PlotNode[];
  } catch (e) {
    console.error('Gemini Plot Rewrite Error:', e);
    throw e;
  }
};

/**
 * Analyze plot rhythm and tension
 */
export const analyzePlotRhythm = async (plotOutline: string): Promise<PlotRhythmPoint[]> => {
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        beat: {
          type: Type.STRING,
          description: "章节名称或关键情节点 (e.g., '第一章', '激励事件')",
        },
        tension: {
          type: Type.NUMBER,
          description: '该点的剧情张力值 (0-100)，0为平静，100为最高潮',
        },
        description: { type: Type.STRING, description: '简短描述该点的剧情内容' },
      },
      required: ['beat', 'tension', 'description'],
    },
  };

  const prompt = `
    请分析以下小说大纲的剧情节奏和张力起伏。
    将大纲拆解为关键的剧情点（Beat），并评估每个点的张力值（Tension Level）。
    
    【评分标准】
    0-20: 平静、铺垫、日常
    21-40: 小波澜、伏笔、对话
    41-60: 冲突升级、阻碍出现
    61-80: 重大转折、危机、战斗
    81-100: 终极高潮、生死攸关、核心揭秘
    
    【剧情大纲】:
    ${plotOutline}

    请输出 JSON 格式的分析结果，包含至少 5-10 个关键点。
    `;

  // Prepare template data
  const templateData = { plotOutline };

  try {
    const responseText = await executeModelTask(
      'analyzePlotRhythm',
      '',
      prompt,
      await getModelName('flash'),
      0.2,
      responseSchema,
      undefined,
      { templateId: 'analyze_plot_rhythm', templateData }
    );

    const parsed = safeParseAiJson(responseText, SchemaPlotRhythm, 'analyzePlotRhythm');
    return parsed ?? [];
  } catch (e) {
    console.error('Rhythm Analysis Error', e);
    return [];
  }
};

/**
 * Split large plot node into detailed chapter outlines (Chapter Fission)
 */
export const splitPlotNodeIntoChapters = async (
  genre: string,
  fullPlotSummary: string,
  targetNode: PlotNode,
  characters: Character[],
  worldSettings: WorldSetting[],
  settings?: CreativeSettings,
  echoes: Echo[] = [],
  fissionCount: number | 'AUTO' = 'AUTO'
): Promise<{ title: string; summary: string; expectedPOV: string; beats?: any[] }[]> => {
  const contextStr = formatContext(characters, worldSettings, echoes);
  const instruction = getInstructionWithSettings('plot_fission', settings);
  const countInstruction = fissionCount === 'AUTO' ? '2-3 个' : `${fissionCount} 个`;

  const prompt = `
    小说类型: ${genre}
    项目全剧情概览: ${fullPlotSummary}
    
    ${contextStr}
    
    【当前需要拆解的情节节点 (Plot Beat)】:
    标题: ${targetNode.title}
    具体内容: ${targetNode.content}
    
    任务：
    请将这个中观维度的“情节节点”进一步细化分解为 ${countInstruction} 具体的“章节细纲”。
    你要确保：
    1. 每一章都有明确的【标题】。
    2. 提供详尽的【章节细纲 (Summary)】，描述本章的核心反转、关键对话或动作，为后续正文协作提供充足依据。
    3. 指定合适的【视角人物 (Expected POV)】。
    4. 确保拆分后的章节在逻辑上紧密承接全书概览，且具有戏剧张力。
    
    **重要输出格式要求**：
    你必须返回一个符合以下 JSON 结构的数组：
    [
      { 
        "title": "章节标题", 
        "summary": "本章核心目标概览", 
        "expectedPOV": "视角人物姓名",
        "beats": [
          { "type": "CONTENT/ACTION/DIALOGUE/TWIST", "description": "具体场景节拍描述" },
          ...
        ]
      },
      ...
    ]
    
    【Beats 说明】：
    - 每个章节必须包含 3-5 个具体的场景节拍。
    - 类型 include: CONTENT(铺垫/描写), ACTION(动作/事件), DIALOGUE(关键对话), TWIST(转折/悬念)。
    
    禁止包含任何开场白或解释文字。
    `;

  // Prepare template data
  const templateData = {
    genre,
    fullPlotSummary,
    targetNode,
    characters,
    worldSettings,
    echoes,
    fissionCount,
  };

  try {
    const responseText = await executeModelTask(
      'splitPlotNodeIntoChapters',
      instruction,
      prompt,
      await getModelName('pro'),
      settings?.creativity || 0.85,
      AiChapterOutlineArraySchema,
      undefined,
      { templateId: 'split_plot_node_into_chapters', templateData }
    );

    const raw = safeParseAiJson(responseText, AiChapterOutlineArraySchema, 'Chapter Fission');
    if (!raw) return [];

    // Map to include IDs and initialized beat states
    return raw.map((ch) => ({
      ...ch,
      beats: ch.beats?.map((b) => ({
        ...b,
        id: Math.random().toString(36).substr(2, 9),
        isCompleted: false,
      })),
    }));
  } catch (e) {
    console.error('Gemini Chapter Fission Error:', e);
    throw e;
  }
};

/**
 * Regenerate a single chapter outline
 */
export const regenerateChapterOutline = async (
  genre: string,
  fullPlotSummary: string,
  targetNode: PlotNode,
  chapterToRewrite: Chapter,
  previousChapter: Chapter | null,
  nextChapter: Chapter | null,
  characters: Character[],
  worldSettings: WorldSetting[],
  settings?: CreativeSettings,
  echoes: Echo[] = []
): Promise<{ title: string; summary: string; expectedPOV: string; beats?: any[] } | null> => {
  const contextStr = formatContext(characters, worldSettings, echoes);
  const instruction = getInstructionWithSettings('plot_fission', settings);

  const prompt = `
    小说类型: ${genre}
    项目全剧情概览: ${fullPlotSummary}
    
    ${contextStr}
    
    【所属的情节节点 (Plot Beat)】:
    标题: ${targetNode.title}
    具体内容: ${targetNode.content}

    ${previousChapter ? `【上一章细纲】:\n标题: ${previousChapter.title}\n内容: ${previousChapter.summary}\n` : ''}
    ${nextChapter ? `【下一章细纲】:\n标题: ${nextChapter.title}\n内容: ${nextChapter.summary}\n` : ''}
    
    【当前需要重写的章节细纲】:
    标题: ${chapterToRewrite.title}
    原内容: ${chapterToRewrite.summary}
    原视角: ${chapterToRewrite.expectedPOV}
    
    任务：
    请结合上下文节点，**单独重写**这个章节的细纲。
    你要确保：
    1. 提供详尽的【章节细纲 (Summary)】，描述本章的核心反转、关键对话或动作，修复原有问题。
    2. 确保它能完美衔接上一章和下一章的剧情，同时符合所属的情节节点目标。
    3. 保留原标题和视角人物（也可根据剧情需要适当调整优化）。
    
    **重要输出格式要求**：
    你必须返回一个**仅仅包含这一个章节**的 JSON 数组结构：
    [
      { 
        "title": "章节标题", 
        "summary": "本章核心目标概览", 
        "expectedPOV": "视角人物姓名",
        "beats": [
          { "type": "CONTENT/ACTION/DIALOGUE/TWIST", "description": "具体场景节拍描述" },
          ...
        ]
      }
    ]
    禁止包含任何开场白或解释文字。
    `;

  // Prepare template data
  const templateData = {
    genre,
    fullPlotSummary,
    targetNode,
    chapterToRewrite,
    previousChapter,
    nextChapter,
    characters,
    worldSettings,
    echoes,
  };

  try {
    const responseText = await executeModelTask(
      'regenerateChapterOutline',
      instruction,
      prompt,
      await getModelName('pro'),
      settings?.creativity || 0.85,
      AiChapterOutlineArraySchema,
      undefined,
      { templateId: 'regenerate_chapter_outline', templateData }
    );

    const raw = safeParseAiJson(responseText, AiChapterOutlineArraySchema, 'Chapter Regeneration');
    const result = raw && raw.length > 0 ? raw[0] : null;

    if (result) {
      return {
        ...result,
        beats: result.beats?.map((b) => ({
          ...b,
          id: Math.random().toString(36).substr(2, 9),
          isCompleted: false,
        })),
      };
    }
    return null;
  } catch (e) {
    console.error('Gemini Chapter Regeneration Error:', e);
    throw e;
  }
};

/**
 * Twist Agent - Inspiration Jumps
 */
export const generateTwistHooks = async (context: string, plotBeat: string): Promise<string[]> => {
  const prompt = `
你是一位顶级的小说策划大师。基于当前的【故事背景/记忆】和即将发生的【情节目标】，请提供 3 个极具张力的“情节勾子”或“反转灵感”。

【灵感要求】：
1. 逻辑自洽：反转要出人意料，但情理之中。
2. 戏剧性：能够瞬间拉升剧情张力或改变角色关系。
3. 风格匹配：根据故事背景（玄幻、都市、悬疑等）调整反转风格。

【故事背景/记忆】：
${context.slice(-3000)}

【情节目标】：
${plotBeat}

请直接返回 3 条灵感，每条占一行，以数字开头（如 1. ...）。不要包含多余的废话。
    `;

  // Prepare template data
  const templateData = { context, plotBeat };

  try {
    const responseText = await executeModelTask(
      'generateTwistHooks',
      '',
      prompt,
      await getModelName('pro'),
      0.9,
      undefined,
      undefined,
      { templateId: 'generate_twist_hooks', templateData }
    );

    return responseText
      .split('\n')
      .filter((line) => /^\d\./.test(line.trim()))
      .map((line) => line.replace(/^\d\.\s*/, '').trim());
  } catch (error) {
    console.error('Failed to generate twist hooks:', error);
    return [];
  }
};
