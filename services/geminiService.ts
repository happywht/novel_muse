import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Character, WorldSetting, CreativeSettings, StateChangeRecommendation, Echo, PlotNode, Chapter } from "../types";

export interface KnowledgeTriple {
    subject: string;
    relation: string;
    object: string;
}

export interface LogicConflict {
    type: 'LOCATION_MISMATCH' | 'RELATIONSHIP_CONFLICT' | 'FACTUAL_INCONSISTENCY';
    description: string;
    truthInGraph: string;
    extractedFact: string;
}

import {
    safeParseAiJson,
    AiCharacterArraySchema,
    AiWorldSettingArraySchema,
    AiStateChangeArraySchema,
    AiEchoArraySchema,
    AiPlotRhythmArraySchema,
    AiPlotNodeArraySchema,
    AiChapterOutlineArraySchema,
} from './schemas';
import { buildPromptContent } from '../config/prompts';
import { useProjectStore } from '../store/useProjectStore';
import { fetchOpenAICompatible } from './openAiAdapter';
import { getProviderForTask, LLMTaskType, Provider } from './llmRouter';

import { storageService, STORAGE_KEYS } from './storageService';

const STORAGE_KEY_API = STORAGE_KEYS.GEMINI_API_KEY;
const STORAGE_KEY_MODEL = STORAGE_KEYS.MODEL_OVERRIDE;

const getAIClient = async () => {
    const savedKey = await storageService.getItem<string>(STORAGE_KEY_API);
    const apiKey = savedKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("请先在全局设置面板中配置您的 Gemini API Key。");
    }
    return new GoogleGenAI({ apiKey });
};

export const getModelName = async (tier: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const customModel = await storageService.getItem<string>(STORAGE_KEY_MODEL);
    if (customModel) return customModel;
    return tier === 'pro'
        ? (process.env.GEMINI_PRO_MODEL || 'gemini-3-pro-preview')
        : (process.env.GEMINI_FLASH_MODEL || 'gemini-3-flash-preview');
};

