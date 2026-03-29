/**
 * 模板注册表服务
 *
 * 管理提示词模板的注册、检索和验证
 * 支持三级模板覆盖: 用户级 > 项目级 > 默认级
 */

import {
  PromptTemplateDefinition,
  PromptVariable,
  VariableTier,
  TemplateCategory,
} from '../types/promptTemplate';

import { DEFAULT_TEMPLATES } from '../config/templates/defaults';

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  missing: string[];
  errors: string[];
  warnings: string[];
}

/**
 * 模板注册表配置
 */
interface TemplateRegistryConfig {
  /** 是否启用项目级模板覆盖 */
  enableProjectTemplates?: boolean;
  /** 是否启用用户级模板覆盖 */
  enableUserTemplates?: boolean;
}

/**
 * 模板注册表类
 *
 * 负责管理所有模板的注册、检索和验证
 */
export class TemplateRegistry {
  /** 默认模板存储 */
  private defaultTemplates: Map<string, PromptTemplateDefinition> = new Map();

  /** 项目级模板覆盖 */
  private projectTemplates: Map<string, PromptTemplateDefinition> = new Map();

  /** 用户级模板覆盖 */
  private userTemplates: Map<string, PromptTemplateDefinition> = new Map();

  /** 配置 */
  private config: TemplateRegistryConfig;

  constructor(config: TemplateRegistryConfig = {}) {
    this.config = {
      enableProjectTemplates: true,
      enableUserTemplates: true,
      ...config,
    };

    // 加载默认模板
    this.loadDefaultTemplates();
  }

  /**
   * 加载默认模板
   */
  private loadDefaultTemplates(): void {
    // 将 DEFAULT_TEMPLATES 转换为 PromptTemplateDefinition 格式
    Object.entries(DEFAULT_TEMPLATES).forEach(([id, template]) => {
      const definition: PromptTemplateDefinition = {
        id: template.id,
        label: template.name,
        description: template.description,
        category: this.mapCategory(template.category),
        systemTemplate: template.systemInstruction,
        userTemplate: this.buildUserTemplate(template.userPromptBlocks),
        variables: this.mapVariables(template.variables),
        sections: this.mapSections(template.userPromptBlocks),
        version: template.metadata?.version,
        author: template.metadata?.author,
        tags: template.metadata?.tags,
      };

      this.defaultTemplates.set(id, definition);
    });
  }

