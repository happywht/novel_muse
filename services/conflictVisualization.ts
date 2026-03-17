import { PlotNode, Chapter, Character } from '../types';

// ============================================================
// 冲突可视化数据接口
// ============================================================

export interface ConflictHeatmapData {
  chapters: string[];           // 章节标题
  conflictCounts: number[];     // 冲突数量
  intensities: number[];        // 冲突强度 (0-10)
  types: Array<'inner' | 'interpersonal' | 'external'>; // 冲突类型
}

export interface CharacterStressData {
  characterId: string;
  characterName: string;
  stressCurve: number[];        // 压力曲线 (0-10)
  peakChapters: string[];       // 压力峰值章节
}

export interface ConflictDistribution {
  inner: number;                // 内心冲突
  interpersonal: number;        // 人际冲突
  external: number;             // 外部冲突
  total: number;
}

export interface ConflictTimeline {
  chapterOrders: number[];
  conflictDensity: number[];
  tensionCurve: number[];       // 张力曲线 (0-10)
}

export interface ConflictVisualizationReport {
  // 冲突热力图数据
  heatmap: ConflictHeatmapData;
  
  // 角色压力数据
  characterStress: CharacterStressData[];
  
  // 冲突类型分布
  distribution: ConflictDistribution;
  
  // 时间线数据
  timeline: ConflictTimeline;
  
  // 修罗场节点识别
  climaxNodes: Array<{
    nodeId: string;
    chapterId: string;
    chapterTitle: string;
    intensity: number;
    involvedCharacters: string[];
  }>;
  
  // 洞察总结
  insights: {
    mostIntenseChapter: string;
    mostStressedCharacter: string;
    conflictPattern: 'EVEN' | 'CLUSTERED' | 'SPARSE';
    suggestions: string[];
  };
}

// ============================================================
// 冲突可视化核心算法
// ============================================================

/**
 * 生成冲突可视化报告
 */
export function generateConflictVisualization(
  plotNodes: PlotNode[],
  chapters: Chapter[],
  characters: Character[]
): ConflictVisualizationReport {
  // 1. 基础数据准备
  const conflictNodes = plotNodes.filter(node => 
    node.beatTag?.includes('conflict')
  );
  
  // 2. 生成热力图数据
  const heatmap = generateHeatmapData(conflictNodes, chapters);
  
  // 3. 生成角色压力数据
  const characterStress = generateCharacterStressData(
    conflictNodes, 
    chapters, 
    characters
  );
  
  // 4. 生成冲突分布
  const distribution = generateConflictDistribution(conflictNodes);
  
  // 5. 生成时间线
  const timeline = generateTimeline(conflictNodes, chapters);
  
  // 6. 识别修罗场节点
  const climaxNodes = identifyClimaxNodes(conflictNodes, chapters);
  
  // 7. 生成洞察
  const insights = generateInsights(heatmap, characterStress, distribution);
  
  return {
    heatmap,
    characterStress,
    distribution,
    timeline,
    climaxNodes,
    insights
  };
}

/**
 * 生成热力图数据
 */
function generateHeatmapData(
  conflictNodes: PlotNode[],
  chapters: Chapter[]
): ConflictHeatmapData {
  const chapterMap = new Map(chapters.map(ch => [ch.id, ch]));
  
  const heatmap: ConflictHeatmapData = {
    chapters: [],
    conflictCounts: [],
    intensities: [],
    types: []
  };
  
  chapters.forEach(chapter => {
    const nodeConflicts = conflictNodes.filter(node =>
      node.relatedChapters?.includes(chapter.id)
    );
    
    heatmap.chapters.push(chapter.title);
    heatmap.conflictCounts.push(nodeConflicts.length);
    
    // 计算平均强度
    const avgIntensity = nodeConflicts.reduce((sum, node) => {
      return sum + extractConflictIntensity(node);
    }, 0) / Math.max(nodeConflicts.length, 1);
    
    heatmap.intensities.push(avgIntensity);
    
    // 主要冲突类型
    const primaryType = nodeConflicts.length > 0
      ? determinePrimaryConflictType(nodeConflicts)
      : 'inner';
    
    heatmap.types.push(primaryType);
  });
  
  return heatmap;
}

/**
 * 生成角色压力数据
 */