// Helper for retry logic
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        const errorCode = error?.status || error?.code || error?.response?.status;
        const errorMessage = error?.message || '';
        const isRetryable =
            errorCode === 503 ||
            errorCode === 429 ||
            errorCode === 500 ||
            errorMessage.includes('503') ||
            errorMessage.includes('overloaded') ||
            errorMessage.includes('temporarily unavailable');

        if (retries > 0 && isRetryable) {
            console.warn(`API call failed with code ${errorCode}. Retrying in ${delay}ms... (Retries left: ${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        throw error;
    }
}

// Helper to format context with Dynamic Echoes
const formatContext = (characters: Character[], worldSettings: WorldSetting[], echoes: Echo[] = []) => {
    let context = "";

    // Filter only accepted echoes
    const activeEchoes = echoes.filter(e => e.status === 'ACCEPTED');

    if (characters.length > 0) {
        context += "【活跃角色档案 (静态设定 + 动态状态)】\n";
        characters.forEach(c => {
            // Find echoes for this character
            const charEchoes = activeEchoes.filter(e => e.targetId === c.id).sort((a, b) => a.timestamp - b.timestamp);

            context += `- ${c.name} (${c.role}): ${c.description.slice(0, 150)}...\n`;
            if (c.relationships) {
                context += `  关系/羁绊: ${c.relationships}\n`;
            }

            // Inject Dynamic State
            if (charEchoes.length > 0) {
                context += `  ⚡ [当前状态变更/重要经历]:\n`;
                charEchoes.forEach(e => {
                    context += `    * ${e.description} (原因: ${e.reason})\n`;
                });
            }
        });
        context += "\n";
    }

    if (worldSettings.length > 0) {
        context += "【世界观设定 (静态规则 + 历史变迁)】\n";
        worldSettings.forEach(w => {
            const worldEchoes = activeEchoes.filter(e => e.targetId === w.id).sort((a, b) => a.timestamp - b.timestamp);

            context += `- [${w.category}] ${w.title}: ${w.content.slice(0, 150)}...\n`;

            // Inject Dynamic State
            if (worldEchoes.length > 0) {
                context += `  ⚡ [环境/规则变更]:\n`;
                worldEchoes.forEach(e => {
                    context += `    * ${e.description} (原因: ${e.reason})\n`;
                });
            }
        });
        context += "\n";
    }

    return context;
};

/**
 * NEW: Tiered Memory System (L1/L2/L3)
 * L1: Recent full text (Last 1-2 chapters)
 * L2: Medium-term summaries (Last 10 chapters)
 * L3: Long-term anchors (Plot Outline, World Bible, Character Archetypes)
 */
export const buildTieredMemory = (
    allChapters: Chapter[],
    currentChapterOrder: number,
    plotOutline?: string,
    characters: Character[] = [],
    worldSettings: WorldSetting[] = [],
    echoes: Echo[] = []
): string => {
    let context = "";

    // Sort chapters by order to be safe
    const sortedChapters = [...allChapters].sort((a, b) => a.order - b.order);
    const previousChapters = sortedChapters.filter(c => c.order < currentChapterOrder);

    // --- L3: Long-term anchors ---
    context += "【📌 L3: 长期战略锚点 (Long-term Anchors)】\n";
    if (plotOutline) {
        context += `1. [核心剧情大纲]: ${plotOutline}\n`;
    }

    // Character archetypes
    if (characters.length > 0) {
        context += `2. [核心角色人设]: ${characters.map(c => `${c.name}(${c.role}/${c.archetype})`).join(', ')}\n`;
    }

    // Relevant world settings (lite filter)
    const topSettings = filterRelevantSettings(worldSettings, plotOutline || "", 5);
    if (topSettings.length > 0) {
        context += `3. [关键世界观设定]: ${topSettings.map(s => `[${s.title}]`).join(', ')}\n`;
    }
    context += "\n";

    // --- L2: Medium-term summaries (Last 10 chapters) ---
    const l2Chapters = previousChapters.slice(-10);
    if (l2Chapters.length > 0) {
        context += "【📜 L2: 中期故事脉络 (Medium-term Arc - Last 10 Chapters)】\n";
        l2Chapters.forEach(c => {
            const summary = c.summary || "(尚未生成摘要，请根据剧情自行衔接)";
            context += `第${c.order}章《${c.title}》摘要: ${summary}\n`;
        });
        context += "\n";
    }

    // --- L1: Recent full text (Last 1 chapter) ---
    const lastChapter = previousChapters[previousChapters.length - 1];
    if (lastChapter && lastChapter.content) {
        context += "【📖 L1: 近期即时细节 (Recent Details - Last Chapter Text)】\n";
        // Take the last 2000 characters to prevent token overflow while keeping enough context
        const recentText = lastChapter.content.slice(-2000);
        context += `(接续第${lastChapter.order}章末尾): ...${recentText}\n\n`;
    }

    return context;
};

/**
 * NEW: Automatic Chapter Summarization
 * Generates a concise summary (L2 memory) for a given piece of text.
 */

// NEW: Client-side RAG-lite Relevance Filter
// Filters a large list of settings down to the most relevant ones based on current context
const filterRelevantSettings = (
    allSettings: WorldSetting[],
    queryContext: string,
    limit: number = 20
): WorldSetting[] => {
    // If the dataset is small, just return everything to ensure serendipity
    if (allSettings.length <= limit) return allSettings;

    const safeQuery = queryContext.toLowerCase();

    // Tokenize query for better matching (if browser supports Intl.Segmenter)
    let queryTokens: string[] = [];
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
        const segmenter = new (Intl as any).Segmenter('zh', { granularity: 'word' });
        queryTokens = [...segmenter.segment(safeQuery)]
            .filter((w: any) => w.isWordLike && w.segment.length > 1) // Filter out single chars/punctuation
            .map((w: any) => w.segment);
    } else {
        // Fallback: simple split by space/punctuation or just use the full string check
        queryTokens = safeQuery.split(/[\s,，.。！!?？]+/);
    }

    // Remove duplicates
    queryTokens = [...new Set(queryTokens)];

    const scored = allSettings.map(s => {
        let score = 0;
        const sTitle = s.title.toLowerCase();
        const sContent = s.content.toLowerCase();

        // 1. Title Match (Strongest signal)
        // If the setting title appears in the query (e.g. "Ice Kingdom" in plot beat)
        if (safeQuery.includes(sTitle)) score += 50;

        // 2. Reverse Title Match
        // If query keywords appear in the title
        queryTokens.forEach(token => {
            if (sTitle.includes(token)) score += 5;
        });

        // 3. Content Match (Weaker signal)
        // If query keywords appear in the setting content
        queryTokens.forEach(token => {
            if (sContent.includes(token)) score += 1;
        });

        return { setting: s, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top N
    return scored.slice(0, limit).map(item => item.setting);
};

// Helper to inject creative settings into instructions
// Now supports custom prompt overrides via the project store
const getInstructionWithSettings = (promptKey: string, settings?: CreativeSettings) => {
    const { project } = useProjectStore.getState();
    return buildPromptContent(promptKey, project.customPrompts, settings);
};

// Unified execution wrapper for Multi-Agent routing
const executeModelTask = async (
    task: LLMTaskType,
    systemInstruction: string,
    prompt: string,
    geminiModel: string,
    temperature: number,
    responseSchema?: any,
    thinkingBudget?: number
): Promise<string> => {
    const provider = getProviderForTask(task);

    if (provider === Provider.GLM) {
        // Map to standard models as defined in implementation plan or environment variables
        const modelName = process.env.GLM_MODEL_NAME || 'glm-4-plus';
        const endpoint = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/anthropic';

        const isJson = !!responseSchema;
        let finalPrompt = prompt;
        // OpenAI compatibility requires explicit JSON mention in prompt
        if (isJson && !finalPrompt.toLowerCase().includes('json')) {
            finalPrompt += '\n\n请严格按要求输出 JSON 格式。';
        }

        const responseText = await fetchOpenAICompatible(
            provider,
            endpoint,
            modelName,
            [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: finalPrompt }
            ],
            temperature,
            isJson ? 'json_object' : undefined
        );
        return responseText;
    }

    // Default Gemini Execution
    const ai = await getAIClient();
    const config: any = {
        systemInstruction,
        temperature,
    };

    if (responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = responseSchema;
    }
    if (thinkingBudget) {
        config.thinkingConfig = { thinkingBudget };
    }

    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: geminiModel,
        contents: prompt,
        config
    }));
    return response.text || "";
};

export const generateText = async (prompt: string, promptKey: string = 'writing_base', settings?: CreativeSettings): Promise<string> => {
    const ai = await getAIClient();
    const instruction = getInstructionWithSettings(promptKey, settings);

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: instruction,
                temperature: settings?.creativity || 0.8,
            }
        }));
        return response.text || "未生成任何内容。";
    } catch (error) {
        console.error("Gemini Text Generation Error:", error);
        throw error;
    }
};

export const generateCharacterImage = async (description: string): Promise<string> => {
    const ai = await getAIClient();
    const prompt = `Digital concept art, detailed character design, cinematic lighting, 4k, trending on artstation. Character description: ${description}`;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                }
            }
        }));

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image data found in response");
    } catch (error) {
        console.error("Gemini Image Generation Error:", error);
        throw error;
    }
};

export const analyzePlot = async (premise: string, currentPlot: string, characters: Character[], worldSettings: WorldSetting[], settings?: CreativeSettings, echoes: Echo[] = []): Promise<string> => {
    const ai = await getAIClient();
    const instruction = getInstructionWithSettings('plot_analysis', settings);
    const contextStr = formatContext(characters, worldSettings, echoes);

    const prompt = `
    你是一个极其严苛的小说编辑和逻辑审计师。
    请基于以下【核心梗概】和【设定背景】，对当前的【剧情大纲】进行深度审计。
    
    【核心梗概】: ${premise}
    
    ${contextStr}
    
    【当前剧情大纲】:
    ${currentPlot}
    
    任务要求：
    1. **逻辑漏洞检测**：找出剧情中的逻辑硬伤、角色动机不合理、或违反既定世界观法则的地方。
    2. **节奏与情感审计**：分析剧情的张力起伏（Pacing），指出哪里节奏太拖沓或转折太突兀。
    3. **给出【可操作的优化方案】**：针对每一个发现的问题，请提供具体的修改建议（例如：“在节点 2 中加入关于主角弱点的细节，为节点 5 的失败做铺垫”）。
    
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

export const expandScene = async (premise: string, genre: string, plotOutline: string, userPrompt: string, characters: Character[], worldSettings: WorldSetting[], settings?: CreativeSettings, echoes: Echo[] = []): Promise<string> => {
    const ai = await getAIClient();
    const instruction = getInstructionWithSettings('scene_expansion', settings);
    const contextStr = formatContext(characters, worldSettings, echoes);

    const prompt = `
  小说类型: ${genre}
  核心梗概: ${premise}
  
  ${contextStr}
  
  当前剧情大纲上下文:
  ${plotOutline}
  
  写作任务:
  ${userPrompt}
  
  请直接开始撰写正文内容，无需过多的开场白。`;

    try {
        return await executeModelTask(
            'expandScene',
            instruction,
            prompt,
            'gemini-3-flash-preview',
            settings?.creativity || 0.9
        ) || "生成失败。";
    } catch (error) {
        console.error("Gemini Scene Expansion Error:", error);
        throw error;
    }
};

export const expandWorldLore = async (title: string, currentContent: string, genre: string, settings?: CreativeSettings): Promise<string> => {
    const ai = await getAIClient();
    const instruction = getInstructionWithSettings('world_building', settings);

    const prompt = `
   世界观条目: ${title}
   所属类型: ${genre}
   
   当前设定:
   ${currentContent}
   
   任务：请基于以上内容，详细扩展其"历史演变"和"文化影响"。
   1. 描述它的起源或它是如何随着时间变化的。
   2. 描述它对当今社会、信仰或日常生活的具体影响。
   3. 增加一些传说或轶事。
   
   请以 Markdown 格式输出补充内容。`;

    try {
        return await executeModelTask(
            'expandLore',
            instruction,
            prompt,
            'gemini-3-flash-preview',
            0.85
        ) || "生成失败。";
    } catch (error) {
        console.error("Gemini Lore Expansion Error:", error);
        throw error;
    }
};

export const generatePlotFromContext = async (
    premise: string,
    genre: string,
    characters: Character[],
    worldSettings: WorldSetting[],
    settings?: CreativeSettings,
    template?: string,
    echoes: Echo[] = []
): Promise<{ title: string; content: string }[]> => {
    const ai = await getAIClient();

    // DYNAMIC CONTEXT INJECTION (Phase 6B.1)
    // Combine text for query: Premise + Template (if any) + Character Names
    const queryContext = `${premise} ${template || ''} ${characters.map(c => c.name).join(' ')}`;

    // Filter relevant world settings based on the core premise
    // Limit to top 15 to leave enough room for deep thinking on the plot structure
    const relevantSettings = filterRelevantSettings(worldSettings, queryContext, 15);

    // Build focused context string
    let contextStr = "【登场角色 (Cast)】\n";
    if (characters.length > 0) {
        characters.forEach(c => {
            const charEchoes = echoes.filter(e => e.targetId === c.id && e.status === 'ACCEPTED').sort((a, b) => a.timestamp - b.timestamp);
            contextStr += `- ${c.name} (${c.role}): ${c.description} (关系: ${c.relationships})\n`;
            if (charEchoes.length > 0) {
                contextStr += `  ⚡ [当前状态变更]: ${charEchoes.map(e => e.description).join('; ')}\n`;
            }
        });
    } else {
        contextStr += "尚未设定。\n";
    }

    contextStr += "\n【高相关度世界观法则 (Deep Lore Context)】\n";
    if (relevantSettings.length > 0) {
        const categories = Array.from(new Set(relevantSettings.map(w => w.category)));
        categories.forEach(cat => {
            const items = relevantSettings.filter(w => w.category === cat);
            if (items.length > 0) {
                contextStr += `[${cat}]:\n`;
                items.forEach(w => contextStr += `  - ${w.title}: ${w.content.slice(0, 500)}${w.content.length > 500 ? '...' : ''}\n`);
            }
        });
    } else {
        contextStr += "无特别约束设定。\n";
    }

    const instruction = getInstructionWithSettings('plot_weaving', settings);

    let taskRequirement = `
  任务要求：
  1. 结合人物的性格缺陷和目标，设计引发剧情的激励事件。
  2. 利用【高相关度世界观法则】制造专属设定的障碍、谜题和转折。
  3. 确保角色关系随着剧情推进而发生变化。
  4. **整合【当前状态变更】**：剧情发展必须考虑角色当前的状态（如伤病、道具、已发生的事件）。`;

    if (template) {
        taskRequirement += `\n\n【关键要求】请严格按照以下经典故事结构模版进行填充和创作：\n${template}`;
    } else {
        taskRequirement += `\n\n请生成一个包含 "起、承、转、合" 或 "分章/分幕" 结构的详细大纲。`;
    }

    const prompt = `
  小说类型: ${genre}
  核心梗概: ${premise}
  
  ${contextStr}
  
  ${taskRequirement}
  
  请直接输出大纲内容。
  
  **重要输出格式要求**：
  你必须返回一个符合以下 JSON 结构的数组：
  [
    { "title": "情节标题", "content": "该情节点的详细描述..." },
    ...
  ]
  禁止包含任何开场白或解释文字。
  `;

    try {
        const responseText = await executeModelTask(
            'generatePlot',
            instruction,
            prompt,
            'gemini-3-pro-preview',
            0.6,
            AiPlotNodeArraySchema,
            4096
        );

        const result = safeParseAiJson(responseText, AiPlotNodeArraySchema, "Plot Generation");
        return result || [];
    } catch (error) {
        console.error("Gemini Plot Generation Error:", error);
        throw error;
    }
};

// NEW: Rewrite plot based on feedback or directive
export const rewritePlot = async (
    currentPlot: string,
    directive: string,
    genre: string,
    characters: Character[],
    worldSettings: WorldSetting[],
    settings?: CreativeSettings,
    echoes: Echo[] = []
): Promise<{ title: string; content: string }[]> => {
    const ai = await getAIClient();
    const contextStr = formatContext(characters, worldSettings, echoes);

    const instruction = getInstructionWithSettings('plot_weaving', settings); // Re-use weaving for rewrite context

    const prompt = `
    你是一个天才的剧情架构师。
    你的任务是根据【修改指令】对现有的【剧情大纲】进行局部或全局的优化。
    
    小说类型: ${genre}
    
    ${contextStr}
    
    【当前剧情大纲】:
    ${currentPlot}
    
    【修改指令/诊断反馈】:
    ${directive}
    
    任务要求：
    1. **精准落实指令**：针对指令（或诊断反馈）指出需要修复的地方进行精准修改。
    2. **最小变动原则**：禁止进行无关的重写。凡是指令未涉及的部分，应尽可能保持原有的文字、结构和逻辑不变。
    3. **保持连贯性**：修改后的剧情必须与角色设定和世界观保持高度的一致性。
    4. **意志遵从度**：你的目标是执行“微创手术”修复问题，严禁自作主张大改大纲基调。
    
    **重要输出格式要求**：
    你必须返回一个符合以下 JSON 结构的数组：
    [
      { "title": "情节标题", "content": "该情节点的详细描述..." },
      ...
    ]
    禁止包含任何开场白或解释文字。
    `;

    try {
        const responseText = await executeModelTask(
            'rewritePlot',
            instruction,
            prompt,
            'gemini-3-pro-preview',
            0.3,
            AiPlotNodeArraySchema,
            4096
        );

        const result = safeParseAiJson(responseText, AiPlotNodeArraySchema, "Plot Rewrite");
        return result || [];
    } catch (e) {
        console.error("Gemini Plot Rewrite Error:", e);
        throw e;
    }
};

export const batchGenerateCharacters = async (premise: string, genre: string, settings?: CreativeSettings): Promise<Omit<Character, 'id'>[]> => {
    const ai = await getAIClient();

    const characterSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING, description: "One of: 主角, 反派, 导师, 伙伴, 守护者, 变形者, 捣蛋鬼, 信使" },
                description: { type: Type.STRING, description: "详细的人物小传。必须包含：外貌、性格、明确的欲望和恐惧、秘密、标志性特征(Signature)、道德阵营(Alignment)。" },
                relationships: { type: Type.STRING, description: "与其他角色的潜在关系" }
            },
            required: ["name", "role", "description"]
        }
    };

    // Incorporate settings into the prompt since we can't easily inject system instruction into JSON schema mode cleanly in all cases, 
    // but Gemini handles instructions in prompt well too.
    const settingText = settings ? `风格要求：基调 ${settings.tone}，风格 ${settings.style}。` : "";

    const prompt = `基于小说梗概："${premise}" (类型: ${genre})，请设计 **7位** 核心角色。${settingText}
    
    请混合使用以下角色原型，构建一个功能完整的角色阵容：
    1. **1位 主角 (Protagonist)**：故事的核心驱动者。
    2. **1位 反派 (Antagonist)**：与主角对立的主要力量。
    3. **1位 导师 (Mentor)** 或 **伙伴 (Ally)**。
    4. **4位 功能性角色**：从 [守护者, 变形者, 捣蛋鬼, 信使] 中选择，以增加故事的张力和变数。
    
    要求：
    - 确保这七个人物之间存在复杂的纠葛（如血缘、仇恨、债务、暗恋、挚友等）。
    - **深度刻画**：每个人物都必须有明确的欲望、恐惧和独特的标志性特征。
    - 请使用中文输出。`;

    try {
        const responseText = await executeModelTask(
            'batchGenerateCharacters',
            '',
            prompt,
            'gemini-3-flash-preview',
            0.7,
            characterSchema
        );

        const parsed = safeParseAiJson(responseText, AiCharacterArraySchema, 'batchGenerateCharacters');
        return parsed ?? [];
    } catch (e) {
        console.error("Batch Character Generation Error", e);
        throw e;
    }
};

