/**
 * PromptPanel Types
 * Defines types for prompt panel component and related functionality
 */

// ============================================
// Base Types
// ============================================

/**
 * Effect level for prompt overrides
 * - default: Default prompt template
 * - project: Project-level override
 * - module: Module-specific override
 */
export type EffectLevel = 'default' | 'project' | 'module';

/**
 * Parameter input type for prompt configuration
 */
export type ParameterType = 'slider' | 'select' | 'text' | 'number';

/**
 * Parameter definition for prompt configuration
 */
export interface PromptParameter {
  /** Parameter identifier name */
  name: string;
  /** Input type for the parameter */
  type: ParameterType;
  /** Display label for the parameter */
  label: string;
  /** Minimum value (for slider/number types) */
  min?: number;
  /** Maximum value (for slider/number types) */
  max?: number;
  /** Step increment (for slider/number types) */
  step?: number;
  /** Default value for the parameter */
  default: unknown;
  /** Available options (for select type) */
  options?: Array<{ value: unknown; label: string }>;
}

// ============================================
// Prompt Template Extension
// ============================================

/**
 * Prompt template extension definition
 * Allows extending base prompts with custom instructions
 */
export interface PromptTemplateExtension {
  /** Unique key for the prompt template */
  key: string;
  /** Associated module IDs (optional) */
  modules?: string[];
  /** Configurable parameters for this template */
  parameters?: PromptParameter[];
  /** Display label */
  label: string;
  /** Description of what this prompt does */
  description: string;
  /** The actual instruction/template content */
  instruction: string;
}

// ============================================
// Component Props
// ============================================

/**
 * Props for PromptPanel component
 */
export interface PromptPanelProps {
  /** Current module ID */
  moduleId: string;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Callback to toggle collapsed state */
  onToggle?: () => void;
}

/**
 * Props for PromptBadge component
 * Displays prompt status indicator
 */
export interface PromptBadgeProps {
  /** Number of available prompts */
  count: number;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
}

/**
 * Props for EffectBadge component
 * Displays effect level indicator
 */
export interface EffectBadgeProps {
  /** Effect level (default/project/module) */
  level: EffectLevel;
}

// ============================================
// Storage Types
// ============================================

/**
 * Prompt override configuration
 * Used for storing customized prompts at different levels
 */
export interface PromptOverride {
  /** Prompt template key being overridden */
  key: string;
  /** Override content/value */
  value: string;
  /** Effect level for this override */
  level: EffectLevel;
  /** Module ID (required when level is 'module') */
  moduleId?: string;
  /** Timestamp of last update */
  updatedAt: string;
}

// ============================================
// Utility Types
// ============================================

/**
 * Parameter value map type
 * Maps parameter names to their values
 */
export type ParameterValues = Record<string, unknown>;

/**
 * Complete prompt configuration for a module
 */
export interface ModulePromptConfig {
  /** Module ID */
  moduleId: string;
  /** Active prompt overrides */
  overrides: PromptOverride[];
  /** Current parameter values */
  parameterValues: ParameterValues;
  /** Last modified timestamp */
  lastModified: string;
}
