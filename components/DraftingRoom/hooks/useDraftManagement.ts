import React from 'react';
import { ProjectState, Draft } from '../../../types';
import { patchProject } from '../../../services/apiService';
import { summarizeChapter } from '../../../services/gemini/writing';
import { useProjectStore } from '../../../store/useProjectStore';
import { useToast } from '../../../hooks/useToast';
import { CREATIVE_CONFIG } from '../../../config/constants';

interface UseDraftManagementProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
  useBackend: boolean;
  generatedContent: string;
  plotBeat: string;
  povCharId: string;
  localPlotNodeId: string | null;
  activeChapterId: string | null;
  setActiveChapterId: (id: string | null) => void;
  setViewMode: (mode: any) => void;
  extractedEchoes: any[];
  handleSyncToGraph: (chapterId: string) => Promise<void>;
  useGraphContext: boolean;
}

/**
 * 草稿管理相关逻辑 Hook
 *
 * 职责：
 * - 草稿保存/加载/删除
 * - 章节提交/删除
 * - 智能摘要生成
 */
export const useDraftManagement = ({
  project,
  updateProject,
  useBackend,
  generatedContent,
  plotBeat,
  povCharId,
  localPlotNodeId,
  activeChapterId,
  setActiveChapterId,
  setViewMode,
  extractedEchoes,
  handleSyncToGraph,
  useGraphContext,
}: UseDraftManagementProps) => {
  const { toast } = useToast();

  // State
  const [isSaving, setIsSaving] = React.useState(false);
  const [activeDraftId, setActiveDraftId] = React.useState<string | null>(null);
  const [isEditingManuscript, setIsEditingManuscript] = React.useState(false);
  const [editingContent, setEditingContent] = React.useState('');

  /**
   * 保存草稿
   */
  const handleSaveDraft = async () => {
    if (!generatedContent) return;
    setIsSaving(true);
    try {
      const title =
        plotBeat.slice(0, CREATIVE_CONFIG.PLOT_BEAT_TITLE_LENGTH) ||
        `草稿 ${new Date().toLocaleTimeString()}`;
      const newDraft: Draft = {
        id: activeDraftId || Date.now().toString(),
        title,
        content: generatedContent,
        lastModified: Date.now(),
      };
      const updatedDrafts = activeDraftId
        ? project.drafts.map((d) => (d.id === activeDraftId ? newDraft : d))
        : [...(project.drafts || []), newDraft];

      updateProject({ drafts: updatedDrafts });
      setActiveDraftId(newDraft.id);
      if (useBackend) await patchProject(project.id, { drafts: updatedDrafts });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 加载草稿
   */
  const loadDraft = (draft: Draft) => {
    // Note: 需要从外部设置 generatedContent 和 plotBeat
    // 这里返回草稿数据，由调用方设置
    return draft;
  };

  /**
   * 删除草稿
   */
  const deleteDraft = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除此草稿吗？')) {
      updateProject({ drafts: project.drafts.filter((d) => d.id !== id) });
      if (activeDraftId === id) setActiveDraftId(null);
    }
  };

  /**
   * 提交到正文
   */
  const handleCommitToManuscript = async () => {
    if (!generatedContent) return;

    // 智能推断目标章节
    let targetChapter = activeChapterId
      ? project.chapters.find((c) => c.id === activeChapterId)
      : null;

    // 其次查看当前情节节点是否已关联章节
    if (!targetChapter && localPlotNodeId) {
      targetChapter = project.chapters.find((c) => c.plotNodeId === localPlotNodeId);
    }

    let order: number;
    let chapterIdToUpdate: string | null = null;

    if (targetChapter) {
      if (
        !confirm(`确定要将此内容采纳至 [第 ${targetChapter.order} 章: ${targetChapter.title}] 吗？`)
      )
        return;
      order = targetChapter.order;
      chapterIdToUpdate = targetChapter.id;
    } else {
      const index = prompt(
        '该草稿未关联到特定章节。请输入章节序号 (1, 2, 3...) 或回车新增最后一章',
        (project.chapters?.length + 1).toString()
      );
      if (index === null) return;
      order = parseInt(index) || project.chapters?.length + 1;

      const conflict = project.chapters.find((c) => c.order === order);
      if (conflict) {
        if (!confirm(`第 ${order} 章已存在，是否覆盖该章内容？`)) return;
        chapterIdToUpdate = conflict.id;
        targetChapter = conflict;
      }
    }

    setIsSaving(true);
    const newChapterId = Date.now().toString();
    try {
      let title =
        targetChapter && !targetChapter.title.startsWith('第')
          ? targetChapter.title
          : plotBeat.slice(0, CREATIVE_CONFIG.CHAPTER_TITLE_LENGTH) || `第 ${order} 章`;

      const content = generatedContent;

      // 智能摘要
      let summary = plotBeat;
      try {
        if (useBackend && content) {
          console.log('Generating silent summary...');
          summarizeChapter(title, content, project.creativeSettings).then((aiSummary) => {
            if (aiSummary && aiSummary !== '摘要生成失败。') {
              const finalChapters = useProjectStore
                .getState()
                .project.chapters.map((c) =>
                  c.id === (chapterIdToUpdate || newChapterId) ? { ...c, summary: aiSummary } : c
                );
              updateProject({ chapters: finalChapters });
              if (useBackend) patchProject(project.id, { chapters: finalChapters });
            }
          });
        }
      } catch (sumErr) {
        console.warn('Silent summary generation failed', sumErr);
      }

      let updatedChapters;
      if (chapterIdToUpdate) {
        updatedChapters = project.chapters.map((c) =>
          c.id === chapterIdToUpdate
            ? {
                ...c,
                title,
                content,
                summary,
                lastModified: Date.now(),
                plotNodeId: localPlotNodeId || c.plotNodeId,
              }
            : c
        );
      } else {
        const newChapter = {
          id: newChapterId,
          title,
          content,
          order,
          lastModified: Date.now(),
          summary,
          expectedPOV: povCharId
            ? project.characters.find((c) => c.id === povCharId)?.name
            : undefined,
          plotNodeId: localPlotNodeId || undefined,
        };
        updatedChapters = [...(project.chapters || []), newChapter].sort(
          (a, b) => a.order - b.order
        );
      }

      updateProject({ chapters: updatedChapters });
      if (useBackend) await patchProject(project.id, { chapters: updatedChapters });

      // 自动同步到图谱
      const finalChapterId = chapterIdToUpdate || newChapterId;
      if (useGraphContext && extractedEchoes.length > 0) {
        handleSyncToGraph(finalChapterId);
      }

      toast.success('已成功采纳至正文！');
      setViewMode('MANUSCRIPT');
      if (chapterIdToUpdate) setActiveChapterId(chapterIdToUpdate);
      else {
        const justAdded = updatedChapters.find((c) => c.order === order);
        if (justAdded) setActiveChapterId(justAdded.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 删除章节
   */
  const handleDeleteChapter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除此章节吗？此操作不可撤销。')) {
      updateProject({ chapters: project.chapters.filter((c) => c.id !== id) });
      if (activeChapterId === id) setActiveChapterId(null);
    }
  };

  return {
    // State
    isSaving,
    activeDraftId,
    setActiveDraftId,
    isEditingManuscript,
    setIsEditingManuscript,
    editingContent,
    setEditingContent,

    // Handlers
    handleSaveDraft,
    loadDraft,
    deleteDraft,
    handleCommitToManuscript,
    handleDeleteChapter,
  };
};
