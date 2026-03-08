import React from 'react';
import { ProjectState, ViewMode } from '../types';
import { useProjectStore } from '../store/useProjectStore';

// Extracted Hook
import { useDraftingActions } from './DraftingRoom/useDraftingActions';

// Extracted UI Components
import { ForgeSidebar } from './DraftingRoom/ForgeSidebar';
import { ForgeEditor } from './DraftingRoom/ForgeEditor';
import { ManuscriptView } from './DraftingRoom/ManuscriptView';
import { ReferenceSidebar } from './DraftingRoom/ReferenceSidebar';

// Extracted Panels
import { ContinuityBanner } from './panels/ContinuityBanner';
import { ButterflyPanel } from './panels/ButterflyPanel';
import { FactionPanel } from './panels/FactionPanel';

interface DraftingRoomProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

export const DraftingRoom: React.FC<DraftingRoomProps> = ({ project, updateProject }) => {
    const fetchChapterContent = useProjectStore(state => state.fetchChapterContent);
    const activePlotNodeId = useProjectStore(state => state.activePlotNodeId);
    const setActivePlotNodeId = useProjectStore(state => state.setActivePlotNodeId);
    const activeChapterId = useProjectStore(state => state.activeChapterId);
    const setActiveChapterId = useProjectStore(state => state.setActiveChapterId);
    const useBackend = useProjectStore(state => state.useBackend);

    // Business Logic & State
    const actions = useDraftingActions({
        project,
        updateProject,
        activeBranchId: project.activeBranchId || 'main',
        useBackend,
        activePlotNodeId,
        setActivePlotNodeId,
        activeChapterId,
        setActiveChapterId,
        fetchChapterContent
    });

    return (
        <div className="flex h-full bg-[#0f172a] text-slate-200 overflow-hidden relative">
            {/* View Mode Switcher */}
            <div className="absolute top-4 right-4 z-20 flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button
                    onClick={() => actions.setViewMode('FORGE')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${
                        actions.viewMode === 'FORGE' ? 'bg-muse-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    ✍️ 自动工坊
                </button>
                <button
                    onClick={() => actions.setViewMode('MANUSCRIPT')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${
                        actions.viewMode === 'MANUSCRIPT' ? 'bg-muse-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    📖 正文归档
                </button>
            </div>

            {/* Logic Conflict / Continuity Warnings */}
            <ContinuityBanner project={project} activeChapterId={activeChapterId} />

            {/* Sidebar Controls */}
            <ForgeSidebar
                actions={actions}
                project={project}
                activeBranchId={project.activeBranchId || 'main'}
            />

            {/* Main Creative Area */}
            <main className="flex-1 flex flex-col h-full bg-slate-900/50 relative">
                {actions.viewMode === 'FORGE' ? (
                    <ForgeEditor
                        actions={actions}
                        project={project}
                    />
                ) : (
                    <ManuscriptView
                        project={project}
                        activeChapterId={activeChapterId}
                        setActiveChapterId={setActiveChapterId}
                        isEditingManuscript={actions.isEditingManuscript}
                        setIsEditingManuscript={actions.setIsEditingManuscript}
                        editingContent={actions.editingContent}
                        setEditingContent={actions.setEditingContent}
                        updateProject={updateProject}
                        fetchChapterContent={fetchChapterContent}
                        handleDeleteChapter={actions.handleDeleteChapter}
                        isLoading={actions.isLoading}
                    />
                )}
            </main>

            {/* Advanced Overlay Panels */}
            {actions.showButterflyPanel && (
                <ButterflyPanel
                    risks={actions.propagationRisks}
                    isLoading={actions.isSimulatingPropagation}
                    onClose={() => actions.setShowButterflyPanel(false)}
                />
            )}

            {actions.showFactionPanel && (
                <FactionPanel
                    factions={actions.factions}
                    isLoading={actions.isFetchingFactions}
                    onClose={() => actions.setShowFactionPanel(false)}
                />
            )}

            {/* Omniscient Reference Sidebar */}
            <ReferenceSidebar
                project={project}
                showReference={actions.showReference}
                onClose={() => actions.setShowReference(false)}
            />
        </div>
    );
};
