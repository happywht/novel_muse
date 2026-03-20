import { Type, GenerateContentResponse } from "@google/genai";
import {
    Character, WorldSetting, CreativeSettings, Echo,
    StateChangeRecommendation
} from "../../types";
import {
    safeParseAiJson, AiCharacterArraySchema, AiWorldSettingArraySchema,
    AiEchoArraySchema, AiStateChangeArraySchema
} from "../schemas";
import {
    getAIClient, retryOperation, executeModelTask,
    getInstructionWithSettings, getModelName
} from "./core";
import { formatContext, formatEntityLookupTable } from "./helpers";
import { fetchRelatedSubgraph } from "../apiService";

/**
 * Image generation for characters
 */
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

/**
 * Batch generate core characters from premise
 */
export const batchGenerateCharacters = async (premise: string, genre: string, settings?: CreativeSettings): Promise<Omit<Character, 'id'>[]> => {
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

/**
 * Batch generate world settings by category
 */
export const batchGenerateWorldSettingsByCategory = async (premise: string, genre: string, category: string, settings?: CreativeSettings): Promise<Omit<WorldSetting, 'id'>[]> => {
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

/**
 * Expand lore for a specific world setting
 */
export const expandWorldLore = async (title: string, currentContent: string, genre: string, settings?: CreativeSettings): Promise<string> => {
    const instruction = getInstructionWithSettings('world_building', settings);

    const prompt = `
  小说类型: ${genre}
  当前设定标题: ${title}
  
  当前设定概览:
  ${currentContent}
  
  任务要求：
  请基于以上核心概览，进行深度的"设定考古"与"逻辑扩充"。要求脑洞大开但逻辑自洽，增加关于起源、内在矛盾、或其对世界产生的微妙影响等细节。
  
  请直接输出扩充后的设定内容（Markdown 格式）。`;

    try {
        return await executeModelTask(
            'expandWorldLore',
            instruction,
            prompt,
            'gemini-3-flash-preview',
            0.8
        ) || "扩充失败。";
    } catch (error) {
        console.error("Gemini Lore Expansion Error:", error);
        throw error;
    }
};

/**
 * Extract state change recommendations from scene content
 * MVP重构: 添加置信度评分、上下文增强、ID匹配优化
 */
export const analyzeStateChanges = async (
    sceneContent: string,
    activeCharacters: Character[],
    allWorldSettings: WorldSetting[],
    // MVP: 可选上下文参数
    context?: {
        recentChapterSummary?: string;      // 最近章节摘要
        unresolvedForeshadowing?: string[]; // 未解决伏笔
    }
): Promise<StateChangeRecommendation[]> => {
    if (!sceneContent || (activeCharacters.length === 0 && allWorldSettings.length === 0)) return [];

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                targetId: { type: Type.STRING, description: "The ID of the character or world setting from the lookup table" },
                targetName: { type: Type.STRING, description: "Name/Title of the entity" },
                targetType: { type: Type.STRING, description: "CHARACTER or WORLD" },
                suggestedUpdate: { type: Type.STRING, description: "Specifically what changed (e.g., 'Lost an arm', 'Village destroyed'). Keep it concise." },
                reason: { type: Type.STRING, description: "Quote from the text justifying this change." },
                // MVP: 新增置信度字段
                confidence: { type: Type.NUMBER, description: "0-1之间的置信度评分。0.9+表示非常确定，0.7-0.9表示较确定，0.5-0.7表示一般确定，低于0.5建议不提取" },
                extractionEvidence: { type: Type.STRING, description: "原文中支持此提取的具体句子（原文引用）" }
            },
            required: ["targetName", "targetType", "suggestedUpdate", "reason", "confidence"]
        }
    };

    const lookupTable = formatEntityLookupTable(activeCharacters, allWorldSettings);
    const instruction = getInstructionWithSettings('echo_analysis');

    // MVP: 构建上下文增强部分
    const contextSection = context?.recentChapterSummary
        ? `\n【前文背景（最近章节摘要）】:\n${context.recentChapterSummary}\n`
        : '';

    const foreshadowingSection = context?.unresolvedForeshadowing?.length
        ? `\n【待回收的伏笔线索】:\n${context.unresolvedForeshadowing.map(f => `- ${f}`).join('\n')}\n`
        : '';

    const prompt = `
    你是一位专业的小说设定分析师。请阅读以下小说片段，分析是否发生了对【人物状态】或【世界环境】有**永久性或重大影响**的事件。
    ${contextSection}
    ${foreshadowingSection}
    【可在以下实体中匹配】:
    ${lookupTable}

    【待分析文本】:
    ${sceneContent}

    【重大事件定义】（必须满足以下之一才提取）:
    1. 角色状态永久改变：死亡、残疾、获得/失去重要能力
    2. 获得具有剧情意义的物品：非普通道具，影响后续剧情的物品
    3. 人际关系发生质的变化：从盟友变敌人、建立新关系、关系决裂
    4. 世界规则被打破或改变：重要地点损毁、势力格局变化
    5. 秘密被揭露：影响后续剧情的重要信息

    【非重大事件】（请不要提取）:
    - 普通对话（即使包含情感交流）
    - 地点移动（除非触发了上述重大事件）
    - 临时性状态（轻微受伤但很快恢复）
    - 获得普通物品（食物、金钱、日常用品）

    【输出要求】:
    1. targetId: 必须从上述实体映射表中精确匹配ID，如果无法匹配请留空
    2. targetName: 实体名称，必须与映射表中的名称完全一致
    3. confidence: 置信度评分
       - 0.9-1.0: 非常确定，原文有明确描述
       - 0.7-0.9: 较确定，可以合理推断
       - 0.5-0.7: 一般确定，存在多种可能解释
       - <0.5: 不确定，建议不提取
    4. extractionEvidence: 原文中支持此提取的具体句子，必须引用原文

    请输出 JSON 格式。如果没有重大事件，返回空数组 []。
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

        const raw = safeParseAiJson(responseText, AiStateChangeArraySchema, 'analyzeStateChanges');
        if (!raw) return [];
        const result: StateChangeRecommendation[] = [];

        for (const item of raw) {
            // MVP: 置信度过滤 - 低于0.5的跳过
            if (item.confidence !== undefined && item.confidence < 0.5) {
                console.log(`[Echo] 跳过低置信度提取: ${item.targetName} (${item.confidence})`);
                continue;
            }

            let id = item.targetId || '';

            // MVP: 改进的ID匹配逻辑 - 精确匹配优先
            if (!id) {
                if (item.targetType === 'CHARACTER') {
                    // 优先精确匹配
                    let char = activeCharacters.find(c => c.name === item.targetName);
                    // 其次尝试包含匹配（但需要更严格）
                    if (!char) {
                        char = activeCharacters.find(c =>
                            (c.name.includes(item.targetName) && item.targetName.length >= 2) ||
                            (item.targetName.includes(c.name) && c.name.length >= 2)
                        );
                    }
                    if (char) id = char.id;
                } else if (item.targetType === 'WORLD') {
                    // 优先精确匹配
                    let setting = allWorldSettings.find(w => w.title === item.targetName);
                    // 其次尝试包含匹配
                    if (!setting) {
                        setting = allWorldSettings.find(w =>
                            (w.title.includes(item.targetName) && item.targetName.length >= 2) ||
                            (item.targetName.includes(w.title) && w.title.length >= 2)
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
                    extractionEvidence: item.extractionEvidence
                });
            }
        }
        return result;
    } catch (e) {
        console.error("State Analysis Error", e);
        return [];
    }
};

/**
 * Automatic Echo capture from generated text
 * MVP: 增加置信度评分和改进的ID匹配
 */
export const extractEchoesFromText = async (
    text: string,
    characters: Character[],
    worldSettings: WorldSetting[],
    // MVP: 新增参数 - 历史上下文
    recentEchoes: Echo[] = []
): Promise<Echo[]> => {
    if (!text || text.length < 100) return [];

    const contextStr = formatContext(characters, worldSettings, recentEchoes);
    const lookupTable = formatEntityLookupTable(characters, worldSettings);

    // MVP: 构建历史状态摘要，帮助AI判断"变化"
    const recentChangesSummary = recentEchoes
        .filter(e => e.status === 'ACCEPTED')
        .slice(-5)
        .map(e => `- ${e.targetName}: ${e.description}`)
        .join('\n');

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                targetId: { type: Type.STRING, description: "The ID of the character or world setting from the lookup table" },
                targetName: { type: Type.STRING, description: "Name of the character or world setting affected" },
                targetType: { type: Type.STRING, description: "CHARACTER or WORLD" },
                description: { type: Type.STRING, description: "What happened? (Concise, e.g., Lost left arm, Obtained the Magic Sword)" },
                reason: { type: Type.STRING, description: "Why is this significant?" },
                // MVP: new confidence field
                confidence: { type: Type.NUMBER, description: "0-1: How confident are you about this extraction? 0.9+ = very certain, 0.7-0.9 = likely, <0.7 = uncertain" },
                extractionEvidence: { type: Type.STRING, description: "The exact sentence from the text that supports this extraction" },
                triples: {
                    type: Type.ARRAY,
                    description: "Structural changes (triples) for Knowledge Graph integration",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            subject: { type: Type.STRING, description: "Short entity name" },
                            relation: { type: Type.STRING, description: "Short relation keyword" },
                            object: { type: Type.STRING, description: "Short target entity name" }
                        },
                        required: ["subject", "relation", "object"]
                    }
                }
            },
            required: ["targetName", "targetType", "description", "reason", "confidence"]
        }
    };

    // 使用buildPromptContent构建prompt，支持项目级自定义
    const basePrompt = buildPromptContent('world_echo_extraction', undefined, settings);
    const prompt = `${basePrompt}