export const batchGenerateWorldSettingsByCategory = async (premise: string, genre: string, category: string, settings?: CreativeSettings): Promise<Omit<WorldSetting, 'id'>[]> => {
    const ai = await getAIClient();

    const worldSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                content: { type: Type.STRING, description: "详细的设定描述" }
            },
            required: ["title", "content"]
        }
    };

    const settingText = settings ? `风格要求：基调 ${settings.tone}，风格 ${settings.style}。` : "";

    const prompt = `基于小说梗概："${premise}" (类型: ${genre})。
    请为世界观分类 **"${category}"** 构思 **2-3个** 关键设定条目。${settingText}
    
    要求：
    - 设定必须独特且符合小说类型。
    - 能够为剧情提供冲突或背景支持。
    - 请使用中文输出。`;

    try {
        const responseText = await executeModelTask(
            'batchGenerateSettings',
            '',
            prompt,
            'gemini-3-flash-preview',
            0.7,
            worldSchema
        );

        const parsed = safeParseAiJson(responseText, AiWorldSettingArraySchema, 'batchGenerateWorldSettings');
        if (parsed) {
            return parsed.map(item => ({
                title: item.title,
                content: item.content,
                category: category as WorldSetting['category']
            }));
        }
        return [];
    } catch (e) {
        console.error(`Batch World Generation Error (${category})`, e);
        return [];
    }
};

