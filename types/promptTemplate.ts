/**
 * Prompt模板系统类型定义
 */

/** 变量重要性分级 */
export type VariableTier = 'critical' | 'important' | 'optional';

/** 变量数据来源 */
export type VariableSource = 'user' | 'project' | 'computed' | 'system';

/** 变量类型 */
export type VariableType = 'string' | 'array' | 'object' | 'boolean' | 'number';

/** 模板变量定义 */
export interface PromptVariable {
  name: string; // 变量名，如 plotBeat
  type: VariableType; // 变量类型
  tier: VariableTier; // 重要性分级
  source: VariableSource; // 数据来源
  required: boolean; // 是否必填
  description: string; // 描述说明
  display: {
    collapsible: boolean; // 是否可折叠
    previewLength: number; // 预览长度
    badge?: string; // 徽章文字，如 "3章摘要"
  };
  defaultValue?: any; // 默认值
}

/** 模板块定义 */
export interface TemplateSection {
  id: string; // 区块ID
  label: string; // 显示标签
  condition?: string; // 条件表达式
  order: number; // 排序权重
  icon?: string; // 图标emoji
}

/** 模板分类 */
export type TemplateCategory = 'writing' | 'world' | 'character' | 'plot' | 'audit' | 'other';

/** 模板定义 */
export interface PromptTemplateDefinition {
  id: string; // 模板ID，如 scene_generation
  label: string; // 显示名称
  description: string; // 描述
  category: TemplateCategory; // 分类

  // 模板内容
  systemTemplate: string; // 系统指令模板
  userTemplate: string; // 用户提示模板

  // 变量定义
  variables: PromptVariable[];

  // 区块定义
  sections: TemplateSection[];

  // 元数据
  version?: string;
  author?: string;
  tags?: string[];
}

/** 运行时模板数据 */
export interface PromptTemplateData {
  templateId: string;
  variables: Record<string, any>;
  creativeSettings?: any;
}

/** 编译后的模板 */
export interface CompiledTemplate {
  systemInstruction: string;
  userPrompt: string;
  variables: Record<string, any>;
  sections: TemplateSection[];
}

/** 模板渲染结果 */
export interface TemplateRenderResult {
  success: boolean;
  systemInstruction: string;
  userPrompt: string;
  errors: string[];
  warnings: string[];
  tokenEstimate: {
    system: number;
    user: number;
    total: number;
  };
}
