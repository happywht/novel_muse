/**
 * API 服务层使用示例
 *
 * 演示如何使用新的服务层进行常见的 CRUD 操作
 */

import { projectService, graphService, echoService, characterService } from '../services';
import { ApiError } from '../ApiResponse';
import type { ProjectState } from '@/types';

// ============================================================
// 项目服务使用示例
// ============================================================

export async function projectServiceExamples() {
  try {
    // 1. 获取项目列表
    const projects = await projectService.list();
    console.log('项目列表:', projects);

    // 2. 创建新项目
    const newProject = await projectService.create({
      title: '我的小说项目',
      genre: '玄幻',
      premise: '一个关于修仙的故事',
      creativeSettings: {
        tone: '热血',
        theme: '成长',
      },
    });
    console.log('创建的项目:', newProject);

    // 3. 获取单个项目
    const project = await projectService.get(newProject.id);
    console.log('项目详情:', project);

    // 4. 更新项目
    await projectService.update(project.id, {
      title: '更新后的标题',
      genre: '仙侠',
    });

    // 5. 获取项目统计
    const stats = await projectService.getStatistics(project.id);
    console.log('项目统计:', stats);

    // 6. 获取章节内容
    const chapters = await projectService.getChaptersContent(project.id);
    console.log('章节内容:', chapters);

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API 错误:', error.message, error.code);
    } else {
      console.error('未知错误:', error);
    }
  }
}

// ============================================================
// 图谱服务使用示例
// ============================================================

export async function graphServiceExamples(projectId: string) {
  try {
    // 1. 获取完整图谱
    const graph = await graphService.getGraph(projectId);
    console.log('图谱节点数:', graph.nodes.length);
    console.log('图谱边数:', graph.edges.length);

    // 2. 获取节点邻居
    if (graph.nodes.length > 0) {
      const neighbors = await graphService.getNodeNeighbors(projectId, graph.nodes[0].id);
      console.log('节点邻居:', neighbors);
    }

    // 3. 查询子图
    const subgraph = await graphService.getSubgraph(projectId, {
      centerNodeId: graph.nodes[0]?.id,
      depth: 2,
      nodeTypes: ['Character', 'WorldSetting'],
    });
    console.log('子图:', subgraph);

    // 4. 添加新节点
    const newNode = await graphService.addNode(projectId, {
      label: '新角色',
      type: 'Character',
      properties: {
        name: '张三',
        role: '主角',
      },
    });
    console.log('新节点:', newNode);

    // 5. 添加边
    await graphService.addEdge(projectId, {
      source: newNode.id,
      target: graph.nodes[0]?.id || '',
      type: 'FRIEND',
      properties: {
        weight: 0.8,
        trajectory: 'IMPROVING',
      },
    });

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('图谱 API 错误:', error.message);
    } else {
      console.error('未知错误:', error);
    }
  }
}

// ============================================================
// Echo 服务使用示例
// ============================================================

export async function echoServiceExamples(projectId: string) {
  try {
    // 1. 获取所有 Echo
    const echoes = await echoService.list(projectId);
    console.log('Echo 列表:', echoes);

    // 2. 创建新 Echo
    const newEcho = await echoService.create(projectId, {
      type: 'CHARACTER',
      timestamp: Date.now(),
      content: '角色属性发生了变化',
      relatedChapterId: 'chapter-1',
      source: 'FORGE',
      status: 'PENDING',
    });
    console.log('新 Echo:', newEcho);

    // 3. 更新 Echo
    await echoService.update(projectId, newEcho.id, {
      status: 'ACCEPTED',
    });

    // 4. 批量操作
    const echoIds = echoes.slice(0, 3).map(e => e.id);
    const result = await echoService.batchOperation(projectId, 'ACCEPT', echoIds);
    console.log('批量操作结果:', result);

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Echo API 错误:', error.message);
    } else {
      console.error('未知错误:', error);
    }
  }
}

