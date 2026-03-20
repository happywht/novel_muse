/**
 * Zod Schemas for AI Output Validation
 * 
 * This file defines strict schemas for all structured AI outputs.
 * Every JSON.parse() in geminiService.ts MUST go through safeParseAiJson()
 * to ensure graceful degradation when AI produces malformed data.
 */

import { z } from 'zod';

// ============================================================
// Core Utility: Safe AI JSON Parser
// ============================================================

/**
 * Parses a raw JSON string from AI and validates it against a Zod schema.
 * Returns the validated data or null on failure.
 *
 * @param rawText - The raw text response from the AI model
 * @param schema - A Zod schema to validate against
 * @param label - A human-readable label for logging purposes
 * @returns Validated data of type T, or null if parsing/validation fails
 */
export function safeParseAiJson<T>(
    rawText: string | undefined,
    schema: z.ZodSchema<T>,
    label: string = 'AI Response'
): T | null {
    if (!rawText) {
        console.warn(`[Zod] ${label}: Received empty response from AI.`);
        return null;
    }

    // Step 1: Attempt to strip potential markdown code fences
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith('```')) {
        // Remove ```json or ``` prefix and trailing ```
        cleanedText = cleanedText
            .replace(/^```(?:json)?\s*\n?/i, '')
            .replace(/\n?\s*```$/i, '')
            .trim();
    }

    // Step 2: Attempt JSON.parse
    let rawObj: unknown;
    try {
        rawObj = JSON.parse(cleanedText);
    } catch (jsonError) {
        console.error(`[Zod] ${label}: JSON.parse failed. Raw text (first 500 chars):`, cleanedText.substring(0, 500));
        console.error(`[Zod] ${label}: JSON.parse error details:`, jsonError);
        return null;
    }

    // Step 2.5: Handle nested AI response structures
    // AI sometimes returns { story_info: {...}, characters: [...] } instead of direct array
    if (rawObj && typeof rawObj === 'object' && !Array.isArray(rawObj)) {
        const obj = rawObj as Record<string, unknown>;

        // 通用处理: 检查常见的嵌套数组字段
        // 角色生成: 提取 characters 数组
        if (obj.characters && Array.isArray(obj.characters)) {
            console.log(`[Zod] ${label}: Detected nested structure with 'characters' array, extracting...`);
            rawObj = obj.characters;
        }
        // 世界观生成: 提取 settings 或 worldSettings 数组
        else if (obj.settings && Array.isArray(obj.settings)) {
            console.log(`[Zod] ${label}: Detected nested structure with 'settings' array, extracting...`);
            rawObj = obj.settings;
        }
        else if (obj.worldSettings && Array.isArray(obj.worldSettings)) {
            console.log(`[Zod] ${label}: Detected nested structure with 'worldSettings' array, extracting...`);
            rawObj = obj.worldSettings;
        }
        // 剧情生成: 提取 plotNodes 或 nodes 数组
        else if (obj.plotNodes && Array.isArray(obj.plotNodes)) {
            console.log(`[Zod] ${label}: Detected nested structure with 'plotNodes' array, extracting...`);
            rawObj = obj.plotNodes;
        }
        else if (obj.nodes && Array.isArray(obj.nodes)) {
            console.log(`[Zod] ${label}: Detected nested structure with 'nodes' array, extracting...`);
            rawObj = obj.nodes;
        }
        // 章节生成: 提取 chapters 数组
        else if (obj.chapters && Array.isArray(obj.chapters)) {
            console.log(`[Zod] ${label}: Detected nested structure with 'chapters' array, extracting...`);
            rawObj = obj.chapters;
        }
    }

    // Step 2.6: Data sanitization for known AI quirks
    // Clean beatTag values that don't match our enum
    if (label === 'Plot Rewrite' || label === 'Plot Generation') {
        const sanitizeBeatTag = (obj: any): any => {
            if (Array.isArray(obj)) {
                return obj.map(sanitizeBeatTag);
            } else if (obj && typeof obj === 'object') {
                const sanitized: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (key === 'beatTag' && typeof value === 'string') {
                        const validBeatTags = ['INCITING_INCIDENT', 'PLOT_POINT_1', 'MIDPOINT', 'PLOT_POINT_2', 'CLIMAX', 'RESOLUTION', 'OTHER'];
                        sanitized[key] = validBeatTags.includes(value) ? value : 'OTHER';
                    } else {
                        sanitized[key] = sanitizeBeatTag(value);
                    }
                }
                return sanitized;
            }
            return obj;
        };

        rawObj = sanitizeBeatTag(rawObj);
    }

    // Step 3: Validate with Zod (safeParse never throws)
    const result = schema.safeParse(rawObj);
    if (result.success) {
        console.log(`[Zod] ${label}: Validation successful.`);
        return result.data;
    } else {
        console.warn(`[Zod] ${label}: Validation failed. Issues:`, result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
        console.warn(`[Zod] ${label}: Raw object (keys):`, typeof rawObj === 'object' && rawObj !== null ? (Array.isArray(rawObj) ? `Array(${rawObj.length})` : Object.keys(rawObj)) : typeof rawObj);
        console.warn(`[Zod] ${label}: Full error:`, result.error);
        return null;
    }
}