export type PacingMode = 'SLOW_BURN' | 'BALANCED' | 'CLIMAX';

export const generateSceneFromIngredients = async (
    genre: string,
    plotBeat: string,
    activeCharacters: Character[],
    activeLocation: WorldSetting | null,
    allWorldSettings: WorldSetting[], // New: Pass entire bible
    settings?: CreativeSettings,
    previousStoryContext?: string, // NEW: Manuscript memory
    pacing: PacingMode = 'BALANCED', // NEW: Pacing Control
    echoes: Echo[] = [], // NEW: Dynamic Echoes
    targetWordCount: number = 3000, // NEW: Target Word Count
    povName?: string, // NEW: Explicit POV lock
    rollingSummary?: string, // NEW: Global Story Arc
    activeChapterId?: string, // NEW: Optional active chapter ID
    twistHook?: string // NEW: Optional Twist Hook (Direction Three)
): Promise<string> => {
    const ai = await getAIClient();

    const profile = settings?.promptProfile || 'LITERARY';
    let pacingInstruction = "";

    if (profile === 'WEB_NOVEL') {
        switch (pacing) {
            case 'SLOW_BURN':
                pacingInstruction = "【节奏控制: 心理拉扯/慢热】重点在于角色博弈、对峙和期待感经营。不要写景物！";
                break;
            case 'CLIMAX':
                pacingInstruction = "【节奏控制: 热血爆发/高潮】进入高强度反转或冲突爆发，全对话驱动，营造极致爽感。";
                break;
            default:
                pacingInstruction = "【节奏控制: 稳定爽快】稳步推进主线冲突。";
                break;
        }
    } else {
        switch (pacing) {
            case 'SLOW_BURN':
                pacingInstruction = "【节奏控制: 铺垫/慢热】大量环境描写、心理活动和细节刻画。";
                break;
            case 'CLIMAX':
                pacingInstruction = "【节奏控制: 高潮/爆发】短促有力的句子，专注动作、冲突和直接反应。";
                break;
            default:
                pacingInstruction = "【节奏控制: 平衡推进】保持叙事流畅，平衡对话、动作和描写。";
                break;
        }
    }

    const instruction = getInstructionWithSettings('scene_generation', settings);

    // Build context
    let context = "";

    // NEW: Global Story Arc (Rolling Summary)
    if (rollingSummary) {
        context += `【📚 全局故事脉络 (Global Story Arc)】\n(以下是目前为止整部小说的情节摘要，请确保当前创作符合整体走向，并注意前后呼应)\n${rollingSummary}\n\n`;
    }

    // Filter only accepted echoes
    const activeEchoes = echoes.filter(e => e.status === 'ACCEPTED');

    // --- NEW: Tiered Memory Context Injection (L1/L2/L3) ---
    // Instead of simple episodic memory, we use the structured tiered system
    const { project } = useProjectStore.getState();
    const currentChapter = activeChapterId ? project.chapters.find(c => c.id === activeChapterId) : null;
    const currentOrder = currentChapter ? currentChapter.order : (project.chapters.length > 0 ? Math.max(...project.chapters.map(c => c.order)) + 1 : 1);

    const tieredContext = buildTieredMemory(
        project.chapters,
        currentOrder,
        project.plotOutline || "",
        activeCharacters,
        allWorldSettings,
        activeEchoes
    );
    context += tieredContext;

    // 3. Stage (Specific Location)
    if (activeLocation) {
        const locEchoes = activeEchoes.filter(e => e.targetId === activeLocation.id).sort((a, b) => a.timestamp - b.timestamp);
        context += `【当前场景地点 (Stage)】\n[${activeLocation.category}] ${activeLocation.title}: ${activeLocation.content}\n`;
        if (locEchoes.length > 0) {
            context += `⚡ [环境变更]: ${locEchoes.map(e => e.description).join('; ')}\n`;
        }
        context += "\n";
    }

    // 3. Rules & Lore (The rest of the bible) - NOW WITH DYNAMIC FILTERING
    // Filter out the active location to avoid duplication
    const otherSettings = allWorldSettings.filter(w => !activeLocation || w.id !== activeLocation.id);

    // Combine text for query: PlotBeat + Previous Context + Active Char Names
    const queryContext = `${plotBeat} ${previousStoryContext || ''} ${activeCharacters.map(c => c.name).join(' ')}`;

    // Dynamic Filter
    const relevantSettings = filterRelevantSettings(otherSettings, queryContext, 20); // Limit to top 20 relevant

    if (relevantSettings.length > 0) {
        context += "【世界观法则与背景 (World Context)】\n";
        context += "*请在写作时参考以下规则，确保逻辑自洽：*\n";
        // Group by category for clarity
        const categories = Array.from(new Set(relevantSettings.map(w => w.category)));
        categories.forEach(cat => {
            const items = relevantSettings.filter(w => w.category === cat);
            if (items.length > 0) {
                context += `[${cat}]:\n`;
                // Increased context limit to allow deeper integration of lore
                items.forEach(w => context += `  - ${w.title}: ${w.content.slice(0, 1000)}${w.content.length > 1000 ? '...' : ''}\n`);
            }
        });
        context += "\n";
    }

    // 4. POV & Pacing Constraints (Absolute Priority)
    let constraintBlock = `【🚨 创作核心限制 (Absolute Constraints)】\n`;

    if (povName) {
        constraintBlock += `- **视角锁定**: 必须严格以【${povName}】的第一人称或限制性第三人称视角叙事。\n`;
        constraintBlock += `  * 严禁描写该角色感知范围（视角、听力、触觉等）之外的任何信息。\n`;
        constraintBlock += `  * 严禁上帝视角，严禁切换到其他角色的内心活动。\n`;
    }

    constraintBlock += pacingInstruction + "\n";
    context += constraintBlock + "\n";

    const prompt = `
    小说类型: ${genre}
    
    ${context}

    ${twistHook ? `【⚠️ 剧情反转指令 (Twist Hook)】: \n${twistHook}\n` : ''}
    
    【本场戏的情节目标 (Plot Beat)】:
    ${plotBeat}
    
    请根据以上要素，撰写一段约 ${targetWordCount} 字的小说正文片段。
    【重要字数要求】：请务必拓展细节、对话和环境描写，撑起框架，使最终生成的字数严格逼近 ${targetWordCount} 字的规模，避免干瘪或敷衍。
    请直接开始正文，不需要标题或概述。
    `;

    try {
        return await executeModelTask(
            'generateText',
            instruction,
            prompt,
            'gemini-3-flash-preview', // Downgrade to flash for cost savings
            settings?.creativity || 0.9,
            undefined,
            2048 // Optional thinking budget if supported by the provider
        ) || "生成失败";
    } catch (e) {
        console.error("Scene Generation Error", e);
        throw e;
    }
};

