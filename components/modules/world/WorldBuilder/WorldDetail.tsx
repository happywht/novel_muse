import React from 'react';
import { Edit2, Save, X, BookPlus, Check, GitCommit } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { useWorldBuilder } from './WorldBuilderContext';

/**
 * 世界观详情展示与编辑组件
 * 包含：条目详情展示、编辑模式、回响处理、扩展功能
 */
export const WorldDetail: React.FC = () => {
  const {
    activeItem,
    activeItemEchoes,
    categories,
    isEditing,
    setIsEditing,
    editContent,
    setEditContent,
    isExpanding,
    isIterating,
    handleExpandLore,
    handleSaveEdit,
    handleAcceptEcho,
    handleRejectEcho,
  } = useWorldBuilder();

  if (!activeItem) {
    return null;
  }

  return (
    <div className="animate-fade-in flex-1 flex flex-col">
      {/* Echo Proposals */}
      {activeItemEchoes.length > 0 && !isEditing && (
        <div className="mb-6 space-y-3">
          {activeItemEchoes.map(echo => (
            <div key={echo.id} className="bg-slate-900/80 border border-cyan-900/50 rounded-xl p-4 shadow-[0_0_20px_rgba(34,211,238,0.05)] relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400/50 to-cyan-500/0"></div>
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 bg-cyan-950 rounded-lg text-cyan-400">
                  <GitCommit size={16} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-1 flex items-center gap-2">
                    🌌 命运回响 (系统洞察)
                  </h4>
                  <p className="text-sm text-slate-300 mb-2 leading-relaxed">
                    AI 观测到在最新剧情中，世界线发生了变动：<br />
                    <span className="text-white font-medium">新增规则/状态：[{echo.description}]</span>
                  </p>
                  <p className="text-xs text-slate-500 italic mb-4 border-l-2 border-slate-700 pl-2">
                    "{echo.reason}"
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptEcho(echo)}
                      className="text-xs bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                    >
                      <Check size={12} /> 接受并铭刻
                    </button>
                    <button
                      onClick={() => handleRejectEcho(echo)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
                    >
                      忽略，这只是平行宇宙的幻影
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 头部区域 */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold tracking-wider text-muse-400 uppercase bg-muse-900/30 px-2 py-1 rounded">
            {categories.find(c => c.id === activeItem.category)?.label}
          </span>
          <h1 className="text-3xl font-serif font-bold text-white mt-2">{activeItem.title}</h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-all flex items-center gap-2"
              >
                <X size={16} /> 取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg border border-emerald-500 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
              >
                <Save size={16} /> 保存
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-all flex items-center gap-2"
              >
                <Edit2 size={16} /> 编辑
              </button>
              <button
                onClick={handleExpandLore}
                disabled={isExpanding || isIterating}
                className="text-sm bg-slate-800 hover:bg-muse-900 text-muse-300 hover:text-white px-3 py-2 rounded-lg border border-slate-700 hover:border-muse-500 transition-all flex items-center gap-2"
              >
                {isExpanding ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div> : <BookPlus size={16} />}
                扩展历史与文化
              </button>
            </>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 w-full bg-slate-950/50 border border-slate-700 rounded-lg p-4 text-slate-300 font-serif leading-relaxed text-lg resize-none focus:border-muse-500 outline-none custom-scrollbar"
        />
      ) : (
        <div className="prose prose-invert prose-slate max-w-none pb-20">
          <MarkdownRenderer content={activeItem.content} />
        </div>
      )}
    </div>
  );
};

export default WorldDetail;
