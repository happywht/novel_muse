/**
 * PromptPanel 组件导出
 *
 * 核心组件用于管理和编辑 AI 提示词
 */

// 主组件
export { PromptPanel } from './PromptPanel';
export type {
  PromptPanelProps,
  PromptPanelMode,
  ModuleType,
} from './PromptPanel';

// 子组件
export { PromptBadge } from './PromptBadge';
export { PromptEditor } from './PromptEditor';
export type { PromptItem, PromptTemplate } from './PromptEditor';

export { EffectBadge, getEffectLevel } from './EffectBadge';
export type { EffectLevel } from './EffectBadge';

export { ParameterControl } from './ParameterControl';
export type {
  ParameterConfig,
  ParameterType,
  SelectOption,
} from './ParameterControl';

// 变量管理面板
export { VariableManagerPanel } from './VariableManagerPanel';
export type { VariableManagerPanelProps } from './VariableManagerPanel';

// 工具函数和常量
export { MODULE_PROMPT_MAP } from './PromptPanel';
