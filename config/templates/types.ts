/**
 * Template Type Re-exports
 *
 * This file re-exports types from the unified source at types/promptTemplate.ts
 * for backward compatibility with existing imports.
 *
 * @deprecated Import directly from '../../types/promptTemplate' instead
 */

export type {
  VariableTier,
  VariableSource,
  BlockTier,
  BlockDataSource,
  BlockMetadata,
  TemplateVariable,
  PromptBlock,
} from '../../types/promptTemplate';

// Note: PromptTemplate is specific to defaults.ts and is defined there
// It uses PromptBlock from the unified types
