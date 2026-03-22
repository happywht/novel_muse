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
    // 角色数据字段映射: AI返回的archetype包含角色类型，需要映射到role字段
    if (Array.isArray(rawObj) && label === 'batchGenerateCharacters') {
        const ROLE_MAPPING: Record<string, string> = {
            '主角': '主角',
            'Protagonist': '主角',
            '反派': '反派',
            'Antagonist': '反派',
            '导师': '导师',
            'Mentor': '导师',
            '伙伴': '伙伴',
            'Ally': '伙伴',
            '守护者': '守护者',
            'Guardian': '守护者',
            '变形者': '变形者',
            'Shapeshifter': '变形者',
            '捣蛋鬼': '捣蛋鬼',
            'Trickster': '捣蛋鬼',
            '信使': '信使',
            'Herald': '信使',
        };

        rawObj = rawObj.map((char: any) => {
            if (char && typeof char === 'object') {
                const mappedChar = { ...char };

                // 如果archetype包含角色类型，映射到role
                if (mappedChar.archetype && typeof mappedChar.archetype === 'string') {
                    const archetypeLower = mappedChar.archetype;
                    for (const [key, value] of Object.entries(ROLE_MAPPING)) {
                        if (archetypeLower.includes(key)) {
                            // 如果role为空或是职位描述，用archetype的角色类型
                            if (!mappedChar.role || mappedChar.role.length > 10) {
                                mappedChar.role = value;
                            }
                            break;
                        }
                    }
                }

                // 确保role字段有值
                if (!mappedChar.role) {
                    mappedChar.role = mappedChar.archetype || '未知角色';
                }

                // 处理signature对象转字符串 - 保留所有字段
                if (mappedChar.signature && typeof mappedChar.signature === 'object') {
                    const sig = mappedChar.signature as Record<string, string>;
                    const parts: string[] = [];

                    // signature 字段中文映射
                    const SIGNATURE_LABELS: Record<string, string> = {
                        'appearance': '外貌',
                        'behavior': '行为',
                        'habit': '习惯',
                        'speech': '说话方式',
                        'style': '风格',
                        'trait': '特质',
                        'feature': '特征',
                    };

                    for (const [key, value] of Object.entries(sig)) {
                        const label = SIGNATURE_LABELS[key] || key;
                        parts.push(`【${label}】${value}`);
                    }
                    mappedChar.signature = parts.join('\n');
                }

                // 处理relationships对象转字符串 - 保留所有字段
                if (mappedChar.relationships && typeof mappedChar.relationships === 'object') {
                    const rel = mappedChar.relationships as Record<string, string>;
                    const parts: string[] = [];

                    // 完整的关系类型中文映射
                    const RELATION_LABELS: Record<string, string> = {
                        // 基本关系
                        'friend': '朋友',
                        'enemy': '敌人',
                        'rival': '对手',
                        'ally': '盟友',
                        'colleague': '同僚',
                        'partner': '伙伴',
                        'companion': '同伴',

                        // 情感关系
                        'love_interest': '情感对象',
                        'lover': '恋人',
                        'spouse': '配偶',
                        'ex': '前任',
                        'crush': '暗恋对象',
                        'obsession': '执念对象',

                        // 家庭关系
                        'family': '家人',
                        'parent': '父母',
                        'child': '子女',
                        'sibling': '兄弟姐妹',
                        'brother': '兄弟',
                        'sister': '姐妹',
                        'cousin': '表亲',
                        'relative': '亲戚',

                        // 权力关系
                        'master': '主人',
                        'servant': '仆人',
                        'mentor': '导师',
                        'student': '学生',
                        'ward': '被监护人',
                        'guardian': '监护人',
                        'boss': '上司',
                        'subordinate': '下属',

                        // 对抗关系
                        'nemesis': '宿敌',
                        'archenemy': '死敌',
                        'foil': '衬托者',

                        // 特殊关系
                        'pawn': '棋子',
                        'frenemy': '亦敌亦友',
                        'bodyguard': '保护对象',
                        'study_target': '研究对象',
                        'victim': '受害者',
                        'savior': '救星',
                        'debtor': '债务人',
                        'creditor': '债权人',
                    };

                    for (const [key, value] of Object.entries(rel)) {
                        const label = RELATION_LABELS[key] || key; // 保留原始键名以防遗漏
                        parts.push(`${label}: ${value}`);
                    }
                    mappedChar.relationships = parts.join('；');
                }

                // ===== 新增: 处理结构化关系数据 =====
                if (mappedChar.structuredRelations && Array.isArray(mappedChar.structuredRelations)) {
                    // 关系类型到标准枚举的映射
                    const TYPE_TO_ENUM: Record<string, string> = {
                        'ENEMY_OF': 'ENEMY_OF',
                        'ALLY_OF': 'ALLY_OF',
                        'LOVES': 'LOVES',
                        'KIN_OF': 'KIN_OF',
                        'MENTORS': 'MENTORS',
                        'RIVAL_OF': 'RIVAL_OF',
                        'SERVES': 'SERVES',
                        'FRIEND_OF': 'FRIEND_OF',
                        'RELATED_TO': 'RELATED_TO',
                        // AI 可能返回的其他格式
                        'ENEMY': 'ENEMY_OF',
                        'ALLY': 'ALLY_OF',
                        'LOVE': 'LOVES',
                        'KIN': 'KIN_OF',
                        'MENTOR': 'MENTORS',
                        'RIVAL': 'RIVAL_OF',
                        'SERVE': 'SERVES',
                        'FRIEND': 'FRIEND_OF',
                    };

                    // 枚举到中文的映射（用于生成 relationships 字符串）
                    const ENUM_TO_LABEL: Record<string, string> = {
                        'ENEMY_OF': '敌人',
                        'ALLY_OF': '盟友',
                        'LOVES': '爱慕',
                        'KIN_OF': '亲属',
                        'MENTORS': '师徒',
                        'RIVAL_OF': '竞争',
                        'SERVES': '效忠',
                        'FRIEND_OF': '朋友',
                        'RELATED_TO': '关联',
                    };

                    // 标准化关系类型（保留 AI 返回的简化格式，后续在 Dashboard 中转换为完整格式）
                    mappedChar.structuredRelations = mappedChar.structuredRelations.map((rel: any) => ({
                        targetName: rel.targetName,
                        // 如果 AI 没有返回 type，使用默认值 'RELATED_TO'
                        type: rel.type ? (TYPE_TO_ENUM[rel.type.toUpperCase()] || 'RELATED_TO') : 'RELATED_TO',
                        description: rel.description,
                    }));

                    // 移除双写逻辑: relationships 现在是计算属性，由前端/后端根据 structuredRelations 动态生成
                    // 不再在此处从 structuredRelations 生成 relationships 字符串
                }

                return mappedChar;
            }
            return char;
        });
        console.log(`[Zod] ${label}: Applied character role mapping and field conversion`);
    }

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
// 升级: 支持更丰富的角色字段 + 结构化关系
export const AiCharacterRelationSchema = z.object({
    targetName: z.string().describe('目标角色名称'),
    type: z.enum([
        'ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF',
        'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF', 'RELATED_TO'
    ]).optional().describe('关系类型（可选，默认为 RELATED_TO）'),
    description: z.string().optional().describe('关系描述'),
});

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

    // 关系字段 - 双格式支持
    relationships: z.string().optional().describe('人际关系（字符串格式，兼容旧数据）'),
    structuredRelations: z.array(AiCharacterRelationSchema).optional().describe('结构化关系数组（新格式）'),

    // 世界设定关联（可选）
    originLocation: z.string().optional().describe('角色的起源/出生地名称'),
    residence: z.string().optional().describe('角色的居住地名称'),
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
    relatedChapters: z.array(z.string()).optional(),  // List of Chapter IDs
    // NEW: 修罗场冲突场景元数据
    conflictScenario: z.object({
        type: z.enum(['CONFRONTATION', 'CLIMAX', 'TWIST']).nullable().optional(),
        participants: z.array(z.string()).optional(), // 参与角色ID数组
        stakes: z.string().optional(), // 赌注/冲突核心
        intensity: z.number().min(1).max(10).optional(), // 1-10强度等级
    }).nullable().optional(), // 允许 null 和 undefined
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
