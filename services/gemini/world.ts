import { Type } from '@google/genai';
import {
  Character,
  WorldSetting,
  CreativeSettings,
  Echo,
  StateChangeRecommendation,
} from '../../types';
import { safeParseAiJson, AiStateChangeArraySchema } from '../schemas';
import {
  getAIClient,
  retryOperation,
  executeModelTask,
  getInstructionWithSettings,
  getModelName,
} from './core';
import { formatContext, formatEntityLookupTable } from './helpers';
import { buildPromptContent } from '../../config/prompts';
import { fetchRelatedSubgraph } from '../apiService';

// ============================================
// Types
// ============================================

export interface WorldInferenceOptions {
  useInkos?: boolean;
  llmConfig?: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature?: number;
  };
  maxDepth?: number;
  temperature?: number;
}

 export interface WorldInferenceResult {
  predictions: StateChangeRecommendation[];
  reasoning: string;
  source: 'inkos' | 'gemini';
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// inkos Engine Implementation
// ============================================

async function runInkosInference(
  echoes: Echo[],
  characters: Character[],
  worldSettings: WorldSetting[],
  graphContext: string,
  genre: string,
  options: WorldInferenceOptions
): Promise<WorldInferenceResult | null> {
  // @inkos/core 模块尚未安装，暂时禁用 inkos 推理
  // 如果需要启用 inkos 推理，请先安装 @inkos/core 包
  console.log('[runInkosInference] @inkos/core not installed, using Gemini fallback');
  return null;
}

// ============================================
// Gemini API Implementation
// ============================================

async function runGeminiInference(
  projectId: string,
  branchId: string,
  echoes: Echo[],
  characters: Character[],
  worldSettings: WorldSetting[],
  genre: string
): Promise<WorldInferenceResult> {
  const contextStr = formatContext(characters, worldSettings, echoes);
  const lookupTable = formatEntityLookupTable(characters, worldSettings);
  const triggerEchoes = echoes.filter((e) => e.status === 'ACCEPTED' || e.status === 'AUTO_ACCEPTED').slice(-5);
  const triggers = triggerEchoes.map((e) => `- ${e.description} (${e.targetName})`).join('\n');

  if (!triggers) {
    return {
      predictions: [],
      reasoning: '没有已接受的 Echo 事件可用于推演',
      source: 'gemini',
    };
  }

  const anchors = triggerEchoes.map((e) => e.targetName);
  let graphContext = '';
  if (anchors.length > 0) {
    try {
      graphContext = await fetchRelatedSubgraph(projectId, anchors, branchId);
      console.log('[WorldInference] Fetched graph context:', graphContext);
    } catch (e) {
      console.warn('[WorldInference] Could not fetch graph context:', e);
    }
  }

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        targetId: {
          type: Type.STRING,
          description: 'The ID of the character or world setting from the lookup table',
        },
        targetName: {
          type: Type.STRING,
          description: 'Name of the character or world setting affected',
        },
        targetType: { type: Type.STRING, description: 'CHARACTER or WORLD' },
        suggestedUpdate: {
          type: Type.STRING,
          description:
            "The predicted consequence (e.g., 'Civil war breaks out', 'Character X seeks revenge')",
        },
        reason: {
          type: Type.STRING,
          description: 'The logical chain of causality (Why does A lead to B?)',
        },
        confidence: {
          type: Type.NUMBER,
          description: 'Confidence level (0-1)',
        },
      },
      required: ['targetName', 'targetType', 'suggestedUpdate', 'reason'],
    },
  };

  const prompt = `
你是一个全知全能的世界模拟器（World Engine)。
你的任务是基于【最近发生的事件】（Triggers)和【动态知识图谱】（Knowledge Graph)，推演它们对【世界】和【人物】产生的**连锁反应** (Consequences)。

小说类型: ${genre}

【最近发生的事件 (Triggers)】:
${triggers}

【可在以下实体中寻找受影响对象】:
${lookupTable}

${graphContext ? `【动态知识图谱上下文】:\n${graphContext}\n` : ''}

【推演规则】:
1. **蝴蝶效应**: 一个小事件可能引发大变动(例如: 国王遇刺 -> 继承人争夺战 -> 内战爆发)。
2. **实体匹配**: 务必从提供的映射表中选择受影响的实体,并返回正确的 targetId。
3. **图谱联动 (重要)**: 务必利用上方提供的【动态知识图谱】中的人物关系(仇恨、亲情、从属)或地理归属,去寻找连锁反应的导火索。
4. **符合逻辑**: 推演必须符合世界观设定。
5. **制造冲突**: 预测的结果应该为故事增加张力和冲突。
6. **强制中文输出**: 你的 JSON 结果中的所有内容必须使用纯正的中文。

请严格按照 JSON 格式输出【未来预测】。
  `;

  const templateData = { genre, triggers, lookupTable, graphContext };

  try {
    const responseText = await executeModelTask(
      'deduceWorldConsequences',
      '',
      prompt,
      await getModelName('pro'),
      0.4,
      responseSchema,
      undefined,
      { templateId: 'deduce_world_consequences', templateData }
    );

    const raw = safeParseAiJson(responseText, AiStateChangeArraySchema, 'deduceWorldConsequences');
    if (!raw) {
      return {
        predictions: [],
        reasoning: 'AI 返回空响应或解析失败',
        source: 'gemini',
      };
    }

    const result: StateChangeRecommendation[] = [];

    for (const item of raw) {
      let id = item.targetId || '';

      if (!id) {
        if (item.targetType === 'CHARACTER') {
          const char = characters.find(
            (c) => c.name.includes(item.targetName) || item.targetName.includes(c.name)
          );
          if (char) id = char.id;
        } else if (item.targetType === 'WORLD') {
          let setting = worldSettings.find((w) => w.title === item.targetName);
          if (!setting) {
            setting = worldSettings.find(
              (w) => w.title.includes(item.targetName) || item.targetName.includes(w.title)
            );
          }
          if (setting) id = setting.id;
        }
      }

      if (id) {
        result.push({
          targetId: id,
          targetType: item.targetType,
          targetName: item.targetName,
          suggestedUpdate: item.suggestedUpdate,
          reason: item.reason,
          confidence: item.confidence,
        });
      }
    }

    return {
      predictions: result,
      reasoning: '推演完成',
      source: 'gemini',
    };
  } catch (e) {
    console.error('[WorldInference] Gemini inference failed:', e);
    return {
      predictions: [],
      reasoning: `推演失败: ${e instanceof Error ? e.message : String(e)}`,
      source: 'gemini',
    };
  }
}

