import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Echo, Chapter, Character, WorldSetting } from '../../types';
import {
  X,
  Check,
  CheckCircle2,
  XCircle,
  Zap,
  ChevronDown,
  FileText,
  Search,
  ArrowUpDown,
  Edit3,
  Eye,
  Save,
  RotateCcw,
  ClipboardCheck,
} from 'lucide-react';
import {
  categorizeEchoes,
  getConfidenceConfig,
  getConfidenceBarColor,
  formatConfidence,
  CategorizedEchoes,
} from './echoUtils';
import { EchoIntegrityReport } from './EchoIntegrityReport';

interface EchoDeepReviewProps {
  isOpen: boolean;
  onClose: () => void;
  echoes: Echo[];
  chapters?: Chapter[];
  characters?: Character[];
  worldSettings?: WorldSetting[];
  onAccept: (echo: Echo) => void;
  onReject: (echo: Echo) => void;
  onBatchAccept?: (echoes: Echo[]) => void;
  onBatchReject?: (echoes: Echo[]) => void;
  onUpdate?: (echo: Echo) => void;
  onSimulate?: (targetName: string, description: string) => void;
  onPublishConfirm?: () => void;
}

type ConfidenceFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
type SortMode = 'TIME' | 'CONFIDENCE';

interface EditingState {
  description: string;
  reason: string;
}