【可在以下实体中寻找关联】:
${lookupTable}

【小说正文片段】:
${text.substring(0, 15000)} ... (截取部分)

${recentChangesSummary ? `【最近已确认的状态变化】:\n${recentChangesSummary}\n` : ''}

请输出 JSON 格式的事件及三元组列表。如果没有重大事件，返回空数组。`;

    try {
        const responseText = await executeModelTask(
            'extractEchoes',
            '',
            prompt,
            await getModelName('flash'),
            0.1,
            responseSchema
        );

        const raw = safeParseAiJson(responseText, AiEchoArraySchema, 'extractEchoesFromText');
        if (!raw) return [];
        const result: Echo[] = [];

        for (const item of raw) {
            // MVP: 置信度过滤 - 低于0.5的跳过
            if (item.confidence !== undefined && item.confidence < 0.5) {
                console.log(`[Echo] 跳过低置信度提取: ${item.targetName} (${item.confidence})`);
                continue;
            }

            let id = item.targetId || '';

            // MVP: 改进的ID匹配逻辑 - 精确匹配优先
            if (!id) {
                if (item.targetType === 'CHARACTER') {
                    // 优先精确匹配
                    let char = characters.find(c => c.name === item.targetName);
                    // 其次尝试包含匹配（但需要更严格）
                    if (!char) {
                        char = characters.find(c =>
                            (c.name.includes(item.targetName) && item.targetName.length >= 2) ||
                            (item.targetName.includes(c.name) && c.name.length >= 2)
                        );
                    }
                    if (char) id = char.id;
                } else if (item.targetType === 'WORLD') {
                    // 优先精确匹配
                    let setting = worldSettings.find(w => w.title === item.targetName);
                    // 其次尝试包含匹配
                    if (!setting) {
                        setting = worldSettings.find(w =>
                            (w.title.includes(item.targetName) && item.targetName.length >= 2) ||
                            (item.targetName.includes(w.title) && w.title.length >= 2)
                        );
                    }
                    if (setting) id = setting.id;
                }
            }

            if (id) {
                result.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    targetId: id,
                    targetName: item.targetName,
                    type: item.targetType,
                    description: item.description,
                    reason: item.reason,
                    status: item.confidence && item.confidence >= 0.85 ? 'AUTO_ACCEPTED' : 'PENDING',
                    timestamp: Date.now(),
                    triples: item.triples,
                    // MVP: 新增字段
                    confidence: item.confidence,
                    extractionEvidence: item.extractionEvidence
                });
            }
        }
        return result;
    } catch (e) {
        console.error("Auto-Echo Extraction Error", e);
        return [];
    }
};

/**
 * Consolidate recent events (Echoes) into static descriptions
 */
export const consolidateMemory = async (
    targetName: string,
    targetType: 'CHARACTER' | 'WORLD',
    currentDescription: string,
    echoesToConsolidate: Echo[]
): Promise<string> => {
    if (echoesToConsolidate.length === 0) return currentDescription;

    const echoText = echoesToConsolidate.map(e => `- ${e.description} (${new Date(e.timestamp).toLocaleDateString()})`).join('\n');

    const prompt = `
    你是一个负责维护小说世界观的"档案管理员"。
    你的任务是将【最近发生的事件】（短期记忆）永久性地整合进【实体档案描述】（长期记忆）中。

    【实体名称】: ${targetName} (${targetType === 'CHARACTER' ? '角色' : '世界设定'})
    
    【当前档案描述】:
    ${currentDescription}

    【待整合的新记忆 (Recent Events)】:
    ${echoText}

    【整合规则】:
    1. **更新状态**: 如果新记忆改变了实体的状态（如受伤、失去物品、获得能力），请在描述中体现。
    2. **丰富背景**: 将发生的事件作为"过去的历史"写入描述。
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

