import { Chapter, Character, PlotNode } from '../types';
import { generateAIBalanceSuggestions } from './gemini/writing';

// ============================================================
// 章节平衡分析接口定义
// ============================================================

export interface ChapterMetrics {
  wordCount: number;
  conflictScenes: number; // 冲突场景数量
  characterAppearances: Record<string, number>; // 角色出场次数
  povChapters: string[]; // POV章节分布
  pacingScore: number; // 节奏评分 0-100
}

export interface BalanceReport {
  // 1. 字数统计分析
  wordCountStats: {
    total: number;
    average: number;
    median: number;
    min: number;
    max: number;
    stdDev: number; // 标准差
    outliers: {
      // 异常值
      tooLong: Chapter[]; // 过长章节
      tooShort: Chapter[]; // 过短章节
    };
  };

  // 2. 冲突密度分析
  conflictAnalysis: {
    totalScenes: number;
    distribution: Array<{
      chapterId: string;
      chapterTitle: string;
      conflictCount: number;
      density: number; // 冲突密度 (0-1)
    }>;
    hotspots: string[]; // 冲突热点章节
    coldspots: string[]; // 冲突冷点章节
  };

  // 3. 角色出场平衡
  characterBalance: {
    totalCharacters: number;
    appearances: Record<
      string,
      {
        characterId: string;
        name: string;
        count: number;
        percentage: number; // 出场占比
        balanceScore: number; // 平衡评分 0-100
      }
    >;
    imbalance: string[]; // 出场不均衡的角色
  };

  // 4. POV视角分布
  povDistribution: {
    totalPOVs: number;
    chaptersByPOV: Record<string, number>;
    rotationPattern: 'GOOD' | 'FAIR' | 'POOR'; // 轮换模式
    suggestions: string[];
  };

  // 5. 章节节奏曲线
  pacingCurve: {
    chapters: string[];
    scores: number[]; // 每章节奏评分
    trend: 'ASC' | 'DESC' | 'FLAT' | 'VARIABLE';
    idealPattern: number[]; // 理想节奏模式
  };

  // 6. 整体平衡评分
  overallBalance: {
    score: number; // 0-100
    level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    strengths: string[]; // 优势点
    weaknesses: string[]; // 改进点
  };
}

export interface OptimizationSuggestion {
  type:
    | 'SPLIT'
    | 'MERGE'
    | 'ADD_CONFLICT'
    | 'REDUCE_CONFLICT'
    | 'BALANCE_CHARACTERS'
    | 'ADJUST_POV';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  chapterId: string;
  chapterTitle: string;
  description: string;
  expectedImprovement: string;
}

// ============================================================
// 核心分析算法
// ============================================================

/**
 * 分析章节平衡性
 */
export function analyzeChapterBalance(
  chapters: Chapter[],
  characters: Character[],
  plotNodes: PlotNode[]
): BalanceReport {
  const metrics = calculateMetrics(chapters, characters, plotNodes);

  return {
    wordCountStats: analyzeWordCount(chapters, metrics),
    conflictAnalysis: analyzeConflictDistribution(chapters, plotNodes),
    characterBalance: analyzeCharacterBalance(chapters, characters, metrics),
    povDistribution: analyzePOVDistribution(chapters),
    pacingCurve: analyzePacingCurve(chapters, metrics),
    overallBalance: calculateOverallBalance(chapters, metrics),
  };
}

/**
 * 计算章节指标
 */
function calculateMetrics(
  chapters: Chapter[],
  characters: Character[],
  plotNodes: PlotNode[]
): ChapterMetrics[] {
  return chapters.map((chapter) => {
    const wordCount = chapter.content?.length || 0;

    // 分析冲突场景（从plotNodes关联，使用conflictScenario判断）
    const conflictNodes = plotNodes.filter(
      (node) => node.relatedChapters?.includes(chapter.id) && node.conflictScenario != null
    );

    // 统计角色出场
    const characterAppearances: Record<string, number> = {};
    characters.forEach((char) => {
      const regex = new RegExp(char.name, 'g');
      const matches = chapter.content?.match(regex);
      if (matches) {
        characterAppearances[char.id] = matches.length;
      }
    });

    // POV分析（从章节元数据）
    const povChapters = extractPOVFromChapter(chapter);

    // 节奏评分（基于字数和冲突）
    const pacingScore = calculatePacingScore(wordCount, conflictNodes.length);

    return {
      wordCount,
      conflictScenes: conflictNodes.length,
      characterAppearances,
      povChapters,
      pacingScore,
    };
  });
}

/**
 * 分析字数统计
 */
