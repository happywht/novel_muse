/**
 * 模板覆盖 CRUD API 路由
 *
 * 提供模板覆盖的完整 CRUD 操作:
 * - GET /api/projects/:id/templates - 获取项目所有模板列表
 * - GET /api/projects/:id/templates/:templateId - 获取单个模板的合并结果
 * - PATCH /api/projects/:id/templates/:templateId - 更新模板覆盖配置
 * - DELETE /api/projects/:id/templates/:templateId - 删除模板覆盖
 * - GET /api/projects/:id/templates/export - 导出模板配置
 * - POST /api/projects/:id/templates/import - 导入模板配置（支持版本迁移）
 *
 * @see docs/template_schema_design.md - Schema 设计文档
 * @see types/templateOverride.ts - TypeScript 类型定义
 * @see services/templateMerge.ts - 模板合并逻辑
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import {
  TemplateOverrideConfig,
  TemplateOverride,
  BlockOverride,
  TemplateOverrideMetadata,
  GetTemplateResponse,
  UpdateTemplateRequest,
  UpdateTemplateResponse,
  ResetTemplateResponse,
  TemplateOverrideExport,
} from '../../../types/templateOverride';
import {
  PromptVariable,
  VariableType,
  VariableTier,
  VariableSource,
  TemplateSection,
} from '../../../types/promptTemplate';
import {
  mergeTemplateConfig,
  validateTemplateOverride,
} from '../../../services/templateMerge';
import {
  DEFAULT_TEMPLATES,
  TemplateVariable,
  PromptBlock,
} from '../../../config/templates/defaults';

// ============================================================
// 版本迁移相关类型和常量
// ============================================================

/**
 * 支持的配置版本列表
 */
const SUPPORTED_VERSIONS = ['1.0', '1.0.0'] as const;

/**
 * 当前最新版本
 */
const CURRENT_VERSION = '1.0.0';

/**
 * 版本迁移函数类型
 */
type VersionMigrator = (config: any) => TemplateOverrideConfig;

/**
 * 版本迁移映射表
 */
const VERSION_MIGRATORS: Record<string, VersionMigrator> = {};

const router = Router();

// ============================================================
// 类型转换函数
// ============================================================

/**
 * 将 TemplateVariable 转换为 PromptVariable
 */
function convertTemplateVariableToPromptVariable(v: TemplateVariable): PromptVariable {
  return {
    name: v.name,
    type: convertVariableType(v.type),
    tier: v.tier as VariableTier,
    source: v.source as VariableSource,
    required: v.required,
    description: v.description,
    display: {
      collapsible: v.tier !== 'critical',
      previewLength: 100,
      badge: v.display,
    },
    defaultValue: v.defaultValue,
  };
}

/**
 * 转换变量类型
 */
function convertVariableType(type: string): VariableType {
  const typeMap: Record<string, VariableType> = {
    string: 'string',
    'string[]': 'array',
    number: 'number',
    boolean: 'boolean',
    object: 'object',
  };
  return typeMap[type] || 'string';
}

/**
 * 将 PromptBlock 转换为 TemplateSection
 */
