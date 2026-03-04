import { Character, WorldSetting, CreativeSettings, Echo } from '../types';

export enum Provider {
    GLM = 'GLM',
    GEMINI = 'GEMINI',
}

export type LLMTaskType =
    | 'analyzePlot'
    | 'batchGenerateSettings'
    | 'analyzeStateChanges'
    | 'batchGenerateCharacters'
    | 'generatePlot'
    | 'rewritePlot'
    | 'expandScene'
    | 'expandLore'
    | 'polishDraft'
    | 'generateText'
    | 'deduceWorldConsequences'
    | 'splitPlotNodeIntoChapters'
    | 'auditChapterPlan'
    | 'regenerateChapterOutline'
    | 'extractEchoes'
    | 'analyzePlotRhythm';

// A strict rule-based router based on the MAS report
export const getProviderForTask = (task: LLMTaskType): Provider => {
    switch (task) {
        case 'analyzePlot':                     // 剧情大纲结构初审
        case 'batchGenerateSettings':           // 宏大背景构建
        case 'analyzeStateChanges':             // 状态提取 (长上下文)
        case 'deduceWorldConsequences':         // 全局推演
        case 'auditChapterPlan':                // 严谨逻辑审计
        case 'extractEchoes':                   // 设定维护/实体追踪
            return Provider.GEMINI;

        // GLM-5: Structured JSON output, tool/planning logic
        case 'batchGenerateCharacters':         // 角色小传批量生成 (JSON)
        case 'generatePlot':                    // 严格大纲节点拆分 (JSON)
        case 'rewritePlot':                     // 大纲改写 (JSON)
        case 'splitPlotNodeIntoChapters':       // 章节拆分 (高难度 JSON)
        case 'regenerateChapterOutline':        // 章节重写 (高难度 JSON)
            return Provider.GLM;

        // Gemini 3 Flash: High speed, low cost execution & creativity
        case 'expandScene':                     // 基础正文扩写
        case 'expandLore':                      // 世界观词条润色
        case 'polishDraft':                     // 片段润色
        case 'generateText':                    // 基础对话生成
        case 'analyzePlotRhythm':               // 简单的节奏张力提取 (Flash可胜任)
            return Provider.GEMINI;

        default:
            return Provider.GEMINI;
    }
};

export const getApiKey = (provider: Provider): string => {
    switch (provider) {
        case Provider.GLM:
            return process.env.GLM_API_KEY || '';
        case Provider.GEMINI:
            return localStorage.getItem('muse_gemini_api_key') || process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    }
    return '';
};