function analyzeWordCount(chapters: Chapter[], metrics: ChapterMetrics[]) {
  // 空数组保护
  if (metrics.length === 0) {
    return {
      total: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      outliers: { tooLong: [], tooShort: [] },
    };
  }

  const wordCounts = metrics.map((m) => m.wordCount);
  const total = wordCounts.reduce((sum, count) => sum + count, 0);
  const average = total / wordCounts.length;
  const sorted = [...wordCounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const min = wordCounts.length > 0 ? Math.min(...wordCounts) : 0;
  const max = wordCounts.length > 0 ? Math.max(...wordCounts) : 0;
  const stdDev = Math.sqrt(
    wordCounts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / wordCounts.length
  );

  // 识别异常值（超过1.5倍标准差）
  const tooLong = chapters.filter((chapter, i) => metrics[i].wordCount > average + 1.5 * stdDev);
  const tooShort = chapters.filter((chapter, i) => metrics[i].wordCount < average - 1.5 * stdDev);

  return {
    total,
    average: Math.round(average),
    median,
    min,
    max,
    stdDev: Math.round(stdDev),
    outliers: { tooLong, tooShort },
  };
}

/**
 * 分析冲突分布
 */
function analyzeConflictDistribution(chapters: Chapter[], plotNodes: PlotNode[]) {
  const distribution = chapters.map((chapter) => {
    const conflictNodes = plotNodes.filter(
      (node) => node.relatedChapters?.includes(chapter.id) && node.conflictScenario != null
    );

    return {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      conflictCount: conflictNodes.length,
      density: conflictNodes.length / Math.max(chapter.content?.length || 1, 1000), // 每千字冲突数
    };
  });

  const avgDensity = distribution.reduce((sum, d) => sum + d.density, 0) / distribution.length;
  const hotspots = distribution.filter((d) => d.density > avgDensity * 1.5).map((d) => d.chapterId);
  const coldspots = distribution
    .filter((d) => d.density < avgDensity * 0.5)
    .map((d) => d.chapterId);

  return {
    totalScenes: plotNodes.filter((n) => n.conflictScenario != null).length,
    distribution,
    hotspots,
    coldspots,
  };
}

/**
 * 分析角色出场平衡
 */
function analyzeCharacterBalance(
  chapters: Chapter[],
  characters: Character[],
  metrics: ChapterMetrics[]
) {
  const appearances: Record<
    string,
    {
      characterId: string;
      name: string;
      count: number;
      percentage: number;
      balanceScore: number;
    }
  > = {};

  // 统计每个角色的总出场次数
  characters.forEach((char) => {
    const totalCount = metrics.reduce(
      (sum, metric) => sum + (metric.characterAppearances[char.id] || 0),
      0
    );

    const totalPossible = chapters.length;
    const percentage = (totalCount / totalPossible) * 100;

    // 平衡评分（出场分布均匀度）
    const chaptersWithAppearance = metrics.filter(
      (m) => m.characterAppearances[char.id] && m.characterAppearances[char.id] > 0
    ).length;
    const balanceScore = (chaptersWithAppearance / totalPossible) * 100;

    appearances[char.id] = {
      characterId: char.id,
      name: char.name,
      count: totalCount,
      percentage: Math.round(percentage),
      balanceScore: Math.round(balanceScore),
    };
  });

  // 识别出场不均衡的角色（出场率<20%或>80%）
  const imbalance = Object.values(appearances)
    .filter((a) => a.percentage < 20 || a.percentage > 80)
    .map((a) => a.characterId);

  return {
    totalCharacters: characters.length,
    appearances,
    imbalance,
  };
}

/**
 * 分析POV视角分布
 */
function analyzePOVDistribution(chapters: Chapter[]) {
  const povChapters: Record<string, number> = {};

  chapters.forEach((chapter) => {
    const povs = extractPOVFromChapter(chapter);
    povs.forEach((pov) => {
      povChapters[pov] = (povChapters[pov] || 0) + 1;
    });
  });

  const totalPOVs = Object.keys(povChapters).length;
  const totalChapters = chapters.length;

  // 评估轮换模式
  let rotationPattern: 'GOOD' | 'FAIR' | 'POOR' = 'GOOD';
  const suggestions: string[] = [];

  if (totalPOVs < 2) {
    rotationPattern = 'POOR';
    suggestions.push('建议增加更多POV视角，丰富叙事层次');
  } else if (totalPOVs > 5) {
    rotationPattern = 'FAIR';
    suggestions.push('POV视角过多，可能导致读者困惑，建议控制在3-5个主要视角');
  }

  // 检查POV分布均匀度
  const povCounts = Object.values(povChapters);
  const avgPOVCount = povCounts.reduce((a, b) => a + b, 0) / povCounts.length;
  const maxDeviation = Math.max(...povCounts.map((c) => Math.abs(c - avgPOVCount)));

  if (maxDeviation > avgPOVCount * 0.5) {
    rotationPattern = 'FAIR';
    suggestions.push('POV视角出场不均衡，建议调整章节分配');
  }

  return {
    totalPOVs,
    chaptersByPOV: povChapters,
    rotationPattern,
    suggestions,
  };
}

/**
 * 分析节奏曲线
 */
function analyzePacingCurve(chapters: Chapter[], metrics: ChapterMetrics[]) {
  const scores = metrics.map((m) => m.pacingScore);
  const chaptersList = chapters.map((c) => c.title);

  // 趋势分析
  let trend: 'ASC' | 'DESC' | 'FLAT' | 'VARIABLE' = 'FLAT';
  const firstHalfAvg =
    scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) /
    Math.floor(scores.length / 2);
  const secondHalfAvg =
    scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) /
    Math.ceil(scores.length / 2);

  if (secondHalfAvg > firstHalfAvg * 1.2) {
    trend = 'ASC';
  } else if (secondHalfAvg < firstHalfAvg * 0.8) {
    trend = 'DESC';
  } else {
    // 计算方差判断是否波动较大
    const variance =
      scores.reduce(
        (sum, score) => sum + Math.pow(score - (firstHalfAvg + secondHalfAvg) / 2, 2),
        0
      ) / scores.length;
    if (variance > 100) {
      trend = 'VARIABLE';
    }
  }

  // 理想节奏模式（应递增）
  const idealPattern = scores.map((_, index) => 50 + (index / Math.max(scores.length - 1, 1)) * 40);

  return {
    chapters: chaptersList,
    scores,
    trend,
    idealPattern,
  };
}

