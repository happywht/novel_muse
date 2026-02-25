import { useState } from 'react';
import { ProjectState, PlotNode } from '../types';
import { generatePlotFromContext, rewritePlot, analyzePlot, analyzePlotRhythm } from '../services/geminiService';

interface UsePlotWeaverAIProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
    updateProjectWithHistory: (data: Partial<ProjectState>, note: string) => void;
    setToast: (toast: { msg: string; type: 'success' | 'error' } | null) => void;
}

export const usePlotWeaverAI = ({ project, updateProject, updateProjectWithHistory, setToast }: UsePlotWeaverAIProps) => {
    const [isGeneratingPlot, setIsGeneratingPlot] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingRhythm, setIsAnalyzingRhythm] = useState(false);
    const [isIterating, setIsIterating] = useState(false);
    const [analysis, setAnalysis] = useState('');
    const [rhythmData, setRhythmData] = useState<any[]>([]);

    // --- Global Plot Generation ---
    const performGeneratePlot = async (templateContext?: string) => {
        setIsGeneratingPlot(true);
        try {
            const result = await generatePlotFromContext(
                project.premise,
                project.genre,
                project.characters,
                project.worldSettings,
                project.creativeSettings,
                templateContext || ''
            );

            const newNodes: PlotNode[] = result.map((node, idx) => ({
                id: crypto.randomUUID(),
                title: node.title,
                content: node.content,
                order: idx,
                relatedCharacters: [],
                relatedLocations: []
            }));

            updateProjectWithHistory({
                plotNodes: newNodes,
                plotOutline: '' // Clear legacy if exists
            }, templateContext ? `AI 全局推演 (基于 ${templateContext.split('\n')[0]})` : 'AI 自由推演');

            setToast({ msg: "剧情大纲推演完成！", type: 'success' });
        } catch (error) {
            console.error(error);
            setToast({ msg: "大纲生成失败，请稍后重试。", type: 'error' });
        } finally {
            setIsGeneratingPlot(false);
        }
    };

    // --- Single Node AI Expansion ---
    const handleGenerateNodeAI = async (nodeId: string, setEditingNodeId: (id: string | null) => void, setDraftNodeContent: (content: string | null) => void) => {
        const node = project.plotNodes.find(n => n.id === nodeId);
        if (!node) return;

        setIsIterating(true);
        setEditingNodeId(nodeId);
        try {
            const prompt = `基于当前小说设定和前后剧情背景，深入扩写这一段情节。请保持风格一致，增加细节描写、角色张力或环境渲染。\n\n当前情节标题：${node.title}\n当前情节内容：${node.content}`;
            const result = await rewritePlot(
                project.plotNodes.map(n => n.content).join('\n\n'),
                prompt,
                project.genre,
                project.characters,
                project.worldSettings,
                project.creativeSettings
            );
            // rewritePlot returns an array of nodes, but handleGenerateNodeAI expects a string for draftNodeContent
            // We'll take the first node's content if it's a single expansion
            const draftContent = Array.isArray(result) ? result[0]?.content : result;
            setDraftNodeContent(draftContent || "生成内容为空");
        } catch (error) {
            console.error(error);
            setToast({ msg: "AI 扩写失败", type: 'error' });
        } finally {
            setIsIterating(false);
        }
    };

    // --- Node Iteration/Refinement ---
    const handleIterateNode = async (nodeId: string, feedback: string, draftContent: string, setDraftNodeContent: (content: string | null) => void) => {
        setIsIterating(true);
        try {
            const prompt = `请根据我的反馈对当前草稿进行微调。\n\n原有草稿：${draftContent}\n我的反馈：${feedback}`;
            const iterationResult = await rewritePlot(
                project.plotNodes.map(n => n.content).join('\n\n'),
                prompt,
                project.genre,
                project.characters,
                project.worldSettings,
                project.creativeSettings
            );
            const iterationDraftContent = Array.isArray(iterationResult) ? iterationResult[0]?.content : iterationResult;
            setDraftNodeContent(iterationDraftContent || "更新失败");
        } catch (error) {
            console.error(error);
            setToast({ msg: "调整失败", type: 'error' });
        } finally {
            setIsIterating(false);
        }
    };

    // --- Logical Audit/Analysis ---
    const handleAnalyze = async (fullContent: string) => {
        if (!fullContent.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzePlot(
                project.premise,
                fullContent,
                project.characters,
                project.worldSettings,
                project.creativeSettings
            );
            setAnalysis(result);
            setToast({ msg: "诊断报告已同步", type: 'success' });
        } catch (error) {
            setToast({ msg: "诊断失败", type: 'error' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- Rhythm Analysis ---
    const handleAnalyzeRhythm = async (fullContent: string) => {
        if (!fullContent.trim()) return;
        setIsAnalyzingRhythm(true);
        try {
            const result = await analyzePlotRhythm(fullContent);
            setRhythmData(result);
        } catch (error) {
            setToast({ msg: "节奏分析失败", type: 'error' });
        } finally {
            setIsAnalyzingRhythm(false);
        }
    };

    return {
        isGeneratingPlot,
        isAnalyzing,
        isAnalyzingRhythm,
        isIterating,
        analysis,
        rhythmData,
        performGeneratePlot,
        handleGenerateNodeAI,
        handleIterateNode,
        handleAnalyze,
        handleAnalyzeRhythm,
        setAnalysis,
        setRhythmData
    };
};
