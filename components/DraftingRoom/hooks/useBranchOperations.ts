import React from 'react';
import { ProjectState } from '../../../types';
import {
    fetchUnresolvedForeshadowing, fetchNarrativeInsights,
    fetchFactions, simulatePropagation, mergeBranchApi
} from '../../../services/apiService';
import { generateTwistHooks } from '../../../services/geminiService';
import { useToast } from '../../../hooks/useToast';

interface UseBranchOperationsProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
    useBackend: boolean;
    activeBranchId: string;
    plotBeat: string;
}

/**
 * 分支操作和上下文管理 Hook
 *
 * 职责：
 * - 分支创建/切换/删除/合并
 * - 伏笔获取
 * - 叙事洞察获取
 * - 转折建议生成
 * - 派系管理
 * - 蝴蝶效应模拟
 */
export const useBranchOperations = ({
    project,
    updateProject,
    useBackend,
    activeBranchId,
    plotBeat
}: UseBranchOperationsProps) => {
    const { toast } = useToast();

    // State
    const [availableBranches, setAvailableBranches] = React.useState<string[]>(
        project.availableBranches || ['main']
    );
    const [pendingForeshadowing, setPendingForeshadowing] = React.useState<any[]>([]);
    const [isFetchingForeshadowing, setIsFetchingForeshadowing] = React.useState(false);
    const [narrativeInsights, setNarrativeInsights] = React.useState<any[]>([]);
    const [isFetchingInsights, setIsFetchingInsights] = React.useState(false);
    const [suggestedTwists, setSuggestedTwists] = React.useState<string[]>([]);
    const [isGeneratingTwists, setIsGeneratingTwists] = React.useState(false);
    const [isMergingBranch, setIsMergingBranch] = React.useState(false);

    // Phase 5 States
    const [factions, setFactions] = React.useState<any[]>([]);
    const [isFetchingFactions, setIsFetchingFactions] = React.useState(false);
    const [showFactionPanel, setShowFactionPanel] = React.useState(false);
    const [showButterflyPanel, setShowButterflyPanel] = React.useState(false);
    const [propagationRisks, setPropagationRisks] = React.useState<any[]>([]);
    const [isSimulatingPropagation, setIsSimulatingPropagation] = React.useState(false);

    /**
     * 获取未解决的伏笔
     */
    const handleFetchForeshadowing = async () => {
        if (!useBackend) return;
        setIsFetchingForeshadowing(true);
        try {
            const hooks = await fetchUnresolvedForeshadowing(project.id, activeBranchId);
            setPendingForeshadowing(hooks);
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingForeshadowing(false);
        }
    };

    /**
     * 获取叙事洞察
     */
    const handleFetchInsights = async () => {
        if (!useBackend) return;
        setIsFetchingInsights(true);
        try {
            const insights = await fetchNarrativeInsights(project.id, activeBranchId);
            setNarrativeInsights(insights);
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingInsights(false);
        }
    };

    /**
     * 生成转折建议
     */
    const handleGenerateTwists = async () => {
        if (!plotBeat || !useBackend) return;
        setIsGeneratingTwists(true);
        try {
            const context = project.chapters.slice(-3).map(c => c.content || c.summary).join('\n\n');
            const twists = await generateTwistHooks(context, plotBeat);
            setSuggestedTwists(twists);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingTwists(false);
        }
    };

    /**
     * 合并分支
     */
    const handleMergeBranch = async () => {
        if (activeBranchId === 'main' || !useBackend) return;
        if (!confirm(`确定要将分支 ${activeBranchId} 合并回主线吗？这可能会覆盖主线的部分数据。`)) return;
        setIsMergingBranch(true);
        try {
            await mergeBranchApi(project.id, activeBranchId);
            toast.success("合并成功！");
        } catch (err) {
            toast.error("合并失败: " + (err as Error).message);
        } finally {
            setIsMergingBranch(false);
        }
    };

    /**
     * 创建分支
     */
    const handleCreateBranch = () => {
        const name = prompt("输入新分支名称 (例如: '主角黑化', '全员存活'):");
        if (name) {
            const newBranches = [...availableBranches, name];
            setAvailableBranches(newBranches);
            updateProject({ availableBranches: newBranches, activeBranchId: name });
            // 切换到新分支后刷新上下文
            handleFetchForeshadowing();
            handleFetchInsights();
        }
    };

    /**
     * 切换分支
     */
    const handleSwitchBranch = (branchId: string) => {
        updateProject({ activeBranchId: branchId });
        // 分支切换时自动刷新伏笔和洞察
        handleFetchForeshadowing();
        handleFetchInsights();
    };

    /**
     * 删除分支
     */
    const handleDeleteBranch = (e: React.MouseEvent, branchId: string) => {
        e.stopPropagation();
        if (branchId === 'main') return;
        if (confirm(`确定要删除分歧 "${branchId}" 吗？该分支下未合并的专属数据将丢失。此操作无法撤销。`)) {
            const newBranches = availableBranches.filter(b => b !== branchId);
            setAvailableBranches(newBranches);
            updateProject({ availableBranches: newBranches });
            if (activeBranchId === branchId) {
                handleSwitchBranch('main');
            }
        }
    };

    /**
     * 获取派系
     */
    const handleFetchFactions = async () => {
        if (!useBackend) return;
        setIsFetchingFactions(true);
        try {
            const data = await fetchFactions(project.id);
            setFactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingFactions(false);
        }
    };

    /**
     * 模拟蝴蝶效应传播
     */
    const handleSimulatePropagation = async (targetName: string, changeDescription: string) => {
        setIsSimulatingPropagation(true);
        setShowButterflyPanel(true);
        try {
            const risks = await simulatePropagation(project.id, targetName, changeDescription);
            setPropagationRisks(risks);
        } catch (err) {
            console.error(err);
            toast.error("模拟失败");
        } finally {
            setIsSimulatingPropagation(false);
        }
    };

    return {
        // Branch State
        availableBranches,
        isMergingBranch,
        isFetchingForeshadowing,
        pendingForeshadowing,
        setPendingForeshadowing,
        isFetchingInsights,
        narrativeInsights,
        setNarrativeInsights,
        isGeneratingTwists,
        suggestedTwists,

        // Phase 5 State
        factions,
        isFetchingFactions,
        showFactionPanel,
        setShowFactionPanel,
        showButterflyPanel,
        setShowButterflyPanel,
        propagationRisks,
        isSimulatingPropagation,

        // Handlers
        handleFetchForeshadowing,
        handleFetchInsights,
        handleGenerateTwists,
        handleMergeBranch,
        handleCreateBranch,
        handleSwitchBranch,
        handleDeleteBranch,
        handleFetchFactions,
        handleSimulatePropagation
    };
};
