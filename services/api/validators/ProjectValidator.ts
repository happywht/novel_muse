/**
 * 项目数据验证器
 *
 * 使用 Zod 进行数据验证，确保数据完整性和类型安全
 */

import { z } from 'zod';
import type { ProjectState } from '@/types';

/**
 * 创作设置 Schema
 */
const CreativeSettingsSchema = z.object({
  tone: z.string().optional(),
  theme: z.string().optional(),
  targetAudience: z.string().optional(),
  writingStyle: z.string().optional(),
}).optional();

/**
 * 时间线索目 Schema
 */
const TimelineEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  title: z.string(),
  description: z.string().optional(),
  relatedCharacters: z.array(z.string()).optional(),
  relatedWorldSettings: z.array(z.string()).optional(),
});

/**
 * 创建项目验证 Schema
 */
export const CreateProjectSchema = z.object({
  title: z.string()
    .min(1, '标题不能为空')
    .max(200, '标题不能超过200字符'),
  genre: z.string().max(100, '类型不能超过100字符').optional(),
  premise: z.string().max(2000, '前提不能超过2000字符').optional(),
  creativeSettings: CreativeSettingsSchema,
});

/**
 * 更新项目验证 Schema
 */
export const UpdateProjectSchema = z.object({
  title: z.string()
    .min(1, '标题不能为空')
    .max(200, '标题不能超过200字符')
    .optional(),
  genre: z.string().max(100, '类型不能超过100字符').optional(),
  premise: z.string().max(2000, '前提不能超过2000字符').optional(),
  creativeSettings: CreativeSettingsSchema.optional(),
  characters: z.array(z.object({})).optional(),
  worldSettings: z.array(z.object({})).optional(),
  plotNodes: z.array(z.object({})).optional(),
  chapters: z.array(z.object({})).optional(),
  drafts: z.array(z.object({})).optional(),
  echoes: z.array(z.object({})).optional(),
  timeline: z.array(TimelineEntrySchema).optional(),
  lastModified: z.number().optional(),
}).partial();

/**
 * 创建项目 DTO 类型
 */
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>;

/**
 * 更新项目 DTO 类型
 */
export type UpdateProjectDTO = z.infer<typeof UpdateProjectSchema>;

/**
 * 验证创建项目数据
 */
export function validateCreateProject(data: unknown): CreateProjectDTO {
  try {
    return CreateProjectSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(e =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      throw new Error(`数据验证失败: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * 验证更新项目数据
 */
export function validateUpdateProject(data: unknown): UpdateProjectDTO {
  try {
    return UpdateProjectSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(e =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      throw new Error(`数据验证失败: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * 安全验证（不抛出错误，返回结果对象）
 */
export function safeValidateCreateProject(
  data: unknown
): { success: true; data: CreateProjectDTO } | { success: false; error: string } {
  try {
    const validated = CreateProjectSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(e =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: '未知验证错误' };
  }
}

/**
 * 安全验证更新数据
 */
export function safeValidateUpdateProject(
  data: unknown
): { success: true; data: UpdateProjectDTO } | { success: false; error: string } {
  try {
    const validated = UpdateProjectSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(e =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: '未知验证错误' };
  }
}
