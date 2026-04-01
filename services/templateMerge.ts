/**
 * 模板合并逻辑
 *
 * 实现三级模板覆盖的合并逻辑：用户级 > 项目级 > 默认级
 *
 * @see docs/template_schema_design.md - 设计文档
 * @see types/templateOverride.ts - 类型定义
 */

import {
  PromptTemplateDefinition,
  PromptBlock,
  PromptVariable,
  TemplateSection,
} from '../types/promptTemplate';

import {
  TemplateOverride,
  BlockOverride,
  UserTemplatePreferences,
  TemplateFieldSources,
  MergedTemplateResult,
  TemplateOverrideValidation,
} from '../types/templateOverride';

import { DEFAULT_TEMPLATES } from '../config/templates/defaults';

// ============================================================
// 主合并函数
// ============================================================

/**
 * 合并模板配置
 *
 * 按优先级合并：用户级 > 项目级 > 默认级
 *
 * @param templateId - 模板ID
 * @param projectOverride - 项目级覆盖配置
 * @param userPreference - 用户级偏好配置
 * @returns 合并后的模板结果
 *
 * @example
 * ```typescript
 * const result = mergeTemplateConfig(
 *   'scene_generation',
 *   projectOverride,
 *   userPreferences
 * );
 *
 * console.log(result.template); // 合并后的模板
 * console.log(result.sources);  // 字段来源
 * ```
 */
export function mergeTemplateConfig(
  templateId: string,
  projectOverride: TemplateOverride | undefined | null,
  userPreference: UserTemplatePreferences | undefined | null
): MergedTemplateResult {
  const warnings: string[] = [];

  // 1. 获取默认模板
  const defaultTemplate = DEFAULT_TEMPLATES[templateId];
  if (!defaultTemplate) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // 2. 初始化来源映射
  const sources: TemplateFieldSources = {
    systemInstruction: 'default',
    blocks: {},
    variables: {},
  };

  // 初始化所有区块和变量来源为 default
  defaultTemplate.userPromptBlocks.forEach(block => {
    sources.blocks[block.id] = 'default';
  });
  defaultTemplate.variables.forEach(variable => {
    sources.variables[variable.name] = 'default';
  });

  // 3. 如果没有覆盖，直接返回默认模板
  if (!projectOverride && !userPreference) {
    return {
      template: convertToDefinition(defaultTemplate),
      sources,
      warnings,
    };
  }

  // 4. 深拷贝默认模板作为合并基础
  let merged: PromptTemplateDefinition = JSON.parse(
    JSON.stringify(convertToDefinition(defaultTemplate))
  );

  // 5. 应用项目级覆盖
  if (projectOverride) {
    const result = applyProjectOverride(merged, projectOverride, sources);
    merged = result.template;
    warnings.push(...result.warnings);
  }

  // 6. 应用用户级偏好
  if (userPreference) {
    const result = applyUserPreference(merged, userPreference, sources);
    merged = result.template;
    warnings.push(...result.warnings);
  }

  return {
    template: merged,
    appliedOverride: projectOverride ?? undefined,
    sources,
    warnings,
  };
}

// ============================================================
// 项目级覆盖应用
// ============================================================

/**
 * 应用项目级覆盖
 */
function applyProjectOverride(
  template: PromptTemplateDefinition,
  override: TemplateOverride,
  sources: TemplateFieldSources
): { template: PromptTemplateDefinition; warnings: string[] } {
  const warnings: string[] = [];

  // 5.1 覆盖系统指令
  if (override.systemInstruction !== undefined) {
    template.systemTemplate = override.systemInstruction;
    sources.systemInstruction = 'project';
  }

  // 5.2 覆盖区块
  if (override.blocks) {
    const result = applyBlockOverrides(template.sections, override.blocks, sources);
    template.sections = result.sections;
    warnings.push(...result.warnings);
  }

  // 5.3 覆盖变量默认值
  if (override.variableDefaults) {
    const result = applyVariableOverrides(
      template.variables,
      override.variableDefaults,
      sources,
      'project'
    );
    template.variables = result.variables;
    warnings.push(...result.warnings);
  }

  return { template, warnings };
}

