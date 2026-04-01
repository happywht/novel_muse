/**
 * 模板覆盖系统类型定义
 *
 * 本文件定义三级模板覆盖系统的数据结构
 * 支持用户级 > 项目级 > 默认级的优先级合并
 *
 * @see docs/template_schema_design.md - 设计文档
 */

import { BlockMetadata, VariableType, VariableTier, VariableSource } from './promptTemplate';

// ============================================================
// 模板覆盖配置
// ============================================================

/**
 * 模板覆盖配置
 *
 * 存储在 project.customTemplates JSON 字段中
 *
 * @example
 * ```typescript
 * const config: TemplateOverrideConfig = {
 *   version: '1.0.0',
 *   lastModified: '2026-03-31T10:30:00Z',
 *   templates: {
 *     'scene_generation': { ... }
 *   }
 * };
 * ```
 */
export interface TemplateOverrideConfig {
  /** Schema 版本号 */
  version: string;

  /** 最后修改时间 (ISO 8601) */
  lastModified: string;

  /** 模板覆盖映射 (templateId -> override) */
  templates: Record<string, TemplateOverride>;
}

/**
 * 单个模板的覆盖配置
 *
 * 仅存储需要覆盖的字段，未定义的字段使用默认值
 *
 * @example
 * ```typescript
 * const override: TemplateOverride = {
 *   templateId: 'scene_generation',
 *   systemInstruction: '自定义系统指令...',
 *   blocks: {
 *     'chekhov_gun': { disabled: true }
 *   },
 *   variableDefaults: {
 *     targetWordCount: 5000
 *   }
 * };
 * ```
 */
export interface TemplateOverride {
  /** 模板ID，如 scene_generation */
  templateId: string;

  // === 可覆盖字段 ===

  /**
   * 系统指令覆盖
   * 如果提供，完全替换默认的系统指令
   */
  systemInstruction?: string;

  /**
   * 区块覆盖配置
   * 按 blockId 索引，仅存储需要修改的区块
   */
  blocks?: Record<string, BlockOverride>;

  /**
   * 变量默认值覆盖
   * 按 variableName 索引，仅存储需要修改的默认值
   */
  variableDefaults?: Record<string, unknown>;

  /** 覆盖元数据 */
  metadata?: TemplateOverrideMetadata;
}

/**
 * 区块覆盖配置
 *
 * 允许覆盖区块的模板、条件、顺序等属性
 *
 * 注意：在 Record<string, BlockOverride> 中使用时，key 即为 blockId
 * blockId 字段仅用于独立传输时标识区块
 *
 * @example
 * ```typescript
 * // 在 Record 中使用（推荐）
 * const blocks: Record<string, BlockOverride> = {
 *   'genre_info': {
 *     template: '[小说类型]: {{genre}}\n\n自定义模板...',
 *     order: 5,
 *     disabled: false
 *   }
 * };
 *
 * // 独立使用时可以包含 blockId
 * const blockOverride: BlockOverride = {
 *   blockId: 'genre_info',
 *   template: '[小说类型]: {{genre}}\n\n自定义模板...',
 * };
 * ```
 */
export interface BlockOverride {
  /**
   * 区块ID，如 genre_info
   * 可选字段：在 Record<string, BlockOverride> 中使用时不需要提供
   * 仅在独立传输时需要此字段来标识区块
   */
  blockId?: string;

  // === 可覆盖字段 ===

  /**
   * 区块模板覆盖
   * 如果提供，完全替换默认模板
   */
  template?: string;

  /**
   * 显示条件覆盖
   * - 字符串: 设置新的条件表达式
   * - null: 移除条件，始终显示
   * - undefined: 使用默认条件
   */
  condition?: string | null;

  /**
   * 排序权重覆盖
   * 数值越小，排在越前面
   */
  order?: number;

  /**
   * 是否禁用该区块
   * - true: 渲染时完全跳过该区块
   * - false/undefined: 正常渲染
   */
  disabled?: boolean;

  /**
   * 区块元数据覆盖
   * 使用 Partial 合并，仅覆盖指定的元数据字段
   */
  metadata?: Partial<BlockMetadata>;
}

/**
 * 模板覆盖元数据
 */
export interface TemplateOverrideMetadata {
  /** 修改时间 */
  modifiedAt?: string;

  /** 修改用户ID */
  modifiedBy?: string;

  /** 备注说明 */
  notes?: string;

  /** 变更原因 */
  changeReason?: string;
}

// ============================================================
// 用户级偏好配置（可选扩展）
// ============================================================

/**
 * 用户级模板偏好配置
 *
 * 存储用户的全局模板偏好，适用于所有项目
 * 可存储在：
 * - 独立的 userPreferences 数据库表
 * - localStorage（浏览器端）
 * - 用户配置文件
 *
 * @example
 * ```typescript
 * const userPrefs: UserTemplatePreferences = {
 *   version: '1.0.0',
 *   lastModified: '2026-03-31T10:30:00Z',
 *   globalVariableDefaults: {
 *     creativityLevel: 0.8
 *   },
 *   templatePreferences: {
 *     'scene_generation': {
 *       defaultCreativity: 0.85,
 *       frequentVariables: {
 *         targetWordCount: 3000
 *       }
 *     }
 *   }
 * };
 * ```
 */
