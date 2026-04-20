/**
 * 图谱服务层
 *
 * 提供图谱相关的 API 服务，包括节点、边和关系查询
 */

import { apiClient } from '../client';
import { validateApiResponse, ApiError } from '../ApiResponse';
import type {
  GraphDTO,
  GraphNodeDTO,
  GraphEdgeDTO,
  NodeNeighborsDTO,
  SubgraphResponse
} from '@/types/api';

/**
 * 图谱服务类
 */
export class GraphService {
  private readonly basePath = '/graph';

  /**
   * 获取完整图谱数据
   */
  async getGraph(projectId: string): Promise<GraphDTO> {
    try {
      const response = await apiClient.get<unknown>(`${this.basePath}/${projectId}`);
      const validated = validateApiResponse<GraphDTO>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取图谱数据失败');
      }

      return validated.data;
    } catch (error) {
      console.error('获取图谱数据失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取图谱数据失败');
    }
  }

  /**
   * 获取节点邻居
   */
  async getNodeNeighbors(projectId: string, nodeId: string): Promise<NodeNeighborsDTO> {
    try {
      const response = await apiClient.get<unknown>(
        `${this.basePath}/${projectId}/nodes/${nodeId}/neighbors`
      );
      const validated = validateApiResponse<NodeNeighborsDTO>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取节点邻居失败');
      }

      return validated.data;
    } catch (error) {
      console.error('获取节点邻居失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取节点邻居失败');
    }
  }

  /**
   * 查询子图
   */
  async getSubgraph(
    projectId: string,
    params: {
      centerNodeId?: string;
      depth?: number;
      nodeTypes?: string[];
    }
  ): Promise<SubgraphResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.centerNodeId) queryParams.append('centerNodeId', params.centerNodeId);
      if (params.depth) queryParams.append('depth', params.depth.toString());
      if (params.nodeTypes) params.nodeTypes.forEach(type => queryParams.append('nodeTypes', type));

      const response = await apiClient.get<unknown>(
        `${this.basePath}/${projectId}/subgraph?${queryParams.toString()}`
      );
      const validated = validateApiResponse<SubgraphResponse>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '查询子图失败');
      }

      return validated.data;
    } catch (error) {
      console.error('查询子图失败:', error);
      throw error instanceof ApiError ? error : new ApiError('查询子图失败');
    }
  }

  /**
   * 添加节点
   */
  async addNode(projectId: string, node: Omit<GraphNodeDTO, 'id'>): Promise<GraphNodeDTO> {
    try {
      const response = await apiClient.post<unknown>(
        `${this.basePath}/${projectId}/nodes`,
        node
      );
      const validated = validateApiResponse<GraphNodeDTO>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '添加节点失败');
      }

      return validated.data;
    } catch (error) {
      console.error('添加节点失败:', error);
      throw error instanceof ApiError ? error : new ApiError('添加节点失败');
    }
  }

  /**
   * 添加边
   */
  async addEdge(projectId: string, edge: GraphEdgeDTO): Promise<void> {
    try {
      const response = await apiClient.post<unknown>(
        `${this.basePath}/${projectId}/edges`,
        edge
      );
      const validated = validateApiResponse(response);

      if (!validated.success) {
        throw new ApiError(validated.error || '添加边失败');
      }
    } catch (error) {
      console.error('添加边失败:', error);
      throw error instanceof ApiError ? error : new ApiError('添加边失败');
    }
  }

  /**
   * 删除节点
   */
  async deleteNode(projectId: string, nodeId: string): Promise<void> {
    try {
      const response = await apiClient.delete(
        `${this.basePath}/${projectId}/nodes/${nodeId}`
      );
      const validated = validateApiResponse(response);

      if (!validated.success) {
        throw new ApiError(validated.error || '删除节点失败');
      }
    } catch (error) {
      console.error('删除节点失败:', error);
      throw error instanceof ApiError ? error : new ApiError('删除节点失败');
    }
  }

  /**
   * 删除边
   */
  async deleteEdge(projectId: string, edgeId: string): Promise<void> {
    try {
      const response = await apiClient.delete(
        `${this.basePath}/${projectId}/edges/${edgeId}`
      );
      const validated = validateApiResponse(response);

      if (!validated.success) {
        throw new ApiError(validated.error || '删除边失败');
      }
    } catch (error) {
      console.error('删除边失败:', error);
      throw error instanceof ApiError ? error : new ApiError('删除边失败');
    }
  }
}

/**
 * 单例实例
 */
export const graphService = new GraphService();