// ============================================================
// Schema Definitions
// ============================================================

// --- Characters (batchGenerateCharacters) ---
// 升级: 支持更丰富的角色字段
export const AiCharacterSchema = z.object({
    name: z.string().min(1, '角色名不能为空'),
    role: z.string().default('未知角色'),
    archetype: z.string().default(''),
    description: z.string().default(''),

    // 新增: 角色深度字段
    alignment: z.string().optional(), // 道德阵营
    tags: z.array(z.string()).optional(), // 角色标签
    desire: z.string().optional(), // 核心欲望
    fear: z.string().optional(), // 核心恐惧
    signature: z.string().optional(), // 标志性特征
    contrast: z.string().optional(), // 反差萌点
    weakness: z.string().optional(), // 弱点/缺陷

    relationships: z.string().optional(),
});

export const AiCharacterArraySchema = z.array(AiCharacterSchema);

// --- World Settings (batchGenerateWorldSettingsByCategory) ---
export const AiWorldSettingSchema = z.object({
    title: z.string().min(1, '设定标题不能为空'),
    category: z.enum(['Geography', 'Magic/Tech', 'Society', 'History', 'Other']).default('Other'),
    content: z.string().default(''),
});

export const AiWorldSettingArraySchema = z.array(AiWorldSettingSchema);

// --- State Changes (analyzeStateChanges, deduceWorldConsequences) ---
export const AiStateChangeSchema = z.object({
    targetId: z.string().optional(), // NEW: Explicit ID resolution
    targetName: z.string().min(1),
    targetType: z.enum(['CHARACTER', 'WORLD']).default('CHARACTER'),
    suggestedUpdate: z.string().default(''),
    reason: z.string().default(''),
    // MVP: 准确性提升字段
    confidence: z.number().min(0).max(1).default(0.5),
    extractionEvidence: z.string().optional(),
});

export const AiStateChangeArraySchema = z.array(AiStateChangeSchema);

// --- Echoes (extractEchoesFromText) ---
export const AiEchoSchema = z.object({
    targetId: z.string().optional(), // NEW: Explicit ID resolution
    targetName: z.string().min(1),
    targetType: z.enum(['CHARACTER', 'WORLD']).default('CHARACTER'),
    description: z.string().default(''),
    reason: z.string().default(''),
    triples: z.array(z.object({
        subject: z.string(),
        relation: z.string(),
        object: z.string()
    })).optional(),
    // MVP: 准确性提升字段
    confidence: z.number().min(0).max(1).default(0.5),
    extractionEvidence: z.string().optional(),
});

export const AiEchoArraySchema = z.array(AiEchoSchema);

// --- Plot Rhythm (analyzePlotRhythm) ---
export const AiPlotRhythmSchema = z.object({
    beat: z.string().min(1),
    tension: z.number().min(0).max(100).default(50),
    description: z.string().default(''),
});

export const AiPlotRhythmArraySchema = z.array(AiPlotRhythmSchema);

// --- Plot Nodes (generatePlotFromContext, rewritePlot) ---
export const AiPlotNodeSchema = z.object({
    title: z.string().min(1, '情节标题不能为空'),
    content: z.string().default(''),
    beatTag: z.enum(['INCITING_INCIDENT', 'PLOT_POINT_1', 'MIDPOINT', 'PLOT_POINT_2', 'CLIMAX', 'RESOLUTION', 'OTHER']).optional(),
    relatedCharacters: z.array(z.string()).optional(), // List of Character IDs
    relatedLocations: z.array(z.string()).optional(),  // List of WorldSetting IDs
    // NEW: 修罗场冲突场景元数据
    conflictScenario: z.object({
        type: z.enum(['CONFRONTATION', 'CLIMAX', 'TWIST']).nullable().optional(),
        participants: z.array(z.string()).optional(), // 参与角色ID数组
        stakes: z.string().optional(), // 赌注/冲突核心
        intensity: z.number().min(1).max(10).optional(), // 1-10强度等级
    }).optional(),
});

export const AiPlotNodeArraySchema = z.array(AiPlotNodeSchema);
// --- Chapter Outlines (splitPlotNodeIntoChapters) ---
export const AiChapterBeatSchema = z.object({
    type: z.enum(['CONTENT', 'ACTION', 'DIALOGUE', 'TWIST']).default('CONTENT'),
    description: z.string().min(1, '节拍描述不能为空'),
});

export const AiChapterOutlineSchema = z.object({
    title: z.string().min(1, '章节标题不能为空'),
    summary: z.string().default(''),
    expectedPOV: z.string().default('未设定'),
    beats: z.array(AiChapterBeatSchema).optional(),
});

export const AiChapterOutlineArraySchema = z.array(AiChapterOutlineSchema);