function generateCharacterStressData(
  conflictNodes: PlotNode[],
  chapters: Chapter[],
  characters: Character[]
): CharacterStressData[] {
  return characters.map(character => {
    const stressCurve: number[] = [];
    const peakChapters: string[] = [];
    
    chapters.forEach(chapter => {
      const chapterConflicts = conflictNodes.filter(node =>
        node.relatedChapters?.includes(chapter.id)
      );
      
      // 计算角色在本章的压力
      const stress = calculateCharacterStress(
        character,
        chapterConflicts,
        chapter
      );
      
      stressCurve.push(stress);
      
      if (stress >= 8) {
        peakChapters.push(chapter.title);
      }
    });
    
    return {
      characterId: character.id,
      characterName: character.name,
      stressCurve,
      peakChapters
    };
  });
}

/**
 * 生成冲突分布
 */
function generateConflictDistribution(
  conflictNodes: PlotNode[]
): ConflictDistribution {
  const distribution: ConflictDistribution = {
    inner: 0,
    interpersonal: 0,
    external: 0,
    total: conflictNodes.length
  };
  
  conflictNodes.forEach(node => {
    const type = extractConflictType(node);
    distribution[type]++;
  });
  
  return distribution;
}

/**
 * 生成时间线
 */
function generateTimeline(
  conflictNodes: PlotNode[],
  chapters: Chapter[]
): ConflictTimeline {
  const timeline: ConflictTimeline = {
    chapterOrders: [],
    conflictDensity: [],
    tensionCurve: []
  };
  
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  
  sortedChapters.forEach(chapter => {
    const chapterConflicts = conflictNodes.filter(node =>
      node.relatedChapters?.includes(chapter.id)
    );
    
    timeline.chapterOrders.push(chapter.order);
    timeline.conflictDensity.push(chapterConflicts.length);
    
    // 计算张力（考虑冲突强度和累积）
    const tension = calculateTension(chapterConflicts, chapter.order);
    timeline.tensionCurve.push(tension);
  });
  
  return timeline;
}

/**
 * 识别修罗场节点
 */
function identifyClimaxNodes(
  conflictNodes: PlotNode[],
  chapters: Chapter[]
) {
  const climaxThreshold = 8; // 强度阈值
  
  return conflictNodes
    .filter(node => extractConflictIntensity(node) >= climaxThreshold)
    .map(node => {
      const chapterId = node.relatedChapters?.[0] || '';
      const chapter = chapters.find(ch => ch.id === chapterId);
      
      return {
        nodeId: node.id,
        chapterId,
        chapterTitle: chapter?.title || '未知章节',
        intensity: extractConflictIntensity(node),
        involvedCharacters: extractInvolvedCharacters(node)
      };
    });
}

/**
 * 生成洞察
 */
