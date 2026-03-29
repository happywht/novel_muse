/**
 * Format Validator - 格式验证
 * 验证 Muse 和 inkos 数据格式
 */

import { z } from 'zod';

// ============================================
// Muse 格式验证
// ============================================

/**
 * Muse Character 验证 Schema
 */
export const MuseCharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().optional(),
  archetype: z.string().optional(),
  description: z.string().optional(),
  alignment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  desire: z.string().optional(),
  fear: z.string().optional(),
  signature: z.string().optional(),
  contrast: z.string().optional(),
  weakness: z.string().optional(),
  arc: z
    .object({
      arcType: z.enum(['redemption', 'corruption', 'steadfast', 'awakening']),
      currentPhase: z.enum(['setup', 'rising-action', 'crisis', 'climax', 'resolution']),
      phaseProgress: z.number().min(0).max(100),
      notes: z.string().optional(),
    })
    .optional(),
  relationships: z.string().optional(),
  structuredRelations: z
    .array(
      z.object({
        id: z.string().optional(),
        targetCharacterId: z.string().optional(),
        targetCharacterName: z.string().optional(),
        targetName: z.string().optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        weight: z.number().min(0).max(100).optional(),
        trajectory: z.enum(['rising', 'falling', 'stable']).optional(),
      })
    )
    .optional(),
  originLocation: z.string().optional(),
  residence: z.string().optional(),
  controlledTerritories: z.array(z.string()).optional(),
  exiledFrom: z.array(z.string()).optional(),
  physicalStatus: z.string().optional(),
  foreshadowingHooks: z.array(z.string()).optional(),
});

/**
 * Muse WorldSetting 验证 Schema
 */
export const MuseWorldSettingSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['Geography', 'Magic/Tech', 'Society', 'History', 'Other']),
  title: z.string().min(1),
  content: z.string(),
  parentId: z.string().optional(),
  importance: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Muse PlotNode 验证 Schema
 */
export const MusePlotNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  order: z.number().int().min(1),
  beatTag: z
    .enum([
      'INCITING_INCIDENT',
      'PLOT_POINT_1',
      'MIDPOINT',
      'PLOT_POINT_2',
      'CLIMAX',
      'RESOLUTION',
      'OTHER',
    ])
    .nullable()
    .optional(),
  relatedCharacters: z.array(z.string()).optional(),
  relatedLocations: z.array(z.string()).optional(),
  relatedChapters: z.array(z.string()).optional(),
});

/**
 * Muse Chapter 验证 Schema
 */
export const MuseChapterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().optional(),
  summary: z.string().optional(),
  expectedPOV: z.string().optional(),
  plotNodeId: z.string().optional(),
  order: z.number().int().min(1),
  lastModified: z.number().optional(),
  targetWordCount: z.number().int().positive().optional(),
  beats: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['CONTENT', 'ACTION', 'DIALOGUE', 'TWIST']),
        description: z.string(),
        isCompleted: z.boolean(),
      })
    )
    .optional(),
});

/**
 * Muse TimelineEvent 验证 Schema
 */
export const MuseTimelineEventSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number(),
  worldDate: z.string(),
  title: z.string().min(1),
  description: z.string(),
  involvedEntities: z.array(z.string()).optional(),
  type: z.enum(['SCENE', 'BACKGROUND', 'ECHO']),
});

/**
 * Muse CreativeSettings 验证 Schema
 */
export const MuseCreativeSettingsSchema = z.object({
  tone: z.string(),
  style: z.string(),
  creativity: z.number().min(0).max(1),
  targetAudience: z.string(),
  promptProfile: z.enum(['LITERARY', 'WEB_NOVEL']).optional(),
  styleTags: z.array(z.string()).optional(),
  referenceText: z.string().optional(),
});

/**
 * Muse Project 完整验证 Schema
 */
export const MuseProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  genre: z.string().min(1),
  premise: z.string(),
  creativeSettings: MuseCreativeSettingsSchema,
  characters: z.array(MuseCharacterSchema).default([]),
  worldSettings: z.array(MuseWorldSettingSchema).default([]),
  plotOutline: z.string().optional(),
  plotNodes: z.array(MusePlotNodeSchema).default([]),
  chapters: z.array(MuseChapterSchema).default([]),
  timeline: z.array(MuseTimelineEventSchema).default([]),
});

// ============================================
// inkos 格式验证
// ============================================

/**
 * inkos Book Config 验证 Schema
 */
export const InkosBookConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  platform: z.string(),
  genre: z.string(),
  status: z.enum(['outlining', 'writing', 'revision', 'completed']),
  targetChapters: z.number().int().positive(),
  chapterWordCount: z.number().int().positive(),
  language: z.string().default('zh'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * inkos Character 验证 Schema (从 story_bible.md 解析)
 */
export const InkosCharacterSchema = z.object({
  name: z.string().min(1),
  role: z.string(),
  archetype: z.string().optional(),
  description: z.string().optional(),
  alignment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  desire: z.string().optional(),
  fear: z.string().optional(),
  signature: z.string().optional(),
  contrast: z.string().optional(),
  weakness: z.string().optional(),
  arcType: z.string().optional(),
  currentPhase: z.string().optional(),
  phaseProgress: z.number().optional(),
  relations: z
    .array(
      z.object({
        type: z.string(),
        targetName: z.string(),
        description: z.string().optional(),
        weight: z.number().optional(),
      })
    )
    .optional(),
  residence: z.string().optional(),
  physicalStatus: z.string().optional(),
});

/**
 * inkos WorldSetting 验证 Schema
 */
export const InkosWorldSettingSchema = z.object({
  category: z.string(),
  title: z.string().min(1),
  content: z.string(),
  importance: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * inkos PlotNode 验证 Schema
 */
export const InkosPlotNodeSchema = z.object({
  order: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string(),
  beatTag: z.string().optional(),
  relatedCharacters: z.array(z.string()).optional(),
  relatedLocations: z.array(z.string()).optional(),
});

// ============================================
// 验证结果类型
// ============================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

// ============================================
// 验证函数
// ============================================

/**
 * 验证 Muse 项目数据
 */
export function validateMuseProject(
  data: unknown
): ValidationResult<z.infer<typeof MuseProjectSchema>> {
  const result = MuseProjectSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * 验证 Muse 角色数据
 */
export function validateMuseCharacter(
  data: unknown
): ValidationResult<z.infer<typeof MuseCharacterSchema>> {
  const result = MuseCharacterSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * 验证 Muse 世界设定
 */
export function validateMuseWorldSetting(
  data: unknown
): ValidationResult<z.infer<typeof MuseWorldSettingSchema>> {
  const result = MuseWorldSettingSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * 验证 Muse 章节
 */
export function validateMuseChapter(
  data: unknown
): ValidationResult<z.infer<typeof MuseChapterSchema>> {
  const result = MuseChapterSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * 验证 inkos Book Config
 */
export function validateInkosBookConfig(
  data: unknown
): ValidationResult<z.infer<typeof InkosBookConfigSchema>> {
  const result = InkosBookConfigSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * 快速验证 - 只检查必需字段
 */
export function quickValidateMuseProject(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.title === 'string' && typeof obj.genre === 'string';
}

/**
 * 快速验证 - inkos Book Config
 */
export function quickValidateInkosBookConfig(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.genre === 'string'
  );
}
