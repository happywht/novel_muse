/**
 * API 模块统一导出
 * 提供清晰的领域模块划分
 */

// HTTP 客户端
export { apiClient, ApiClient } from './client';

// ========== 旧的 API 层（向后兼容，不推荐使用） ==========
// 这些 API 直接返回后端 DTO，需要手动处理数据转换

// 领域 API 模块 - 先导入再导出，避免作用域问题
import { projectApi } from './projectApi';
import { graphApi } from './graphApi';
import { characterApi } from './characterApi';
import { echoApi } from './echoApi';
import { forgeApi } from './forgeApi';
import { chapterApi } from './chapterApi';
import { systemApi } from './systemApi';
import { writingApi } from './writingApi';

// 重新导出以保持模块接口
export {
  projectApi,
  graphApi,
  characterApi,
  echoApi,
  forgeApi,
  chapterApi,
  systemApi,
  writingApi
};

// 类型导出
export type {
  CharacterTraitsResponse,
  CharacterEvolutionItem,
  CharacterForeshadowingItem,
  RelationshipTimelineItem,
  EchoForeshadowingItem,
  ContradictionItem
} from './characterApi';

export type {
  ForgeContextOptions
} from './forgeApi';

export type {
  ChapterDependencies,
  ChapterCharacterNetwork,
  ConflictHeatmapEntry
} from './chapterApi';

export type {
  ContinuationRequest,
  ContinuationResponse,
  ContextAnalysisRequest,
  ContextAnalysisResponse
} from './writingApi';

/**
 * 便捷统一导出对象
 * 使用方式: api.project.list(), api.graph.get(), etc.
 */
export const api = {
  project: projectApi,
  graph: graphApi,
  character: characterApi,
  echo: echoApi,
  forge: forgeApi,
  chapter: chapterApi,
  system: systemApi,
  writing: writingApi,
};

// ========== 新的服务层（推荐使用） ==========
// 这些服务提供数据验证、转换和类型安全

// 服务层导出
export {
  ProjectService,
  projectService,
  GraphService,
  graphService,
  EchoService,
  echoService,
  CharacterService,
  characterService
} from './services';

// 转换器导出
export { projectTransformer } from './transformers/ProjectTransformer';

// API 响应工具导出
export {
  createSuccessResponse,
  createErrorResponse,
  validateApiResponse,
  extractApiResponseData,
  withApiErrorHandling,
  ApiError
} from './ApiResponse';

// 验证器导出
export {
  validateCreateProject,
  validateUpdateProject,
  safeValidateCreateProject,
  safeValidateUpdateProject,
  type CreateProjectDTO,
  type UpdateProjectDTO
} from './validators/ProjectValidator';

/**
 * 新的服务层便捷统一导出对象
 * 推荐使用：提供数据验证、转换和类型安全
 *
 * 使用方式:
 * import { services } from '@/services/api';
 * const projectService = await services.project();
 * const projects = await projectService.list();
 */
export const services = {
  project: () => import('./services').then(m => m.projectService),
  graph: () => import('./services').then(m => m.graphService),
  echo: () => import('./services').then(m => m.echoService),
  character: () => import('./services').then(m => m.characterService),
};