  /**
   * 映射模板分类
   */
  private mapCategory(
    category: 'generation' | 'analysis' | 'refinement' | 'utility'
  ): TemplateCategory {
    const categoryMap: Record<string, TemplateCategory> = {
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
  private buildUserTemplate(blocks: any[]): string {
    return blocks
      .sort((a, b) => a.order - b.order)
      .map((block) => block.template)
      .join('\n\n');
  }

  /**
   * 映射变量定义
   */
  private mapVariables(variables: any[]): PromptVariable[] {
    return variables.map((v) => ({
      name: v.name,
      type: this.mapVariableType(v.type),
      tier: v.tier as VariableTier,
      source: this.mapVariableSource(v.source),
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
  private mapVariableType(type: string): 'string' | 'array' | 'object' | 'boolean' | 'number' {
    const typeMap: Record<string, 'string' | 'array' | 'object' | 'boolean' | 'number'> = {
      string: 'string',
      'string[]': 'array',
      number: 'number',
      boolean: 'boolean',
      object: 'object',
    };
    return typeMap[type] || 'string';
  }

  /**
   * 映射变量来源
   */
  private mapVariableSource(source: string): 'user' | 'project' | 'computed' | 'system' {
    const sourceMap: Record<string, 'user' | 'project' | 'computed' | 'system'> = {
      user_input: 'user',
      project_state: 'project',
      computed: 'computed',
      derived: 'computed',
      optional: 'system',
    };
    return sourceMap[source] || 'system';
  }

  /**
   * 映射模板块为 sections
   */
  private mapSections(blocks: any[]): any[] {
    return blocks.map((block) => ({
      id: block.id,
      label: block.title,
      condition: block.condition,
      order: block.order,
    }));
  }

  /**
   * 注册模板
   *
   * @param template - 模板定义
   * @param level - 注册级别: 'default' | 'project' | 'user'
   */
  registerTemplate(
    template: PromptTemplateDefinition,
    level: 'default' | 'project' | 'user' = 'default'
  ): void {
    const targetMap =
      level === 'user'
        ? this.userTemplates
        : level === 'project'
          ? this.projectTemplates
          : this.defaultTemplates;

    targetMap.set(template.id, template);
  }

  /**
   * 获取模板(支持覆盖级联)
   *
   * 优先级: 用户级 > 项目级 > 默认级
   */
  getTemplate(id: string): PromptTemplateDefinition | null {
    // 1. 检查用户级模板
    if (this.config.enableUserTemplates && this.userTemplates.has(id)) {
      return this.userTemplates.get(id) || null;
    }

    // 2. 检查项目级模板
    if (this.config.enableProjectTemplates && this.projectTemplates.has(id)) {
      return this.projectTemplates.get(id) || null;
    }

    // 3. 返回默认模板
    return this.defaultTemplates.get(id) || null;
  }

  /**
   * 获取所有模板
   *
   * @param includeAllLevels - 是否包含所有级别的模板
   */
  getAllTemplates(includeAllLevels: boolean = false): PromptTemplateDefinition[] {
    if (includeAllLevels) {
      const allTemplates = new Map<string, PromptTemplateDefinition>();

      // 默认模板
      this.defaultTemplates.forEach((template, id) => {
        allTemplates.set(id, template);
      });

      // 项目级模板(覆盖默认)
      if (this.config.enableProjectTemplates) {
        this.projectTemplates.forEach((template, id) => {
          allTemplates.set(id, template);
        });
      }

      // 用户级模板(覆盖所有)
      if (this.config.enableUserTemplates) {
        this.userTemplates.forEach((template, id) => {
          allTemplates.set(id, template);
        });
      }

      return Array.from(allTemplates.values());
    }

    // 只返回默认模板
    return Array.from(this.defaultTemplates.values());
  }

  /**
   * 获取模板变量定义
   */
  getVariables(templateId: string): PromptVariable[] {
    const template = this.getTemplate(templateId);
    if (!template) {
      return [];
    }
    return template.variables;
  }

  /**
   * 按重要性获取变量
   */
  getVariablesByTier(templateId: string, tier: VariableTier): PromptVariable[] {
    const variables = this.getVariables(templateId);
    return variables.filter((v) => v.tier === tier);
  }

  /**
   * 验证变量完整性
   */
  validateVariables(templateId: string, values: Record<string, any>): ValidationResult {
    const template = this.getTemplate(templateId);

    if (!template) {
      return {
        valid: false,
        missing: [],
        errors: [`Template not found: ${templateId}`],
        warnings: [],
      };
    }

    const missing: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必填变量
    template.variables.forEach((variable) => {
      const value = values[variable.name];

      if (variable.required) {
        if (value === undefined || value === null || value === '') {
          missing.push(variable.name);
          errors.push(`Missing required variable: ${variable.name} (${variable.description})`);
        }
      } else {
        // 可选变量缺失时给出警告
        if (value === undefined || value === null) {
          if (variable.tier === 'important') {
            warnings.push(
              `Important variable not provided: ${variable.name} (${variable.description})`
            );
          }
        }
      }

      // 类型检查
      if (value !== undefined && value !== null) {
        const typeError = this.validateVariableType(variable, value);
        if (typeError) {
          errors.push(typeError);
        }
      }
    });

    return {
      valid: errors.length === 0,
      missing,
      errors,
      warnings,
    };
  }

  /**
   * 验证变量类型
   */
  private validateVariableType(variable: PromptVariable, value: any): string | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    switch (variable.type) {
      case 'string':
        if (actualType !== 'string') {
          return `Variable ${variable.name} should be string, got ${actualType}`;
        }
        break;
      case 'number':
        if (actualType !== 'number') {
          return `Variable ${variable.name} should be number, got ${actualType}`;
        }
        break;
      case 'boolean':
        if (actualType !== 'boolean') {
          return `Variable ${variable.name} should be boolean, got ${actualType}`;
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return `Variable ${variable.name} should be array, got ${actualType}`;
        }
        break;
      case 'object':
        if (actualType !== 'object' || Array.isArray(value)) {
          return `Variable ${variable.name} should be object, got ${actualType}`;
        }
        break;
    }

    return null;
  }

  /**
   * 获取模板分类
   */
  getTemplatesByCategory(category: TemplateCategory): PromptTemplateDefinition[] {
    const allTemplates = this.getAllTemplates(true);
    return allTemplates.filter((template) => template.category === category);
  }

  /**
   * 清除项目级模板
   */
  clearProjectTemplates(): void {
    this.projectTemplates.clear();
  }

  /**
   * 清除用户级模板
   */
  clearUserTemplates(): void {
    this.userTemplates.clear();
  }

  /**
   * 清除所有自定义模板
   */
  clearAllCustomTemplates(): void {
    this.clearProjectTemplates();
    this.clearUserTemplates();
  }

  /**
   * 获取模板统计信息
   */
  getStats(): {
    default: number;
    project: number;
    user: number;
    total: number;
  } {
    return {
      default: this.defaultTemplates.size,
      project: this.projectTemplates.size,
      user: this.userTemplates.size,
      total: this.getAllTemplates(true).length,
    };
  }
}

// ============================================================
// 单例实例
// ============================================================

/**
 * 全局模板注册表实例
 */
export const templateRegistry = new TemplateRegistry();

// ============================================================
// 便捷导出函数
// ============================================================

/**
 * 获取模板
 */
export function getTemplate(id: string): PromptTemplateDefinition | null {
  return templateRegistry.getTemplate(id);
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): PromptTemplateDefinition[] {
  return templateRegistry.getAllTemplates(true);
}

/**
 * 获取模板变量
 */
export function getTemplateVariables(templateId: string): PromptVariable[] {
  return templateRegistry.getVariables(templateId);
}

/**
 * 按重要性获取变量
 */
export function getVariablesByTier(templateId: string, tier: VariableTier): PromptVariable[] {
  return templateRegistry.getVariablesByTier(templateId, tier);
}

/**
 * 验证模板变量
 */
export function validateTemplateVariables(
  templateId: string,
  values: Record<string, any>
): ValidationResult {
  return templateRegistry.validateVariables(templateId, values);
}

/**
 * 按分类获取模板
 */
export function getTemplatesByCategory(category: TemplateCategory): PromptTemplateDefinition[] {
  return templateRegistry.getTemplatesByCategory(category);
}

/**
 * 注册模板
 */
export function registerTemplate(
  template: PromptTemplateDefinition,
  level?: 'default' | 'project' | 'user'
): void {
  templateRegistry.registerTemplate(template, level);
}