// ============================================================
// 区块覆盖应用
// ============================================================

/**
 * 应用区块覆盖
 */
function applyBlockOverrides(
  sections: TemplateSection[],
  blockOverrides: Record<string, BlockOverride>,
  sources: TemplateFieldSources
): { sections: TemplateSection[]; warnings: string[] } {
  const warnings: string[] = [];
  const result: TemplateSection[] = [];

  for (const section of sections) {
    const override = blockOverrides[section.id];

    // 如果区块被禁用，跳过
    if (override?.disabled) {
      warnings.push(`Block "${section.id}" is disabled by override`);
      continue;
    }

    // 如果没有覆盖，保留原区块
    if (!override) {
      result.push(section);
      continue;
    }

    // 应用覆盖
    const mergedSection: TemplateSection = {
      ...section,
    };

    // 覆盖模板内容
    if (override.template !== undefined) {
      // 注意：TemplateSection 的 template 字段需要在 PromptBlock 中
      // 这里需要将 TemplateSection 转换为包含 template 的结构
      (mergedSection as any).template = override.template;
    }

    // 覆盖条件
    if (override.condition !== undefined) {
      mergedSection.condition = override.condition === null ? undefined : override.condition;
    }

    // 覆盖顺序
    if (override.order !== undefined) {
      mergedSection.order = override.order;
    }

    // 覆盖元数据
    if (override.metadata) {
      mergedSection.metadata = {
        ...section.metadata,
        ...override.metadata,
      } as any;
    }

    sources.blocks[section.id] = 'project';
    result.push(mergedSection);
  }

  // 按顺序排序
  result.sort((a, b) => a.order - b.order);

  return { sections: result, warnings };
}

// ============================================================
// 变量覆盖应用
// ============================================================

/**
 * 应用变量默认值覆盖
 */
function applyVariableOverrides(
  variables: PromptVariable[],
  overrides: Record<string, unknown>,
  sources: TemplateFieldSources,
  level: 'project' | 'user'
): { variables: PromptVariable[]; warnings: string[] } {
  const warnings: string[] = [];
  const result: PromptVariable[] = variables.map(variable => {
    const overrideValue = overrides[variable.name];

    if (overrideValue !== undefined) {
      // 验证类型
      const typeValid = validateVariableType(overrideValue, variable.type);
      if (!typeValid) {
        warnings.push(
          `Variable "${variable.name}" override type mismatch: expected ${variable.type}, got ${typeof overrideValue}`
        );
      }

      sources.variables[variable.name] = level;
      return {
        ...variable,
        defaultValue: overrideValue,
      };
    }

    return variable;
  });

  return { variables: result, warnings };
}

// ============================================================
// 用户级偏好应用
// ============================================================

/**
 * 应用用户级偏好
 */
function applyUserPreference(
  template: PromptTemplateDefinition,
  preference: UserTemplatePreferences,
  sources: TemplateFieldSources
): { template: PromptTemplateDefinition; warnings: string[] } {
  const warnings: string[] = [];

  // 应用全局变量默认值（仅当项目级未定义时）
  if (preference.globalVariableDefaults) {
    const result = applyUserVariableDefaults(
      template.variables,
      preference.globalVariableDefaults,
      sources
    );
    template.variables = result.variables;
    warnings.push(...result.warnings);
  }

  // 应用模板类型偏好
  if (preference.templatePreferences) {
    const typePref = preference.templatePreferences[template.id];
    if (typePref) {
      // 应用常用变量值
      if (typePref.frequentVariables) {
        const result = applyUserVariableDefaults(
          template.variables,
          typePref.frequentVariables,
          sources
        );
        template.variables = result.variables;
        warnings.push(...result.warnings);
      }
    }
  }

  return { template, warnings };
}

/**
 * 应用用户级变量默认值
 * 仅当项目级未定义时才应用
 */
