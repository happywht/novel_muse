import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Settings2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PromptPanel, ModuleType } from '../PromptPanel/PromptPanel';
import { PromptItem } from '../PromptPanel/PromptEditor';
import { useProjectStore } from '../../store/useProjectStore';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from '../../config/prompts';
import { validatePostWrite, formatViolations, type PostWriteViolation } from '../../services/validators/postWriteValidator';
import { getPostWriteOptionsFromGenre } from '../../config/genreRules';
import { useToast } from '../../hooks/useToast';

/**
 * EchoPromptPanel - EchoChamber 模块的 Prompt 面板
 *
 * 功能:
 * 1. 可折叠的右侧栏设计
 * 2. 包含 world_echo_extraction 和 audit_plot 两个 prompts
 * 3. 支持项目级和模块级覆盖
 * 4. 集成写后验证功能
 */
export const EchoPromptPanel: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [validationText, setValidationText] = useState('');
  const [validationResults, setValidationResults] = useState<ReadonlyArray<PostWriteViolation>>([]);
  const [isValidating, setIsValidating] = useState(false);
  const project = useProjectStore((state) => state.project);
  const updateProject = useProjectStore((state) => state.updateProject);
  const { toast } = useToast();

  // 根据 promptProfile 选择 registry
  const registry = useMemo(() => {
    const profile = project.creativeSettings?.promptProfile || 'LITERARY';
    return profile === 'WEB_NOVEL' ? PROMPT_REGISTRY_WEB_NOVEL : PROMPT_REGISTRY_LITERARY;
  }, [project.creativeSettings?.promptProfile]);

  // 过滤 echo 模块相关的 prompts
  const echoPrompts = useMemo(() => {
    const promptKeys = ['world_echo_extraction', 'audit_plot'];

    const items: PromptItem[] = promptKeys
      .map((key) => {
        const template = registry[key];
        if (!template) return null;

        // 转换 parameters 格式 (PromptParameter -> ParameterConfig)
        const convertedParameters = template.parameters?.map((param: any) => ({
          key: param.name,
          label: param.label,
          type: param.type,
          min: param.min,
          max: param.max,
          step: param.step,
          options: param.options?.map((opt) => ({
            label: opt.label,
            value: opt.value,
          })),
          value: param.default,
          description: param.description,
        }));

        return {
          key: template.key,
          label: template.label,
          description: template.description,
          instruction: template.instruction,
          parameters: convertedParameters,
        } as PromptItem;
      })
      .filter((item): item is PromptItem => item !== null);

    return items;
  }, [registry]);

  // 从 project.customPrompts 获取 projectOverrides
  const projectOverrides = useMemo(() => {
    const overrides: Record<string, string> = {};
    const customPrompts = project.customPrompts || {};

    // 提取 echo 模块相关的 project 级覆盖
    ['world_echo_extraction', 'audit_plot'].forEach((key) => {
      if (customPrompts[key]) {
        overrides[key] = customPrompts[key];
      }
    });

    return overrides;
  }, [project.customPrompts]);

  // 从 project.modulePrompts 获取 moduleOverrides (如果存在)
  const moduleOverrides = useMemo(() => {
    // TODO: 如果需要模块级覆盖, 可以从 project.modulePrompts?.echo 中获取
    return {};
  }, []);

  // 保存 prompt 覆盖
  const handleSave = useCallback(
    (key: string, content: string, level: 'PROJECT' | 'MODULE') => {
      const customPrompts = project.customPrompts || {};

      if (level === 'PROJECT') {
        // 项目级覆盖
        updateProject({
          customPrompts: {
            ...customPrompts,
            [key]: content,
          },
        });
      } else {
        // 模块级覆盖 (如果支持)
        // TODO: 实现模块级覆盖存储
        console.warn('Module-level prompt override not yet implemented');
      }
    },
    [project.customPrompts, updateProject]
  );

  // 重置 prompt 覆盖
  const handleReset = useCallback(
    (key: string, level: 'PROJECT' | 'MODULE') => {
      const customPrompts = { ...(project.customPrompts || {}) };

      if (level === 'PROJECT') {
        // 删除项目级覆盖
        delete customPrompts[key];
        updateProject({ customPrompts });
      } else {
        // 模块级覆盖重置
        // TODO: 实现模块级覆盖重置
        console.warn('Module-level prompt override reset not yet implemented');
      }
    },
    [project.customPrompts, updateProject]
  );

  // 全部重置
  const handleResetAll = useCallback(
    (level: 'PROJECT' | 'MODULE') => {
      if (level === 'PROJECT') {
        const customPrompts = { ...(project.customPrompts || {}) };
        ['world_echo_extraction', 'audit_plot'].forEach((key) => {
          delete customPrompts[key];
        });
        updateProject({ customPrompts });
      } else {
        // TODO: 实现模块级全部重置
        console.warn('Module-level prompt reset all not yet implemented');
      }
    },
    [project.customPrompts, updateProject]
  );

  // 写后验证处理
  const handleValidateText = useCallback(() => {
    if (!validationText.trim()) {
      toast.warning('请输入要验证的文本');
      return;
    }

    setIsValidating(true);
    try {
      const genreOptions = getPostWriteOptionsFromGenre(project.genre);
      const violations = validatePostWrite(validationText, genreOptions);
      setValidationResults(violations);

      if (violations.length === 0) {
        toast.success('验证通过! 未发现问题');
      } else {
        const errorCount = violations.filter(v => v.severity === 'error').length;
        const warningCount = violations.filter(v => v.severity === 'warning').length;
        toast.info(`发现 ${errorCount} 个错误, ${warningCount} 个警告`);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('验证失败');
    } finally {
      setIsValidating(false);
    }
  }, [validationText, project.genre, toast]);

  // 清除验证结果
  const handleClearValidation = useCallback(() => {
    setValidationText('');
    setValidationResults([]);
  }, []);

  // 折叠状态下的最小化视图
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all"
          title="展开 Prompt 面板"
        >
          <Settings2 size={20} />
        </button>
        <button
          onClick={() => setIsCollapsed(false)}
          className="mt-2 p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-all"
          title="展开"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    );
  }

  // 展开状态
  return (
    <div className="relative flex flex-col h-full">
      {/* 折叠按钮 */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50"
        title="折叠面板"
      >
        <ChevronRight size={16} />
      </button>

      {/* 写后验证工具 */}
      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            写后验证工具
          </h3>
          {validationResults.length > 0 && (
            <button
              onClick={handleClearValidation}
              className="text-[10px] text-slate-400 hover:text-slate-300 underline"
            >
              清除
            </button>
          )}
        </div>

        <textarea
          value={validationText}
          onChange={(e) => setValidationText(e.target.value)}
          placeholder="粘贴 Echo 描述文本进行质量检查..."
          className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-xs text-slate-200 resize-none h-20 focus:ring-1 focus:ring-emerald-500/50 outline-none"
        />

        <button
          onClick={handleValidateText}
          disabled={isValidating || !validationText.trim()}
          className="w-full mt-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {isValidating ? (
            <>
              <div className="animate-spin w-3 h-3 border border-emerald-400/30 border-t-emerald-400 rounded-full" />
              验证中...
            </>
          ) : (
            <>
              <CheckCircle2 size={12} />
              开始验证
            </>
          )}
        </button>

        {/* 验证结果 */}
        {validationResults.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
            {validationResults.map((violation, idx) => (
              <div
                key={idx}
                className={`text-[10px] p-2 rounded border ${
                  violation.severity === 'error'
                    ? 'bg-red-900/20 border-red-500/30 text-red-200'
                    : 'bg-amber-900/20 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">[{violation.rule}]</span>{' '}
                    {violation.description}
                    <div className="text-slate-400 mt-0.5">
                      → {violation.suggestion}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {validationResults.length === 0 && validationText.trim() && !isValidating && (
          <div className="mt-3 text-center text-[10px] text-emerald-400 py-2">
            <CheckCircle2 size={14} className="inline-block mr-1" />
            验证通过,未发现问题
          </div>
        )}
      </div>

      <PromptPanel
        prompts={echoPrompts}
        projectOverrides={projectOverrides}
        moduleOverrides={moduleOverrides}
        onSave={handleSave}
        onReset={handleReset}
        onResetAll={handleResetAll}
        mode="collapsed"
        moduleType="echo"
        title="Echo 调教台"
        subtitle="自定义事件提取与剧情审计"
      />
    </div>
  );
};

export default EchoPromptPanel;
