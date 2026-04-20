import { apiClient } from './client';
import type {
  BatchOperationResponseDTO,
  BatchOperationHistoryResponseDTO,
  UndoBatchOperationResponseDTO
} from '../../types/api';

/**
 * Echo批量操作 API
 */
export const echoApi = {
  /**
   * 批量接受Echo
   */
  batchAccept: (
    projectId: string,
    echoIds: string[],
    syncToGraph: boolean = true
  ): Promise<BatchOperationResponseDTO> =>
    apiClient.post<BatchOperationResponseDTO>(
      `/projects/${projectId}/echoes/batch-accept`,
      { echoIds, syncToGraph }
    ),

  /**
   * 批量拒绝Echo
   */
  batchReject: (
    projectId: string,
    echoIds: string[]
  ): Promise<BatchOperationResponseDTO> =>
    apiClient.post<BatchOperationResponseDTO>(
      `/projects/${projectId}/echoes/batch-reject`,
      { echoIds }
    ),

  /**
   * 撤销批量操作
   */
  undoBatch: (
    projectId: string,
    operationId?: string
  ): Promise<UndoBatchOperationResponseDTO> =>
    apiClient.post<UndoBatchOperationResponseDTO>(
      `/projects/${projectId}/echoes/undo-batch`,
      { operationId }
    ),

  /**
   * 获取批量操作历史
   */
  getHistory: (projectId: string): Promise<BatchOperationHistoryResponseDTO> =>
    apiClient.get<BatchOperationHistoryResponseDTO>(
      `/projects/${projectId}/echoes/batch-history`
    ),
};