// NEW: Literary Polish Engine
export type PolishMode = 'SENSORY' | 'CINEMATIC' | 'PSYCHOLOGICAL' | 'MINIMALIST' | 'WEB_MEME';

export const polishDraft = async (
    content: string,
    mode: PolishMode,
    settings?: CreativeSettings
): Promise<string> => {
    const ai = await getAIClient();

    let modeInstruction = "";
    switch (mode) {
        case 'SENSORY':
            modeInstruction = "任务：【五感增强】。请扫描文本，在只有视觉描写的地方，强制植入嗅觉、听觉、触觉甚至味觉的细节。让读者能“闻到”和“摸到”场景。";
            break;
        case 'CINEMATIC':
            modeInstruction = "任务：【镜头语言优化】。重写动作和场景转换，像电影剧本一样强调空间感、光影变化和动态捕捉。删除静态的说明性文字。";
            break;
        case 'PSYCHOLOGICAL':
            modeInstruction = "任务：【心理侧写加深】。深入角色的内心世界，增加潜台词、微表情和内心挣扎的描写。让角色的动机不仅仅停留在表面。";
            break;
        case 'MINIMALIST':
            modeInstruction = "任务：【极简主义/海明威风格】。删除所有不必要的形容词和副词。使用短句。通过对话和动作来展示情感，而不是直接描述情感。";
            break;
        case 'WEB_MEME':
            modeInstruction = "任务：【网文网感增强/吐槽化】。将平淡的文字重写为带梗、诙谐、具有现代网文生命力的风格。删除冗长景物，强化角色个性和吐槽感，增加潜台词。";
            break;
    }

    const instruction = getInstructionWithSettings('polish_engine', settings);

    const prompt = `
    【待润色文本】:
    ${content}
    
    请直接输出润色后的正文。
    `;

    try {
        return await executeModelTask(
            'polishDraft',
            instruction,
            prompt,
            'gemini-3-flash-preview',
            0.8
        ) || content;
    } catch (e) {
        console.error("Polish Error", e);
        throw e;
    }
};

