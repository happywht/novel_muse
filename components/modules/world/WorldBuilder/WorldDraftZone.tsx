import React from 'react';
import { Check, Edit2, Info, RefreshCw } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { useWorldBuilder, SparklesIcon } from './WorldBuilderContext';

/**
 * 世界观草稿展示与编辑组件
 * 包含：AI 生成草稿展示、迭代优化、接受/拒绝操作
 */
export const WorldDraftZone: React.FC = () => {
  const {
    draftLore,
    setDraftLore,
    isEditing,
    setIsEditing,
    editContent,
    setEditContent,
    iterationFeedback,
    setIterationFeedback,
    isIterating,
    handleIterateLore,
    updateProject,
    project,
    setActiveItemId,
    setNewItemTitle,
    showToast,
  } = useWorldBuilder();

  if (!draftLore) {
    return null;
  }

  // 处理确认收录
  const handleAcceptDraft = () => {
    const finalDraft = isEditing ? { ...draftLore, content: editContent } : draftLore;
    updateProject({
      worldSettings: [...project.worldSettings, finalDraft]
    });
    setActiveItemId(finalDraft.id);
    setDraftLore(null);
    setNewItemTitle('');
    setIsEditing(false);
    showToast(`已确立: ${finalDraft.title}`, 'success');
  };

  // 处理舍弃草稿
  const handleDiscardDraft = () => {
    setDraftLore(null);
    setIsEditing(false);
  };

  return (
    <div className="animate-fade-in flex-1 flex flex-col">
      {/* 头部区域 */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold tracking-wider text-amber-500 uppercase bg-amber-500/10 px-2 py-1 rounded flex items-center gap-1">
            <SparklesIcon size={12} /> 待确立的新条目
          </span>
          <h1 className="text-3xl font-serif font-bold text-white mt-2">{draftLore.title}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDiscardDraft}
            className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-all"
          >
            舍弃草稿
          </button>
          <button
            onClick={handleAcceptDraft}
            className="text-sm bg-muse-600 hover:bg-muse-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-muse-900/20 transition-all flex items-center gap-2"
          >
            <Check size={18} /> 确认收录
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* 提示信息 */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
          <Info size={18} className="text-muse-400 mt-1" />
          <div className="text-xs text-slate-400 leading-relaxed">
            这是新生成的设定建议。您可以直接在下方修改内容，确认无误后点击"确认收录"将其永久保存到世界观档案中。
          </div>
        </div>

        {/* 内容区域 */}
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="输入设定内容..."
            className="flex-1 w-full bg-slate-950/50 border border-slate-700 rounded-lg p-4 text-slate-300 font-serif leading-relaxed text-lg resize-none focus:border-muse-500 outline-none custom-scrollbar"
          />
        ) : (
          <div className="prose prose-invert prose-slate max-w-none flex-1">
            <MarkdownRenderer content={draftLore.content} />
            {draftLore.content && (
              <button
                onClick={() => { setIsEditing(true); setEditContent(draftLore.content); }}
                className="mt-4 text-sm text-muse-400 hover:text-muse-300 flex items-center gap-1"
              >
                <Edit2 size={14} /> 修改内容
              </button>
            )}
          </div>
        )}

        {/* 迭代优化区域 */}
        {!isEditing && (
          <div className="border-t border-slate-800 pt-6 mt-6">
            <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">觉得不满意？告诉 AI 如何完善：</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={iterationFeedback}
                onChange={(e) => setIterationFeedback(e.target.value)}
                placeholder="例如：增加更多的宗教细节，或者描述一下它的起源..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-muse-500 outline-none"
              />
              <button
                onClick={handleIterateLore}
                disabled={isIterating || !iterationFeedback.trim()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isIterating ? <RefreshCw size={14} className="animate-spin" /> : <SparklesIcon size={14} />}
                优化建议
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldDraftZone;