function convertPromptBlockToTemplateSection(block: PromptBlock): TemplateSection {
  return {
    id: block.id,
    label: block.label || block.title,
    template: block.template,
    condition: block.condition,
    order: block.order,
    metadata: block.metadata,
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 从 req.params 中安全获取字符串参数
 */
function getParam(params: Record<string, string | string[]>, key: string): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 安全获取路由参数中的字符串
 */
function getParamString(param: string | string[] | undefined): string | undefined {
  if (param === undefined) return undefined;
  if (Array.isArray(param)) return param[0];
  return param;
}

/**
 * 解析项目的模板覆盖配置
 */
function parseTemplateConfig(customTemplates: string | null): TemplateOverrideConfig | null {
  if (!customTemplates) return null;

  try {
    const config = JSON.parse(customTemplates) as TemplateOverrideConfig;

    // 验证版本
    if (!config.version || !config.templates) {
      console.warn('Invalid template config structure');
      return null;
    }

    return config;
  } catch (error) {
    console.error('Failed to parse template config:', error);
    return null;
  }
}

/**
 * 序列化模板覆盖配置
 */
function serializeTemplateConfig(config: TemplateOverrideConfig): string {
  return JSON.stringify(config);
}

/**
 * 初始化空的模板配置
 */
function createEmptyConfig(): TemplateOverrideConfig {
  return {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    templates: {},
  };
}

/**
 * 获取所有可用模板的列表
 */
function getAvailableTemplateIds(): string[] {
  return Object.keys(DEFAULT_TEMPLATES);
}

/**
 * 获取模板摘要信息
 */
function getTemplateSummary(templateId: string, override?: TemplateOverride) {
  const defaultTemplate = DEFAULT_TEMPLATES[templateId];
  if (!defaultTemplate) return null;

  return {
    id: templateId,
    name: defaultTemplate.name,
    description: defaultTemplate.description,
    category: defaultTemplate.category,
    hasOverride: !!override,
    overrideSummary: override ? {
      hasSystemInstruction: !!override.systemInstruction,
      overriddenBlocks: override.blocks ? Object.keys(override.blocks).length : 0,
      overriddenVariables: override.variableDefaults ? Object.keys(override.variableDefaults).length : 0,
      modifiedAt: override.metadata?.modifiedAt,
    } : null,
  };
}

// ============================================================
// 版本迁移逻辑
// ============================================================

/**
 * 版本迁移函数
 *
 * 将旧版本的配置迁移到当前版本
 * 支持向后兼容，为未来版本预留扩展点
 *
 * @param config - 旧版本配置
 * @param fromVersion - 源版本号
 * @returns 迁移后的配置
 */
function migrateConfigVersion(config: any, fromVersion: string): TemplateOverrideConfig {
  // 如果已经是当前版本，直接返回
  if (fromVersion === CURRENT_VERSION || fromVersion === '1.0') {
    // 标准化版本号
    return {
      ...config,
      version: CURRENT_VERSION,
    };
  }

  // 查找迁移函数
  const migrator = VERSION_MIGRATORS[fromVersion];
  if (migrator) {
    return migrator(config);
  }

  // 未知版本，尝试兼容处理
  console.warn(`Unknown config version: ${fromVersion}, attempting compatibility mode`);

  // 尝试提取有效数据
  const migrated: TemplateOverrideConfig = {
    version: CURRENT_VERSION,
    lastModified: new Date().toISOString(),
    templates: {},
  };

  // 尝试保留模板数据
  if (config.templates && typeof config.templates === 'object') {
    migrated.templates = config.templates;
  }

  return migrated;
}

/**
 * 检查版本兼容性
 *
 * @param version - 要检查的版本号
 * @returns 是否兼容
 */
function isVersionSupported(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version as any);
}

/**
 * 验证导入数据格式
 *
 * @param data - 导入数据
 * @returns 验证结果
 */
function validateImportFormat(data: any): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // 检查必需字段
  if (!data) {
    return { valid: false, error: '导入数据为空' };
  }

  if (typeof data !== 'object') {
    return { valid: false, error: '导入数据格式无效，必须为对象' };
  }

  if (!data.version) {
    return { valid: false, error: '缺少 version 字段' };
  }

  if (typeof data.version !== 'string') {
    return { valid: false, error: 'version 字段必须为字符串' };
  }

  if (!data.templates) {
    return { valid: false, error: '缺少 templates 字段' };
  }

  if (!Array.isArray(data.templates)) {
    return { valid: false, error: 'templates 字段必须为数组' };
  }

  // 检查版本兼容性
  if (!isVersionSupported(data.version)) {
    return {
      valid: false,
      error: `不支持的版本号: ${data.version}，当前支持的版本: ${SUPPORTED_VERSIONS.join(', ')}`,
    };
  }

  // 检查可选字段
  if (data.exportedAt && typeof data.exportedAt !== 'string') {
    warnings.push('exportedAt 字段应为字符串格式');
  }

  if (data.metadata && typeof data.metadata !== 'object') {
    warnings.push('metadata 字段应为对象格式');
  }

  return { valid: true, warnings };
}

