import { apiClient } from './client';
import type { ForgeGraphContextDTO, ForgeSyncResultDTO } from '../../types/api';

/**
 * Forge 上下文查询选项
 */
export interface ForgeContextOptions {
  characterIds?: string[];
  locationId?: string;
  plotNodeId?: string;
}

/**
 * Forge 图谱 API
 */
export const forgeApi = {
  /**
   * 获取Forge上下文
   */
  getContext: async (
    projectId: string,
    options?: ForgeContextOptions
  ): Promise<ForgeGraphContextDTO> => {
    const params = new URLSearchParams();
    if (options?.characterIds && options.characterIds.length > 0) {
      params.set('characterIds', options.characterIds.join(','));
    }
    if (options?.locationId) {
      params.set('locationId', options.locationId);
    }
    if (options?.plotNodeId) {
      params.set('plotNodeId', options.plotNodeId);
    }

    const url = params.toString()
      ? `/graph/${projectId}/forge-context?${params.toString()}`
      : `/graph/${projectId}/forge-context`;

    return apiClient.get<ForgeGraphContextDTO>(url);
  },

  /**
   * 同步Forge结果
   */
  syncResult: (projectId: string, result: ForgeSyncResultDTO): Promise<void> =>
    apiClient.post<void>(`/graph/${projectId}/forge-sync`, result),
};
