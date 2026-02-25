import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Character, WorldSetting, CreativeSettings, StateChangeRecommendation, Echo } from "../types";
import {
    safeParseAiJson,
    AiCharacterArraySchema,
    AiWorldSettingArraySchema,
    AiStateChangeArraySchema,
    AiEchoArraySchema,
    AiPlotRhythmArraySchema,
    AiPlotNodeArraySchema,
} from './schemas';
import { buildPromptContent } from '../config/prompts';
import { useProjectStore } from '../store/useProjectStore';

const STORAGE_KEY_API = 'muse_gemini_api_key';
const STORAGE_KEY_MODEL = 'muse_gemini_model';

const getAIClient = () => {
    const apiKey = localStorage.getItem(STORAGE_KEY_API) || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("请先在全局设置面板中配置您的 Gemini API Key。");
    }
    return new GoogleGenAI({ apiKey });
};

export const getModelName = (tier: 'flash' | 'pro' = 'flash'): string => {
    const customModel = localStorage.getItem(STORAGE_KEY_MODEL);
    if (customModel) return customModel;
    return tier === 'pro' ? 'gemini-2.5-pro-preview-05-06' : 'gemini-2.5-flash-preview-05-20';
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

export const generateText = async (prompt: string, promptKey: string = 'writing_base', settings?: CreativeSettings): Promise<string> => {
    const ai = getAIClient();
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
    const ai = getAIClient();
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
    const ai = getAIClient();
    const instruction = getInstructionWithSettings('plot_analysis', settings);
    const contextStr = formatContext(characters, worldSettings, echoes);
    const prompt = `核心梗概: ${premise}\n\n${contextStr}\n当前剧情大纲:\n${currentPlot}`;

    try {
        // Enable Thinking for deep analysis
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                systemInstruction: instruction,
                // The effective token limit for the response is `maxOutputTokens` minus the `thinkingBudget`.
                // We give it a healthy budget to think through logical inconsistencies.
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        return response.text || "无法分析剧情。";
    } catch (error) {
        console.error("Gemini Plot Analysis Error:", error);
        throw error;
    }
};

export const expandScene = async (premise: string, genre: string, plotOutline: string, userPrompt: string, characters: Character[], worldSettings: WorldSetting[], settings?: CreativeSettings, echoes: Echo[] = []): Promise<string> => {
    const ai = getAIClient();
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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: instruction,
                temperature: settings?.creativity || 0.9,
            }
        }));
        return response.text || "生成失败。";
    } catch (error) {
        console.error("Gemini Scene Expansion Error:", error);
        throw error;
    }
};

export const expandWorldLore = async (title: string, currentContent: string, genre: string, settings?: CreativeSettings): Promise<string> => {
    const ai = getAIClient();
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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: instruction,
                temperature: 0.85,
            }
        }));
        return response.text || "生成失败。";
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
    const ai = getAIClient();

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
        // Enable Thinking for complex plotting
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Stronger model for structural logic
            contents: prompt,
            config: {
                systemInstruction: instruction,
                thinkingConfig: { thinkingBudget: 4096 }, // Plot generation needs deep thought
                temperature: settings?.creativity || 0.85,
                responseMimeType: "application/json",
            }
        }));

        const result = safeParseAiJson(response.text, AiPlotNodeArraySchema, "Plot Generation");
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
    const ai = getAIClient();
    const contextStr = formatContext(characters, worldSettings, echoes);

    const instruction = getInstructionWithSettings('plot_weaving', settings); // Re-use weaving for rewrite context

    const prompt = `
    小说类型: ${genre}
    
    ${contextStr}
    
    当前剧情大纲:
    ${currentPlot}
    
    【修改指令】:
    ${directive}
    
    请根据以上修改指令，重新输出一份完整的、优化后的剧情大纲。保留原大纲中优秀的部分，修正问题或调整方向。
    
    **重要输出格式要求**：
    你必须返回一个符合以下 JSON 结构的数组：
    [
      { "title": "情节标题", "content": "该情节点的详细描述..." },
      ...
    ]
    禁止包含任何开场白或解释文字。
    `;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                systemInstruction: instruction,
                temperature: settings?.creativity || 0.85,
                responseMimeType: "application/json",
            }
        }));

        const result = safeParseAiJson(response.text, AiPlotNodeArraySchema, "Plot Rewrite");
        return result || [];
    } catch (e) {
        console.error("Gemini Plot Rewrite Error:", e);
        throw e;
    }
};

export const batchGenerateCharacters = async (premise: string, genre: string, settings?: CreativeSettings): Promise<Omit<Character, 'id'>[]> => {
    const ai = getAIClient();

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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: characterSchema
            }
        }));

        const parsed = safeParseAiJson(response.text, AiCharacterArraySchema, 'batchGenerateCharacters');
        return parsed ?? [];
    } catch (e) {
        console.error("Batch Character Generation Error", e);
        throw e;
    }
};

