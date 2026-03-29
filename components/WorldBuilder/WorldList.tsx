import React, { useState } from 'react';
import {
  Search,
  Plus,
  BookPlus,
  Trash2,
  Settings2,
  Map,
  Eye,
  Cpu,
  BookOpen,
  Scroll,
} from 'lucide-react';
import { VirtualList } from '../VirtualList';
import { ConfirmDialog } from '../common';
import { useWorldBuilder, SparklesIcon } from './WorldBuilderContext';
import { UI_CONFIG } from '../../config/constants';

/**
 * 世界观列表侧边栏组件
 * 包含：分类标签、搜索、配置面板、条目列表、新建表单
 */
export const WorldList: React.FC = () => {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    showConfig,
    setShowConfig,
    genConfig,
    updateConfig,
    newItemTitle,
    setNewItemTitle,
    draftLore,
    isGenerating,
    filteredSettings,
    activeItemId,
    setActiveItemId,
    setDraftLore,
    deleteLore,
    handleGenerateLore,
    handleManualAdd,
    project,
  } = useWorldBuilder();

  // 删除确认状态
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    itemId: string | null;
    itemTitle: string;
  }>({
    isOpen: false,
    itemId: null,
    itemTitle: '',
  });

  // 打开删除确认
  const handleDeleteClick = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      itemId: id,
      itemTitle: title,
    });
  };

  // 确认删除
  const handleConfirmDelete = () => {
    if (deleteConfirm.itemId) {
      deleteLore(deleteConfirm.itemId);
    }
    setDeleteConfirm({ isOpen: false, itemId: null, itemTitle: '' });
  };

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, itemId: null, itemTitle: '' });
  };

  return (
    <div className="w-1/3 flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden relative">
      {/* 头部区域 */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-serif font-bold text-lg text-white">世界观档案</h2>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg transition-colors ${showConfig ? 'bg-muse-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="生成配置"
          >
            <Settings2 size={18} />
          </button>
        </div>

        {/* 配置面板 */}
        {showConfig && (
          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-700 space-y-3 animate-fade-in text-sm">
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">
                详略程度
              </label>
              <div className="flex gap-1">
                {['Brief', 'Standard', 'Detailed'].map((level) => (
                  <button
                    key={level}
                    onClick={() => updateConfig('detailLevel', level)}
                    className={`flex-1 py-1 px-2 rounded text-xs border ${genConfig.detailLevel === level ? 'bg-muse-900 border-muse-500 text-muse-200' : 'bg-slate-800 border-transparent text-slate-400'}`}
                  >
                    {level === 'Brief' ? '简短' : level === 'Standard' ? '标准' : '详尽'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">
                侧重方向
              </label>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { k: 'Balanced', l: '平衡', i: BookOpen },
                  { k: 'Sensory', l: '感官描写', i: Eye },
                  { k: 'Logic', l: '逻辑原理', i: Cpu },
                  { k: 'History', l: '历史渊源', i: Scroll },
                ].map((opt) => (
                  <button
                    key={opt.k}
                    onClick={() => updateConfig('focus', opt.k)}
                    className={`flex items-center justify-center gap-1 py-1 px-2 rounded text-xs border ${genConfig.focus === opt.k ? 'bg-muse-900 border-muse-500 text-muse-200' : 'bg-slate-800 border-transparent text-slate-400'}`}
                  >
                    <opt.i size={10} /> {opt.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 分类标签 */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide pt-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors min-w-[40px] ${selectedCategory === cat.id ? 'bg-muse-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              title={cat.label}
            >
              <cat.icon size={18} />
            </button>
          ))}
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`搜索${categories.find((c) => c.id === selectedCategory)?.label}...`}
            className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:border-muse-500 outline-none"
          />
        </div>
      </div>

      {/* 条目列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* 新建条目表单 */}
        <div className="p-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="新建词条标题..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-muse-500 outline-none"
            />
            <div className="flex gap-1">
              <button
                onClick={handleManualAdd}
                disabled={draftLore !== null}
                title="手动创建"
                className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-md disabled:opacity-50"
              >
                <BookPlus size={18} />
              </button>
              <button
                onClick={handleGenerateLore}
                disabled={isGenerating || draftLore !== null}
                title="AI 灵感生成"
                className="bg-muse-600 hover:bg-muse-500 text-white p-2 rounded-md disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                ) : (
                  <Plus size={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 虚拟滚动列表 */}
        {filteredSettings.length > 0 && (
          <VirtualList
            items={filteredSettings}
            itemHeight={UI_CONFIG.WORLD_LIST_ITEM_HEIGHT}
            height={
              typeof window !== 'undefined'
                ? window.innerHeight - UI_CONFIG.WORLD_LIST_HEIGHT_OFFSET
                : UI_CONFIG.DEFAULT_LIST_HEIGHT
            }
            className="space-y-2"
            renderItem={(lore, idx) => {
              const hasEcho = (project.echoes || []).some(
                (e) => e.targetId === lore.id && e.status === 'PENDING'
              );
              return (
                <div
                  key={lore.id}
                  onClick={() => {
                    setActiveItemId(lore.id);
                    setDraftLore(null);
                  }}
                  className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group relative overflow-hidden ${
                    activeItemId === lore.id
                      ? 'bg-muse-900/50 border border-muse-500/50'
                      : 'bg-slate-800 hover:bg-slate-750 border border-transparent'
                  } ${hasEcho && activeItemId !== lore.id ? 'shadow-[0_0_15px_rgba(34,211,238,0.15)] border-cyan-900/50' : ''}`}
                >
                  {/* Echo指示器 */}
                  {hasEcho && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
                  )}

                  {/* 标题 */}
                  <span
                    className={`font-medium truncate ${hasEcho ? 'text-cyan-100' : 'text-slate-200'}`}
                  >
                    {lore.title}
                  </span>

                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => handleDeleteClick(e, lore.id, lore.title)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            }}
          />
        )}

        {/* 空状态 */}
        {filteredSettings.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-8 italic">
            {searchQuery ? '未找到匹配条目' : '暂无条目'}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="删除设定条目"
        message={`确定要删除「${deleteConfirm.itemTitle}」吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default WorldList;
