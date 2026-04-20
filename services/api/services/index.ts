/**
 * 服务层统一导出
 *
 * 提供所有服务的统一导出入口
 */

// 项目服务
export { ProjectService, projectService } from './ProjectService';

// 图谱服务
export { GraphService, graphService } from './GraphService';

// Echo 服务
export { EchoService, echoService } from './EchoService';

// 角色服务
export { CharacterService, characterService } from './CharacterService';

/**
 * 服务集合对象（按需加载）
 * 使用方式:
 * const projectService = await services.project();
 */
export const services = {
  project: () => import('./ProjectService').then(m => m.projectService),
  graph: () => import('./GraphService').then(m => m.graphService),
  echo: () => import('./EchoService').then(m => m.echoService),
  character: () => import('./CharacterService').then(m => m.characterService),
};
