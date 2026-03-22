import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, Plus, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { ProjectState, PlotNode, AppSection } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { PlotHistorySidebar } from './PlotWeaver/PlotHistorySidebar';
import { STRUCTURE_TEMPLATES } from './PlotWeaver/constants';
import { PlotToolbar } from './PlotWeaver/PlotToolbar';
import { PlotCard } from './PlotWeaver/PlotCard';
import { AuxiliaryDrawer } from './PlotWeaver/AuxiliaryDrawer';
import { usePlotWeaverAI } from '../hooks/usePlotWeaverAI';
import { VirtualList } from './VirtualList';
import { UI_CONFIG, PLOT_CONFIG } from '../config/constants';

interface PlotWeaverProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

export type TabMode = 'ANALYSIS' | 'OPTIMIZE' | 'STRUCTURE' | 'CARDS';

export const PlotWeaver: React.FC<PlotWeaverProps> = ({ project, updateProject }) => {
    const { setActiveSection } = useProjectStore();
    // --- State ---
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveNote, setSaveNote] = useState('');
    const [showRightSidebar, setShowRightSidebar] = useState(false);
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabMode>('ANALYSIS');

    // Per-card AI iteration states
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [draftNodeContent, setDraftNodeContent] = useState<string | null>(null);
    const [iterationFeedback, setIterationFeedback] = useState('');
    const [showEntitySelector, setShowEntitySelector] = useState<{ id: string, type: 'CHARACTER' | 'LOCATION' } | null>(null);
    const [showConflictConfigurator, setShowConflictConfigurator] = useState<string | null>(null);

    // Confirmation Action State
    const [pendingAction, setPendingAction] = useState<{ type: 'GENERATE' | 'RESTORE', data?: any } | null>(null);

    // Selection State
    const [selectedText, setSelectedText] = useState('');
    const [customRewritePrompt, setCustomRewritePrompt] = useState('');

    const fullContent = useMemo(() => project.plotNodes.map(n => n.content).join('\n\n'), [project.plotNodes]);

    // --- Effects ---
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), UI_CONFIG.TOAST_DURATION);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                setSelectedText(selection.toString().trim());
            } else {
                setSelectedText('');
            }
        };
        document.addEventListener('mouseup', handleSelection);
        return () => document.removeEventListener('mouseup', handleSelection);
    }, []);

    // --- Project Handlers ---
    const updateProjectWithHistory = (data: Partial<ProjectState>, note: string) => {
        const historyItem = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            content: JSON.stringify({
                plotNodes: project.plotNodes,
                plotOutline: project.plotOutline || ''
            }),
            note
        };
        updateProject({
            ...data,
            plotHistory: [historyItem, ...(project.plotHistory || [])].slice(0, PLOT_CONFIG.MAX_HISTORY_ITEMS)
        });
    };

    // --- Custom Hooks ---
    const ai = usePlotWeaverAI({
        project,
        updateProject,
        updateProjectWithHistory,
        setToast
    });

    // --- Business Handlers ---
    const handleUpdateCard = (id: string, data: Partial<PlotNode>) => {
        updateProject({
            plotNodes: project.plotNodes.map(n => n.id === id ? { ...n, ...data } : n)
        });
    };

    const handleRemoveCard = (id: string) => {
        updateProject({
            plotNodes: project.plotNodes.filter(n => n.id !== id)
        });
    };

    const handleAddCard = () => {
        const maxOrder = project.plotNodes.length > 0 ? Math.max(...project.plotNodes.map(n => n.order)) : -1;
        const newNode: PlotNode = {
            id: crypto.randomUUID(),
            title: '',
            content: '',
            order: maxOrder + 1,
            relatedCharacters: [],
            relatedLocations: []
        };
        updateProject({
            plotNodes: [...project.plotNodes, newNode]
        });
        setFocusedNodeId(newNode.id);
    };

    const toggleEntityRelation = (nodeId: string, entityId: string, type: 'CHARACTER' | 'LOCATION') => {
        const node = project.plotNodes.find(n => n.id === nodeId);
        if (!node) return;

        const field = type === 'CHARACTER' ? 'relatedCharacters' : 'relatedLocations';
        const currentRelations = node[field] || [];
        const newRelations = currentRelations.includes(entityId)
            ? currentRelations.filter(id => id !== entityId)
            : [...currentRelations, entityId];

        handleUpdateCard(nodeId, { [field]: newRelations });
    };

    const handleQuickDraft = (nodeId: string) => {
        const node = project.plotNodes.find(n => n.id === nodeId);
        if (node) {
            setActiveSection(AppSection.DRAFTING);
        }
    };

    const handleAcceptDraftNode = () => {
        if (editingNodeId && draftNodeContent) {
            handleUpdateCard(editingNodeId, { content: draftNodeContent });
            setDraftNodeContent(null);
            setEditingNodeId(null);
            setToast({ msg: "扩写内容已同步", type: 'success' });
        }
    };

    const handleManualSave = () => {
        updateProjectWithHistory({}, saveNote || '手动存档');
        setShowSaveModal(false);
        setSaveNote('');
        setToast({ msg: "版本已保存至历史记录", type: 'success' });
    };

    const handleRestoreHistory = (historyItem: any) => {
        setPendingAction({ type: 'RESTORE', data: historyItem });
    };

    const confirmAction = () => {
        if (!pendingAction) return;
        if (pendingAction.type === 'GENERATE') {
            ai.performGeneratePlot(pendingAction.data);
        } else if (pendingAction.type === 'RESTORE') {
            const historyItem = pendingAction.data;
            try {
                const restoredData = typeof historyItem.content === 'string'
                    ? JSON.parse(historyItem.content)
                    : historyItem.content;

                updateProjectWithHistory(restoredData, `回滚至：${historyItem.note}`);
                setToast({ msg: "已回放至历史版本", type: 'success' });
            } catch (e) {
                console.error("Restore failed:", e);
                setToast({ msg: "版本数据解析失败，无法恢复", type: 'error' });
            }
        }
        setPendingAction(null);
    };

    const toggleSidebarTab = (tab: TabMode) => {
        if (showRightSidebar && activeTab === tab) {
            setShowRightSidebar(false);
        } else {
            setActiveTab(tab);
            setShowRightSidebar(true);
        }
    };

    const handleGeneratePlotSelect = (template: typeof STRUCTURE_TEMPLATES[0] | null) => {
        if (project.plotNodes.length > 0) {
            setPendingAction({ type: 'GENERATE', data: template?.content });
        } else {
            ai.performGeneratePlot(template?.content);
        }
    };

    // --- Render Helpers ---
    const sortedNodes = useMemo(() => [...project.plotNodes].sort((a, b) => a.order - b.order), [project.plotNodes]);

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 relative">
            {/* ===== Left Side: Editor ===== */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <PlotToolbar
                    activeTab={activeTab}
                    showRightSidebar={showRightSidebar}
                    showHistory={showHistory}
                    isGeneratingPlot={ai.isGeneratingPlot}
                    hasPlotNodes={project.plotNodes.length > 0}
                    toggleSidebarTab={toggleSidebarTab}
                    onShowSaveModal={() => setShowSaveModal(true)}
                    onToggleHistory={() => setShowHistory(!showHistory)}
                    onGeneratePlot={() => handleGeneratePlotSelect(null)}
                />

                <div className="flex-1 relative overflow-hidden bg-slate-900/30 rounded-3xl border border-slate-800/50 p-6 shadow-inner">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 pb-20 h-full">
                        {project.plotNodes.length > 0 ? (
                            <>
                                <VirtualList
                                    items={sortedNodes}
                                    itemHeight={UI_CONFIG.PLOT_CARD_HEIGHT}
                                    height={window.innerHeight - UI_CONFIG.VIRTUAL_LIST_BOTTOM_OFFSET}
                                    className="space-y-4"
                                    renderItem={(node, idx) => (
                                        <PlotCard
                                            key={node.id}
                                            node={node}
                                            idx={idx}
                                            focusedNodeId={focusedNodeId}
                                            editingNodeId={editingNodeId}
                                            draftNodeContent={draftNodeContent}
                                            iterationFeedback={iterationFeedback}
                                            showEntitySelector={showEntitySelector}
                                            showConflictConfigurator={showConflictConfigurator}
                                            isIterating={ai.isIterating}
                                            project={project}
                                            setFocusedNodeId={setFocusedNodeId}
                                            handleUpdateCard={handleUpdateCard}
                                            handleRemoveCard={handleRemoveCard}
                                            handleGenerateNodeAI={(id) => ai.handleGenerateNodeAI(id, setEditingNodeId, setDraftNodeContent)}
                                            handleQuickDraft={handleQuickDraft}
                                            handleIterateNode={() => ai.handleIterateNode(editingNodeId!, iterationFeedback, draftNodeContent!, setDraftNodeContent)}
                                            handleAcceptDraftNode={handleAcceptDraftNode}
                                            setDraftNodeContent={setDraftNodeContent}
                                            setEditingNodeId={setEditingNodeId}
                                            setIterationFeedback={setIterationFeedback}
                                            setShowEntitySelector={setShowEntitySelector}
                                            setShowConflictConfigurator={setShowConflictConfigurator}
                                            toggleEntityRelation={toggleEntityRelation}
                                        />
                                    )}
                                />
                                <button
                                    onClick={handleAddCard}
                                    className="w-full py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 hover:text-muse-400 hover:border-muse-500/50 hover:bg-muse-500/5 transition-all flex flex-col items-center gap-2 group"
                                >
                                    <div className="w-10 h-10 rounded-full border-2 border-slate-800 group-hover:border-muse-500/50 flex items-center justify-center">
                                        <Plus size={20} />
                                    </div>
                                    <span className="text-sm font-medium">添加新情节卡片</span>
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-slate-600">
                                    <LayoutGrid size={40} />
                                </div>
                                <div className="max-w-xs">
                                    <h3 className="text-lg font-bold text-white mb-2">开始构建你的故事</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        使用上方的“自由生成”通过 AI 开启灵感，或者点击下方按钮手动添加情节。
                                    </p>
                                </div>
                                <button
                                    onClick={handleAddCard}
                                    className="bg-muse-600 hover:bg-muse-500 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-muse-900/20 transition-all flex items-center gap-2"
                                >
                                    <Plus size={18} /> 添加第一张情节卡片
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status Bar */}
                    {sortedNodes.length > 0 && (
                        <div className="absolute bottom-4 right-4 pointer-events-none opacity-80">
                            <div className="bg-slate-800/90 text-xs text-slate-400 px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2 shadow-lg backdrop-blur-sm">
                                <Info size={12} className="text-muse-400" />
                                <span>AI 已连接: {project.characters.length} 角色 · {project.worldSettings.length} 设定</span>
                            </div>
                        </div>
                    )}

                    {/* Loading Overlay */}
                    {ai.isGeneratingPlot && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                            <i className="animate-spin text-muse-400 mb-4" />
                            <span className="text-white font-serif">AI 正在推演命运的齿轮...</span>
                        </div>
                    )}

                    {/* History Overlay */}
                    {showHistory && (
                        <PlotHistorySidebar
                            plotHistory={project.plotHistory}
                            onRestore={handleRestoreHistory}
                            onClose={() => setShowHistory(false)}
                        />
                    )}
                </div>
            </div>

            {/* Right Side Drawer: Auxiliary Tools */}
            <AuxiliaryDrawer
                showRightSidebar={showRightSidebar}
                activeTab={activeTab}
                analysis={ai.analysis}
                selectedText={selectedText}
                customRewritePrompt={customRewritePrompt}
                isAnalyzing={ai.isAnalyzing}
                project={project}
                fullContent={fullContent}
                setShowRightSidebar={setShowRightSidebar}
                setCustomRewritePrompt={setCustomRewritePrompt}
                handleRewrite={(p, l) => {/* Optional: Add rewrite logic to hook if needed */ }}
                handleAutoFix={ai.handleAutoFix}
                isIterating={ai.isIterating}
                handleAnalyze={() => ai.handleAnalyze(fullContent)}
            />

            {/* ===== Modals ===== */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">保存历史版本</h3>
                        <input
                            type="text" value={saveNote}
                            onChange={(e) => setSaveNote(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white mb-4 outline-none focus:border-muse-500"
                            placeholder="版本备注..."
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowSaveModal(false)} className="text-slate-400">取消</button>
                            <button onClick={handleManualSave} className="bg-muse-600 px-4 py-2 rounded-lg text-white">保存</button>
                        </div>
                    </div>
                </div>
            )}

            {pendingAction && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">操作确认</h3>
                        <p className="text-slate-300 text-sm mb-6">继续操作将覆盖现有内容（旧版本将自动存档）。是否继续？</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setPendingAction(null)} className="text-slate-400">取消</button>
                            <button onClick={confirmAction} className="bg-amber-600 px-4 py-2 rounded-lg text-white">确认覆盖</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 transition-all animate-fade-in font-medium text-sm flex items-center gap-2 border ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'}`}>
                    {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    );
};