// ============================================================
// 角色服务使用示例
// ============================================================

export async function characterServiceExamples(projectId: string) {
  try {
    // 1. 获取所有角色
    const characters = await characterService.list(projectId);
    console.log('角色列表:', characters);

    // 2. 创建新角色
    const newCharacter = await characterService.create(projectId, {
      name: '李四',
      role: '配角',
      physicalStatus: '健康',
      desire: '成为强者',
      fear: '失去亲人',
    });
    console.log('新角色:', newCharacter);

    // 3. 获取角色关系网络
    if (characters.length > 0) {
      const network = await characterService.getRelationshipNetwork(
        projectId,
        characters[0].id
      );
      console.log('角色关系网络:', network);
    }

    // 4. 获取角色演变历史
    const evolution = await characterService.getEvolutionHistory(
      projectId,
      newCharacter.id
    );
    console.log('角色演变历史:', evolution);

    // 5. 更新角色
    await characterService.update(projectId, newCharacter.id, {
      physicalStatus: '受伤',
    });

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('角色 API 错误:', error.message);
    } else {
      console.error('未知错误:', error);
    }
  }
}

// ============================================================
// 综合使用示例
// ============================================================

export async function comprehensiveExample() {
  try {
    // 1. 创建项目
    const project = await projectService.create({
      title: '示例项目',
      genre: '玄幻',
    });

    // 2. 添加角色
    const character = await characterService.create(project.id, {
      name: '主角',
      role: '主角',
      physicalStatus: '健康',
    });

    // 3. 添加图谱节点
    const graphNode = await graphService.addNode(project.id, {
      label: character.name,
      type: 'Character',
      properties: {
        characterId: character.id,
      },
    });

    // 4. 创建 Echo
    const echo = await echoService.create(project.id, {
      type: 'CHARACTER',
      timestamp: Date.now(),
      content: '角色首次登场',
      relatedChapterId: 'chapter-1',
      source: 'MANUAL',
      status: 'ACCEPTED',
    });

    console.log('综合示例完成:', {
      project: project.id,
      character: character.id,
      graphNode: graphNode.id,
      echo: echo.id,
    });

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('综合示例错误:', error.message, error.code);
    } else {
      console.error('未知错误:', error);
    }
  }
}

// ============================================================
// 错误处理示例
// ============================================================

export async function errorHandlingExample() {
  // 1. 基本错误处理
  try {
    await projectService.get('non-existent-id');
  } catch (error) {
    if (error instanceof ApiError) {
      // 处理特定 API 错误
      console.error('API 错误:', error.message);
      console.error('错误代码:', error.code);
      console.error('状态码:', error.statusCode);
    } else {
      // 处理其他错误
      console.error('未知错误:', error);
    }
  }

  // 2. 验证错误处理
  try {
    await projectService.create({
      title: '', // 无效：标题为空
      genre: 'a'.repeat(300), // 无效：类型太长
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('验证错误:', error.message);
      // 错误信息会包含具体的验证失败原因
    }
  }

  // 3. 网络错误处理
  try {
    // 假设网络连接失败
    await projectService.list();
  } catch (error) {
    console.error('网络错误，请检查连接');
  }
}

// ============================================================
// 迁移示例
// ============================================================

// 旧代码（使用 API 层）
export async function oldWay() {
  import { projectApi, projectTransformer } from '../index';

  // 需要手动处理 DTO 转换
  const dto = await projectApi.get('project-id');
  const project = projectTransformer.transform(dto);

  // 创建项目需要多个步骤
  const response = await projectApi.create();
  const newProject = await projectApi.get(response.id);
}

// 新代码（使用服务层）
export async function newWay() {
  import { projectService } from '../services';

  // 自动处理转换
  const project = await projectService.get('project-id');

  // 创建项目一步完成
  const newProject = await projectService.create({
    title: '新项目',
  });
}