// NEW: Analyze text for state changes
export const analyzeStateChanges = async (
    sceneContent: string,
    activeCharacters: Character[],
    allWorldSettings: WorldSetting[]
): Promise<StateChangeRecommendation[]> => {
    if (!sceneContent || (activeCharacters.length === 0 && allWorldSettings.length === 0)) return [];

    const ai = await getAIClient();

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                targetName: { type: Type.STRING, description: "Name of the character or world setting" },
                targetType: { type: Type.STRING, description: "CHARACTER or WORLD" },
                suggestedUpdate: { type: Type.STRING, description: "Specifically what changed (e.g., 'Lost an arm', 'Village destroyed'). Keep it concise." },
                reason: { type: Type.STRING, description: "Quote from the text justifying this change." }
            },
            required: ["targetName", "targetType", "suggestedUpdate", "reason"]
        }
    };

    // Simplify the list for the prompt to save tokens, but include all names
    const worldList = allWorldSettings.map(w => `${w.title} (${w.category})`).join(', ');

    const instruction = getInstructionWithSettings('echo_analysis');
    const prompt = `
    阅读以下小说片段，分析是否发生了对【人物状态】或【世界环境】有**永久性或重大影响**的事件。
    只有当发生重大变更（如：受伤、死亡、获得重要道具、关系决裂、地点损毁、物品丢失）时才生成记录。
    如果只是普通的对话或移动，请不要生成记录。

    【追踪目标】:
    人物: ${activeCharacters.map(c => c.name).join(', ')}
    世界/地点: ${worldList}

    【待分析文本】:
    ${sceneContent}
    `;

    try {
        const responseText = await executeModelTask(
            'analyzeStateChanges',
            instruction,
            prompt,
            'gemini-3-flash-preview',
            0.1,
            responseSchema
        );

        {
            const raw = safeParseAiJson(responseText, AiStateChangeArraySchema, 'analyzeStateChanges');
            if (!raw) return [];
            // Post-process to link back to IDs
            const result: StateChangeRecommendation[] = [];

            for (const item of raw) {
                let id = '';
                if (item.targetType === 'CHARACTER') {
                    const char = activeCharacters.find(c => c.name.includes(item.targetName) || item.targetName.includes(c.name));
                    if (char) id = char.id;
                } else if (item.targetType === 'WORLD') {
                    // Search through ALL settings
                    // 1. Exact match
                    let setting = allWorldSettings.find(w => w.title === item.targetName);
                    // 2. Partial match
                    if (!setting) {
                        setting = allWorldSettings.find(w => w.title.includes(item.targetName) || item.targetName.includes(w.title));
                    }

                    if (setting) {
                        id = setting.id;
                    }
                }

                if (id) {
                    result.push({
                        targetId: id,
                        targetType: item.targetType,
                        targetName: item.targetName,
                        suggestedUpdate: item.suggestedUpdate,
                        reason: item.reason
                    });
                }
            }
            return result;
        }
        return [];
    } catch (e) {
        console.error("State Analysis Error", e);
        return [];
    }
};

/**
 * Localized Text Rewrite (for Tiptap Editor Copilot)
 * Rewrites a specific selection of text while preserving the context around it.
 */
export const rewriteLocalText = async (
    genre: string,
    selectedText: string,
    contextBefore: string,
    contextAfter: string,
    instruction: string,
    settings?: CreativeSettings
): Promise<string> => {
    const ai = await getAIClient();

    // We can reuse the scene_generation system instruction for consistent tone
    const sysInstruction = getInstructionWithSettings('scene_generation', settings);

    const prompt = `
    你现在是一个极其专业的小说润色助手（类型：${genre}）。

    【用户指令】
    ${instruction}

    【上下文环境】
    为了保证你重写的连贯性，这里提供选中文字的前后文（仅作参考，绝对不要在你的输出中重复这段前后文！）：
    [前文]: "...${contextBefore}"
    [后文]: "${contextAfter}..."

    【需要你重写的原文】
    "${selectedText}"

    【任务要求】
    1. 请严格按照用户的指令，**仅**对“需要你重写的原文”进行重造/润色/扩写/精简。
    2. 生成结果必须能在语义和语境上与 [前文] 和 [后文] 完美、无缝地拼接在一起。
    3. **极其重要**：直接输出重写后的纯文本素材！绝对不要包含任何 Markdown 格式包裹（如 \`\`\` 或 ** 等），绝对不要自作主张添加“这段话已经重写完毕：”或“以下是...”等废话引导语。你的输出将被程序直接插入原文替换原有片段。
    `;

    try {
        const response = await ai.models.generateContent({
            // getModelName('flash') typically maps to gemini-2.5-flash for faster lightweight tasks
            model: await getModelName('flash'),
            contents: prompt,
            config: {
                systemInstruction: sysInstruction,
                temperature: settings?.creativity || 0.7,
            }
        });

        let newText = response.text || "";
        // Ultimate safeguard against AI returning markdown code blocks
        newText = newText.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
        return newText;
    } catch (e) {
        console.error("Local rewrite failed:", e);
        throw e;
    }
};

