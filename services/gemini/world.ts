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
import { buildPromptContent } from "../../config/prompts";
import { fetchRelatedSubgraph } from "../apiService";
import { getDisplayRelationships } from "../../utils/characterRelations";

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
 * 升级: 支持结构化关系数据，实现双写兼容
 */
export const batchGenerateCharacters = async (premise: string, genre: string, settings?: CreativeSettings): Promise<Omit<Character, 'id'>[]> => {
    // 升级: Schema中添加结构化关系字段
    const characterSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING, description: "One of: 主角, 反派, 导师, 伙伴, 守护者, 变形者, 捣蛋鬼, 信使" },
                archetype: { type: Type.STRING, description: "角色原型，如：英雄、智者、捣蛋鬼、变形者、守护者、信使" },
                description: { type: Type.STRING, description: "详细的人物小传。必须包含：外貌、性格、明确的欲望和恐惧、秘密、标志性特征(Signature)、道德阵营(Alignment)。" },
                // 新增: 角色深度字段
                alignment: { type: Type.STRING, description: "道德阵营（如：守序善良、混乱邪恶、中立善良等）" },
                desire: { type: Type.STRING, description: "核心欲望：角色最想得到什么？" },
                fear: { type: Type.STRING, description: "核心恐惧：角色最害怕什么？" },
                signature: { type: Type.STRING, description: "标志性特征：让读者记住这个角色的特点" },
                contrast: { type: Type.STRING, description: "反差萌点：角色表里不一的地方" },
                weakness: { type: Type.STRING, description: "弱点/缺陷：角色的致命缺陷" },
                // 关系字段 - 双格式
                relationships: { type: Type.STRING, description: "与其他角色的关系概述（简短描述）" },
                structuredRelations: {
                    type: Type.ARRAY,
                    description: "结构化关系列表",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            targetName: { type: Type.STRING, description: "目标角色名称（必须是本次生成的其他角色之一）" },
                            type: { type: Type.STRING, description: "关系类型: ENEMY_OF(敌对), ALLY_OF(盟友), LOVES(爱慕), KIN_OF(亲属), MENTORS(师徒), RIVAL_OF(竞争), SERVES(效忠), FRIEND_OF(朋友)" },
                            description: { type: Type.STRING, description: "关系详细描述" }
                        },
                        required: ["targetName", "type"]
                    }
                }
            },
            required: ["name", "role", "archetype", "description"]
        }
    };

    // 使用正确的system instruction
    const instruction = getInstructionWithSettings('character_gen', settings);
    const settingText = settings ? `风格要求：基调 ${settings.tone}，风格 ${settings.style}。` : "";

    const prompt = `基于小说梗概："${premise}" (类型: ${genre})，请设计 **7位** 核心角色。${settingText}

请严格按照以下角色配置，构建一个功能完整的角色阵容：
1. **1位 主角 (Protagonist)**：故事的核心驱动者，必须有明确的欲望和恐惧。
2. **1位 反派 (Antagonist)**：与主角对立的主要力量，动机必须合理且令人信服。
3. **1位 导师 (Mentor)** 或 **伙伴 (Ally)**：提供指导或支持的关键人物。
4. **4位 功能性角色**：从 [守护者(Guardian), 变形者(Shapeshifter), 捣蛋鬼(Trickster), 信使(Herald)] 中选择，确保角色类型的多样性。

【核心要求】：
- **角色关联**: 确保这七个人物之间存在复杂的人际纠葛。每个角色至少与2个其他角色有关系。
- **深度刻画**: 每个人物都必须有：
  - 明确的欲望 (desire)
  - 核心恐惧 (fear)
  - 标志性特征 (signature)
  - 道德阵营 (alignment: 守序善良/混乱邪恶等)
  - 弱点/缺陷 (weakness)
- **关系结构化**: structuredRelations 必须准确填写，targetName 必须是本次生成的其他角色名之一
- **archetype字段**: 必须填写，使用上述角色原型之一。
- 请使用中文输出。`;

    try {
        console.log('【batchGenerateCharacters】开始调用AI，prompt:', prompt);
        const responseText = await executeModelTask(
            'batchGenerateCharacters',
            instruction,  // 修复: 使用正确的system instruction
            prompt,
            'gemini-3-flash-preview',
            0.6,  // 修复: 降低temperature提高一致性
            characterSchema
        );
        console.log('【batchGenerateCharacters】AI原始响应:', responseText);

        if (!responseText) {
            console.error('【batchGenerateCharacters】错误：AI返回空响应');
            throw new Error('AI返回空响应');
        }

        const parsed = safeParseAiJson(responseText, AiCharacterArraySchema, 'batchGenerateCharacters');
        console.log('【batchGenerateCharacters】解析结果:', parsed);

        if (!parsed) {
            console.error('【batchGenerateCharacters】警告：解析失败，返回null');
            throw new Error('角色数据解析失败，请重试');
        } else if (parsed.length === 0) {
            console.warn('【batchGenerateCharacters】警告：解析成功但返回空数组');
            throw new Error('AI未返回任何角色，请重试');
        } else if (parsed.length < 5) {
            console.warn(`【batchGenerateCharacters】警告：期望7个角色，实际只生成${parsed.length}个`);
        }

        console.log('【batchGenerateCharacters】成功：解析到', parsed.length, '个角色');
        return parsed;
    } catch (e) {
        console.error("【batchGenerateCharacters】捕获到异常:", e);
        throw e;
    }
};

