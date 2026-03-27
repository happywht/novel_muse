import { GenerateContentResponse } from "@google/genai";
import {
    Character, WorldSetting, CreativeSettings, Echo, Chapter,
    PhysicalStatus, KnowledgeTriple, PolishMode, PlotNode
} from "../../types";
import { useProjectStore } from "../../store/useProjectStore";
import {
    executeModelTask,
    getInstructionWithSettings, getModelName
} from "./core";
import { formatContext, buildTieredMemory, filterRelevantSettings } from "./helpers";
import { buildGenreContext } from "../../config/genreRules";

export type PacingMode = 'SLOW_BURN' | 'BALANCED' | 'CLIMAX';

/**
 * Basic text generation with standard retry and instruction logic
 * 修复: 使用 executeModelTask 以支持高级模式拦截
 */
export const generateText = async (prompt: string, promptKey: string = 'writing_base', settings?: CreativeSettings): Promise<string> => {
    const instruction = getInstructionWithSettings(promptKey, settings);

    try {
        return await executeModelTask(
            'generateText',
            instruction,
            prompt,
            'gemini-3-flash-preview',
            settings?.creativity || 0.8
        ) || "未生成任何内容。";
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
    activeSettings: WorldSetting[],
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
                pacingInstruction = "【节奏控制: 心理拉扯/慢热】重点在于角色博弈、对峙和期待感经营。切忌流水账式的环境描写，应以暗流涌动的互动为主。";
                break;
            case 'CLIMAX':
                pacingInstruction = "【节奏控制: 热血爆发/高潮】进入高强度反转或冲突爆发，全动作与对话驱动，营造极致爽感。绝不拖泥带水。";
                break;
            default:
                pacingInstruction = "【节奏控制: 稳定爽快】稳步推进主线冲突，信息密度要高。";
                break;
        }
    } else {
        switch (pacing) {
            case 'SLOW_BURN':
                pacingInstruction = "【节奏控制: 铺垫/慢热】侧重人物心理活动、细微的神态刻画，通过白描建立情绪铺垫，而非生硬地堆砌景物。";
                break;
            case 'CLIMAX':
                pacingInstruction = "【节奏控制: 高潮/爆发】短促有力的句子，专注动作、直接反应与核心冲突。";
                break;
            default:
                pacingInstruction = "【节奏控制: 平衡推进】保持叙事流畅，自然地交织对话、动作与心理活动。";
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

    if (activeSettings && activeSettings.length > 0) {
        context += `【当前锚定世界设定/场景 (Active Settings)】\n`;
        activeSettings.forEach(setting => {
            const locEchoes = activeEchoes.filter(e => e.targetId === setting.id).sort((a, b) => a.timestamp - b.timestamp);
            context += `- [${setting.category}] ${setting.title}: ${setting.content}\n`;
            if (locEchoes.length > 0) {
                context += `  ⚡ [环境/设定变更]: ${locEchoes.map(e => e.description).join('; ')}\n`;
            }
        });
        context += "\n";
    }

    const otherSettings = allWorldSettings.filter(w => !activeSettings || !activeSettings.find(s => s.id === w.id));
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

    const genreContext = buildGenreContext(genre);
    const prompt = `
    小说类型: ${genre}
    
    ${genreContext}
    
    ${context}

    ${twistHook ? `【⚠️ 剧情反转指令 (Twist Hook)】: \n${twistHook}\n` : ''}
    
    【本场戏的情节目标 (Plot Beat)】:
    ${plotBeat}
    
    请根据以上要素，撰写一段约 ${targetWordCount} 字的小说正文片段。
    
    【🚨 质量与网文调性红线（绝对禁止）】：
    1. **拒绝套路化开局**：绝对不要以"天气、风景、光线"（如"云梦泽的雾浓得化不开"、"阳光透过树叶的缝隙"）作为本段正文的开头。请**直接以人物的动作、核心冲突或极具张力的台词切入**！
    2. **拒绝好莱坞式说教结尾**：绝对不要在片段末尾加上类似"而这，只是一个开始"、"这将是属于他的时代"、"命运的齿轮开始转动"等假大空的总结性/史诗感旁白。
    
    【🚨 章节结尾强制约束】：
    3. **必须完成情节目标**：本章结尾必须**完成上面"情节目标(Plot Beat)"中规定的核心任务**，不能偏离或跳过。如果情节目标是"林远说服芈岚结盟"，结尾必须是结盟成功或明确失败，不能悬而未决。
    4. **关联下一章**：在完成本章情节目标的前提下，可以在结尾处**自然地引出下一章的悬念**，但必须确保本章的目标是完成的。严禁为了悬念而牺牲本章完整性。
    
    【指令】：
    请务必拓展真实的互动细节和动作，撑起框架，使真实情节密度支撑起字数要求。直接开始正文，不要输出任何标题、概述或解释文字。
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
            modeInstruction = "任务：【五感增强】。请扫描文本，在只有视觉描写的地方，强制植入嗅觉、听觉、触觉甚至味觉的细节。让读者能'闻到'和'摸到'场景。";
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
        case 'ANTI_DETECT':
            modeInstruction = `任务：【反AI检测改写】。在保持剧情不变的前提下，降低AI生成可检测性。

改写手法（附正例）：
1. 打破句式规律：连续短句 → 长短交替，句式不可预测
2. 口语化替代：✗"然而事情并没有那么简单" → ✓"哪有那么便宜的事"
3. 减少"了"字密度：✗"他走了过去，拿了杯子" → ✓"他走过去，端起杯子"
4. 转折词降频：✗"虽然…但是…" → ✓ 用角色内心吐槽或直接动作切换
5. 情绪外化：✗"他感到愤怒" → ✓"他捏碎了茶杯，滚烫的茶水流过指缝"
6. 删掉叙述者结论：✗"这一刻他终于明白了力量" → ✓ 只写行动，让读者自己感受
7. 群像反应具体化：✗"全场震惊" → ✓"老陈的烟掉在裤子上，烫得他跳起来"
8. 段落长度差异化：不再等长段落，有的段只有一句话，有的段七八行
9. 消灭"不禁""仿佛""宛如"等AI标记词：换成具体感官描写`;
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
            settings?.creativity || 0.8
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
    1. 请严格按照用户的指令，**仅**对"需要你重写的原文"进行重造/润色/扩写/精简。
    2. 生成结果必须能在语义和语境上与 [前文] 和 [后文] 完美、无缝地拼接在一起。
    3. **极其重要**：直接输出重写后的纯文本素材！绝对不要包含任何 Markdown 格式包裹（如 \`\`\` 或 ** 等），绝对不要自作主张添加"这段话已经重写完毕："或"以下是..."等废话引导语。你的输出将被程序直接插入原文替换原有片段。
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
4. 语言要客观、利索，作为后续写作的"中期记忆"参考。

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
 * AI Enhanced Chapter Balance Suggestions
 * Uses Gemini to provide intelligent analysis of chapter balance
 */
export const generateAIBalanceSuggestions = async (
    chapters: Chapter[],
    characters: Character[],
    plotNodes: PlotNode[],
    settings?: CreativeSettings
): Promise<string> => {
    const chapterInfo = chapters.map(ch => ({
        title: ch.title,
        wordCount: ch.content?.length || 0,
        pov: ch.expectedPOV || '未知',
        summary: ch.summary || '暂无摘要'
    }));
    
    const characterNames = characters.map(c => c.name).join(', ');
    const plotBeatCount = plotNodes.length;
    
    const prompt = `
你是一位资深的小说编辑和结构顾问，擅长分析小说章节结构的平衡性。

请分析以下小说的章节结构，并提供专业的优化建议：

## 章节数据
${JSON.stringify(chapterInfo, null, 2)}

## 角色列表
${characterNames}

## 情节节点数
${plotBeatCount}

## 分析要求
请从以下维度提供专业建议：

1. **字数平衡**：哪些章节过长或过短？应该如何调整？

2. **节奏控制**：章节的叙事节奏是否合理？是否有需要增加冲突或缓冲的地方？

3. **角色出场**：主要角色的出场频率是否均衡？哪些角色出场过多或过少？

4. **POV视角**：视角人物的分配是否合理？是否需要调整POV轮换模式？

5. **结构优化**：基于情节节点，章节的拆分或合并建议。

## 输出格式
请用清晰的结构输出分析，包括：
- 总体评价（0-100分）
- 主要问题（如有）
- 具体优化建议（按优先级排序）
- 预期改进效果

请直接输出分析结果，不要包含任何额外的解释或说明。
    `;

    try {
        const responseText = await executeModelTask(
            'generateAIBalanceSuggestions',
            '',
            prompt,
            await getModelName('pro'),
            settings?.creativity || 0.7
        );
        return responseText.trim();
    } catch (error) {
        console.error("Failed to generate AI balance suggestions:", error);
        return "AI平衡分析生成失败。";
    }
};