// NEW: World Engine - Deduce consequences of recent events
// NEW: Memory Consolidation - Merge echoes into static description
// NEW: Auto-Echo Capture - Extract echoes from generated text
export const extractEchoesFromText = async (
    text: string,
    characters: Character[],
    worldSettings: WorldSetting[]
): Promise<Echo[]> => {
    if (!text || text.length < 100) return [];

    const ai = getAIClient();
    const contextStr = formatContext(characters, worldSettings, []);

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                targetName: { type: Type.STRING, description: "Name of the character or world setting affected" },
                targetType: { type: Type.STRING, description: "CHARACTER or WORLD" },
                description: { type: Type.STRING, description: "What happened? (Concise, e.g., 'Lost left arm', 'Obtained the Magic Sword')" },
                reason: { type: Type.STRING, description: "Why is this significant?" }
            },
            required: ["targetName", "targetType", "description", "reason"]
        }
    };

    const prompt = `
    你是一个文学评论家和设定分析师。
    请阅读以下小说正文片段，分析其中是否发生了**具有持久影响**的关键事件（Fate Echoes）。

    【现有实体列表】:
    ${contextStr}

    【小说正文片段】:
    ${text.substring(0, 15000)} ... (截取部分)

    【提取规则】:
    1. **只提取重大变更**: 忽略琐碎的对话或动作。只关注状态改变（受伤、获得物品、关系破裂、死亡）、重大秘密揭露、或世界规则的变动。
    2. **关联现有实体**: 尽量将事件关联到上述列表中的【角色】或【世界设定】。
    3. **客观描述**: 描述必须是客观的事实陈述。

    请输出 JSON 格式的事件列表。如果没有重大事件，返回空数组。
    `;

    try {
        const responseText = await executeModelTask(
            'extractEchoes',
            '',
            prompt,
            await getModelName('flash'),
            0.1,
            responseSchema
        );

        {
            const raw = safeParseAiJson(responseText, AiEchoArraySchema, 'extractEchoesFromText');
            if (!raw) return [];
            const result: Echo[] = [];

            for (const item of raw) {
                let id = '';
                if (item.targetType === 'CHARACTER') {
                    const char = characters.find(c => c.name.includes(item.targetName) || item.targetName.includes(c.name));
                    if (char) id = char.id;
                } else if (item.targetType === 'WORLD') {
                    let setting = worldSettings.find(w => w.title === item.targetName);
                    if (!setting) {
                        setting = worldSettings.find(w => w.title.includes(item.targetName) || item.targetName.includes(w.title));
                    }
                    if (setting) id = setting.id;
                }

                if (id) {
                    result.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        targetId: id,
                        targetName: item.targetName,
                        type: item.targetType,
                        description: item.description,
                        reason: item.reason,
                        status: 'PENDING', // Auto-extracted echoes start as PENDING
                        timestamp: Date.now()
                    });
                }
            }
            return result;
        }
        return [];
    } catch (e) {
        console.error("Auto-Echo Extraction Error", e);
        return [];
    }
};
export const consolidateMemory = async (
    targetName: string,
    targetType: 'CHARACTER' | 'WORLD',
    currentDescription: string,
    echoesToConsolidate: Echo[]
): Promise<string> => {
    if (echoesToConsolidate.length === 0) return currentDescription;

    const ai = await getAIClient();
    const echoText = echoesToConsolidate.map(e => `- ${e.description} (${new Date(e.timestamp).toLocaleDateString()})`).join('\n');

    const prompt = `
    你是一个负责维护小说世界观的“档案管理员”。
    你的任务是将【最近发生的事件】（短期记忆）永久性地整合进【实体档案描述】（长期记忆）中。

    【实体名称】: ${targetName} (${targetType === 'CHARACTER' ? '角色' : '世界设定'})
    
    【当前档案描述】:
    ${currentDescription}

    【待整合的新记忆 (Recent Events)】:
    ${echoText}

    【整合规则】:
    1. **更新状态**: 如果新记忆改变了实体的状态（如受伤、失去物品、获得能力），请在描述中体现。
    2. **丰富背景**: 将发生的事件作为“过去的历史”写入描述。
    3. **保持连贯**: 不要简单地追加文本，而是重写描述，使其通顺、自然。
    4. **精简**: 去除不再重要的细节，保留核心特质和关键变化。

    请直接输出整合后的【新档案描述】（纯文本，不要 Markdown 格式）。
    `;

    try {
        const responseText = await executeModelTask(
            'generateText',
            '',
            prompt,
            await getModelName('flash'),
            0.3
        );

        return responseText.trim() || currentDescription;
    } catch (e) {
        console.error("Memory Consolidation Error", e);
        return currentDescription;
    }
};

// NEW: World Engine - Deduce consequences of recent events
export const deduceWorldConsequences = async (
    recentEchoes: Echo[],
    characters: Character[],
    worldSettings: WorldSetting[],
    genre: string
): Promise<StateChangeRecommendation[]> => {
    if (recentEchoes.length === 0) return [];

    const ai = await getAIClient();
    const contextStr = formatContext(characters, worldSettings, recentEchoes);

    // Only consider recent accepted echoes as triggers
    const triggers = recentEchoes
        .filter(e => e.status === 'ACCEPTED')
        .slice(-5) // Focus on last 5 events to avoid noise
        .map(e => `- ${e.description} (${e.targetName})`)
        .join('\n');

    if (!triggers) return [];

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                targetName: { type: Type.STRING, description: "Name of the character or world setting affected" },
                targetType: { type: Type.STRING, description: "CHARACTER or WORLD" },
                suggestedUpdate: { type: Type.STRING, description: "The predicted consequence (e.g., 'Civil war breaks out', 'Character X seeks revenge')" },
                reason: { type: Type.STRING, description: "The logical chain of causality (Why does A lead to B?)" }
            },
            required: ["targetName", "targetType", "suggestedUpdate", "reason"]
        }
    };

    const prompt = `
    你是一个全知全能的世界模拟器（World Engine）。
    你的任务是基于【最近发生的事件】（Triggers），推演它们对【世界】和【人物】产生的**连锁反应**（Consequences）。

    小说类型: ${genre}

    ${contextStr}

    【最近发生的事件 (Triggers)】:
    ${triggers}

    【推演规则】:
    1. **蝴蝶效应**: 一个小事件可能引发大变动（例如：国王遇刺 -> 继承人争夺战 -> 内战爆发）。
    2. **符合逻辑**: 推演必须符合世界观设定（例如：如果魔法依赖水晶，水晶破碎会导致魔法失效）。
    3. **制造冲突**: 预测的结果应该为故事增加张力和冲突。
    4. **具体**: 不要模糊地说“局势紧张”，要说“北方公爵集结军队”。

    请输出 JSON 格式的【未来预测】。
    `;

    try {
        const responseText = await executeModelTask(
            'deduceWorldConsequences',
            '',
            prompt,
            await getModelName('pro'),
            0.4,
            responseSchema
        );

        {
            const raw = safeParseAiJson(responseText, AiStateChangeArraySchema, 'deduceWorldConsequences');
            if (!raw) return [];
            const result: StateChangeRecommendation[] = [];

            for (const item of raw) {
                let id = '';
                if (item.targetType === 'CHARACTER') {
                    const char = characters.find(c => c.name.includes(item.targetName) || item.targetName.includes(c.name));
                    if (char) id = char.id;
                } else if (item.targetType === 'WORLD') {
                    let setting = worldSettings.find(w => w.title === item.targetName);
                    if (!setting) {
                        setting = worldSettings.find(w => w.title.includes(item.targetName) || item.targetName.includes(w.title));
                    }
                    if (setting) id = setting.id;
                }

                if (id) {
                    result.push({
                        targetId: id,
                        targetType: item.targetType,
                        targetName: item.targetName,
                        suggestedUpdate: item.suggestedUpdate,
                        reason: item.reason
                    });
                }
            }
            return result;
        }
        return [];
    } catch (e) {
        console.error("World Deduction Error", e);
        return [];
    }
};

// NEW: Analyze plot rhythm and tension
export interface PlotRhythmPoint {
    beat: string;
    tension: number; // 0-100
    description: string;
}