/**
 * 验证单个模板覆盖配置
 *
 * @param override - 模板覆盖配置
 * @param availableTemplateIds - 可用的模板ID列表
 * @returns 验证结果
 */
function validateTemplateOverrideForImport(
  override: any,
  availableTemplateIds: string[]
): {
  valid: boolean;
  templateId?: string;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // 检查 templateId
  if (!override.templateId) {
    return { valid: false, error: '缺少 templateId 字段' };
  }

  if (typeof override.templateId !== 'string') {
    return { valid: false, templateId: override.templateId, error: 'templateId 必须为字符串' };
  }

  const { templateId } = override;

  // 检查模板是否存在
  if (!availableTemplateIds.includes(templateId)) {
    return {
      valid: false,
      templateId,
      error: `模板 ${templateId} 不存在，可用模板: ${availableTemplateIds.join(', ')}`,
    };
  }

  // 检查必需字段
  if (override.systemInstruction !== undefined && typeof override.systemInstruction !== 'string') {
    warnings.push(`模板 ${templateId}: systemInstruction 应为字符串`);
  }

  if (override.blocks !== undefined && typeof override.blocks !== 'object') {
    return {
      valid: false,
      templateId,
      error: 'blocks 字段必须为对象',
    };
  }

  if (override.variableDefaults !== undefined && typeof override.variableDefaults !== 'object') {
    return {
      valid: false,
      templateId,
      error: 'variableDefaults 字段必须为对象',
    };
  }

  if (override.metadata !== undefined && typeof override.metadata !== 'object') {
    warnings.push(`模板 ${templateId}: metadata 应为对象`);
  }

  return { valid: true, templateId, warnings };
}

// ============================================================
// GET /api/projects/:id/templates
// 获取项目所有模板列表（带覆盖状态）
// ============================================================