/**
 * 分类差异化的世界观生成指导
 */
const WORLD_CATEGORY_GUIDANCE: Record<string, string> = {
    'Geography': `
【地理地貌类设定指导】:
- 重点关注：地理位置、地貌特征、气候环境、自然资源
- 必须包含：该地理特征对文明/势力分布的影响
- 叙事钩子：可探索的秘境、危险的禁区、战略要地
- 示例方向：悬浮大陆、地下迷宫城市、永冻荒原、活火山群`,

    'Magic/Tech': `
【魔法/科技类设定指导】:
- 重点关注：能力体系的规则、使用代价、等级划分
- 必须包含：该能力对社会的改变、获取/学习方式
- 叙事钩子：禁忌技术、失落的魔法、代价与副作用
- 示例方向：元素魔法系统、蒸汽朋克机械、基因改造技术`,

    'Society': `
【社会人文类设定指导】:
- 重点关注：社会阶层、权力结构、文化习俗、宗教信仰
- 必须包含：社会矛盾、压迫/反抗的根源
- 叙事钩子：地下反抗组织、贵族阴谋、禁忌的节日
- 示例方向：种姓制度、商业帝国、秘密结社`,

    'History': `
【历史传说类设定指导】:
- 重点关注：关键历史事件、神话传说、英雄/反派人物
- 必须包含：历史对当下的深远影响
- 叙事钩子：被掩盖的真相、失落的文明、预言与诅咒
- 示例方向：诸神黄昏、王朝覆灭、创世神话`,

    'Other': `
【其他设定指导】:
- 重点关注：未分类但重要的世界元素
- 可包含：特殊物品、独特生物、神秘现象
- 叙事钩子：必须与主线剧情产生关联
- 示例方向：神器的传说、变异生物、时空裂缝`
};

/**
 * Batch generate world settings by category
 * 修复: 使用正确的system instruction、分类差异化prompt、降低temperature
 */
