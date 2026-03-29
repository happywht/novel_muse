import { AppSection } from '../types';

/**
 * Prompt覆盖层级
 */
export type PromptOverrideTier = 'DEFAULT' | 'PROJECT' | 'MODULE';

/**
 * 模块Prompt配置
 */
export interface ModulePromptConfig {
  moduleId: AppSection;
  promptKeys: string[]; // 该模块相关的prompt keys
  creativity?: number; // 默认创意值
  parameters?: PromptParameter[];
}

/**
 * Prompt参数定义
 */
export interface PromptParameter {
  name: string;
  type: 'slider' | 'select' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  default: any;
  label: string;
  description: string;
}

/**
 * PromptPanel属性
 */
export interface PromptPanelProps {
  moduleId: AppSection;
  compact?: boolean; // 紧凑模式（仅显示徽章）
  defaultCollapsed?: boolean;
  onPromptChange?: (key: string, value: string) => void;
  onParameterChange?: (key: string, value: any) => void;
}

/**
 * Prompt状态徽章数据
 */
export interface PromptBadgeData {
  totalPrompts: number;
  modifiedCount: number;
  tier: PromptOverrideTier;
}