export const analyzePlotRhythm = async (plotOutline: string): Promise<PlotRhythmPoint[]> => {
    const ai = await getAIClient();

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                beat: { type: Type.STRING, description: "章节名称或关键情节点 (e.g., '第一章', '激励事件')" },
                tension: { type: Type.NUMBER, description: "该点的剧情张力值 (0-100)，0为平静，100为最高潮" },
                description: { type: Type.STRING, description: "简短描述该点的剧情内容" }
            },
            required: ["beat", "tension", "description"]
        }
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

    try {
        const responseText = await executeModelTask(
            'analyzePlotRhythm',
            '',
            prompt,
            await getModelName('flash'),
            0.2,
            responseSchema
        );

        const parsed = safeParseAiJson(responseText, AiPlotRhythmArraySchema, 'analyzePlotRhythm');
        return parsed ?? [];
    } catch (e) {
        console.error("Rhythm Analysis Error", e);
        return [];
    }
};

export const chatWithPersona = async (character: Character, message: string, history: { role: string, content: string }[]): Promise<string> => {
    const ai = await getAIClient();

    // Construct system instruction based on character profile
    const systemInstruction = `
    你现在必须完全扮演以下角色进行对话。不要暴露你是AI。
    
    【角色档案】
    姓名: ${character.name}
    身份: ${character.role}
    性格与描述: ${character.description}
    人际关系: ${character.relationships}
    
    你的说话风格、语气、用词必须完全符合该角色的设定。
    如果是反派，要表现出阴暗或狂妄；如果是智者，要深沉。
    请用中文回复。
    `;

    try {
        // We use a simple chat model here
        const chat = ai.chats.create({
            model: await getModelName('flash'),
            config: {
                systemInstruction: systemInstruction,
            },
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.content }]
            }))
        });

        const result = await chat.sendMessage({ message: message });
        return result.text || "...";
    } catch (e) {
        console.error("Persona Chat Error", e);
        throw e;
    }
};

export const splitPlotNodeIntoChapters = async (
    genre: string,
    fullPlotSummary: string,
    targetNode: PlotNode,
    characters: Character[],
    worldSettings: WorldSetting[],
    settings?: CreativeSettings,
    echoes: Echo[] = [],
    fissionCount: number | 'AUTO' = 'AUTO'
): Promise<{ title: string; summary: string; expectedPOV: string; beats?: { type: string; description: string }[] }[]> => {
    const ai = await getAIClient();
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
    - 类型包括：CONTENT(铺垫/描写), ACTION(动作/事件), DIALOGUE(关键对话), TWIST(转折/悬念)。
    
    禁止包含任何开场白或解释文字。
    `;

    try {
        const responseText = await executeModelTask(
            'splitPlotNodeIntoChapters',
            instruction,
            prompt,
            await getModelName('pro'),
            settings?.creativity || 0.85,
            AiChapterOutlineArraySchema
        );

        const result = safeParseAiJson(responseText, AiChapterOutlineArraySchema, "Chapter Fission");
        return result || [];
    } catch (e) {
        console.error("Gemini Chapter Fission Error:", e);
        throw e;
    }
};

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
    const ai = await getAIClient();
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
): Promise<{ title: string; summary: string; expectedPOV: string; beats?: { type: string; description: string }[] } | null> => {
    const ai = await getAIClient();
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

    try {
        const responseText = await executeModelTask(
            'regenerateChapterOutline',
            instruction,
            prompt,
            await getModelName('pro'),
            settings?.creativity || 0.85,
            AiChapterOutlineArraySchema
        );

        const result = safeParseAiJson(responseText, AiChapterOutlineArraySchema, "Chapter Regeneration");
        return result && result.length > 0 ? result[0] : null;
    } catch (e) {
        console.error("Gemini Chapter Regeneration Error:", e);
        throw e;
    }
};

/**
 * NEW: Automatic Chapter Summarization (L2 Memory Builder)
 */
export const summarizeChapter = async (
    title: string,
    content: string,
    settings?: CreativeSettings
): Promise<string> => {
    const prompt = `
你是一位专业的文学编辑。请对以下小说章节进行【极度精简】的摘要（100-200字）。
要求：
1. 提取所有关键的剧情转折点（Plot Points）。
2. 记录角色之间的重要情感/关系状态变化。
3. 标注任何新出现的伏笔或核心道具。
4. 语言要客观、利索，作为后续写作的“中期记忆”参考。

章节标题: ${title}
正文内容:
${content.slice(0, 10000)}
    `;

    try {
        const responseText = await executeModelTask(
            'summarizeChapter',
            '',
            prompt,
            await getModelName('flash'),
            0.3
        );
        return responseText.trim();
    } catch (error) {
        console.error("Failed to summarize chapter:", error);
        return "摘要生成失败。";
    }
};

/**
 * NEW: Twist Agent - Inspiration Jumps
 */
export const generateTwistHooks = async (
    context: string,
    plotBeat: string
): Promise<string[]> => {
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

    try {
        const responseText = await executeModelTask(
            'generateTwistHooks',
            '',
            prompt,
            await getModelName('pro'), // Use Pro for better creativity
            0.9
        );

        return responseText.split('\n').filter(line => /^\d\./.test(line.trim())).map(line => line.replace(/^\d\.\s*/, '').trim());
    } catch (error) {
        console.error("Failed to generate twist hooks:", error);
        return [];
    }
};


/**
 * NEW: Knowledge Graph Logic Audit - Triple Extraction
 */
export const extractKnowledgeTriples = async (
    content: string
): Promise<KnowledgeTriple[]> => {
    const prompt = `
你是一位精通逻辑分析的小说编辑。你的任务是从给定的【正文内容】中提取核心的人物位置、人物关系和重大事实三元组。

【提取要求】：
1. 重点提取“A 在 B 地”、“A 与 B 是 C 关系”、“A 拥有 B 物品”等事实。
2. 保持 Subject 和 Object 为简短的名称（如角色名、地点名）。
3. Relation 尽量使用简练的词汇（如：“位于”、“在”、“仇恨”、“爱”、“拥有”）。

【格式要求】：
必须返回一个纯 JSON 数组，格式如下：
[
  {"subject": "角色A", "relation": "位于", "object": "地点B"},
  {"subject": "角色A", "relation": "爱", "object": "角色B"}
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

        // Simple regex-based JSON extraction
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
 * NEW: Knowledge Graph Logic Audit - Backend Verification Wrapper
 */
export const verifyLogicConflicts = async (
    projectId: string,
    triples: KnowledgeTriple[]
): Promise<LogicConflict[]> => {
    if (triples.length === 0) return [];

    try {
        // Note: Make sure the backend endpoint /api/graph/verify-logic exists
        const response = await fetch('/api/graph/verify-logic', {
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