function applyUserVariableDefaults(
  variables: PromptVariable[],
  defaults: Record<string, unknown>,
  sources: TemplateFieldSources
): { variables: PromptVariable[]; warnings: string[] } {
  const warnings: string[] = [];

  const result = variables.map(variable => {
    // 如果项目级已定义，跳过
    if (sources.variables[variable.name] === 'project') {
      return variable;
    }

    const userDefault = defaults[variable.name];
    if (userDefault !== undefined && variable.defaultValue === undefined) {
      sources.variables[variable.name] = 'user';
      return {
        ...variable,
        defaultValue: userDefault,
      };
    }

    return variable;
  });

  return { variables: result, warnings };
}

// ============================================================
// 区块过滤和排序
// ============================================================

/**
 * 过滤并排序区块
 *
 * @param blocks - 区块列表
 * @param override - 模板覆盖配置
 * @returns 过滤和排序后的区块
 */
export function filterAndSortBlocks(
  blocks: PromptBlock[],
  override: TemplateOverride | undefined
): PromptBlock[] {
  return blocks
    .filter(block => {
      // 检查是否被禁用
      const blockOverride = override?.blocks?.[block.id];
      if (blockOverride?.disabled) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // 使用覆盖的顺序或原始顺序
      const orderA = override?.blocks?.[a.id]?.order ?? a.order;
      const orderB = override?.blocks?.[b.id]?.order ?? b.order;
      return orderA - orderB;
    });
}

// ============================================================
// 验证函数
// ============================================================

/**
 * 验证模板覆盖配置
 */
export function validateTemplateOverride(
  override: TemplateOverride,
  templateId: string
): TemplateOverrideValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: any = {};

  // 1. 验证模板ID存在
  const defaultTemplate = DEFAULT_TEMPLATES[templateId];
  if (!defaultTemplate) {
    errors.push(`Template not found: ${templateId}`);
    return { valid: false, errors, warnings };
  }

  // 2. 验证系统指令
  if (override.systemInstruction !== undefined) {
    details.systemInstruction = {
      valid: true,
      length: override.systemInstruction.length,
      maxLength: 10000,
    };

    if (override.systemInstruction.length > 10000) {
      warnings.push('System instruction exceeds 10000 characters');
      details.systemInstruction.valid = false;
    }

    if (override.systemInstruction.trim().length === 0) {
      errors.push('System instruction cannot be empty');
      details.systemInstruction.valid = false;
    }
  }

  // 3. 验证区块覆盖
  if (override.blocks) {
    const validBlockIds = new Set(defaultTemplate.userPromptBlocks.map(b => b.id));
    details.blocks = {};

    for (const [blockId, blockOverride] of Object.entries(override.blocks)) {
      const blockDetail: any = {
        valid: true,
      };

      if (!validBlockIds.has(blockId)) {
        errors.push(`Invalid block ID: ${blockId}`);
        blockDetail.valid = false;
      } else {
        // 验证区块模板语法
        if (blockOverride.template !== undefined) {
          const syntaxErrors = validateTemplateSyntax(blockOverride.template);
          if (syntaxErrors.length > 0) {
            errors.push(...syntaxErrors.map(e => `Block "${blockId}": ${e}`));
            blockDetail.templateValid = false;
            blockDetail.valid = false;
          } else {
            blockDetail.templateValid = true;
          }
        }

        // 验证条件表达式
        if (blockOverride.condition !== undefined && blockOverride.condition !== null) {
          const conditionErrors = validateConditionSyntax(blockOverride.condition);
          if (conditionErrors.length > 0) {
            errors.push(...conditionErrors.map(e => `Block "${blockId}" condition: ${e}`));
            blockDetail.conditionValid = false;
            blockDetail.valid = false;
          } else {
            blockDetail.conditionValid = true;
          }
        }
      }

      details.blocks[blockId] = blockDetail;
    }
  }

  // 4. 验证变量默认值
  if (override.variableDefaults) {
    const validVarNames = new Set(defaultTemplate.variables.map(v => v.name));
    const varTypes = new Map(defaultTemplate.variables.map(v => [v.name, v.type]));
    details.variables = {};

    for (const [varName, value] of Object.entries(override.variableDefaults)) {
      const varDetail: any = {
        valid: true,
      };

      if (!validVarNames.has(varName)) {
        warnings.push(`Unknown variable: ${varName}`);
        varDetail.valid = false;
      } else {
        // 验证类型
        const expectedType = varTypes.get(varName);
        if (expectedType && !validateVariableType(value, expectedType)) {
          warnings.push(
            `Variable "${varName}" type mismatch: expected ${expectedType}, got ${typeof value}`
          );
          varDetail.typeValid = false;
        } else {
          varDetail.typeValid = true;
        }
      }

      details.variables[varName] = varDetail;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details,
  };
}