export const batchGenerateWorldSettingsByCategory = async (premise: string, genre: string, category: string, settings?: CreativeSettings): Promise<Omit<WorldSetting, 'id'>[]> => {
    const ai = getAIClient();

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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: worldSchema
            }
        }));

        const parsed = safeParseAiJson(response.text, AiWorldSettingArraySchema, 'batchGenerateWorldSettings');
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
    targetWordCount: number = 3000 // NEW: Target Word Count
): Promise<string> => {
    const ai = getAIClient();

    let pacingInstruction = "";
    switch (pacing) {
        case 'SLOW_BURN':
            pacingInstruction = `【节奏控制: 铺垫/慢热 (Slow Burn)】
            - 请放慢叙事节奏，大量使用环境描写、心理活动和细节刻画。
            - 句子结构可以复杂、修辞丰富。
            - 重点渲染氛围，为后续剧情蓄力。`;
            break;
        case 'CLIMAX':
            pacingInstruction = `【节奏控制: 高潮/爆发 (Climax)】
            - 请加快叙事节奏，使用短促有力的句子。
            - 减少心理活动和环境描写，专注于动作、冲突和直接反应。
            - 营造紧迫感和危机感。`;
            break;
        default:
            pacingInstruction = `【节奏控制: 平衡推进 (Balanced)】
            - 保持叙事流畅，平衡对话、动作和描写。
            - 稳步推进情节发展。`;
            break;
    }

    const instruction = getInstructionWithSettings('scene_generation', settings);

    // Build context
    let context = "";

    // Filter only accepted echoes
    const activeEchoes = echoes.filter(e => e.status === 'ACCEPTED');

    // 0. Episodic Memory (Manuscript Context)
    if (previousStoryContext) {
        context += `【📖 前情提要 (Context)】\n(以下是故事上文的最后片段，请确保剧情连贯，接续人物状态和语气)\n"${previousStoryContext}"\n\n`;
    }

    // 1. Actors
    if (activeCharacters.length > 0) {
        context += "【登场角色 (Cast)】\n";
        activeCharacters.forEach(c => {
            const charEchoes = activeEchoes.filter(e => e.targetId === c.id).sort((a, b) => a.timestamp - b.timestamp);
            context += `- ${c.name} (${c.role}): ${c.description} (关系: ${c.relationships})\n`;
            if (charEchoes.length > 0) {
                context += `  ⚡ [当前状态变更]: ${charEchoes.map(e => e.description).join('; ')}\n`;
            }
        });
        context += "\n";
    }

    // 2. Stage (Specific Location)
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

    const prompt = `
    小说类型: ${genre}
    
    ${context}
    
    【本场戏的情节目标 (Plot Beat)】:
    ${plotBeat}
    
    请根据以上要素，撰写一段约 800-1200 字的小说正文片段。
    请直接开始正文，不需要标题或概述。
    `;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview', // High quality for prose
            contents: prompt,
            config: {
                systemInstruction: instruction,
                temperature: settings?.creativity || 0.9,
                // Thinking config to allow model to plan how to integrate world settings and character arcs before writing
                thinkingConfig: { thinkingBudget: 2048 },
            }
        }));
        return response.text || "生成失败";
    } catch (e) {
        console.error("Scene Generation Error", e);
        throw e;
    }
};

// NEW: Literary Polish Engine
export type PolishMode = 'SENSORY' | 'CINEMATIC' | 'PSYCHOLOGICAL' | 'MINIMALIST';

export const polishDraft = async (
    content: string,
    mode: PolishMode,
    settings?: CreativeSettings
): Promise<string> => {
    const ai = getAIClient();

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
    }

    const instruction = getInstructionWithSettings('polish_engine', settings);

    const prompt = `
    【待润色文本】:
    ${content}
    
    请直接输出润色后的正文。
    `;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Use Pro for stylistic nuances
            contents: prompt,
            config: {
                systemInstruction: instruction,
                temperature: 0.8,
            }
        }));
        return response.text || content;
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

    const ai = getAIClient();

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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                systemInstruction: instruction,
                temperature: 0.1 // Low temp for factual extraction
            }
        }));

        {
            const raw = safeParseAiJson(response.text, AiStateChangeArraySchema, 'analyzeStateChanges');
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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Flash is fast and good at extraction
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        }));

        {
            const raw = safeParseAiJson(response.text, AiEchoArraySchema, 'extractEchoesFromText');
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

    const ai = getAIClient();
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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Flash is sufficient for summarization
            contents: prompt
        }));

        return response.text?.trim() || currentDescription;
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

    const ai = getAIClient();
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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Use Pro for complex reasoning
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.4 // Balanced creativity and logic
            }
        }));

        {
            const raw = safeParseAiJson(response.text, AiStateChangeArraySchema, 'deduceWorldConsequences');
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
    const ai = getAIClient();

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
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2
            }
        }));

        const parsed = safeParseAiJson(response.text, AiPlotRhythmArraySchema, 'analyzePlotRhythm');
        return parsed ?? [];
    } catch (e) {
        console.error("Rhythm Analysis Error", e);
        return [];
    }
};

export const chatWithPersona = async (character: Character, message: string, history: { role: string, content: string }[]): Promise<string> => {
    const ai = getAIClient();

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
            model: 'gemini-3-flash-preview',
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