export const batchGenerateWorldSettingsByCategory = async (
    premise: string,
    genre: string,
    category: WorldSetting['category'],
    count: number = 3,
    settings?: CreativeSettings
): Promise<Omit<WorldSetting, 'id'>[]> => {
    const worldSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "设定标题，简洁有力" },
                content: { type: Type.STRING, description: "详细的设定描述，包含内在矛盾或叙事钩子" }
            },
            required: ["title", "content"]
        }
    };

    // 修复: 使用正确的system instruction
    const instruction = getInstructionWithSettings('world_gen', settings);
    const settingText = settings ? `风格要求：基调 ${settings.tone}，风格 ${settings.style}。` : "";

    // 修复: 使用分类差异化的指导
    const categoryGuidance = WORLD_CATEGORY_GUIDANCE[category] || WORLD_CATEGORY_GUIDANCE['Other'];

    const prompt = `基于小说梗概："${premise}" (类型: ${genre})。
请为世界观分类 **"${category}"** 构思 **${count}个** 关键设定条目。

${categoryGuidance}

${settingText}

【通用要求】:
- 设定必须独特且符合小说类型。
- 每个设定必须包含内在矛盾或叙事钩子。
- 能够为剧情提供冲突或背景支持。
- 请使用中文输出。`;

    try {
        console.log(`【batchGenerateWorldSettingsByCategory】开始生成 ${category} 类设定`);
        const responseText = await executeModelTask(
            'batchGenerateSettings',
            instruction,  // 修复: 使用正确的system instruction
            prompt,
            'gemini-3-flash-preview',
            0.5,  // 修复: 降低temperature提高一致性
            worldSchema
        );

        if (!responseText) {
            console.error(`【batchGenerateWorldSettingsByCategory】${category}: AI返回空响应`);
            throw new Error(`${category}类设定生成失败：AI返回空响应`);
        }

        const parsed = safeParseAiJson(responseText, AiWorldSettingArraySchema, 'batchGenerateWorldSettings');

        if (!parsed || parsed.length === 0) {
            console.error(`【batchGenerateWorldSettingsByCategory】${category}: 解析失败或返回空`);
            throw new Error(`${category}类设定生成失败：数据解析错误`);
        }

        console.log(`【batchGenerateWorldSettingsByCategory】${category}: 成功生成${parsed.length}个设定`);

        return parsed.map(item => ({
            title: item.title,
            content: item.content,
            category: category
        }));
    } catch (e) {
        console.error(`【batchGenerateWorldSettingsByCategory】${category} 捕获异常:`, e);
        throw e;  // 修复: 向上抛出异常而非静默返回空数组
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
    recentEchoes: Echo[] = [],
    // 新增: 创意设置（用于prompt构建）
    settings?: CreativeSettings
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
    const displayRels = getDisplayRelationships(character.structuredRelations) || character.relationships || '';
    const systemInstruction = `
    你现在必须完全扮演以下角色进行对话。不要暴露你是AI。

    【角色档案】
    姓名: ${character.name}
    身份: ${character.role}
    性格与描述: ${character.description}
    人际关系: ${displayRels}

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

/**
 * Generate a single character with full depth fields
 * Reuses the same schema as batchGenerateCharacters but single character output
 */
export const generateSingleCharacter = async (
    name: string,
    role: string,
    premise: string,
    genre: string,
    settings?: CreativeSettings
): Promise<Omit<Character, 'id'>> {
    // 复用 batchGenerateCharacters 的 Schema，但生成单个角色
    const characterSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING, description: "One of: 主角, 反派, 导师, 伙伴, 守护者, 变形者, 捣蛋鬼, 信使" },
            archetype: { type: Type.STRING, description: "角色原型，如：英雄、智者/捣蛋鬼/变形者/守护者/信使" },
            description: { type: Type.STRING, description: "详细的人物小传。必须包含:外貌、性格、明确的欲望和恐惧、秘密、标志性特征(Signature)、道德阵营(Alignment)。" },
            // 角色深度字段
            alignment: { type: Type.STRING, description: "道德阵营(如:守序善良、混乱邪恶、中立善良等)" },
            desire: { type: Type.STRING, description: "核心欲望:角色最想得到什么?" },
            fear: { type: Type.STRING, description: "核心恐惧:角色最害怕什么?" },
            signature: { type: Type.STRING, description: "标志性特征:让读者记住这个角色的特点" },
            contrast: { type: Type.STRING, description: "反差萌点:角色表里不一的地方" },
            weakness: { type: Type.STRING, description: "弱点/缺陷:角色的致命缺陷" },
            // 关系字段 - 单个角色不需要结构化关系
            relationships: { type: Type.STRING, description: "与其他角色的关系概述(简短描述)" },
        },
        required: ["name", "role", "archetype", "description"]
    };

    const instruction = getInstructionWithSettings('character_gen', settings);
    const settingText = settings ? `风格要求:基调 ${settings.tone}，风格 ${settings.style}。` : "";

    const prompt = `为小说"${premise}"(类型: ${genre})创建一个详细的角色档案。

角色名称: "${name}"
角色定位: ${role}

请包含:外貌特征、 核心性格(道德阵营)、 动机与目标(欲望与恐惧). 秘密与缺陷、 能力。
${settingText}

【核心要求】:
- 深度刻画: 必须有明确的欲望 (desire)、 核心恐惧 (fear). 标志性特征 (signature). 弱点/缺陷 (weakness)
- 道德阵营 (alignment): 守序善良/混乱邪恶等
- 请使用中文输出。`;

    try {
        console.log('[generateSingleCharacter] 开始生成角色:', name);
        const responseText = await executeModelTask(
            'generateSingleCharacter',
            instruction,
            prompt,
            'gemini-3-flash-preview',
            0.6,
            characterSchema
        );
        console.log('[generateSingleCharacter] AI原始响应:', responseText);

        if (!responseText) {
            console.error('[generateSingleCharacter] 错误: AI返回空响应');
            throw new Error('AI返回空响应');
        }

        const parsed = safeParseAiJson(responseText, AiCharacterSchema, 'generateSingleCharacter');
        console.log('[generateSingleCharacter] 解析结果:', parsed);

        if (!parsed) {
            console.error('[generateSingleCharacter] 警告: 解析失败, 返回null');
            return null;
        }

        console.log('[generateSingleCharacter] 成功生成角色:', parsed.name);
        return parsed;
    } catch (e) {
        console.error('[generateSingleCharacter] 捕获到异常:', e);
        throw e;
    }
};
