import { Type } from "@google/genai";
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
import { formatContext } from "./helpers";

/**
 * Image generation for characters
 */
export const generateCharacterImage = async (description: string): Promise<string> => {
    const ai = await getAIClient();
    const prompt = `Digital concept art, detailed character design, cinematic lighting, 4k, trending on artstation. Character description: ${description}`;

    try {
        const response: any = await retryOperation(() => (ai as any).models.generateContent({
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
  请基于以上核心概览，进行深度的“设定考古”与“逻辑扩充”。要求脑洞大开但逻辑自洽，增加关于起源、内在矛盾、或其对世界产生的微妙影响等细节。
  
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
 */
export const analyzeStateChanges = async (
    sceneContent: string,
    activeCharacters: Character[],
    allWorldSettings: WorldSetting[]
): Promise<StateChangeRecommendation[]> => {
    if (!sceneContent || (activeCharacters.length === 0 && allWorldSettings.length === 0)) return [];

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

        const raw = safeParseAiJson(responseText, AiStateChangeArraySchema, 'analyzeStateChanges');
        if (!raw) return [];
        const result: StateChangeRecommendation[] = [];

        for (const item of raw) {
            let id = '';
            if (item.targetType === 'CHARACTER') {
                const char = activeCharacters.find(c => c.name.includes(item.targetName) || item.targetName.includes(c.name));
                if (char) id = char.id;
            } else if (item.targetType === 'WORLD') {
                let setting = allWorldSettings.find(w => w.title === item.targetName);
                if (!setting) {
                    setting = allWorldSettings.find(w => w.title.includes(item.targetName) || item.targetName.includes(w.title));
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
    } catch (e) {
        console.error("State Analysis Error", e);
        return [];
    }
};

/**
 * Automatic Echo capture from generated text
 */
export const extractEchoesFromText = async (
    text: string,
    characters: Character[],
    worldSettings: WorldSetting[]
): Promise<Echo[]> => {
    if (!text || text.length < 100) return [];

    const contextStr = formatContext(characters, worldSettings, []);

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                targetName: { type: Type.STRING, description: "Name of the character or world setting affected" },
                targetType: { type: Type.STRING, description: "CHARACTER or WORLD" },
                description: { type: Type.STRING, description: "What happened? (Concise, e.g., 'Lost left arm', 'Obtained the Magic Sword')" },
                reason: { type: Type.STRING, description: "Why is this significant?" },
                triples: {
                    type: Type.ARRAY,
                    description: "Structural changes (triples) for Knowledge Graph integration",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            subject: { type: Type.STRING, description: "Short entity name" },
                            relation: { type: Type.STRING, description: "Short relation keyword (e.g., '位于', '持有', '仇恨', '爱')" },
                            object: { type: Type.STRING, description: "Short target entity name" }
                        },
                        required: ["subject", "relation", "object"]
                    }
                }
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
    4. **结构化三元组 (Triples)**: 对于每一个重大变更，尝试将其进一步拆解为“主体-关系-客体”的结构化三元组，以便后续存入知识图谱。例如：“林青在京城遭遇伏击” -> \`[{"subject": "林青", "relation": "位于", "object": "京城"}]\`。

    请输出 JSON 格式的事件及三元组列表。如果没有重大事件，返回空数组。
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
                    status: 'PENDING',
                    timestamp: Date.now(),
                    triples: item.triples
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

/**
 * Deduce world consequences based on recent echoes
 */
export const deduceWorldConsequences = async (
    recentEchoes: Echo[],
    characters: Character[],
    worldSettings: WorldSetting[],
    genre: string
): Promise<StateChangeRecommendation[]> => {
    if (recentEchoes.length === 0) return [];

    const contextStr = formatContext(characters, worldSettings, recentEchoes);
    const triggers = recentEchoes
        .filter(e => e.status === 'ACCEPTED')
        .slice(-5)
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
