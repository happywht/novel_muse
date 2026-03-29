import React, { useState, useMemo } from 'react';
import { ProjectState, PlotNode, Chapter, AppSection } from '../../types';
import {
  LayoutGrid,
  BookOpen,
  Sparkles,
  Plus,
  PenTool,
  ChevronRight,
  User,
  Trash2,
  Calendar,
  ArrowRight,
  Activity,
  ChevronUp,
  ChevronDown,
  PlusCircle,
  LayoutList,
  ChevronDownCircle,
  BarChart3,
  Network,
  Flame,
  Link2,
  Target,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import {
  splitPlotNodeIntoChapters,
  regenerateChapterOutline,
  auditChapterPlan,
} from '../../services/geminiService';
import { isBackendAvailable } from '../../services/apiService';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Info } from 'lucide-react'; // For loading state
import { recalculateChapterOrders } from '../../utils/chapterUtils';
import { ChapterBalanceAnalyzer } from '../ChapterBalanceAnalyzer';
import { useFeature } from '../../hooks/useFeature';
import { ChapterGraphVisualization } from './ChapterGraphVisualization';
import { ForeshadowingChainPanel } from './ForeshadowingChainPanel';
import {
  countWords,
  formatWordCount,
  calculateProgress,
  getProgressStatus,
  WORD_COUNT_TARGETS,
  DEFAULT_TARGET_WORD_COUNT,
} from '../../utils/wordCount';
import { useToast } from '../../hooks/useToast';
import { PromptPanelWrapper } from './PromptPanelWrapper';

interface ChapterOutlinerProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

