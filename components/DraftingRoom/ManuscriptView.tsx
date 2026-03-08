import React from 'react';
import { Book, Trash2, PenTool, RefreshCw, Clipboard, Check, Save, FileText, Cloud } from 'lucide-react';
import { ProjectState } from '../../types';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface ManuscriptViewProps {
    project: ProjectState;
    activeChapterId: string | null;
    setActiveChapterId: (id: string | null) => void;
    isEditingManuscript: boolean;
    setIsEditingManuscript: (is: boolean) => void;
    editingContent: string;
    setEditingContent: (content: string) => void;
    updateProject: (data: Partial<ProjectState>) => void;
    fetchChapterContent: (id: string) => void;
    handleDeleteChapter: (e: React.MouseEvent, id: string) => void;
    isLoading: boolean;
}

export const ManuscriptView: React.FC<ManuscriptViewProps> = ({
    project,
    activeChapterId,
    setActiveChapterId,
    isEditingManuscript,
    setIsEditingManuscript,
    editingContent,
    setEditingContent,
    updateProject,
    fetchChapterContent,
    handleDeleteChapter,
    isLoading
}) => {
    return (
        <div className="w-full flex h-full gap-6 pt-10">
            {/* Left: Chapter List */}
            <div className="w-1/4 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Book size={18} className="text-muse-400" /> 正文目录
                    </h3>
                    <button
                        onClick={() => {
                            if (activeChapterId) {
                                fetchChapterContent(activeChapterId);
                            }
                        }}
                        className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${isLoading ? 'bg-indigo-900/50 text-indigo-300 border-indigo-500/30 cursor-not-allowed' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'}`}
                        title="从数据库拉取当前选中章节内容"
                        disabled={!activeChapterId || isLoading}
                    >
                        <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> 同步
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {(project.chapters || []).length === 0 && (
                        <p className="text-slate-500 text-xs p-4 text-center">暂无正文章节。请去工坊采纳草稿。</p>
                    )}
                    {[...(project.chapters || [])]
                        .sort((a, b) => a.order - b.order)
                        .map((chapter, idx) => (
                            <div
                                key={chapter.id}
                                onClick={() => setActiveChapterId(chapter.id)}
                                className={`p-3 rounded-lg cursor-pointer transition-colors group relative ${activeChapterId === chapter.id
                                    ? 'bg-muse-900/50 text-muse-200 border border-muse-500/30'
                                    : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'
                                    }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold opacity-50">#{idx + 1}</span>
                                    <span className="text-[10px] text-slate-500">{new Date(chapter.lastModified).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-medium text-sm truncate pr-6">{chapter.title}</h4>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fetchChapterContent(chapter.id);
                                    }}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="从云端同步此章"
                                >
                                    <Cloud size={14} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteChapter(e, chapter.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="删除章节"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                </div>
            </div>

            {/* Right: Reader */}
            <div className="w-3/4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
                {activeChapterId ? (
                    (() => {
                        const chapter = (project.chapters || []).find(c => c.id === activeChapterId);
                        if (!chapter) return null;

                        const hasContent = chapter.content && chapter.content.trim() !== "";

                        return (
                            <>
                                <div className="p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-end">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-3xl font-serif font-bold text-white">{chapter.title}</h2>
                                            {isEditingManuscript && (
                                                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                                    编辑模式
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2">
                                            字数统计: {hasContent ? chapter.content.length : 0} 字 · 最后修改: {new Date(chapter.lastModified).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {!isEditingManuscript ? (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingManuscript(true);
                                                        setEditingContent(chapter.content || '');
                                                    }}
                                                    className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                                                >
                                                    <PenTool size={14} className="text-muse-400" /> 编辑正文
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("确定要放弃本地缓存，重试从云端加载吗？")) {
                                                            // We need to clear local content first to trigger fetch
                                                            updateProject({
                                                                chapters: project.chapters.map(c =>
                                                                    c.id === chapter.id ? { ...c, content: '' } : c
                                                                )
                                                            });
                                                            fetchChapterContent(chapter.id);
                                                        }
                                                    }}
                                                    className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-500 hover:text-sky-400 transition-colors flex items-center gap-2"
                                                    title="从数据库强制拉取内容"
                                                >
                                                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                                                </button>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(chapter.content)}
                                                    disabled={!hasContent}
                                                    className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:text-white disabled:opacity-50"
                                                >
                                                    <Clipboard size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const updatedChapters = project.chapters.map(c =>
                                                            c.id === chapter.id
                                                                ? { ...c, content: editingContent, lastModified: Date.now() }
                                                                : c
                                                        );
                                                        updateProject({ chapters: updatedChapters });
                                                        setIsEditingManuscript(false);
                                                    }}
                                                    className="text-xs bg-emerald-600 px-4 py-1.5 rounded text-white hover:bg-emerald-500 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/40"
                                                >
                                                    <Save size={14} /> 保存修改
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingManuscript(false)}
                                                    className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-white"
                                                >
                                                    取消
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar prose prose-invert prose-lg max-w-none font-serif leading-loose text-slate-300 relative">
                                    {isEditingManuscript ? (
                                        <div className="h-full flex flex-col p-8 bg-slate-950/20">
                                            <textarea
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                className="w-full flex-1 bg-transparent border-none focus:ring-0 text-slate-200 text-lg font-serif leading-loose resize-none custom-scrollbar"
                                                placeholder="点击此处开始校对或补全正文内容..."
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-8">
                                            {hasContent ? (
                                                <MarkdownRenderer content={chapter.content} />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full space-y-4 py-20 bg-slate-950/10 rounded-2xl border border-dashed border-slate-800">
                                                    {isLoading ? (
                                                        <>
                                                            <RefreshCw className="animate-spin text-muse-500" size={32} />
                                                            <p className="text-slate-500 animate-pulse">正在从卷轴中提取文字...</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600 mb-2">
                                                                <FileText size={32} />
                                                            </div>
                                                            <p className="text-slate-500">此卷轴尚未记录任何文字</p>
                                                            <button
                                                                onClick={() => {
                                                                    setIsEditingManuscript(true);
                                                                    setEditingContent('');
                                                                }}
                                                                className="text-xs text-muse-400 hover:text-muse-300 underline underline-offset-4"
                                                            >
                                                                立即开始书写
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        );
                    })()
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                        <Book size={64} className="opacity-20 mb-4" />
                        <p>选择左侧章节进行阅读或校对</p>
                    </div>
                )}
            </div>
        </div>
    );
};
