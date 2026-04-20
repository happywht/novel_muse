/**
 * 批量操作 Slice
 *
 * 管理Echo批量操作和操作历史
 * 支持批量接受、拒绝和撤销操作
 */

import { StateCreator } from 'zustand';
import {
  batchAcceptEchoes,
  batchRejectEchoes,
  undoBatchOperation,
  getBatchOperationHistory
} from '../../services/apiService';
import type { BatchOperationHistoryItemDTO } from '../../types/api';

export interface BatchSlice {
  // 状态
  batchOperationHistory: BatchOperationHistoryItemDTO[];
  lastBatchOperationId: string | null;
  isBatchProcessing: boolean;

  // 操作
  batchAcceptEchoes: (projectId: string, echoIds: string[], useBackend: boolean, syncToGraph?: boolean) => Promise<void>;
  batchRejectEchoes: (projectId: string, echoIds: string[], useBackend: boolean) => Promise<void>;
  undoLastBatchOperation: (projectId: string, useBackend: boolean, operationId?: string) => Promise<void>;
  loadBatchOperationHistory: (projectId: string, useBackend: boolean) => Promise<void>;
}

export const createBatchSlice: StateCreator<
  BatchSlice,
  [],
  [],
  BatchSlice
> = (set, get) => ({
  // 初始状态
  batchOperationHistory: [],
  lastBatchOperationId: null,
  isBatchProcessing: false,

  // 批量接受Echo
  batchAcceptEchoes: async (projectId: string, echoIds: string[], useBackend: boolean, syncToGraph: boolean = true) => {
    if (!useBackend) {
      // 回退到本地更新
      const store = get() as any;
      const updatedEchoes = store.project.echoes.map((e: any) =>
        echoIds.includes(e.id) ? { ...e, status: 'ACCEPTED' as const } : e
      );
      if (store.updateProject) {
        store.updateProject({ echoes: updatedEchoes });
      }
      return;
    }

    try {
      const result = await batchAcceptEchoes(projectId, echoIds, syncToGraph);

      // 更新本地状态
      const store = get() as any;
      const updatedEchoes = store.project.echoes.map((e: any) =>
        echoIds.includes(e.id) ? { ...e, status: 'ACCEPTED' as const } : e
      );
      if (store.updateProject) {
        store.updateProject({ echoes: updatedEchoes });
      }

      // 更新批量操作历史
      const historyItem: BatchOperationHistoryItemDTO = {
        id: result.operationId,
        operation: 'BATCH_ACCEPT',
        echoCount: result.affectedCount,
        timestamp: Date.now(),
        canUndo: true
      };

      set((state) => ({
        batchOperationHistory: [historyItem, ...state.batchOperationHistory],
        lastBatchOperationId: result.operationId
      }));
    } catch (err) {
      console.error('Failed to batch accept echoes:', err);
      // 回退到本地更新
      const store = get() as any;
      const updatedEchoes = store.project.echoes.map((e: any) =>
        echoIds.includes(e.id) ? { ...e, status: 'ACCEPTED' as const } : e
      );
      if (store.updateProject) {
        store.updateProject({ echoes: updatedEchoes });
      }
    }
  },

  // 批量拒绝Echo
  batchRejectEchoes: async (projectId: string, echoIds: string[], useBackend: boolean) => {
    if (!useBackend) {
      // 回退到本地更新
      const store = get() as any;
      const updatedEchoes = store.project.echoes.map((e: any) =>
        echoIds.includes(e.id) ? { ...e, status: 'REJECTED' as const } : e
      );
      if (store.updateProject) {
        store.updateProject({ echoes: updatedEchoes });
      }
      return;
    }

    try {
      const result = await batchRejectEchoes(projectId, echoIds);

      // 更新本地状态
      const store = get() as any;
      const updatedEchoes = store.project.echoes.map((e: any) =>
        echoIds.includes(e.id) ? { ...e, status: 'REJECTED' as const } : e
      );
      if (store.updateProject) {
        store.updateProject({ echoes: updatedEchoes });
      }

      // 更新批量操作历史
      const historyItem: BatchOperationHistoryItemDTO = {
        id: result.operationId,
        operation: 'BATCH_REJECT',
        echoCount: result.affectedCount,
        timestamp: Date.now(),
        canUndo: true
      };

      set((state) => ({
        batchOperationHistory: [historyItem, ...state.batchOperationHistory],
        lastBatchOperationId: result.operationId
      }));
    } catch (err) {
      console.error('Failed to batch reject echoes:', err);
      // 回退到本地更新
      const store = get() as any;
      const updatedEchoes = store.project.echoes.map((e: any) =>
        echoIds.includes(e.id) ? { ...e, status: 'REJECTED' as const } : e
      );
      if (store.updateProject) {
        store.updateProject({ echoes: updatedEchoes });
      }
    }
  },

  // 撤销最后的批量操作
  undoLastBatchOperation: async (projectId: string, useBackend: boolean, operationId?: string) => {
    if (!useBackend) {
      alert('批量撤销需要后端支持');
      return;
    }

    try {
      await undoBatchOperation(projectId, operationId);

      // 重新加载项目数据
      const { fetchProject } = await import('../../services/apiService');
      const fullProject = await fetchProject(projectId);

      const store = set as any;
      store({ project: fullProject });

      // 清除已撤销的操作历史
      set((state) => ({
        batchOperationHistory: state.batchOperationHistory.filter(
          (item: BatchOperationHistoryItemDTO) => item.id !== operationId
        )
      }));
    } catch (err) {
      console.error('Failed to undo batch operation:', err);
      alert('撤销失败');
    }
  },

  // 加载批量操作历史
  loadBatchOperationHistory: async (projectId: string, useBackend: boolean) => {
    if (!useBackend) {
      console.log('批量操作历史需要后端支持');
      return;
    }

    try {
      const result = await getBatchOperationHistory(projectId);
      set({ batchOperationHistory: result.operations });
    } catch (err) {
      console.error('Failed to load batch operation history:', err);
    }
  },
});