/**
 * 验证模板语法
 */
function validateTemplateSyntax(template: string): string[] {
  const errors: string[] = [];

  // 检查未闭合的 {{}}
  const openBraces = (template.match(/{{/g) || []).length;
  const closeBraces = (template.match(/}}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push('Unclosed variable placeholders');
  }

  // 检查未闭合的 {{#each}}{{/each}}
  const eachOpen = (template.match(/{{#each/g) || []).length;
  const eachClose = (template.match(/{{\/each/g) || []).length;

  if (eachOpen !== eachClose) {
    errors.push('Unclosed {{#each}} blocks');
  }

  // 检查未闭合的 {{#if}}{{/if}}
  const ifOpen = (template.match(/{{#if/g) || []).length;
  const ifClose = (template.match(/{{\/if/g) || []).length;

  if (ifOpen !== ifClose) {
    errors.push('Unclosed {{#if}} blocks');
  }

  return errors;
}

/**
 * 验证条件表达式语法
 */
function validateConditionSyntax(condition: string): string[] {
  const errors: string[] = [];

  // 简单的语法检查
  try {
    // 尝试创建一个简单的函数来验证语法
    // 注意：这不执行代码，仅检查语法
    new Function(`return ${condition}`);
  } catch (error) {
    errors.push(`Invalid condition syntax: ${condition}`);
  }

  return errors;
}

/**
 * 验证变量值类型
 */
function validateVariableType(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 将 defaults.ts 中的 PromptTemplate 转换为 PromptTemplateDefinition
 */
function convertToDefinition(template: any): PromptTemplateDefinition {
  return {
    id: template.id,
    label: template.name,
    description: template.description,
    category: mapCategory(template.category),
    systemTemplate: template.systemInstruction,
    userTemplate: buildUserTemplate(template.userPromptBlocks),
    variables: mapVariables(template.variables),
    sections: mapSections(template.userPromptBlocks),
    version: template.metadata?.version,
    author: template.metadata?.author,
    tags: template.metadata?.tags,
  };
}

/**
 * 映射模板分类
 */
function mapCategory(
  category: 'generation' | 'analysis' | 'refinement' | 'utility'
): 'writing' | 'world' | 'character' | 'plot' | 'audit' | 'other' {
  const categoryMap: Record<string, any> = {
    generation: 'writing',
    analysis: 'audit',
    refinement: 'writing',
    utility: 'other',
  };
  return categoryMap[category] || 'other';
}

/**
 * 构建 User Template 字符串
 */
function buildUserTemplate(blocks: any[]): string {
  return blocks
    .sort((a, b) => a.order - b.order)
    .map(block => block.template)
    .join('\n\n');
}

/**
 * 映射变量定义
 */
function mapVariables(variables: any[]): PromptVariable[] {
  return variables.map(v => ({
    name: v.name,
    type: mapVariableType(v.type),
    tier: v.tier,
    source: v.source,
    required: v.required,
    description: v.description,
    display: {
      collapsible: v.tier !== 'critical',
      previewLength: 100,
      badge: v.display,
    },
    defaultValue: v.defaultValue,
  }));
}

/**
 * 映射变量类型
 */
function mapVariableType(type: string): 'string' | 'array' | 'object' | 'boolean' | 'number' {
  const typeMap: Record<string, any> = {
    string: 'string',
    'string[]': 'array',
    number: 'number',
    boolean: 'boolean',
    object: 'object',
  };
  return typeMap[type] || 'string';
}

/**
 * 映射区块定义
 */
function mapSections(blocks: any[]): TemplateSection[] {
  return blocks.map(block => ({
    id: block.id,
    label: block.title,
    template: block.template,  // 包含模板内容
    condition: block.condition,
    order: block.order,
    icon: undefined,
    metadata: block.metadata,
  }));
}
