/**
 * 模板编辑器组件
 *
 * 用于管理和编辑小说创作模板的抽象层编辑器
 * 支持模板列表、区块编辑、变量管理和实时预览
 *
 * @see docs/prompt_template_analyse_list.md - 设计文档
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileCode, Save, RotateCcw, ChevronDown, ChevronRight,
  Sparkles, AlertTriangle, Search, Filter, Eye, Code, Settings2,
  Download, Upload, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { useProjectStore } from '@/store';
import { API_BASE } from '@/services/apiService';
import { TemplateListPanel } from './TemplateListPanel';
import { BlockEditorPanel } from './BlockEditorPanel';
import { VariableManagerPanel } from './VariableManagerPanel';
import { TemplatePreview } from './TemplatePreview';

// 导入共享类型定义
import type {
  TemplateOverride,
  BlockOverride,
} from '../../types/templateOverride';
import type {
  PromptVariable,
  TemplateSection,
  PromptTemplateDefinition,
} from '../../types/promptTemplate';

// ============================================================
// 导入导出相关类型定义
// ============================================================

/**
 * 模板导出数据格式
 */
interface TemplateExportData {
  version: string;
  exportedAt: string;
  templates: TemplateOverride[];
  metadata?: {
    projectId?: string;
    projectName?: string;
    exportedBy?: string;
  };
}

/**
 * 导入结果
 */
interface ImportResult {
  success: boolean;
  message: string;
  mode: 'merge' | 'overwrite';
  stats: {
    total: number;
    imported: number;
    skipped: number;
  };
  details: Array<{
    templateId: string;
    valid: boolean;
    error?: string;
    warning?: string;
  }>;
}

/**
 * 导入确认对话框状态
 */
interface ImportConfirmState {
  isOpen: boolean;
  data: TemplateExportData | null;
  fileName: string;
}

// ============================================================
// 组件特定类型定义（不与共享类型重复）
// ============================================================

/**
 * 模板摘要信息（API 响应）
 * 后端返回的模板列表项结构
 */
export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  hasOverride: boolean;
  overrideSummary?: {
    hasSystemInstruction: boolean;
    overriddenBlocks: number;
    overriddenVariables: number;
    modifiedAt?: string;
  } | null;
}

/**
 * 区块覆盖（前端使用版本）
 * 与后端 BlockOverride 兼容，但在 Record 中使用时不需要 blockId
 */
export interface BlockOverrideForUI {
  template?: string;
  condition?: string | null;
  order?: number;
  disabled?: boolean;
  metadata?: {
    tier?: string;
    dataSource?: string;
    description?: string;
  };
}

/**
 * 合并后的模板（前端显示用）
 * 与 PromptTemplateDefinition 兼容，但 sections 包含 template 字段
 */
export interface MergedTemplate {
  id: string;
  label: string;
  description: string;
  category: string;
  systemTemplate: string;
  userTemplate: string;
  variables: PromptVariable[];
  sections: TemplateSection[];
}

export interface TemplateEditorProps {
  project: ReturnType<typeof useProjectStore.getState>['project'];
  updateProject: ReturnType<typeof useProjectStore.getState>['updateProject'];
}