/**
 * Deduce world consequences based on recent echoes
 */
export const deduceWorldConsequences = async (
    projectId: string,
    branchId: string,
    recentEchoes: Echo[],
    characters: Character[],
    worldSettings: WorldSetting[],
    genre: string
): Promise<StateChangeRecommendation[]> => {
    if (recentEchoes.length === 0) return [];

    const contextStr = formatContext(characters, worldSettings, recentEchoes);
    const lookupTable = formatEntityLookupTable(characters, worldSettings);
    const triggerEchoes = recentEchoes.filter(e => e.status === 'ACCEPTED').slice(-5);
    const triggers = triggerEchoes.map(e => `- ${e.description} (${e.targetName})`).join('\n');

    if (!triggers) return [];

    // Fetch related graph subgraph context based on the triggers
    const anchors = triggerEchoes.map(e => e.targetName);
    let graphContext = "";
    if (anchors.length > 0) {
        try {
            graphContext = await fetchRelatedSubgraph(projectId, anchors, branchId);
            console.log("🦋 Butterfly Effect - Fetched Graph Context:", graphContext);
        } catch (e) {
            console.warn("Could not fetch graph context for butterfly effect", e);
        }
    }

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                targetId: { type: Type.STRING, description: "The ID of the character or world setting from the lookup table" },
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
    你的任务是基于【最近发生的事件】（Triggers）和【动态知识图谱】（Knowledge Graph），推演它们对【世界】和【人物】产生的**连锁反应**（Consequences）。

    小说类型: ${genre}

    【最近发生的事件 (Triggers)】:
    ${triggers}

    【可在以下实体中寻找受影响对象】:
    ${lookupTable}

    【推演规则】:
    1. **蝴蝶效应**: 一个小事件可能引发大变动（例如：国王遇刺 -> 继承人争夺战 -> 内战爆发）。
    2. **实体匹配**: 务必从提供的映射表中选择受影响的实体，并返回正确的 targetId。
    3. **图谱联动 (重要)**: 务必利用上方提供的【动态知识图谱】中的人物关系（仇恨、亲情、从属）或地理归属，去寻找连锁反应的导火索。
    4. **符合逻辑**: 推演必须符合世界观设定。
    5. **制造冲突**: 预测的结果应该为故事增加张力和冲突。
    6. **强制中文输出**: 你的 JSON 结果中的所有内容必须使用纯正的中文。

    请严格按照 JSON 格式输出【未来预测】。
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

        const raw = safeParseAiJson(responseText, AiStateChangeArraySchema, 'deduceWorldConsequences');
        if (!raw) return [];
        const result: StateChangeRecommendation[] = [];

        for (const item of raw) {
            let id = item.targetId || '';

            if (!id) {
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
    } catch (e) {
        console.error("World Deduction Error", e);
        return [];
    }
};

/**
 * Interactive chat with a character persona
 */
export const chatWithPersona = async (character: Character, message: string, history: { role: string, content: string }[]): Promise<string> => {
    const ai = await getAIClient();
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
        const chat = (ai as any).chats.create({
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
