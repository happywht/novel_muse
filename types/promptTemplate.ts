/**
 * Prompt模板系统类型定义
 *
 * 本文件是所有模板相关类型的唯一来源（Single Source of Truth）
 * 其他文件应该从这里导入类型，而不是重复定义
 */

// ============================================================
// 变量相关类型
// ============================================================

/**
 * 变量重要性分级
 * - critical: 核心变量，缺失将导致生成失败
 * - important: 重要变量，极大影响输出质量
 * - optional: 可选变量，增强上下文
 */
export type VariableTier = 'critical' | 'important' | 'optional';

/**
 * 变量数据来源
 * - user_input: 用户直接输入
 * - project_state: 项目状态存储
 * - computed: 系统计算生成
 * - derived: 从其他数据推导
 * - optional: 可选来源
 */
export type VariableSource = 'user_input' | 'project_state' | 'computed' | 'derived' | 'optional';

/** 变量类型 */
export type VariableType = 'string' | 'array' | 'object' | 'boolean' | 'number';

/**
 * 模板变量定义
 */
export interface PromptVariable {
  name: string;                    // 变量名，如 plotBeat
  type: VariableType;              // 变量类型
  tier: VariableTier;              // 重要性分级
  source: VariableSource;          // 数据来源
  required: boolean;               // 是否必填
  description: string;             // 描述说明
  display: {
    collapsible: boolean;          // 是否可折叠
    previewLength: number;         // 预览长度
    badge?: string;                // 徽章文字，如 "3章摘要"
  };
  defaultValue?: unknown;          // 默认值
}

/**
 * 模板变量定义（用于defaults.ts）
 * 与PromptVariable兼容，但字段命名略有不同
 */
export interface TemplateVariable {
  name: string;                    // 变量标识符 (e.g., {{genre}})
  type: 'string' | 'string[]' | 'number' | 'boolean' | 'object';
  tier: VariableTier;              // 重要性级别
  source: VariableSource;          // 数据来源
  required: boolean;               // 是否必须提供
  description: string;             // 可读描述
  display?: string;                // UI显示名称（中文）
  defaultValue?: unknown;          // 默认值
}

// ============================================================
// 区块相关类型
// ============================================================

/**
 * 区块分类层级
 * - task: 核心/任务指令
 * - context: 上下文/背景信息
 * - style: 风格指导
 * - constraint: 约束/限制条件
 * - format: 输出格式要求
 * - other: 其他
 */
export type BlockTier = 'task' | 'context' | 'style' | 'constraint' | 'format' | 'other';

/**
 * 区块数据来源
 * - static: 静态模板内容，不随上下文变化
 * - user_input: 用户输入内容
 * - computed: 系统计算生成
 * - derived: 从其他数据推导
 */
export type BlockDataSource = 'static' | 'user_input' | 'computed' | 'derived';

/**
 * 区块元数据（用于先验分类）
 *
 * @example
 * ```typescript
 * {
 *   tier: 'task',
 *   isStatic: true,
 *   dataSource: 'static',
 *   description: '核心任务指令'
 * }
 * ```
 */
export interface BlockMetadata {
  tier: BlockTier;                 // 分类层级
  isStatic: boolean;               // 是否静态内容
  dataSource: BlockDataSource;     // 数据来源
  description?: string;            // 描述说明
}

/**
 * Prompt Block 定义 - 模板中的逻辑区块
 *
 * @example
 * ```typescript
 * {
 *   id: 'genre_info',
 *   title: 'Genre Information',
 *   template: '[Novel Genre]: {{genre}}',
 *   order: 1,
 *   metadata: { tier: 'context', isStatic: false, dataSource: 'computed' }
 * }
 * ```
 */
export interface PromptBlock {
  id: string;
  title: string;                   // 区块标题
  template: string;                // 模板字符串，含 {{variable}} 占位符
  condition?: string;              // 条件表达式（JavaScript）
  order: number;                   // 显示顺序
  metadata?: BlockMetadata;        // 区块元数据
}

/**
 * 模板块定义（用于前端显示）
 */
export interface TemplateSection {
  id: string;                      // 区块ID
  label: string;                   // 显示标签
  condition?: string;              // 条件表达式
  order: number;                   // 排序权重
  icon?: string;                   // 图标emoji
  metadata?: BlockMetadata;        // 区块元数据
}

// ============================================================
// 模板相关类型
// ============================================================

/** 模板分类 */
export type TemplateCategory = 'writing' | 'world' | 'character' | 'plot' | 'audit' | 'other';

/**
 * 完整模板定义
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'generation' | 'analysis' | 'refinement' | 'utility';
  systemInstruction: string;
  userPromptBlocks: PromptBlock[];
  variables: TemplateVariable[];
  metadata?: {
    version?: string;
    author?: string;
    lastUpdated?: string;
    tags?: string[];
  };
}

/**
 * 模板定义（用于注册表）
 */
export interface PromptTemplateDefinition {
  id: string;                      // 模板ID，如 scene_generation
  label: string;                   // 显示名称
  description: string;             // 描述
  category: TemplateCategory;      // 分类

  // 模板内容
  systemTemplate: string;          // 系统指令模板
  userTemplate: string;            // 用户提示模板

  // 变量定义
  variables: PromptVariable[];

  // 区块定义
  sections: TemplateSection[];

  // 元数据
  version?: string;
  author?: string;
  tags?: string[];
}

// ============================================================
// 运行时类型
// ============================================================

/** 模板渲染上下文 */
export interface TemplateRenderContext {
  variables: Record<string, unknown>;
  projectId?: string;
  userId?: string;
}

/** 模板渲染结果 */
export interface TemplateRenderResult {
  success: boolean;
  systemInstruction: string;
  userPrompt: string;
  variables: Record<string, unknown>;
  sections: TemplateSection[];
  errors: string[];
  warnings: string[];
  tokenEstimate: {
    system: number;
    user: number;
    total: number;
  };
}

/** 编译后的模板 */
export interface CompiledTemplate {
  systemInstruction: string;
  userPrompt: string;
  variables: Record<string, unknown>;
  sections: TemplateSection[];
}