// ============================================================
// 主组件
// ============================================================

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  project,
  updateProject
}) => {
  // --- 语言状态 ---
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  // --- 状态管理 ---
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [mergedTemplate, setMergedTemplate] = useState<MergedTemplate | null>(null);
  const [currentOverride, setCurrentOverride] = useState<TemplateOverride | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'blocks' | 'variables' | 'preview'>('blocks');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- 导入导出状态 ---
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importConfirm, setImportConfirm] = useState<ImportConfirmState>({
    isOpen: false,
    data: null,
    fileName: '',
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 获取模板列表 ---
  const fetchTemplateList = useCallback(async () => {
    if (!project.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/projects/${project.id}/templates`);
      if (!response.ok) {
        throw new Error('获取模板列表失败');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('获取模板列表失败:', err);
      setError(err instanceof Error ? err.message : '获取模板列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  // --- 获取单个模板详情 ---
  const fetchTemplateDetail = useCallback(async (templateId: string) => {
    if (!project.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/projects/${project.id}/templates/${templateId}`);
      if (!response.ok) {
        throw new Error('获取模板详情失败');
      }
      const data = await response.json();
      setMergedTemplate(data.template);
      setCurrentOverride(data.override || null);
    } catch (err) {
      console.error('获取模板详情失败:', err);
      setError(err instanceof Error ? err.message : '获取模板详情失败');
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  // --- 保存模板覆盖 ---
  const saveOverride = useCallback(async () => {
    if (!project.id || !selectedTemplateId || !currentOverride) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/projects/${project.id}/templates/${selectedTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentOverride),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '保存失败');
      }

      const data = await response.json();
      setMergedTemplate(data.merged);
      setHasChanges(false);

      // 刷新模板列表以更新状态
      await fetchTemplateList();
    } catch (err) {
      console.error('保存模板覆盖失败:', err);
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [project.id, selectedTemplateId, currentOverride, fetchTemplateList]);

  // --- 重置模板覆盖 ---
  const resetOverride = useCallback(async () => {
    if (!project.id || !selectedTemplateId) return;

    if (!confirm('确定要重置此模板为默认值吗？所有自定义修改将被清除。')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/projects/${project.id}/templates/${selectedTemplateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('重置失败');
      }

      const data = await response.json();
      setMergedTemplate(data.default);
      setCurrentOverride(null);
      setHasChanges(false);

      // 刷新模板列表以更新状态
      await fetchTemplateList();
    } catch (err) {
      console.error('重置模板覆盖失败:', err);
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setIsLoading(false);
    }
  }, [project.id, selectedTemplateId, fetchTemplateList]);

  // --- 更新覆盖配置 ---
  const updateOverride = useCallback((updates: Partial<TemplateOverride>) => {
    setCurrentOverride(prev => ({
      ...prev,
      templateId: selectedTemplateId || '',
      ...updates,
      metadata: {
        ...prev?.metadata,
        ...updates.metadata,
        modifiedAt: new Date().toISOString(),
      },
    }));
    setHasChanges(true);
  }, [selectedTemplateId]);

  // --- 导出模板配置 ---
  const handleExport = useCallback(async () => {
    if (!project.id) return;

    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/projects/${project.id}/templates/export`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '导出失败');
      }

      // 获取导出数据
      const exportData: TemplateExportData = await response.json();

      // 创建并下载文件
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 从响应头获取文件名，或使用默认名称
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `template-overrides-${project.title || project.id}-${new Date().toISOString().split('T')[0]}.json`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;'"]+)/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].trim());
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出模板配置失败:', err);
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setIsExporting(false);
    }
  }, [project.id, project.title]);

  // --- 触发文件选择 ---
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // --- 处理文件选择 ---
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.name.endsWith('.json')) {
      setError('请选择 JSON 格式的文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as TemplateExportData;

        // 验证基本格式
        if (!data.version || !data.templates) {
          setError('无效的导入文件格式，缺少 version 或 templates 字段');
          return;
        }

        // 验证版本
        if (data.version !== '1.0') {
          setError(`不支持的版本号: ${data.version}，当前仅支持 1.0`);
          return;
        }

        // 显示确认对话框
        setImportConfirm({
          isOpen: true,
          data,
          fileName: file.name,
        });
      } catch (parseErr) {
        console.error('解析导入文件失败:', parseErr);
        setError('无法解析导入文件，请确保文件是有效的 JSON 格式');
      }
    };

    reader.onerror = () => {
      setError('读取文件失败');
    };

    reader.readAsText(file);

    // 清空 input 以便可以重复选择同一文件
    event.target.value = '';
  }, []);

  // --- 确认导入 ---
  const handleConfirmImport = useCallback(async (mode: 'merge' | 'overwrite') => {
    if (!project.id || !importConfirm.data) return;

    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const response = await fetch(`${API_BASE}/projects/${project.id}/templates/import?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importConfirm.data),
      });

      const result: ImportResult = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '导入失败');
      }

      setImportResult(result);

      // 关闭确认对话框
      setImportConfirm({ isOpen: false, data: null, fileName: '' });

      // 刷新模板列表
      await fetchTemplateList();

      // 如果当前选中的模板有更新，重新加载
      if (selectedTemplateId) {
        await fetchTemplateDetail(selectedTemplateId);
      }
    } catch (err) {
      console.error('导入模板配置失败:', err);
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setIsImporting(false);
    }
  }, [project.id, importConfirm.data, fetchTemplateList, selectedTemplateId, fetchTemplateDetail]);

  // --- 取消导入 ---
  const handleCancelImport = useCallback(() => {
    setImportConfirm({ isOpen: false, data: null, fileName: '' });
  }, []);

  // --- 关闭导入结果 ---
  const handleCloseImportResult = useCallback(() => {
    setImportResult(null);
  }, []);

  // --- 初始化加载 ---
  useEffect(() => {
    fetchTemplateList();
  }, [fetchTemplateList]);

  // --- 选择模板时加载详情 ---
  useEffect(() => {
    if (selectedTemplateId) {
      fetchTemplateDetail(selectedTemplateId);
    }
  }, [selectedTemplateId, fetchTemplateDetail]);

  // --- 过滤模板列表 ---
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // --- 获取分类列表 ---
  const categories = ['all', ...new Set(templates.map(t => t.category))];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0b1222] animate-fade-in">
      {/* 页面标题 */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-lg">
              <FileCode size={24} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">模板编辑器</h2>
              <p className="text-sm text-slate-400">Template Editor - 自定义您的创作模板</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportClick}
              disabled={isLoading || isImporting}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              title="导入配置"
            >
              <Upload size={16} />
              导入
            </button>
            <button
              onClick={handleExport}
              disabled={isLoading || isExporting}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
              title="导出配置"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download size={16} />
                  导出
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 左侧：模板列表 */}
        <div className="w-80 border-r border-slate-800/80 flex flex-col">
          {/* 搜索和过滤 */}
          <div className="p-4 border-b border-slate-800/50 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索模板..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? '全部分类' : cat}
                  </option>
                ))}
              </select>
            </div>
            {/* 导入导出按钮 */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleExport}
                disabled={isExporting || templates.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                title="导出所有模板配置"
              >
                {isExporting ? (
                  <div className="w-3.5 h-3.5 border-1.5 border-slate-500/30 border-t-slate-300 rounded-full animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                导出
              </button>
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                title="导入模板配置"
              >
                {isImporting ? (
                  <div className="w-3.5 h-3.5 border-1.5 border-slate-500/30 border-t-slate-300 rounded-full animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                导入
              </button>
              {/* 隐藏的文件输入 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* 模板列表 */}
          <TemplateListPanel
            templates={filteredTemplates}
            selectedId={selectedTemplateId}
            onSelect={setSelectedTemplateId}
            isLoading={isLoading}
          />
        </div>

        {/* 右侧：编辑区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {!selectedTemplateId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <FileCode size={64} className="text-slate-700 mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">
                选择一个模板开始编辑
              </h3>
              <p className="text-sm text-slate-500 max-w-md">
                从左侧列表中选择一个模板，您可以编辑其区块、变量默认值，并实时预览合并后的效果。
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : mergedTemplate ? (
            <>
              {/* 标签页切换 */}
              <div className="px-6 pt-4 border-b border-slate-800/50">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('blocks')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                      activeTab === 'blocks'
                        ? 'bg-slate-800 text-teal-400 border-b-2 border-teal-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code size={16} className="inline mr-2" />
                    区块编辑
                  </button>
                  <button
                    onClick={() => setActiveTab('variables')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                      activeTab === 'variables'
                        ? 'bg-slate-800 text-teal-400 border-b-2 border-teal-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Settings2 size={16} className="inline mr-2" />
                    变量管理
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-slate-800 text-teal-400 border-b-2 border-teal-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye size={16} className="inline mr-2" />
                    实时预览
                  </button>
                </div>
              </div>

              {/* 标签页内容 */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'blocks' && (
                  <BlockEditorPanel
                    sections={mergedTemplate.sections}
                    override={currentOverride}
                    onUpdateOverride={updateOverride}
                  />
                )}
                {activeTab === 'variables' && (
                  <VariableManagerPanel
                    templateId={selectedTemplateId}
                    templateName={mergedTemplate.label}
                    variables={mergedTemplate.variables}
                    values={currentOverride?.variableDefaults || {}}
                    onSave={(name, value) => {
                      updateOverride({
                        variableDefaults: {
                          ...currentOverride?.variableDefaults,
                          [name]: value,
                        },
                      });
                    }}
                    onReset={(name) => {
                      const newDefaults = { ...currentOverride?.variableDefaults };
                      delete newDefaults[name];
                      updateOverride({ variableDefaults: newDefaults });
                    }}
                    onResetAll={() => {
                      updateOverride({ variableDefaults: {} });
                    }}
                  />
                )}
                {activeTab === 'preview' && (
                  <TemplatePreview
                    template={mergedTemplate}
                    override={currentOverride}
                  />
                )}
              </div>

              {/* 更改提示 */}
              {hasChanges && (
                <div className="px-6 py-3 bg-amber-900/20 border-t border-amber-500/20">
                  <p className="text-sm text-amber-300 flex items-center gap-2">
                    <Sparkles size={14} />
                    您有未保存的更改
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">加载模板失败</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