// ============================================
// Exported Main Functions
// ============================================

export async function deduceWorldConsequencesWithBridge(
  projectId: string,
  branchId: string,
  echoes: Echo[],
  characters: Character[],
  worldSettings: WorldSetting[],
  genre: string,
  options: WorldInferenceOptions = {}
): Promise<WorldInferenceResult> {
  const acceptedEchoes = echoes.filter((e) => e.status === 'ACCEPTED' || e.status === 'AUTO_ACCEPTED');
  if (acceptedEchoes.length === 0) {
    return {
      predictions: [],
      reasoning: '没有已接受的 Echo 事件可用于推演',
      source: 'gemini',
    };
  }

  const anchors = acceptedEchoes.slice(-5).map((e) => e.targetName);
  let graphContext = '';
  if (anchors.length > 0) {
    try {
      graphContext = await fetchRelatedSubgraph(projectId, anchors, branchId);
    } catch (e) {
      console.warn('[WorldInference] Could not fetch graph context:', e);
    }
  }

  if (options.useInkos && options.llmConfig) {
    const result = await runInkosInference(
      echoes,
      characters,
      worldSettings,
      graphContext,
      genre,
      options
    );
    if (result) {
      console.log('[WorldInference] Successfully used inkos engine');
      return result;
    }
  }

  console.log('[WorldInference] Using Gemini API for inference');
  return runGeminiInference(projectId, branchId, echoes, characters, worldSettings, genre);
}

export async function deduceWorldConsequences(
  projectId: string,
  branchId: string,
  recentEchoes: Echo[],
  characters: Character[],
  worldSettings: WorldSetting[],
  genre: string
): Promise<StateChangeRecommendation[]> {
  const result = await deduceWorldConsequencesWithBridge(
    projectId,
    branchId,
    recentEchoes,
    characters,
    worldSettings,
    genre,
    {}
  );
  return result.predictions;
}

/**
 * 记忆固化：将多个 Echo 事件合并成一个描述字符串
 * 用于更新角色或世界设定的描述
 */
export async function consolidateMemory(
  entityName: string,
  entityType: 'CHARACTER' | 'WORLD',
  currentDescription: string,
  echoes: Echo[]
): Promise<string> {
  if (echoes.length === 0) {
    return currentDescription;
  }

  // 构建事件摘要
  const eventSummaries = echoes
    .map((e) => `- ${e.description}${e.reason ? ` (${e.reason})` : ''}`)
    .join('\n');

  // 构建提示词
  const prompt = `你是一个小说设定整合助手。

任务：将以下【事件记录】整合到【当前描述】中，生成一个新的描述。

实体名称: ${entityName}
实体类型: ${entityType}

【当前描述】:
${currentDescription}

【需要整合的事件记录】:
${eventSummaries}

【整合规则】:
1. 保持描述的连贯性和可读性
2. 将事件的影响融入描述中，不要简单罗列
3. 保留原有的重要信息
4. 添加事件带来的变化和影响
5. 使用简洁、专业的语言
6. 输出纯文本描述，不要添加任何标记或说明

请直接输出整合后的描述:`;

  try {
    const responseText = await executeModelTask(
      'consolidateMemory',
      '',
      prompt,
      await getModelName('flash'),
      0.3,
      undefined,
      undefined,
      { templateId: 'consolidate_memory', templateData: { entityName, entityType } }
    );

    return responseText.trim() || currentDescription;
  } catch (e) {
    console.error('[ConsolidateMemory] Failed to consolidate:', e);
    // 失败时返回原始描述加上事件摘要
    return `${currentDescription}\n\n【近期变化】:\n${eventSummaries}`;
  }
}