/**
 * 计算整体平衡评分
 */
function calculateOverallBalance(
  chapters: Chapter[],
  metrics: ChapterMetrics[]
): {
  score: number;
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  strengths: string[];
  weaknesses: string[];
} {
  // 空数组保护
  if (metrics.length === 0 || chapters.length === 0) {
    return {
      score: 0,
      level: 'POOR' as const,
      strengths: ['暂无章节数据，无法分析'],
      weaknesses: ['请先创建章节内容'],
    };
  }

  // 各项权重
  const weights = {
    wordCount: 0.3,
    conflict: 0.25,
    character: 0.25,
    pov: 0.2,
  };

  // 字数平衡评分（基于标准差)
  const wordCounts = metrics.map((m) => m.wordCount);
  const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const wordCountStdDev = Math.sqrt(
    wordCounts.reduce((sum, count) => sum + Math.pow(count - avgWordCount, 2), 0) /
      wordCounts.length
  );
  const wordCountScore = Math.max(0, 100 - (wordCountStdDev / Math.max(avgWordCount, 1)) * 100);

  // 冲突平衡评分
  const conflictCounts = metrics.map((m) => m.conflictScenes);
  const avgConflict = conflictCounts.reduce((a, b) => a + b, 0) / conflictCounts.length;
  const conflictBalanceScore = conflictCounts.every((c) => Math.abs(c - avgConflict) <= 2)
    ? 85
    : 60;

  // 角色平衡评分(平均值)
  const charBalanceScores = metrics.flatMap((m) =>
    Object.values(m.characterAppearances).map((count) =>
      count > 0 ? Math.min(100, count * 20) : 0
    )
  );
  const characterScore =
    charBalanceScores.length > 0
      ? charBalanceScores.reduce((a, b) => a + b, 0) / charBalanceScores.length
      : 0;

  // POV平衡评分（简化）
  const povScore = 75; // 基础分，需要更复杂分析

  // 综合评分
  const overallScore = Math.round(
    wordCountScore * weights.wordCount +
      conflictBalanceScore * weights.conflict +
      characterScore * weights.character +
      povScore * weights.pov
  );

  const level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' =
    overallScore >= 90
      ? 'EXCELLENT'
      : overallScore >= 75
        ? 'GOOD'
        : overallScore >= 60
          ? 'FAIR'
          : 'POOR';

  return {
    score: overallScore,
    level,
    strengths: generateStrengths(overallScore, metrics),
    weaknesses: generateWeaknesses(overallScore, metrics),
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 提取POV视角
 */
function extractPOVFromChapter(chapter: Chapter): string[] {
  // 从章节元数据提取POV
  const povMeta = chapter.metadata?.find((m) => m.key === 'POV');
  if (povMeta?.value) {
    return [povMeta.value];
  }

  // 从内容推测（出现次数最多的角色名）
  // 简化实现，实际需更复杂逻辑
  return [];
}

/**
 * 计算节奏评分
 */
function calculatePacingScore(wordCount: number, conflictCount: number): number {
  // 基础分：字数适中（2000-5000字）
  let score = 50;
  if (wordCount >= 2000 && wordCount <= 5000) {
    score += 20;
  } else if (wordCount < 1000) {
    score -= 10;
  } else if (wordCount > 8000) {
    score -= 5;
  }

  // 冲突加分
  if (conflictCount >= 1 && conflictCount <= 3) {
    score += 20;
  } else if (conflictCount > 3) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 生成优势点
 */
function generateStrengths(score: number, metrics: ChapterMetrics[]): string[] {
  // 空数组保护
  if (metrics.length === 0) {
    return ['暂无章节数据，无法分析'];
  }

  const strengths: string[] = [];

  if (score >= 75) {
    strengths.push('整体章节平衡性良好');
  }

  const avgPacing = metrics.reduce((sum, m) => sum + m.pacingScore, 0) / metrics.length;
  if (avgPacing >= 70) {
    strengths.push('章节节奏控制得当');
  }

  return strengths;
}

/**
 * 生成改进点
 */
function generateWeaknesses(score: number, metrics: ChapterMetrics[]): string[] {
  // 空数组保护
  if (metrics.length === 0) {
    return ['暂无章节数据，请先添加章节'];
  }

  const weaknesses: string[] = [];

  if (score < 75) {
    weaknesses.push('章节平衡需要优化');
  }

  const wordCounts = metrics.map((m) => m.wordCount);
  const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const variance =
    wordCounts.reduce((sum, count) => sum + Math.pow(count - avgWordCount, 2), 0) /
    wordCounts.length;

  if (variance > Math.pow(avgWordCount * 0.5, 2)) {
    weaknesses.push('章节字数差异较大，建议调整');
  }

  return weaknesses;
}

// ============================================================
// 优化建议生成
// ============================================================

/**
 * 生成优化建议
 */
export function generateOptimizationSuggestions(
  report: BalanceReport,
  chapters: Chapter[],
  characters: Character[]
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // 1. 拆分过长章节
  report.wordCountStats.outliers.tooLong.forEach((chapter) => {
    suggestions.push({
      type: 'SPLIT',
      priority: 'HIGH',
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      description: `章节字数(${chapter.content?.length || 0})远超平均值，建议拆分为两章`,
      expectedImprovement: '提升章节可读性，保持节奏一致',
    });
  });

  // 2. 合并过短章节
  report.wordCountStats.outliers.tooShort.forEach((chapter) => {
    suggestions.push({
      type: 'MERGE',
      priority: 'MEDIUM',
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      description: `章节字数(${chapter.content?.length || 0})过短，建议与相邻章节合并`,
      expectedImprovement: '增强章节完整性，减少碎片化',
    });
  });

  // 3. 增加冲突场景
  report.conflictAnalysis.coldspots.forEach((chapterId) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) {
      suggestions.push({
        type: 'ADD_CONFLICT',
        priority: 'MEDIUM',
        chapterId,
        chapterTitle: chapter.title,
        description: `章节冲突密度较低，建议增加冲突场景提升张力`,
        expectedImprovement: '提升章节吸引力，推动情节发展',
      });
    }
  });

  // 4. 减少冲突场景
  report.conflictAnalysis.hotspots.forEach((chapterId) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) {
      suggestions.push({
        type: 'REDUCE_CONFLICT',
        priority: 'LOW',
        chapterId,
        chapterTitle: chapter.title,
        description: `章节冲突过于密集，建议适当减少冲突场景`,
        expectedImprovement: '避免读者疲劳，给予缓冲空间',
      });
    }
  });

  // 5. 平衡角色出场
  report.characterBalance.imbalance.forEach((characterId) => {
    const char = characters.find((c) => c.id === characterId);
    if (char) {
      suggestions.push({
        type: 'BALANCE_CHARACTERS',
        priority: 'MEDIUM',
        chapterId: '', // 适用于多个章节
        chapterTitle: '多章节',
        description: `角色"${char.name}"出场不均衡，建议调整出场频率`,
        expectedImprovement: '保持角色重要性平衡',
      });
    }
  });

  // 6. 调整POV
  if (report.povDistribution.rotationPattern === 'POOR') {
    suggestions.push({
      type: 'ADJUST_POV',
      priority: 'HIGH',
      chapterId: '',
      chapterTitle: '整体',
      description: 'POV视角轮换需要优化，建议增加或减少POV数量',
      expectedImprovement: '提升叙事多样性和读者体验',
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// ============================================================
// AI增强建议
// ============================================================

/**
 * 生成AI增强的优化建议
 */
export async function generateAIEnhancedSuggestions(
  chapters: Chapter[],
  characters: Character[],
  plotNodes: PlotNode[],
  settings?: any
): Promise<string> {
  try {
    const aiAnalysis = await generateAIBalanceSuggestions(
      chapters,
      characters,
      plotNodes,
      settings
    );
    return aiAnalysis;
  } catch (error) {
    console.error('AI增强建议生成失败:', error);
    return 'AI分析功能暂时不可用，请使用基础分析。';
  }
}
