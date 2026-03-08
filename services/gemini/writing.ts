import { GenerateContentResponse } from "@google/genai";
import {
    Character, WorldSetting, CreativeSettings, Echo, Chapter,
    PhysicalStatus, KnowledgeTriple, PolishMode
} from "../../types";
import { useProjectStore } from "../../store/useProjectStore";
import {
    getAIClient, retryOperation, executeModelTask,
    getInstructionWithSettings, getModelName
} from "./core";
import { formatContext, buildTieredMemory, filterRelevantSettings } from "./helpers";

export type PacingMode = 'SLOW_BURN' | 'BALANCED' | 'CLIMAX';

/**
 * Basic text generation with standard retry and instruction logic
 */
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
        return (response as any).text || "未生成任何内容。";
    } catch (error) {
        console.error("Gemini Text Generation Error:", error);
        throw error;
    }
};

/**
 * Full scene generation with ingredient-based context building
 */
export const generateSceneFromIngredients = async (
    genre: string,
    plotBeat: string,
    activeCharacters: Character[],
    activeLocation: WorldSetting | null,
    allWorldSettings: WorldSetting[],
    settings?: CreativeSettings,
    previousStoryContext?: string,
    pacing: PacingMode = 'BALANCED',
    echoes: Echo[] = [],
    targetWordCount: number = 3000,
    povName?: string,
    rollingSummary?: string,
    activeChapterId?: string,
    twistHook?: string,
    graphContext?: string,
    physicalStatus: PhysicalStatus[] = [],
    unresolvedForeshadowing: KnowledgeTriple[] = []
): Promise<string> => {
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
                pacingInstruction = "【节奏控制: 平衡推进】保持叙事流畅，平衡对话、动作 and 描写。";
                break;
        }
    }

    const instruction = getInstructionWithSettings('scene_generation', settings);

    // Build context
    let context = "";
    if (rollingSummary) {
        context += `【📚 全局故事脉络 (Global Story Arc)】\n(以下是目前为止整部小说的情节摘要，请确保当前创作符合整体走向，并注意前后呼应)\n${rollingSummary}\n\n`;
    }

    const activeEchoes = echoes.filter(e => e.status === 'ACCEPTED');
    const { project } = useProjectStore.getState();
    const currentChapter = activeChapterId ? project.chapters.find(c => c.id === activeChapterId) : null;
    const currentOrder = currentChapter ? currentChapter.order : (project.chapters.length > 0 ? Math.max(...project.chapters.map(c => c.order)) + 1 : 1);

    const tieredContext = buildTieredMemory(
        project.chapters,
        currentOrder,
        project.plotOutline || "",
        activeCharacters,
        allWorldSettings,
        activeEchoes,
        graphContext
    );
    context += tieredContext;

    if (physicalStatus && physicalStatus.length > 0) {
        context += `【🔒 逻辑锚点: 角色目前状态 (Logic Anchors)】\n`;
        context += `注意：以下事实由系统图谱强制提供，如有冲突必须以下文为准，严禁无交代瞬移或复活：\n`;
        physicalStatus.forEach(ps => {
            const statusStr = ps.isDead ? '已死亡' : `${ps.state}`;
            context += `- [${ps.name}]: 目前位于 [${ps.location}]，生理/精神状态：[${statusStr}]\n`;
        });
        context += `\n`;
    }

    if (unresolvedForeshadowing && unresolvedForeshadowing.length > 0) {
        context += `【🎭 契诃夫之枪: 未回收的伏笔 (Chekhov's Gun)】\n`;
        context += `注意：以下是之前章节埋下的悬念或钩子，请尽量在本次创作中推进、提及或回收（填坑）：\n`;
        unresolvedForeshadowing.forEach(uf => {
            context += `- [${uf.subject}] ${uf.relation} [${uf.object}]\n`;
        });
        context += `\n`;
    }

    if (activeLocation) {
        const locEchoes = activeEchoes.filter(e => e.targetId === activeLocation.id).sort((a, b) => a.timestamp - b.timestamp);
        context += `【当前场景地点 (Stage)】\n[${activeLocation.category}] ${activeLocation.title}: ${activeLocation.content}\n`;
        if (locEchoes.length > 0) {
            context += `⚡ [环境变更]: ${locEchoes.map(e => e.description).join('; ')}\n`;
        }
        context += "\n";
    }

    const otherSettings = allWorldSettings.filter(w => !activeLocation || w.id !== activeLocation.id);
    const queryContextForRAG = `${plotBeat} ${previousStoryContext || ''} ${activeCharacters.map(c => c.name).join(' ')}`;
    const relevantSettings = filterRelevantSettings(otherSettings, queryContextForRAG, 20);

    if (relevantSettings.length > 0) {
        context += "【世界观法则与背景 (World Context)】\n";
        context += "*请在写作时参考以下规则，确保逻辑自洽：*\n";
        const categories = Array.from(new Set(relevantSettings.map(w => w.category)));
        categories.forEach(cat => {
            const items = relevantSettings.filter(w => w.category === cat);
            if (items.length > 0) {
                context += `[${cat}]:\n`;
                items.forEach(w => context += `  - ${w.title}: ${w.content.slice(0, 1000)}${w.content.length > 1000 ? '...' : ''}\n`);
            }
        });
        context += "\n";
    }

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
            'gemini-3-flash-preview',
            settings?.creativity || 0.9,
            undefined,
            2048
        ) || "生成失败";
    } catch (e) {
        console.error("Scene Generation Error", e);
        throw e;
    }
};

/**
 * Expand scene from a premise and plot outline
 */
export const expandScene = async (
    premise: string,
    genre: string,
    plotOutline: string,
    userPrompt: string,
    characters: Character[],
    worldSettings: WorldSetting[],
    settings?: CreativeSettings,
    echoes: Echo[] = []
): Promise<string> => {
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

/**
 * Polish draft in various modes (Sensory, Cinematic, etc.)
 */
export const polishDraft = async (
    content: string,
    mode: PolishMode,
    settings?: CreativeSettings
): Promise<string> => {
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
    【指令】: ${modeInstruction}
    
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

/**
 * Localized Text Rewrite
 */
export const rewriteLocalText = async (
    genre: string,
    selectedText: string,
    contextBefore: string,
    contextAfter: string,
    instruction: string,
    settings?: CreativeSettings
): Promise<string> => {
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
        const responseText = await executeModelTask(
            'rewriteLocalText',
            sysInstruction,
            prompt,
            await getModelName('flash'),
            settings?.creativity || 0.7
        );

        let newText = responseText.trim();
        newText = newText.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
        return newText;
    } catch (e) {
        console.error("Local rewrite failed:", e);
        throw e;
    }
};

/**
 * Chapter Summarization
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
