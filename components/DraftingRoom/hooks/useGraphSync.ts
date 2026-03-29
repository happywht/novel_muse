import React from 'react';
import { ProjectState } from '../../../types';
import { syncForgeResult } from '../../../services/apiService';
import { useToast } from '../../../hooks/useToast';

interface UseGraphSyncProps {
  project: ProjectState;
  useBackend: boolean;
  useGraphContext: boolean;
  extractedEchoes: any[];
  setExtractedEchoes: (echoes: any[]) => void;
}

/**
 * 图谱同步相关逻辑 Hook
 *
 * 职责：
 * - Forge 结果同步到知识图谱
 * - 管理同步状态
 */
export const useGraphSync = ({
  project,
  useBackend,
  useGraphContext,
  extractedEchoes,
  setExtractedEchoes,
}: UseGraphSyncProps) => {
  const { toast } = useToast();

  // State
  const [isSyncingToGraph, setIsSyncingToGraph] = React.useState(false);

  /**
   * 同步Forge生成结果到知识图谱
   */
  const handleSyncToGraph = async (chapterId: string) => {
    if (!useBackend || !useGraphContext) return;

    setIsSyncingToGraph(true);
    try {
      const echoesToSync = extractedEchoes.filter((e: any) => e.status === 'ACCEPTED');
      const physicalStatusUpdates = echoesToSync
        .filter((e: any) => e.type === 'CHARACTER')
        .map((e: any) => ({
          characterId: e.targetId || '',
          characterName: e.targetName,
          status: e.description,
          reason: e.reason,
        }));

      await syncForgeResult(project.id, {
        chapterId,
        echoes: echoesToSync.map((e: any) => ({
          id: e.id,
          targetId: e.targetId,
          targetName: e.targetName,
          targetType: e.type,
          description: e.description,
          reason: e.reason,
          triples: [],
        })),
        physicalStatusUpdates,
      });

      // 清空已同步的Echo
      setExtractedEchoes(extractedEchoes.filter((e: any) => e.status !== 'ACCEPTED'));

      console.log('Forge结果已成功同步到知识图谱');
    } catch (error) {
      console.error('同步到图谱失败:', error);
      toast.error('同步到图谱失败，请查看控制台了解详情');
    } finally {
      setIsSyncingToGraph(false);
    }
  };

  return {
    // State
    isSyncingToGraph,

    // Handlers
    handleSyncToGraph,
  };
};
