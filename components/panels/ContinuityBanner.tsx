import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ProjectState } from '../../types';

interface ContinuityBannerProps {
    project: ProjectState;
    activeChapterId: string | null;
}

/**
 * Continuity Gap Detection Banner
 * Extracted from DraftingRoom.tsx
 */
export const ContinuityBanner: React.FC<ContinuityBannerProps> = ({ project, activeChapterId }) => {
    const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);

    if (currentIndex <= 0) return null;

    // Check for empty chapters before this one
    const precedingChapters = sortedChapters.slice(0, currentIndex);
    const emptyChapters = precedingChapters.filter(c => !c.content || c.content.trim().length < 50);

    if (emptyChapters.length > 0) {
        return (
            <div className="w-full bg-amber-900/40 border border-amber-500/50 p-3 rounded-xl flex items-start gap-2">
                <div className="mt-0.5"><AlertTriangle className="text-amber-500" size={14} /></div>
                <div className="flex-1">
                    <p className="text-amber-300 text-xs font-bold">检测到叙事断层 (Continuity Gap)</p>
                    <p className="text-amber-400/80 text-[10px] leading-relaxed mt-1">
                        前序章节（如：{emptyChapters.slice(0, 2).map(c => `"${c.title}"`).join(', ')}{emptyChapters.length > 2 ? ' 等' : ''}）内容缺失。
                        这会导致 AI 无法继承之前的关键伏笔或状态变更，建议补全。
                    </p>
                </div>
            </div>
        );
    }

    return null;
};