export interface UserTemplatePreferences {
  /** Schema 版本号 */
  version: string;

  /** 最后修改时间 (ISO 8601) */
  lastModified: string;

  /**
   * 全局变量默认值
   * 适用于所有模板，优先级低于项目级
   */
  globalVariableDefaults?: Record<string, unknown>;

  /**
   * 按模板类型的偏好设置
   */
  templatePreferences?: Record<string, TemplateTypePreference>;
}

/**
 * 模板类型偏好
 */
export interface TemplateTypePreference {
  /** 默认创意值 (0-1) */
  defaultCreativity?: number;

  /** 默认区块启用状态 */
  defaultBlockStatus?: Record<string, boolean>;

  /** 常用变量值 */
  frequentVariables?: Record<string, unknown>;
}

// ============================================================
// 验证相关类型
// ============================================================

/**
 * 模板覆盖验证结果
 */
export interface TemplateOverrideValidation {
  /** 是否有效 */
  valid: boolean;

  /** 错误消息列表 */
  errors: string[];

  /** 警告消息列表 */
  warnings: string[];

  /** 详细验证结果 */
  details?: {
    systemInstruction?: {
      valid: boolean;
      length: number;
      maxLength: number;
    };
    blocks?: Record<string, {
      valid: boolean;
      templateValid?: boolean;
      conditionValid?: boolean;
    }>;
    variables?: Record<string, {
      valid: boolean;
      typeValid?: boolean;
    }>;
  };
}

// ============================================================
// 合并相关类型
// ============================================================

/**
 * 模板来源标记
 * 标记最终值的来源层级
 */
export type TemplateSource = 'default' | 'project' | 'user';

/**
 * 模板字段来源映射
 */
export interface TemplateFieldSources {
  /** 系统指令来源 */
  systemInstruction: TemplateSource;

  /** 各区块来源映射 */
  blocks: Record<string, TemplateSource>;

  /** 各变量默认值来源映射 */
  variables: Record<string, TemplateSource>;
}

/**
 * 合并后的模板结果
 */
export interface MergedTemplateResult {
  /** 合并后的完整模板定义 */
  template: import('./promptTemplate').PromptTemplateDefinition;

  /** 应用的覆盖配置（如果有） */
  appliedOverride?: TemplateOverride;

  /** 字段来源映射 */
  sources: TemplateFieldSources;

  /** 合并警告 */
  warnings: string[];
}

// ============================================================
// API 请求/响应类型
// ============================================================

/**
 * 获取模板响应
 */
export interface GetTemplateResponse {
  /** 合并后的模板 */
  template: import('./promptTemplate').PromptTemplateDefinition;

  /** 项目级覆盖（如果有） */
  override?: TemplateOverride;

  /** 字段来源 */
  sources: TemplateFieldSources;
}

/**
 * 更新模板请求
 */
export interface UpdateTemplateRequest {
  /** 系统指令覆盖 */
  systemInstruction?: string;

  /** 区块覆盖 */
  blocks?: Record<string, BlockOverride>;

  /** 变量默认值覆盖 */
  variableDefaults?: Record<string, unknown>;

  /** 元数据 */
  metadata?: TemplateOverrideMetadata;
}

/**
 * 更新模板响应
 */
export interface UpdateTemplateResponse {
  /** 是否成功 */
  success: boolean;

  /** 更新后的覆盖配置 */
  override: TemplateOverride;

  /** 合并后的模板 */
  merged: import('./promptTemplate').PromptTemplateDefinition;

  /** 字段来源 */
  sources: TemplateFieldSources;
}

/**
 * 重置模板响应
 */
export interface ResetTemplateResponse {
  /** 是否成功 */
  success: boolean;

  /** 重置后的默认模板 */
  default: import('./promptTemplate').PromptTemplateDefinition;
}

// ============================================================
// 辅助类型
// ============================================================

/**
 * 模板覆盖差异
 * 用于比较两个覆盖配置的差异
 */
export interface TemplateOverrideDiff {
  /** 新增的覆盖 */
  added: string[];

  /** 修改的覆盖 */
  modified: string[];

  /** 删除的覆盖 */
  removed: string[];

  /** 详细变更 */
  changes: Record<string, {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[]>;
}

/**
 * 模板覆盖导出格式
 */
export interface TemplateOverrideExport {
  /** 导出格式版本 */
  version: string;

  /** 导出时间 */
  exportedAt: string;

  /** 导出的模板覆盖列表 */
  templates: TemplateOverride[];

  /** 导出元数据 */
  metadata?: {
    projectId?: string;
    projectName?: string;
    exportedBy?: string;
  };
}