export const ChapterOutliner: React.FC<ChapterOutlinerProps> = ({ project, updateProject }) => {
  const { setActiveSection, setActiveChapterId } = useProjectStore();
  const { toast } = useToast();

  // 功能开关检查
  const enableChapterBalance = useFeature('enableChapterBalance');

  const [selectedPlotNodeId, setSelectedPlotNodeId] = useState<string | null>(
    project.plotNodes.length > 0 ? project.plotNodes[0].id : null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [fissionCount, setFissionCount] = useState<number | 'AUTO'>('AUTO');
  const [regeneratingChapterId, setRegeneratingChapterId] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<{
    isAligned: boolean;
    issues: { type: string; description: string; suggestion: string }[];
  } | null>(null);
  const [isAuditCollapsed, setIsAuditCollapsed] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showBalanceAnalyzer, setShowBalanceAnalyzer] = useState(false);
  const [graphChapterId, setGraphChapterId] = useState<string | null>(null);
  const [showForeshadowingPanel, setShowForeshadowingPanel] = useState(false);

  // 检查后端是否可用
  const { useBackend } = useProjectStore();

  const selectedPlotNode = useMemo(
    () => project.plotNodes.find((n) => n.id === selectedPlotNodeId),
    [project.plotNodes, selectedPlotNodeId]
  );

  const relatedChapters = useMemo(
    () =>
      project.chapters
        .filter((c) => c.plotNodeId === selectedPlotNodeId)
        .sort((a, b) => a.order - b.order),
    [project.chapters, selectedPlotNodeId]
  );

  const handleAddChapter = () => {
    if (!selectedPlotNodeId) return;

    const newOrder =
      relatedChapters.length > 0 ? relatedChapters[relatedChapters.length - 1].order + 1 : 0;

    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: `新章节 ${relatedChapters.length + 1}`,
      content: '',
      summary: '',
      expectedPOV: '未设定',
      plotNodeId: selectedPlotNodeId,
      order: newOrder,
      lastModified: Date.now(),
    };

    const newChapterList = [...project.chapters, newChapter];
    updateProject({
      chapters: recalculateChapterOrders(newChapterList, project.plotNodes),
    });
  };

  const handleInsertChapter = (index: number) => {
    if (!selectedPlotNodeId) return;

    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: `插入章节`,
      content: '',
      summary: '',
      expectedPOV: '未设定',
      plotNodeId: selectedPlotNodeId,
      order: 0, // Placeholder, will be fixed by splicing and recalculating
      lastModified: Date.now(),
    };

    // Create a copy of related chapters for splicing
    const newChapters = [...project.chapters];

    // Find where in the full list to insert.
    // We need to insert it at a specific logical position relative to relatedChapters.
    const targetRelatedChapter = relatedChapters[index];
    const fullIdx = project.chapters.findIndex((c) => c.id === targetRelatedChapter.id);

    newChapters.splice(fullIdx + 1, 0, newChapter);

    updateProject({
      chapters: recalculateChapterOrders(newChapters, project.plotNodes),
    });
  };

  const handleMoveChapter = (chapterId: string, direction: 'UP' | 'DOWN') => {
    const index = relatedChapters.findIndex((c) => c.id === chapterId);
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === relatedChapters.length - 1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const currentChapter = relatedChapters[index];
    const targetChapter = relatedChapters[targetIndex];

    // Swap order values in a copy of the full list
    const updatedChapters = project.chapters.map((c) => {
      if (c.id === currentChapter.id) return { ...c, order: targetChapter.order };
      if (c.id === targetChapter.id) return { ...c, order: currentChapter.order };
      return c;
    });

    updateProject({
      chapters: recalculateChapterOrders(updatedChapters, project.plotNodes),
    });
  };

  const handleUpdateChapter = (id: string, updates: Partial<Chapter>) => {
    updateProject({
      chapters: project.chapters.map((c) =>
        c.id === id ? { ...c, ...updates, lastModified: Date.now() } : c
      ),
    });
  };

  const handleDeleteChapter = (id: string) => {
    if (window.confirm('确定要删除这个章节规划吗？')) {
      const filtered = project.chapters.filter((c) => c.id !== id);
      updateProject({
        chapters: recalculateChapterOrders(filtered, project.plotNodes),
      });
    }
  };

  const handleRegenerateChapter = async (chapterId: string) => {
    if (!selectedPlotNode || regeneratingChapterId || isGenerating) return;

    const chapterIndex = relatedChapters.findIndex((c) => c.id === chapterId);
    if (chapterIndex === -1) return;

    const chapterToRewrite = relatedChapters[chapterIndex];
    const previousChapter = chapterIndex > 0 ? relatedChapters[chapterIndex - 1] : null;
    const nextChapter =
      chapterIndex < relatedChapters.length - 1 ? relatedChapters[chapterIndex + 1] : null;

    setRegeneratingChapterId(chapterId);
    try {
      const fullPlotSummary = project.plotNodes.map((n) => n.content).join('\n\n');
      const regeneratedOutline = await regenerateChapterOutline(
        project.genre,
        fullPlotSummary,
        selectedPlotNode,
        chapterToRewrite,
        previousChapter,
        nextChapter,
        project.characters,
        project.worldSettings,
        project.creativeSettings,
        project.echoes || []
      );

      if (regeneratedOutline) {
        handleUpdateChapter(chapterId, {
          title: regeneratedOutline.title,
          summary: regeneratedOutline.summary,
          expectedPOV: regeneratedOutline.expectedPOV,
          beats: regeneratedOutline.beats?.map((b) => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            type: b.type as any,
            description: b.description,
            isCompleted: false,
          })),
        });
      } else {
        toast.warning('局部重写未能生成有效内容，请重试。');
      }
    } catch (error) {
      console.error('Regenerate Error:', error);
      toast.error('局部重写失败，请检查网络或配置后重试。');
    } finally {
      setRegeneratingChapterId(null);
    }
  };

  const handleGoToDraft = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setActiveSection(AppSection.DRAFTING);
  };

  const handleApplyBalanceSuggestion = (suggestion: any) => {
    switch (suggestion.type) {
      case 'SPLIT':
        // 将章节拆分为两个
        const chapterToSplit = project.chapters.find((c) => c.id === suggestion.chapterId);
        if (chapterToSplit) {
          const halfLength = Math.floor((chapterToSplit.content?.length || 0) / 2);
          const firstHalf = chapterToSplit.content?.substring(0, halfLength) || '';
          const secondHalf = chapterToSplit.content?.substring(halfLength) || '';

          const newChapter: Chapter = {
            ...chapterToSplit,
            id: `chapter-${Date.now()}`,
            title: `${chapterToSplit.title} (第二部分)`,
            content: secondHalf,
            order: chapterToSplit.order + 1,
          };

          // 更新原章节
          const updatedChapters = project.chapters.map((c) =>
            c.id === chapterToSplit.id
              ? { ...c, content: firstHalf, title: `${c.title} (第一部分)` }
              : c.order > chapterToSplit.order
                ? { ...c, order: c.order + 1 }
                : c
          );

          updateProject({ chapters: [...updatedChapters, newChapter] });
          toast.success(`已拆分"${chapterToSplit.title}"为两个章节`);
        }
        break;

      case 'MERGE':
        toast.info('章节合并功能需要手动操作，请选择要合并的章节');
        break;

      case 'ADD_CONFLICT':
        toast.info('建议在下一章节中增加冲突场景');
        break;

      case 'BALANCE_CHARACTERS':
        toast.info('请检查角色出场频率，在下一章节中调整出场角色');
        break;

      default:
        toast.info(`建议"${suggestion.description}"已记录，请手动调整`);
    }
  };

  const handleFission = async () => {
    if (!selectedPlotNode || isGenerating) return;

    setIsGenerating(true);
    try {
      const fullPlotSummary = project.plotNodes.map((n) => n.content).join('\n\n');
      const newOutlines = await splitPlotNodeIntoChapters(
        project.genre,
        fullPlotSummary,
        selectedPlotNode,
        project.characters,
        project.worldSettings,
        project.creativeSettings,
        project.echoes || [],
        fissionCount
      );

      if (newOutlines.length > 0) {
        const newChapters: Chapter[] = newOutlines.map((outline, idx) => ({
          id: `${Date.now()}-${idx}`,
          title: outline.title,
          content: '',
          summary: outline.summary,
          expectedPOV: outline.expectedPOV,
          plotNodeId: selectedPlotNode.id,
          order: project.chapters.length + idx, // Will be reordered
          lastModified: Date.now(),
          beats: outline.beats?.map((b) => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            type: b.type as any,
            description: b.description,
            isCompleted: false,
          })),
        }));

        const newChapterList = [...project.chapters, ...newChapters];
        updateProject({
          chapters: recalculateChapterOrders(newChapterList, project.plotNodes),
        });
      }
    } catch (error) {
      console.error('Fission Error:', error);
      toast.error('生成章节细纲失败，请检查网络或配置后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAudit = async () => {
    if (!selectedPlotNode || isAuditing) return;
    setIsAuditing(true);
    try {
      const result = await auditChapterPlan(
        project.genre,
        selectedPlotNode,
        relatedChapters,
        project.characters,
        project.worldSettings,
        project.creativeSettings
      );
      setAuditResult(result);
      setIsAuditCollapsed(false);
    } catch (error) {
      console.error('Audit Error:', error);
      toast.error('审计失败，请重试。');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 animate-fade-in">
      {/* Left Panel: Plot Beat Index */}
      <div className="w-72 flex flex-col bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/20">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={14} className="text-sky-400" /> 情节节点索引
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {project.plotNodes.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 italic">暂无情节卡片，请先在情节罗盘中创建。</p>
            </div>
          ) : (
            project.plotNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedPlotNodeId(node.id)}
                className={`w-full text-left p-3 rounded-xl transition-all group ${
                  selectedPlotNodeId === node.id
                    ? 'bg-sky-500/10 border border-sky-500/30'
                    : 'hover:bg-slate-800/50 border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      selectedPlotNodeId === node.id
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    BEAT {node.order + 1}
                  </span>
                </div>
                <h4
                  className={`text-sm font-bold truncate ${selectedPlotNodeId === node.id ? 'text-sky-100' : ''}`}
                >
                  {node.title || '未命名节点'}
                </h4>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center Area: Chapter Fission */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedPlotNode ? (
          <>
            {/* Selected Beat Header */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 mb-6 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/50" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                      当前处理的情节
                    </span>
                    <ChevronRight size={12} className="text-slate-600" />
                    <span className="text-xs font-medium text-slate-500">
                      {selectedPlotNode.title}
                    </span>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-white">
                    {selectedPlotNode.title || '未命名情节'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={fissionCount}
                    onChange={(e) =>
                      setFissionCount(e.target.value === 'AUTO' ? 'AUTO' : Number(e.target.value))
                    }
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2 py-2 outline-none focus:border-sky-500"
                    disabled={isGenerating}
                  >
                    <option value="AUTO">AI 智能决定</option>
                    <option value={1}>裂变 1 章</option>
                    <option value={2}>裂变 2 章</option>
                    <option value={3}>裂变 3 章</option>
                    <option value={4}>裂变 4 章</option>
                    <option value={5}>裂变 5 章</option>
                  </select>
                  <button
                    onClick={handleFission}
                    disabled={isGenerating}
                    className={`bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-sky-500/20 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isGenerating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    {isGenerating ? '正在排布章节...' : '✨ AI 裂变章节细纲'}
                  </button>
                  <button
                    onClick={handleAudit}
                    disabled={isAuditing || relatedChapters.length === 0}
                    className={`bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-700 ${isAuditing || relatedChapters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isAuditing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <AlertCircle size={16} className="text-amber-400" />
                    )}
                    结构审计
                  </button>

                  <button
                    onClick={() => setShowBalanceAnalyzer(!showBalanceAnalyzer)}
                    disabled={project.chapters.length === 0 || !enableChapterBalance}
                    title={!enableChapterBalance ? '章节平衡分析已禁用，请在设置中启用' : ''}
                    className={`bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-700 ${project.chapters.length === 0 || !enableChapterBalance ? 'opacity-50 cursor-not-allowed' : ''} ${showBalanceAnalyzer ? 'bg-muse-600 text-white border-muse-500' : ''}`}
                  >
                    <BarChart3 size={16} className="text-purple-400" />
                    平衡分析
                    {!enableChapterBalance && (
                      <span className="text-[10px] text-slate-500">(已禁用)</span>
                    )}
                  </button>
                  <button
                    onClick={() => setGraphChapterId('heatmap')}
                    disabled={project.chapters.length === 0}
                    title="查看全项目冲突热力图"
                    className={`bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-700 ${project.chapters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Flame size={16} className="text-orange-400" />
                    冲突热力图
                  </button>
                  <button
                    onClick={() => setShowForeshadowingPanel(true)}
                    disabled={project.echoes.length === 0}
                    title="查看伏笔链追踪"
                    className={`bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-700 ${project.echoes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Link2 size={16} className="text-cyan-400" />
                    伏笔追踪
                  </button>
                </div>
              </div>

              {/* Audit Results Banner */}
              {auditResult && (
                <div
                  className={`mb-6 rounded-2xl border overflow-hidden transition-all duration-300 ${auditResult.isAligned ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}
                >
                  <div className="flex items-center justify-between p-4 bg-slate-900/40">
                    <div className="flex items-center gap-3">
                      {auditResult.isAligned ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                          <AlertCircle size={16} />
                        </div>
                      )}
                      <div>
                        <h4
                          className={`text-sm font-bold ${auditResult.isAligned ? 'text-emerald-400' : 'text-rose-400'}`}
                        >
                          {auditResult.isAligned ? '结构审计通过' : '检测到潜在的跑偏风险'}
                          <span className="ml-2 text-[10px] text-slate-500 font-normal uppercase tracking-wider">
                            {isAuditCollapsed ? '(点击展开详情)' : '(点击折叠)'}
                          </span>
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsAuditCollapsed(!isAuditCollapsed)}
                        className="text-slate-500 hover:text-sky-400 p-2 transition-colors"
                        title={isAuditCollapsed ? '展开审计建议' : '折叠显示'}
                      >
                        {isAuditCollapsed ? (
                          <LayoutList size={16} />
                        ) : (
                          <ChevronDownCircle size={16} className="rotate-180" />
                        )}
                      </button>
                      <button
                        onClick={() => setAuditResult(null)}
                        className="text-slate-500 hover:text-rose-400 p-2 transition-colors"
                        title="移除审计报告"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {!isAuditCollapsed && (
                    <div className="p-4 pt-0 animate-fade-in">
                      {!auditResult.isAligned && auditResult.issues.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 mt-2">
                          {auditResult.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 ${
                                    issue.type === 'DRIFT'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : issue.type === 'GAP'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-sky-500/20 text-sky-400'
                                  }`}
                                >
                                  {issue.type}
                                </span>
                                <div className="flex-1">
                                  <p className="text-xs text-slate-200 font-medium mb-1">
                                    {issue.description}
                                  </p>
                                  <p className="text-[11px] text-slate-500 italic">
                                    💡 建议：{issue.suggestion}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 p-2">
                          当前的章节规划与宏观情节节点目标高度契合，请保持创作节奏。
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="text-slate-400 text-sm leading-relaxed font-serif line-clamp-2 italic">
                "{selectedPlotNode.content || '暂无描述...'}"
              </p>
            </div>

            {/* Chapters Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                {relatedChapters.map((chapter, idx) => (
                  <div
                    key={chapter.id}
                    className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-violet-500/40 transition-all flex flex-col group relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs">
                          {idx + 1}
                        </div>
                        <input
                          className="bg-transparent text-lg font-bold text-slate-200 border-none focus:ring-0 p-0 w-full"
                          value={chapter.title}
                          onChange={(e) =>
                            handleUpdateChapter(chapter.id, { title: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex flex-col gap-0.5 mr-2 bg-slate-950/40 rounded-lg p-0.5">
                          <button
                            onClick={() => handleMoveChapter(chapter.id, 'UP')}
                            disabled={idx === 0}
                            className="text-slate-600 hover:text-sky-400 disabled:opacity-20 transition-colors"
                            title="上移 CHAPTER"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveChapter(chapter.id, 'DOWN')}
                            disabled={idx === relatedChapters.length - 1}
                            className="text-slate-600 hover:text-sky-400 disabled:opacity-20 transition-colors"
                            title="下移 CHAPTER"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRegenerateChapter(chapter.id)}
                          disabled={regeneratingChapterId === chapter.id}
                          className={`text-slate-600 hover:text-sky-400 p-1 rounded-md transition-colors ${regeneratingChapterId === chapter.id ? 'opacity-50 cursor-not-allowed text-sky-400' : ''}`}
                          title="局部重写此纲要"
                        >
                          <RefreshCw
                            size={16}
                            className={regeneratingChapterId === chapter.id ? 'animate-spin' : ''}
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          className="text-slate-600 hover:text-rose-400 p-1 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 flex-1">
                      {/* Word Count Progress */}
                      <div className="bg-slate-950/30 rounded-xl p-3 border border-slate-800/40">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Target size={12} className="text-sky-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              写作进度
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={chapter.targetWordCount || DEFAULT_TARGET_WORD_COUNT}
                              onChange={(e) =>
                                handleUpdateChapter(chapter.id, {
                                  targetWordCount: Number(e.target.value),
                                })
                              }
                              className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-2 py-1 outline-none focus:border-sky-500"
                            >
                              {WORD_COUNT_TARGETS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {(() => {
                          const wordCount = countWords(chapter.content || '');
                          const target = chapter.targetWordCount || DEFAULT_TARGET_WORD_COUNT;
                          const progress = calculateProgress(wordCount, target);
                          const status = getProgressStatus(progress);

                          return (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-400">
                                  {formatWordCount(wordCount)} / {formatWordCount(target)}
                                </span>
                                <span
                                  className={`font-bold ${
                                    progress >= 100
                                      ? 'text-emerald-400'
                                      : progress >= 75
                                        ? 'text-sky-400'
                                        : progress >= 50
                                          ? 'text-amber-400'
                                          : progress >= 25
                                            ? 'text-orange-400'
                                            : 'text-slate-500'
                                  }`}
                                >
                                  {progress}% · {status}
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    progress >= 100
                                      ? 'bg-emerald-500'
                                      : progress >= 75
                                        ? 'bg-sky-500'
                                        : progress >= 50
                                          ? 'bg-amber-500'
                                          : progress >= 25
                                            ? 'bg-orange-500'
                                            : 'bg-slate-600'
                                  }`}
                                  style={{ width: `${Math.min(100, progress)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                          <Calendar size={12} /> 章节细纲内容
                        </label>
                        <textarea
                          className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl p-3 text-sm text-slate-300 font-serif leading-relaxed h-32 focus:border-violet-500/30 transition-all outline-none resize-none"
                          placeholder="这个章节具体要写什么？包含哪些关键反转或对话？"
                          value={chapter.summary}
                          onChange={(e) =>
                            handleUpdateChapter(chapter.id, { summary: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                            <User size={12} /> 视角人物 (POV)
                          </label>
                          <input
                            className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-violet-500/30 transition-all outline-none"
                            placeholder="例如：林默"
                            value={chapter.expectedPOV}
                            onChange={(e) =>
                              handleUpdateChapter(chapter.id, { expectedPOV: e.target.value })
                            }
                          />
                        </div>
                        <div className="pt-5 flex gap-2">
                          <button
                            onClick={() => setGraphChapterId(chapter.id)}
                            className="h-10 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border border-slate-700/50 hover:border-muse-500/50 hover:text-muse-400"
                            title="查看图谱可视化"
                          >
                            <Network size={14} />
                          </button>
                          <button
                            onClick={() => handleGoToDraft(chapter.id)}
                            className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700/50 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-500 group-hover:shadow-lg group-hover:shadow-violet-600/20"
                          >
                            <PenTool size={14} /> 去写正文
                          </button>
                        </div>
                      </div>

                      {/* Chapter Beats (Scene Chain) */}
                      {chapter.beats && chapter.beats.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800/40 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 tracking-wider">
                            <Activity size={12} className="text-violet-400" /> 场景节拍 / Scene
                            Chain
                          </label>
                          <div className="space-y-2">
                            {chapter.beats.map((beat) => (
                              <div key={beat.id} className="flex gap-3 group/beat items-start">
                                <div
                                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)] ${
                                    beat.type === 'TWIST'
                                      ? 'bg-rose-500 ring-4 ring-rose-500/10'
                                      : beat.type === 'ACTION'
                                        ? 'bg-amber-500 ring-4 ring-amber-500/10'
                                        : beat.type === 'DIALOGUE'
                                          ? 'bg-sky-500 ring-4 ring-sky-500/10'
                                          : 'bg-slate-600 ring-4 ring-slate-600/10'
                                  }`}
                                />
                                <div className="flex-1 text-[11px] text-slate-400 font-serif leading-relaxed py-0.5 group-hover/beat:text-slate-200 transition-colors">
                                  <span className="opacity-40 font-sans mr-1 text-[9px] uppercase">
                                    [{beat.type}]
                                  </span>{' '}
                                  {beat.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Insert Action Bar */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 flex flex-col items-center">
                      <button
                        onClick={() => handleInsertChapter(idx)}
                        className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 scale-90 hover:scale-100 transition-transform"
                      >
                        <PlusCircle size={12} /> 在此后插入章节
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Chapter Button Card */}
                <button
                  onClick={handleAddChapter}
                  className="border-2 border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                  </div>
                  <span className="font-bold text-sm tracking-wide">添加新章节规划</span>
                </button>
              </div>
            </div>

            {/* Chapter Balance Analyzer */}
            {showBalanceAnalyzer && enableChapterBalance && (
              <div className="mt-6">
                <ChapterBalanceAnalyzer
                  chapters={project.chapters}
                  characters={project.characters}
                  plotNodes={project.plotNodes}
                  onApplySuggestion={handleApplyBalanceSuggestion}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/20 border border-slate-800/40 rounded-3xl p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 text-slate-600">
              <LayoutGrid size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-300 mb-2">欢迎来到章节细纲规划器</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
              在这里，你可以将宏观的情节卡片裂变为具体的章节。请从左侧选择一个情节节点开始规划。
            </p>
          </div>
        )}
      </div>

      {/* Right Panel: Prompt Configuration */}
      <div className="flex-shrink-0 h-full">
        <PromptPanelWrapper />
      </div>

      {/* Graph Visualization Modal */}
      {graphChapterId && (
        <ChapterGraphVisualization
          projectId={project.id}
          chapterId={graphChapterId}
          onClose={() => setGraphChapterId(null)}
        />
      )}

      {/* Foreshadowing Chain Panel */}
      {showForeshadowingPanel && (
        <ForeshadowingChainPanel
          projectId={project.id}
          onClose={() => setShowForeshadowingPanel(false)}
        />
      )}
    </div>
  );
};