export const EchoDeepReview: React.FC<EchoDeepReviewProps> = ({
  isOpen,
  onClose,
  echoes,
  chapters = [],
  characters = [],
  worldSettings = [],
  onAccept,
  onReject,
  onBatchAccept,
  onBatchReject,
  onUpdate,
  onSimulate,
  onPublishConfirm,
}) => {
  // 筛选状态
  const [chapterFilter, setChapterFilter] = useState<string>('ALL');
  const [characterFilter, setCharacterFilter] = useState<string>('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('CONFIDENCE');

  // 选择和编辑状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeEchoId, setActiveEchoId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingState, setEditingState] = useState<EditingState>({
    description: '',
    reason: '',
  });

  // 完整性报告模态框状态
  const [showIntegrityReport, setShowIntegrityReport] = useState(false);

  // ESC键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey) && isOpen) {
        e.preventDefault();
        handleSelectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 当echoes变化时重置activeEchoId
  useEffect(() => {
    if (activeEchoId && !echoes.find((e) => e.id === activeEchoId)) {
      setActiveEchoId(null);
      setIsEditing(false);
    }
  }, [echoes, activeEchoId]);

  // 分类统计
  const categorized = useMemo<CategorizedEchoes>(() => {
    return categorizeEchoes(echoes);
  }, [echoes]);

  // 获取Echo关联的章节信息
  const getEchoChapter = useCallback((echo: Echo): string => {
    // 简化实现：从echo的targetId查找关联章节
    // 实际项目中可能需要更复杂的逻辑
    return '未分类';
  }, []);

  // 筛选后的echoes
  const filteredEchoes = useMemo(() => {
    let result = [...echoes];

    // 按置信度筛选
    if (confidenceFilter === 'HIGH') {
      result = categorized.high;
    } else if (confidenceFilter === 'MEDIUM') {
      result = categorized.medium;
    } else if (confidenceFilter === 'LOW') {
      result = categorized.low;
    }

    // 按角色筛选
    if (characterFilter !== 'ALL') {
      result = result.filter(
        (echo) => echo.type === 'CHARACTER' && echo.targetId === characterFilter
      );
    }

    // 排序
    if (sortMode === 'CONFIDENCE') {
      result.sort((a, b) => (b.confidence || 0.7) - (a.confidence || 0.7));
    } else {
      result.sort((a, b) => b.timestamp - a.timestamp);
    }

    return result;
  }, [echoes, confidenceFilter, characterFilter, sortMode, categorized]);

  // 当前选中的Echo
  const activeEcho = useMemo(() => {
    return echoes.find((e) => e.id === activeEchoId) || null;
  }, [echoes, activeEchoId]);

  // 统计当前筛选结果的状态
  const filterStats = useMemo(() => {
    const accepted = filteredEchoes.filter(
      (e) => e.status === 'ACCEPTED' || e.status === 'AUTO_ACCEPTED'
    ).length;
    const pending = filteredEchoes.filter((e) => e.status === 'PENDING').length;
    const rejected = filteredEchoes.filter((e) => e.status === 'REJECTED').length;
    return { accepted, pending, rejected, total: filteredEchoes.length };
  }, [filteredEchoes]);

  // 切换选择
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 全选
  const handleSelectAll = () => {
    if (selectedIds.size === filteredEchoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEchoes.map((e) => e.id)));
    }
  };

  // 清空选择
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // 批量采纳
  const handleBatchAccept = () => {
    const selected = filteredEchoes.filter((e) => selectedIds.has(e.id));
    if (onBatchAccept) {
      onBatchAccept(selected);
    } else {
      selected.forEach((e) => onAccept(e));
    }
    setSelectedIds(new Set());
  };

  // 批量拒绝
  const handleBatchReject = () => {
    const selected = filteredEchoes.filter((e) => selectedIds.has(e.id));
    if (onBatchReject) {
      onBatchReject(selected);
    } else {
      selected.forEach((e) => onReject(e));
    }
    setSelectedIds(new Set());
  };

  // 选中Echo并显示详情
  const selectEcho = (echo: Echo) => {
    setActiveEchoId(echo.id);
    setIsEditing(false);
    setEditingState({
      description: echo.description,
      reason: echo.reason,
    });
  };

  // 开始编辑
  const startEditing = () => {
    if (activeEcho) {
      setEditingState({
        description: activeEcho.description,
        reason: activeEcho.reason,
      });
      setIsEditing(true);
    }
  };

  // 保存编辑
  const saveEditing = () => {
    if (activeEcho && onUpdate) {
      onUpdate({
        ...activeEcho,
        description: editingState.description,
        reason: editingState.reason,
      });
      setIsEditing(false);
    }
  };

  // 取消编辑
  const cancelEditing = () => {
    if (activeEcho) {
      setEditingState({
        description: activeEcho.description,
        reason: activeEcho.reason,
      });
      setIsEditing(false);
    }
  };

  // 获取状态图标和文本
  const getStatusDisplay = (status: Echo['status']) => {
    switch (status) {
      case 'ACCEPTED':
      case 'AUTO_ACCEPTED':
        return { icon: '🟢', text: '已采纳', color: 'text-emerald-400' };
      case 'PENDING':
        return { icon: '🟡', text: '待审核', color: 'text-amber-400' };
      case 'REJECTED':
        return { icon: '🔴', text: '已拒绝', color: 'text-rose-400' };
      case 'ARCHIVED':
        return { icon: '📦', text: '已归档', color: 'text-slate-400' };
      default:
        return { icon: '❓', text: '未知', color: 'text-slate-400' };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[95vw] h-[90vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部工具栏 */}
        <div className="bg-slate-950/50 border-b border-slate-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Search className="text-muse-400" size={24} />
              <h2 className="text-xl font-bold text-white">关系深度审核</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowIntegrityReport(true)}
                className="flex items-center gap-2 bg-muse-700 hover:bg-muse-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <ClipboardCheck size={16} />
                完整性报告
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* 筛选器行 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 章节筛选 */}
            <div className="relative">
              <select
                value={chapterFilter}
                onChange={(e) => setChapterFilter(e.target.value)}
                className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm px-4 py-2 pr-10 rounded-lg focus:outline-none focus:border-muse-500 transition-colors"
              >
                <option value="ALL">全部章节</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={16}
              />
            </div>

            {/* 角色筛选 */}
            <div className="relative">
              <select
                value={characterFilter}
                onChange={(e) => setCharacterFilter(e.target.value)}
                className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm px-4 py-2 pr-10 rounded-lg focus:outline-none focus:border-muse-500 transition-colors"
              >
                <option value="ALL">全部角色</option>
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={16}
              />
            </div>

            {/* 置信度筛选 */}
            <div className="relative">
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value as ConfidenceFilter)}
                className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm px-4 py-2 pr-10 rounded-lg focus:outline-none focus:border-muse-500 transition-colors"
              >
                <option value="ALL">全部置信度</option>
                <option value="HIGH">高置信度</option>
                <option value="MEDIUM">中置信度</option>
                <option value="LOW">低置信度</option>
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={16}
              />
            </div>

            {/* 排序切换 */}
            <button
              onClick={() => setSortMode(sortMode === 'TIME' ? 'CONFIDENCE' : 'TIME')}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <ArrowUpDown size={16} />
              {sortMode === 'TIME' ? '按时间' : '按置信度'}
            </button>

            {/* 批量操作 */}
            {selectedIds.size > 0 && (
              <div className="flex gap-2 ml-auto animate-fade-in">
                <button
                  onClick={handleBatchAccept}
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  <CheckCircle2 size={16} />
                  批量采纳 ({selectedIds.size})
                </button>
                <button
                  onClick={handleBatchReject}
                  className="flex items-center gap-2 bg-rose-900/50 hover:bg-rose-800 text-rose-200 text-sm px-4 py-2 rounded-lg border border-rose-500/30 transition-colors"
                >
                  <XCircle size={16} />
                  批量拒绝
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：变更概览列表 */}
          <div className="w-[400px] border-r border-slate-800 flex flex-col bg-slate-900">
            {/* 统计摘要 */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📊</span>
                <span className="text-sm font-bold text-white">变更概览</span>
              </div>
              <div className="text-xs text-slate-400 mb-3">共 {filterStats.total} 个Echo</div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span>🟢</span>
                  <span className="text-slate-300">已采纳: {filterStats.accepted}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🟡</span>
                  <span className="text-slate-300">待审核: {filterStats.pending}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🔴</span>
                  <span className="text-slate-300">已拒绝: {filterStats.rejected}</span>
                </div>
              </div>
            </div>

            {/* Echo列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredEchoes.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">暂无符合条件的Echo</p>
                </div>
              ) : (
                filteredEchoes.map((echo) => {
                  const confConfig = getConfidenceConfig(echo.confidence);
                  const isSelected = selectedIds.has(echo.id);
                  const isActive = activeEchoId === echo.id;
                  const statusDisplay = getStatusDisplay(echo.status);

                  return (
                    <div
                      key={echo.id}
                      onClick={() => selectEcho(echo)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-muse-900/30 border-muse-500/50 shadow-lg'
                          : isSelected
                            ? `${confConfig.bg} ${confConfig.border}`
                            : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* 复选框 */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(echo.id);
                          }}
                          className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? `${confConfig.border} ${confConfig.text} bg-current`
                              : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <Check size={10} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* 状态图标和名称 */}
                          <div className="flex items-center gap-2 mb-1">
                            <span>{statusDisplay.icon}</span>
                            <span className="font-bold text-slate-200 text-xs truncate flex-1">
                              {echo.targetName}
                            </span>
                            <span className={`text-[10px] ${confConfig.text} font-bold`}>
                              {formatConfidence(echo.confidence)}
                            </span>
                          </div>

                          {/* 描述 */}
                          <p className="text-slate-400 text-xs truncate">{echo.description}</p>

                          {/* 类型标签 */}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                                echo.type === 'CHARACTER'
                                  ? 'bg-indigo-900/50 text-indigo-300'
                                  : 'bg-emerald-900/50 text-emerald-300'
                              }`}
                            >
                              {echo.type === 'CHARACTER' ? '人物' : '世界'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 底部工具栏 */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/30">
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    全选
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    onClick={clearSelection}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    清空
                  </button>
                </div>
                <div className="text-slate-500">
                  已选择 {selectedIds.size} / {filteredEchoes.length} 项
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：详细编辑面板 */}
          <div className="flex-1 flex flex-col bg-slate-950/30">
            {activeEcho ? (
              <>
                {/* 详情头部 */}
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{activeEcho.targetName}</h3>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-1 rounded-sm ${
                          activeEcho.type === 'CHARACTER'
                            ? 'bg-indigo-900/50 text-indigo-300'
                            : 'bg-emerald-900/50 text-emerald-300'
                        }`}
                      >
                        {activeEcho.type === 'CHARACTER' ? '人物' : '世界'}
                      </span>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={startEditing}
                        className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                  </div>

                  {/* 状态和置信度 */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">类型:</span>
                      <span
                        className={`text-xs px-2 py-1 rounded border ${
                          activeEcho.type === 'CHARACTER'
                            ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-300'
                            : 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
                        }`}
                      >
                        {activeEcho.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">状态:</span>
                      <span
                        className={`text-xs px-2 py-1 rounded border ${
                          activeEcho.status === 'ACCEPTED' || activeEcho.status === 'AUTO_ACCEPTED'
                            ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
                            : activeEcho.status === 'PENDING'
                              ? 'bg-amber-900/30 border-amber-500/50 text-amber-300'
                              : 'bg-rose-900/30 border-rose-500/50 text-rose-300'
                        }`}
                      >
                        {activeEcho.status}
                      </span>
                    </div>
                  </div>

                  {/* 置信度进度条 */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">置信度:</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getConfidenceBarColor(activeEcho.confidence || 0.7)}`}
                        style={{ width: `${(activeEcho.confidence || 0.7) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-300">
                      {formatConfidence(activeEcho.confidence)}
                    </span>
                  </div>
                </div>

                {/* 编辑区域 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {/* 描述 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">描述</label>
                    {isEditing ? (
                      <textarea
                        value={editingState.description}
                        onChange={(e) =>
                          setEditingState({ ...editingState, description: e.target.value })
                        }
                        className="w-full h-24 bg-slate-800 border border-slate-700 text-slate-200 text-sm p-3 rounded-lg focus:outline-none focus:border-muse-500 transition-colors resize-none"
                        placeholder="输入描述..."
                      />
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300">
                        {activeEcho.description}
                      </div>
                    )}
                  </div>

                  {/* 原因 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">原因</label>
                    {isEditing ? (
                      <textarea
                        value={editingState.reason}
                        onChange={(e) =>
                          setEditingState({ ...editingState, reason: e.target.value })
                        }
                        className="w-full h-20 bg-slate-800 border border-slate-700 text-slate-200 text-sm p-3 rounded-lg focus:outline-none focus:border-muse-500 transition-colors resize-none"
                        placeholder="输入原因..."
                      />
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300">
                        {activeEcho.reason}
                      </div>
                    )}
                  </div>

                  {/* 原文依据 */}
                  {activeEcho.extractionEvidence && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">
                        原文依据
                      </label>
                      <div className="bg-slate-900/60 border-l-4 border-muse-500 pl-4 py-3 text-sm text-slate-400 italic rounded-r-lg">
                        "{activeEcho.extractionEvidence}"
                      </div>
                    </div>
                  )}

                  {/* 关联知识三元组 */}
                  {activeEcho.triples && activeEcho.triples.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">
                        关联关系变更
                      </label>
                      <div className="space-y-2">
                        {activeEcho.triples.map((triple, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-xs"
                          >
                            <div className="flex items-center gap-2 text-slate-300">
                              <span className="font-bold">{triple.subject}</span>
                              <span className="text-muse-400">→</span>
                              <span className="text-amber-400">{triple.relation}</span>
                              <span className="text-muse-400">→</span>
                              <span className="font-bold">{triple.object}</span>
                            </div>
                            {triple.weight !== undefined && (
                              <div className="mt-1 text-slate-500">
                                强度: {triple.weight}%{' '}
                                {triple.trajectory && `(${triple.trajectory})`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 时间戳 */}
                  <div className="text-xs text-slate-600">
                    创建时间: {new Date(activeEcho.timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/30">
                  {isEditing ? (
                    <div className="flex gap-3">
                      <button
                        onClick={saveEditing}
                        className="flex-1 flex items-center justify-center gap-2 bg-muse-700 hover:bg-muse-600 text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
                      >
                        <Save size={16} />
                        保存修改
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2.5 rounded-lg transition-colors border border-slate-700"
                      >
                        <RotateCcw size={16} />
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => onAccept(activeEcho)}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
                      >
                        <CheckCircle2 size={16} />
                        采纳
                      </button>
                      <button
                        onClick={() => onReject(activeEcho)}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-900/50 hover:bg-rose-800 text-rose-200 text-sm px-4 py-2.5 rounded-lg border border-rose-500/30 transition-colors"
                      >
                        <XCircle size={16} />
                        拒绝
                      </button>
                      {onSimulate && (
                        <button
                          onClick={() => onSimulate(activeEcho.targetName, activeEcho.description)}
                          className="flex items-center justify-center gap-2 bg-muse-900/50 hover:bg-muse-800 text-muse-200 text-sm px-4 py-2.5 rounded-lg border border-muse-500/30 transition-colors"
                        >
                          <Zap size={16} />
                          预演影响
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600">
                <div className="text-center">
                  <Eye size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm">从左侧选择一个Echo查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 完整性报告模态框 */}
      <EchoIntegrityReport
        isOpen={showIntegrityReport}
        onClose={() => setShowIntegrityReport(false)}
        onConfirm={() => {
          setShowIntegrityReport(false);
          if (onPublishConfirm) {
            onPublishConfirm();
          }
        }}
        echoes={echoes}
        characters={characters}
        worldSettings={worldSettings}
        chapters={chapters}
      />
    </div>
  );
};
