/**
 * Template System Entry Point
 *
 * This file provides a unified API for importing templates and related utilities.
 *
 * @example
 * ```typescript
 * // Import all templates
 * import { DEFAULT_TEMPLATES } from './templates';
 *
 * // Import specific template
 * import { getTemplate } from './templates';
 * const sceneTemplate = getTemplate('scene_generation');
 *
 * // Import helper functions
 * import { renderUserPromptBlocks, validateTemplateVariables } from './templates';
 * ```
 */

// Re-export unified types
export type {
  VariableTier,
  VariableSource,
  BlockTier,
  BlockDataSource,
  BlockMetadata,
} from '../../types/promptTemplate';

// Re-export from defaults.ts (main template definitions)
export {
  DEFAULT_TEMPLATES,
  getTemplate,
  getTemplateIds,
  getVariablesByTier,
  getRequiredVariables,
  validateTemplateVariables,
  getVariableDisplayNames,
  renderUserPromptBlocks,
} from './defaults';

// Re-export types from defaults.ts
export type { PromptTemplate, TemplateVariable } from './defaults';

// Re-export category rules
export { CATEGORY_RULES, getTierColor, getTierFromKeywords, getTierFromClassification, getTierIcon, getAllTiers } from './categoryRules';

// Re-export types from category rules
export type { SectionTier, CategoryRule, CategoryColor } from './categoryRules';

// Re-export from sub-modules for modular imports
export { CHARACTER_TEMPLATES } from './character';
export { WORLD_TEMPLATES } from './world';
export { PLOT_TEMPLATES } from './plot';
export { WRITING_TEMPLATES } from './writing';
export { AUDIT_TEMPLATES } from './audit';

// Template category helpers
import { DEFAULT_TEMPLATES } from './defaults';

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: 'generation' | 'analysis' | 'refinement' | 'utility'
): Record<string, typeof DEFAULT_TEMPLATES[string]> {
  const result: Record<string, typeof DEFAULT_TEMPLATES[string]> = {};
  for (const [id, template] of Object.entries(DEFAULT_TEMPLATES)) {
    if (template.category === category) {
      result[id] = template;
    }
  }
  return result;
}

/**
 * Get all template IDs
 */
export function getAllTemplateIds(): string[] {
  return Object.keys(DEFAULT_TEMPLATES);
}

/**
 * Check if a template exists
 */
export function hasTemplate(templateId: string): boolean {
  return templateId in DEFAULT_TEMPLATES;
}