function generateInsights(
  heatmap: ConflictHeatmapData,
  characterStress: CharacterStressData[],
  distribution: ConflictDistribution
) {
  // 找出冲突最激烈的章节
  const maxIntensityIndex = heatmap.intensities.indexOf(
    Math.max(...heatmap.intensities)
  );
  const mostIntenseChapter = heatmap.chapters[maxIntensityIndex];
  
  // 找出压力最大的角色
  const avgStress = characterStress.map(char => ({
    name: char.characterName,
    avgStress: char.stressCurve.reduce((a, b) => a + b, 0) / char.stressCurve.length
  }));
  const mostStressed = avgStress.reduce((max, char) => 
    char.avgStress > max.avgStress ? char : max
  );
  
  // 分析冲突分布模式
  let conflictPattern: 'EVEN' | 'CLUSTERED' | 'SPARSE' = 'EVEN';
  const densityStdDev = Math.sqrt(
    heatmap.conflictCounts.reduce((sum, count) => 
      sum + Math.pow(count - heatmap.conflictCounts.reduce((a, b) => a + b, 0) / heatmap.conflictCounts.length, 2)
      , 0) / heatmap.conflictCounts.length
  );
  
  if (densityStdDev > 2) {
    conflictPattern = 'CLUSTERED';
  } else if (heatmap.conflictCounts.every(count => count <= 1)) {
    conflictPattern = 'SPARSE';
  }
  
  // 生成建议
  const suggestions: string[] = [];
  
  if (conflictPattern === 'CLUSTERED') {
    suggestions.push('冲突分布过于集中，建议在前后章节增加小冲突铺垫');
  }
  
  if (conflictPattern === 'SPARSE') {
    suggestions.push('整体冲突密度偏低，建议在关键章节增加冲突强度');
  }
  
  const maxStressChar = characterStress.find(char => 
    char.peakChapters.length >= 3
  );
  if (maxStressChar) {
    suggestions.push(`${maxStressChar.characterName}压力过于集中，建议分散到不同章节`);
  }
  
  return {
    mostIntenseChapter,
    mostStressedCharacter: mostStressed.name,
    conflictPattern,
    suggestions
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 提取冲突强度（从节点元数据）
 */
function extractConflictIntensity(node: PlotNode): number {
  // 从节点元数据或beatTag中提取
  const intensityTag = node.beatTag?.match(/intensity:(\d+)/);
  if (intensityTag) {
    return Math.min(10, Math.max(0, parseInt(intensityTag[1])));
  }
  
  // 默认强度
  return node.beatTag?.includes('climax') ? 9 :
         node.beatTag?.includes('major') ? 7 :
         node.beatTag?.includes('minor') ? 4 : 5;
}

/**
 * 提取冲突类型
 */
function extractConflictType(node: PlotNode): 'inner' | 'interpersonal' | 'external' {
  if (node.beatTag?.includes('inner') || node.beatTag?.includes('psychological')) {
    return 'inner';
  }
  
  if (node.beatTag?.includes('interpersonal') || node.beatTag?.includes('relationship')) {
    return 'interpersonal';
  }
  
  return 'external';
}

/**
 * 确定主要冲突类型
 */
function determinePrimaryConflictType(
  conflicts: PlotNode[]
): 'inner' | 'interpersonal' | 'external' {
  const types = conflicts.map(extractConflictType);
  const counts = {
    inner: types.filter(t => t === 'inner').length,
    interpersonal: types.filter(t => t === 'interpersonal').length,
    external: types.filter(t => t === 'external').length
  };
  
  const maxType = Object.entries(counts).reduce((max, [type, count]) => 
    count > max.count ? { type, count } : max
  , { type: 'external', count: 0 });
  
  return maxType.type as 'inner' | 'interpersonal' | 'external';
}

/**
 * 计算角色压力
 */
function calculateCharacterStress(
  character: Character,
  conflicts: PlotNode[],
  chapter: Chapter
): number {
  let stress = 0;
  
  conflicts.forEach(conflict => {
    // 如果角色参与冲突
    if (isCharacterInvolvedInConflict(character, conflict)) {
      stress += extractConflictIntensity(conflict);
    }
  });
  
  // 归一化到0-10
  return Math.min(10, stress / Math.max(conflicts.length, 1) * 2);
}

/**
 * 判断角色是否参与冲突
 */
function isCharacterInvolvedInConflict(
  character: Character,
  conflict: PlotNode
): boolean {
  // 检查冲突相关角色
  const relatedChars = extractInvolvedCharacters(conflict);
  return relatedChars.includes(character.id);
}

/**
 * 提取涉及的角色
 */
function extractInvolvedCharacters(conflict: PlotNode): string[] {
  // 从冲突节点提取涉及的角色ID
  const matches = conflict.content?.match(/@\[(.*?)\]/g);
  if (!matches) return [];
  
  return matches.map(match => match.replace(/[@\[\]]/g, ''));
}

/**
 * 计算张力
 */
function calculateTension(conflicts: PlotNode[], chapterOrder: number): number {
  if (conflicts.length === 0) return 0;
  
  // 基础张力：冲突数量 * 平均强度
  const baseTension = conflicts.reduce((sum, conflict) => {
    return sum + extractConflictIntensity(conflict);
  }, 0) / Math.max(conflicts.length, 1);
  
  // 位置加成（后期章节张力递增）
  const positionMultiplier = 0.8 + (chapterOrder * 0.02);
  
  return Math.min(10, baseTension * positionMultiplier);
}

// ============================================================
// 导出工具函数
// ============================================================

/**
 * 获取冲突强度颜色
 */
export function getConflictIntensityColor(intensity: number): string {
  if (intensity >= 9) return '#ef4444'; // red-500
  if (intensity >= 7) return '#f97316'; // orange-500
  if (intensity >= 5) return '#eab308'; // yellow-500
  if (intensity >= 3) return '#22c55e'; // green-500
  return '#3b82f6'; // blue-500
}

/**
 * 获取冲突类型标签
 */
export function getConflictTypeLabel(type: 'inner' | 'interpersonal' | 'external'): string {
  const labels = {
    inner: '内心冲突',
    interpersonal: '人际冲突',
    external: '外部冲突'
  };
  return labels[type];
}

/**
 * 获取冲突模式描述
 */
export function getConflictPatternDescription(pattern: string): string {
  const descriptions = {
    'EVEN': '冲突分布均匀，节奏稳定',
    'CLUSTERED': '冲突集中爆发，高潮迭起',
    'SPARSE': '冲突较少，需要增加张力'
  };
  return descriptions[pattern] || '未知模式';
}
