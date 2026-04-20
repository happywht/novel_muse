/**
 * 伏笔关联分析服务
 *
 * 分析伏笔之间的关联关系，构建关联网络
 */

import {
  Foreshadowing,
  ForeshadowingRelationship,
  ForeshadowingRelationType,
  ForeshadowingAnalysis,
} from '@/types/foreshadowing';

/**
 * 分析伏笔之间的关联关系
 */
export class ForeshadowingAnalyzer {
  /**
   * 分析伏笔集合，构建所有关联关系
   */
  static analyzeRelationships(
    foreshadowings: Foreshadowing[]
  ): ForeshadowingRelationship[] {
    const relationships: ForeshadowingRelationship[] = [];

    for (let i = 0; i < foreshadowings.length; i++) {
      for (let j = i + 1; j < foreshadowings.length; j++) {
        const source = foreshadowings[i];
        const target = foreshadowings[j];

        const relationship = this.detectRelationship(source, target);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  /**
   * 检测两个伏笔之间的关联关系
   */
  static detectRelationship(
    source: Foreshadowing,
    target: Foreshadowing
  ): ForeshadowingRelationship | null {
    // 检查共同角色
    const commonCharacters = this.getCommonElements(
      source.relatedCharacters,
      target.relatedCharacters
    );

    // 检查共同事件
    const commonEvents = this.getCommonElements(
      source.relatedEvents,
      target.relatedEvents
    );

    // 检查共同章节
    const commonChapters = this.getCommonElements(
      source.relatedChapters,
      target.relatedChapters
    );

    // 检查共同标签
    const commonTags = this.getCommonElements(source.tags, target.tags);

    // 计算关联强度
    const strength = this.calculateRelationshipStrength({
      commonCharacters: commonCharacters.length,
      commonEvents: commonEvents.length,
      commonChapters: commonChapters.length,
      commonTags: commonTags.length,
    });

    // 如果关联强度太低，不创建关联
    if (strength < 0.1) {
      return null;
    }

    // 确定关联类型
    const relationType = this.determineRelationType(
      source,
      target,
      { commonCharacters, commonEvents, commonChapters, commonTags }
    );

    // 生成关联描述
    const description = this.generateRelationshipDescription(
      relationType,
      { commonCharacters, commonEvents, commonChapters, commonTags }
    );

    return {
      id: `fsr-${source.id}-${target.id}`,
      sourceId: source.id,
      targetId: target.id,
      relationType,
      strength,
      description,
      createdAt: new Date(),
    };
  }

  /**
   * 计算关联强度（0-1）
   */
  static calculateRelationshipStrength(params: {
    commonCharacters: number;
    commonEvents: number;
    commonChapters: number;
    commonTags: number;
  }): number {
    let score = 0;

    // 共同角色（40%权重）
    score += Math.min(params.commonCharacters * 0.15, 0.4);

    // 共同事件（25%权重）
    score += Math.min(params.commonEvents * 0.12, 0.25);

    // 共同章节（20%权重）
    score += Math.min(params.commonChapters * 0.1, 0.2);

    // 共同标签（15%权重）
    score += Math.min(params.commonTags * 0.05, 0.15);

    return Math.min(score, 1);
  }

  /**
   * 确定关联类型
   */
  static determineRelationType(
    source: Foreshadowing,
    target: Foreshadowing,
    commonElements: {
      commonCharacters: string[];
      commonEvents: string[];
      commonChapters: string[];
      commonTags: string[];
    }
  ): ForeshadowingRelationType {
    const { commonCharacters, commonEvents, commonChapters } = commonElements;

    // 检查是否是回报关系
    if (source.type === 'payoff' && target.type !== 'payoff') {
      return ForeshadowingRelationType.DIRECT;
    }
    if (target.type === 'payoff' && source.type !== 'payoff') {
      return ForeshadowingRelationType.DIRECT;
    }

    // 检查是否有因果关系（时间顺序）
    if (this.hasCausalRelationship(source, target)) {
      return ForeshadowingRelationType.CAUSAL;
    }

    // 检查是否有矛盾
    if (this.hasConflictRelationship(source, target)) {
      return ForeshadowingRelationType.CONFLICTING;
    }

    // 检查是否互补
    if (this.isComplementary(source, target, commonElements)) {
      return ForeshadowingRelationType.COMPLEMENTARY;
    }

    // 默认为间接关联
    return ForeshadowingRelationType.INDIRECT;
  }

  /**
   * 检查是否有因果关系
   */
  static hasCausalRelationship(
    source: Foreshadowing,
    target: Foreshadowing
  ): boolean {
    // 检查时间顺序（通过章节）
    const sourceChapters = source.relatedChapters;
    const targetChapters = target.relatedChapters;

    if (sourceChapters.length > 0 && targetChapters.length > 0) {
      const sourceMaxChapter = Math.max(...sourceChapters.map(Number));
      const targetMinChapter = Math.min(...targetChapters.map(Number));

      // 如果源伏笔的最晚章节早于目标伏笔的最早章节，可能是因果关系
      if (sourceMaxChapter < targetMinChapter) {
        return true;
      }
    }

    // 检查类型（setup -> payoff）
    if (source.type === 'setup' && target.type === 'payoff') {
      return true;
    }
    if (source.type === 'foreshadowing' && target.type === 'payoff') {
      return true;
    }

    return false;
  }

  /**
   * 检查是否有矛盾关系
   */
  static hasConflictRelationship(
    source: Foreshadowing,
    target: Foreshadowing
  ): boolean {
    // 检查状态矛盾
    if (
      source.status === 'resolved' &&
      target.status === 'resolved' &&
      source.relatedCharacters.some((char) =>
        target.relatedCharacters.includes(char)
      )
    ) {
      // 如果两个已解决的伏笔涉及相同角色，可能存在矛盾
      // 这里需要更复杂的逻辑来判断是否真的矛盾
      // 暂时返回 false
      return false;
    }

    return false;
  }

  /**
   * 检查是否互补
   */
  static isComplementary(
    source: Foreshadowing,
    target: Foreshadowing,
    commonElements: {
      commonCharacters: string[];
      commonEvents: string[];
      commonChapters: string[];
    }
  ): boolean {
    // 如果有大量共同元素但类型不同，可能是互补关系
    const commonCount =
      commonElements.commonCharacters.length +
      commonElements.commonEvents.length +
      commonElements.commonChapters.length;

    return commonCount >= 2 && source.type !== target.type;
  }

  /**
   * 生成关联描述
   */
  static generateRelationshipDescription(
    relationType: ForeshadowingRelationType,
    commonElements: {
      commonCharacters: string[];
      commonEvents: string[];
      commonChapters: string[];
      commonTags: string[];
    }
  ): string {
    const parts: string[] = [];

    if (commonElements.commonCharacters.length > 0) {
      parts.push(`共享${commonElements.commonCharacters.length}个角色`);
    }

    if (commonElements.commonEvents.length > 0) {
      parts.push(`关联${commonElements.commonEvents.length}个事件`);
    }

    if (commonElements.commonChapters.length > 0) {
      parts.push(`涉及${commonElements.commonChapters.length}个相同章节`);
    }

    if (commonElements.commonTags.length > 0) {
      parts.push(`包含${commonElements.commonTags.length}个共同标签`);
    }

    const relationTypeLabels: Record<ForeshadowingRelationType, string> = {
      [ForeshadowingRelationType.DIRECT]: '直接关联',
      [ForeshadowingRelationType.INDIRECT]: '间接关联',
      [ForeshadowingRelationType.COMPLEMENTARY]: '互补关联',
      [ForeshadowingRelationType.CONFLICTING]: '矛盾关联',
      [ForeshadowingRelationType.CAUSAL]: '因果关联',
      [ForeshadowingRelationType.PARALLEL]: '平行关联',
    };

    const baseDesc = parts.length > 0 ? parts.join('，') : '存在关联';
    return `${relationTypeLabels[relationType]}：${baseDesc}`;
  }

  /**
   * 获取两个数组的共同元素
   */
  static getCommonElements<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter((item) => arr2.includes(item));
  }

  /**
   * 分析伏笔网络
   */
  static analyzeNetwork(
    foreshadowings: Foreshadowing[],
    relationships: ForeshadowingRelationship[]
  ): {
    clusters: Foreshadowing[][];
    hubs: Foreshadowing[];
    isolated: Foreshadowing[];
  } {
    // 构建邻接表
    const adjacency = new Map<string, Set<string>>();
    foreshadowings.forEach((fs) => adjacency.set(fs.id, new Set()));

    relationships.forEach((rel) => {
      adjacency.get(rel.sourceId)?.add(rel.targetId);
      adjacency.get(rel.targetId)?.add(rel.sourceId);
    });

    // 找出孤立节点（没有关联的伏笔）
    const isolated = foreshadowings.filter(
      (fs) => (adjacency.get(fs.id)?.size || 0) === 0
    );

    // 找出中心节点（关联最多的伏笔）
    const sortedByConnections = [...foreshadowings].sort(
      (a, b) => (adjacency.get(b.id)?.size || 0) - (adjacency.get(a.id)?.size || 0)
    );

    const hubs = sortedByConnections.filter(
      (fs) => (adjacency.get(fs.id)?.size || 0) >= 3
    );

    // 使用并查集找出连通分量（聚类）
    const clusters = this.findConnectedComponents(
      foreshadowings,
      adjacency
    );

    return {
      clusters,
      hubs,
      isolated,
    };
  }

  /**
   * 找出连通分量（聚类）
   */
  static findConnectedComponents(
    foreshadowings: Foreshadowing[],
    adjacency: Map<string, Set<string>>
  ): Foreshadowing[][] {
    const visited = new Set<string>();
    const clusters: Foreshadowing[][] = [];

    const dfs = (fsId: string, component: Set<string>) => {
      visited.add(fsId);
      component.add(fsId);

      adjacency.get(fsId)?.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          dfs(neighborId, component);
        }
      });
    };