router.get('/:id/templates', async (req: Request, res: Response) => {
  try {
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { customTemplates: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${projectId} does not exist`,
      });
    }

    // 解析模板配置
    const config = parseTemplateConfig(project.customTemplates);

    // 获取所有可用模板
    const availableTemplateIds = getAvailableTemplateIds();

    // 构建模板列表
    const templates = availableTemplateIds
      .map(templateId => {
        const override = config?.templates[templateId];
        return getTemplateSummary(templateId, override);
      })
      .filter(summary => summary !== null);

    // 统计信息
    const stats = {
      total: templates.length,
      withOverrides: templates.filter(t => t.hasOverride).length,
      lastModified: config?.lastModified || null,
    };

    res.json({
      projectId,
      templates,
      stats,
    });
  } catch (error) {
    console.error('Error fetching project templates:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================
// GET /api/projects/:id/templates/:templateId
// 获取单个模板的合并结果
// ============================================================

router.get('/:id/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const projectId = getParamString(req.params.id);
    const templateId = getParamString(req.params.templateId);

    if (!projectId || !templateId) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Project ID and Template ID are required',
      });
    }

    // 验证模板ID
    if (!DEFAULT_TEMPLATES[templateId]) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${templateId} does not exist`,
      });
    }

    // 验证项目存在并获取配置
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { customTemplates: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${projectId} does not exist`,
      });
    }

    // 解析模板配置
    const config = parseTemplateConfig(project.customTemplates);
    const override = config?.templates[templateId];

    // 合并模板
    const mergedResult = mergeTemplateConfig(templateId, override, null);

    const response: GetTemplateResponse = {
      template: mergedResult.template,
      override: override,
      sources: mergedResult.sources,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================
// PATCH /api/projects/:id/templates/:templateId
// 更新模板覆盖配置（部分更新）
// ============================================================

router.patch('/:id/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const projectId = getParamString(req.params.id);
    const templateId = getParamString(req.params.templateId);
    const updateData: UpdateTemplateRequest = req.body;

    // 验证参数
    if (!projectId || !templateId) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Project ID and Template ID are required',
      });
    }

    // 验证模板ID
    if (!DEFAULT_TEMPLATES[templateId]) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${templateId} does not exist`,
      });
    }

    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${projectId} does not exist`,
      });
    }

    // 构建覆盖配置
    const newOverride: TemplateOverride = {
      templateId,
      systemInstruction: updateData.systemInstruction,
      blocks: updateData.blocks,
      variableDefaults: updateData.variableDefaults,
      metadata: {
        ...updateData.metadata,
        modifiedAt: new Date().toISOString(),
      },
    };

    // 移除 undefined 字段
    Object.keys(newOverride).forEach(key => {
      if (newOverride[key as keyof TemplateOverride] === undefined) {
        delete newOverride[key as keyof TemplateOverride];
      }
    });

    // 验证覆盖配置
    const validation = validateTemplateOverride(newOverride, templateId);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Template override validation failed',
        details: validation.errors,
        warnings: validation.warnings,
      });
    }

    // 获取现有配置
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { customTemplates: true },
    });

    const existingConfig = parseTemplateConfig(existingProject?.customTemplates || null)
      || createEmptyConfig();

    // 合并覆盖配置（部分更新）
    const existingOverride = existingConfig.templates[templateId] || {} as TemplateOverride;
    const mergedOverride: TemplateOverride = {
      ...existingOverride,
      ...newOverride,
      metadata: {
        ...(existingOverride as TemplateOverride).metadata,
        ...newOverride.metadata,
      },
    };

    // 更新配置
    const updatedConfig: TemplateOverrideConfig = {
      ...existingConfig,
      lastModified: new Date().toISOString(),
      templates: {
        ...existingConfig.templates,
        [templateId]: mergedOverride,
      },
    };

    // 保存到数据库
    await prisma.project.update({
      where: { id: projectId },
      data: {
        customTemplates: serializeTemplateConfig(updatedConfig),
      },
    });

    // 返回合并后的结果
    const mergedResult = mergeTemplateConfig(templateId, mergedOverride, null);

    const response: UpdateTemplateResponse = {
      success: true,
      override: mergedOverride,
      merged: mergedResult.template,
      sources: mergedResult.sources,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating template override:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================
// DELETE /api/projects/:id/templates/:templateId
// 删除模板覆盖，恢复默认值
// ============================================================

router.delete('/:id/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const projectId = getParamString(req.params.id);
    const templateId = getParamString(req.params.templateId);

    if (!projectId || !templateId) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Project ID and Template ID are required',
      });
    }

    // 验证模板ID
    if (!DEFAULT_TEMPLATES[templateId]) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID ${templateId} does not exist`,
      });
    }

    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { customTemplates: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${projectId} does not exist`,
      });
    }

    // 解析现有配置
    const existingConfig = parseTemplateConfig(project.customTemplates);

    if (!existingConfig || !existingConfig.templates[templateId]) {
      // 没有覆盖配置，直接返回默认模板
      const defaultTemplate = DEFAULT_TEMPLATES[templateId];
      const response: ResetTemplateResponse = {
        success: true,
        default: {
          id: defaultTemplate.id,
          label: defaultTemplate.name,
          description: defaultTemplate.description,
          category: defaultTemplate.category as any,
          systemTemplate: defaultTemplate.systemInstruction,
          userTemplate: '',
          variables: defaultTemplate.variables.map(convertTemplateVariableToPromptVariable),
          sections: defaultTemplate.userPromptBlocks.map(convertPromptBlockToTemplateSection),
        },
      };
      return res.json(response);
    }

    // 删除覆盖配置
    const { [templateId]: removed, ...remainingTemplates } = existingConfig.templates;

    const updatedConfig: TemplateOverrideConfig = {
      ...existingConfig,
      lastModified: new Date().toISOString(),
      templates: remainingTemplates,
    };

    // 保存到数据库
    await prisma.project.update({
      where: { id: projectId },
      data: {
        customTemplates: serializeTemplateConfig(updatedConfig),
      },
    });

    // 返回默认模板
    const defaultTemplate = DEFAULT_TEMPLATES[templateId];
    const response: ResetTemplateResponse = {
      success: true,
      default: {
        id: defaultTemplate.id,
        label: defaultTemplate.name,
        description: defaultTemplate.description,
        category: defaultTemplate.category as any,
        systemTemplate: defaultTemplate.systemInstruction,
        userTemplate: '',
        variables: defaultTemplate.variables.map(convertTemplateVariableToPromptVariable),
        sections: defaultTemplate.userPromptBlocks.map(convertPromptBlockToTemplateSection),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting template override:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================
// GET /api/projects/:id/templates/export
// 导出项目的所有模板覆盖配置
// ============================================================

router.get('/:id/templates/export', async (req: Request, res: Response) => {
  try {
    const projectId = getParamString(req.params.id);

    if (!projectId) {
      return res.status(400).json({
        error: 'Invalid parameter',
        message: 'Project ID is required',
      });
    }

    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, customTemplates: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${projectId} does not exist`,
      });
    }

    // 解析模板配置
    const config = parseTemplateConfig(project.customTemplates);

    // 构建导出数据
    const exportData: TemplateOverrideExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: config ? Object.values(config.templates) : [],
      metadata: {
        projectId: project.id,
        projectName: project.title,
      },
    };

    // 设置响应头以触发下载
    const filename = `template-overrides-${project.title || projectId}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting template overrides:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================
// POST /api/projects/:id/templates/import
// 导入模板覆盖配置（增强版）
// ============================================================

/**
 * 导入结果详情
 */
interface ImportDetail {
  templateId: string;
  valid: boolean;
  error?: string;
  warning?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * 导入统计信息
 */
interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  warnings: number;
}

/**
 * 导入响应
 */
interface ImportResponse {
  success: boolean;
  message: string;
  mode: string;
  stats: ImportStats;
  details: ImportDetail[];
  warnings: string[];
  migratedFromVersion?: string;
}

router.post('/:id/templates/import', async (req: Request, res: Response) => {
  try {
    const projectId = getParamString(req.params.id);

    if (!projectId) {
      return res.status(400).json({
        error: 'Invalid parameter',
        message: 'Project ID is required',
      });
    }

    const importData = req.body;
    const { mode = 'merge' } = req.query; // merge | overwrite

    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { customTemplates: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${projectId} does not exist`,
      });
    }

    // ========================================
    // 步骤 1: 验证导入数据格式
    // ========================================
    const formatValidation = validateImportFormat(importData);
    if (!formatValidation.valid) {
      return res.status(400).json({
        error: 'Invalid format',
        message: formatValidation.error,
      });
    }

    const globalWarnings: string[] = formatValidation.warnings || [];

    // ========================================
    // 步骤 2: 版本迁移（如果需要）
    // ========================================
    let migratedData: TemplateOverrideExport = importData;
    let migratedFromVersion: string | undefined;

    if (importData.version !== CURRENT_VERSION) {
      console.log(`Migrating config from version ${importData.version} to ${CURRENT_VERSION}`);

      try {
        // 执行版本迁移
        const migratedConfig = migrateConfigVersion(importData, importData.version);

        // 转换为导出格式
        migratedData = {
          version: CURRENT_VERSION,
          exportedAt: importData.exportedAt || new Date().toISOString(),
          templates: Object.values(migratedConfig.templates),
          metadata: importData.metadata,
        };

        migratedFromVersion = importData.version;
        globalWarnings.push(`配置已从版本 ${importData.version} 迁移到 ${CURRENT_VERSION}`);
      } catch (error) {
        return res.status(400).json({
          error: 'Migration failed',
          message: `版本迁移失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // ========================================
    // 步骤 3: 验证每个模板覆盖配置
    // ========================================
    const availableTemplateIds = getAvailableTemplateIds();
    const details: ImportDetail[] = [];
    const validOverrides: Record<string, TemplateOverride> = {};

    for (const override of migratedData.templates) {
      // 基础格式验证
      const basicValidation = validateTemplateOverrideForImport(override, availableTemplateIds);

      if (!basicValidation.valid) {
        details.push({
          templateId: basicValidation.templateId || 'unknown',
          valid: false,
          error: basicValidation.error,
          skipped: true,
          skipReason: basicValidation.error,
        });
        continue;
      }

      const { templateId } = override;

      // 深度验证（使用 templateMerge 的验证函数）
      const deepValidation = validateTemplateOverride(override, templateId);

      if (!deepValidation.valid) {
        details.push({
          templateId,
          valid: false,
          error: deepValidation.errors.join('; '),
          skipped: true,
          skipReason: `验证失败: ${deepValidation.errors.join('; ')}`,
        });
        continue;
      }

      // 记录警告
      if (deepValidation.warnings.length > 0 || (basicValidation.warnings && basicValidation.warnings.length > 0)) {
        const allWarnings = [
          ...(deepValidation.warnings || []),
          ...(basicValidation.warnings || []),
        ];

        details.push({
          templateId,
          valid: true,
          warning: allWarnings.join('; '),
        });

        globalWarnings.push(`模板 ${templateId}: ${allWarnings.join('; ')}`);
      } else {
        details.push({
          templateId,
          valid: true,
        });
      }

      validOverrides[templateId] = override;
    }

    // ========================================
    // 步骤 4: 检查是否有有效配置
    // ========================================
    if (Object.keys(validOverrides).length === 0) {
      const stats: ImportStats = {
        total: migratedData.templates.length,
        imported: 0,
        skipped: migratedData.templates.length,
        errors: details.filter(d => d.error).length,
        warnings: details.filter(d => d.warning).length,
      };

      return res.status(400).json({
        success: false,
        message: '导入文件中没有有效的模板覆盖配置',
        mode: mode as string,
        stats,
        details,
        warnings: globalWarnings,
      } as ImportResponse);
    }

    // ========================================
    // 步骤 5: 合并或覆盖现有配置
    // ========================================
    const existingConfig = parseTemplateConfig(project.customTemplates) || createEmptyConfig();

    let finalTemplates: Record<string, TemplateOverride>;

    if (mode === 'overwrite') {
      // 覆盖模式：完全使用导入的配置
      finalTemplates = validOverrides;
    } else {
      // 合并模式（默认）：将导入的配置合并到现有配置
      finalTemplates = {
        ...existingConfig.templates,
        ...validOverrides,
      };
    }

    // 构建更新后的配置
    const updatedConfig: TemplateOverrideConfig = {
      ...existingConfig,
      version: CURRENT_VERSION,
      lastModified: new Date().toISOString(),
      templates: finalTemplates,
    };

    // ========================================
    // 步骤 6: 保存到数据库
    // ========================================
    await prisma.project.update({
      where: { id: projectId },
      data: {
        customTemplates: serializeTemplateConfig(updatedConfig),
      },
    });

    // ========================================
    // 步骤 7: 构建详细的响应
    // ========================================
    const stats: ImportStats = {
      total: migratedData.templates.length,
      imported: Object.keys(validOverrides).length,
      skipped: migratedData.templates.length - Object.keys(validOverrides).length,
      errors: details.filter(d => d.error).length,
      warnings: details.filter(d => d.warning).length,
    };

    const response: ImportResponse = {
      success: true,
      message: `成功导入 ${stats.imported}/${stats.total} 个模板覆盖配置`,
      mode: mode as string,
      stats,
      details,
      warnings: globalWarnings,
      migratedFromVersion,
    };

    res.json(response);
  } catch (error) {
    console.error('Error importing template overrides:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as templateOverridesRouter };