    foreshadowings.forEach((fs) => {
      if (!visited.has(fs.id)) {
        const component = new Set<string>();
        dfs(fs.id, component);

        // 将组件ID转换为伏笔对象
        const cluster = foreshadowings.filter((fs) => component.has(fs.id));
        if (cluster.length > 1) {
          // 只保留有多个节点的聚类
          clusters.push(cluster);
        }
      }
    });

    return clusters;
  }

  /**
   * 计算伏笔的中心性（在网络中的重要性）
   */
  static calculateCentrality(
    foreshadowingId: string,
    relationships: ForeshadowingRelationship[]
  ): {
    degree: number;
    betweenness: number;
    closeness: number;
  } {
    // 度中心性（直接关联数）
    const degree = relationships.filter(
      (rel) => rel.sourceId === foreshadowingId || rel.targetId === foreshadowingId
    ).length;

    // TODO: 实现介数中心性和接近中心性
    // 这需要更复杂的图算法

    return {
      degree,
      betweenness: 0,
      closeness: 0,
    };
  }

  /**
   * 找出最短路径
   */
  static findShortestPath(
    startId: string,
    endId: string,
    relationships: ForeshadowingRelationship[]
  ): string[] | null {
    if (startId === endId) {
      return [startId];
    }

    // BFS 搜索最短路径
    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const currentId = path[path.length - 1];

      // 找出当前节点的所有邻居
      const neighbors = relationships
        .filter((rel) => rel.sourceId === currentId || rel.targetId === currentId)
        .map((rel) => (rel.sourceId === currentId ? rel.targetId : rel.sourceId));

      for (const neighbor of neighbors) {
        if (neighbor === endId) {
          return [...path, neighbor];
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null; // 没有路径
  }

  /**
   * 计算网络的密度
   */
  static calculateNetworkDensity(
    nodeCount: number,
    edgeCount: number
  ): number {
    if (nodeCount <= 1) {
      return 0;
    }

    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    return edgeCount / maxPossibleEdges;
  }

  /**
   * 分析伏笔的影响力传播
   */
  static analyzeInfluenceSpread(
    foreshadowingId: string,
    relationships: ForeshadowingRelationship[],
    maxDepth: number = 3
  ): {
    directInfluence: string[];
    indirectInfluence: string[];
    reach: number;
  } {
    const directInfluence = new Set<string>();
    const indirectInfluence = new Set<string>();

    // 找出直接影响
    relationships
      .filter((rel) => rel.sourceId === foreshadowingId)
      .forEach((rel) => directInfluence.add(rel.targetId));

    relationships
      .filter((rel) => rel.targetId === foreshadowingId)
      .forEach((rel) => directInfluence.add(rel.sourceId));

    // 找出间接影响（通过BFS）
    const queue: string[] = [...directInfluence];
    const visited = new Set<string>([foreshadowingId, ...directInfluence]);
    let depth = 0;

    while (queue.length > 0 && depth < maxDepth) {
      const levelSize = queue.length;

      for (let i = 0; i < levelSize; i++) {
        const currentId = queue.shift()!;

        // 找出当前节点的邻居
        const neighbors = relationships
          .filter(
            (rel) =>
              rel.sourceId === currentId || rel.targetId === currentId
          )
          .map((rel) =>
            rel.sourceId === currentId ? rel.targetId : rel.sourceId
          );

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            indirectInfluence.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      depth++;
    }

    const reach = directInfluence.size + indirectInfluence.size;

    return {
      directInfluence: Array.from(directInfluence),
      indirectInfluence: Array.from(indirectInfluence),
      reach,
    };
  }
}
