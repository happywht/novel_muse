/**
 * 角色出场统计引擎
 * 提供角色在各章节的出场次数、占比、趋势分析
 * 帮助新手作家平衡角色戏份
 */

import { Chapter, Character, PlotNode } from '../types';

// ============================================================
// 统计接口定义
// ============================================================

/**
 * 单个角色的统计数据
 */
export interface CharacterStats {
  characterId: string;          // 角色ID
  characterName: string;        // 角色名称
  totalAppearances: number;     // 总出场次数
  chapterBreakdown: ChapterBreakdown[]; // 各章节出场明细
  percentage: number;           // 出场时间占比 (0-100)
  trend: 'rising' | 'falling' | 'stable'; // 出场趋势
  firstAppearance?: number;     // 首次出场章节序号
  lastAppearance?: number;      // 最后出场章节序号
  averagePerChapter: number;    // 平均每章出场次数
  peakChapter?: string;         // 出场最多的章节ID
  peakChapterTitle?: string;    // 出场最多的章节标题
}

/**
 * 章节出场明细
 */
export interface ChapterBreakdown {
  chapterId: string;            // 章节ID
  chapterTitle: string;         // 章节标题
  chapterOrder: number;         // 章节顺序
  count: number;                // 出场次数
  wordCount: number;            // 章节字数
  density: number;              // 出场密度 (每千字出场次数)
}

/**
 * 统计报告
 */
export interface StatisticsReport {
  characters: CharacterStats[]; // 所有角色统计
  totalChapters: number;        // 总章节数
  totalWordCount: number;       // 总字数
  summary: ReportSummary;       // 报告摘要
  generatedAt: number;          // 生成时间戳
}

/**
 * 报告摘要
 */
export interface ReportSummary {
  mostActive: CharacterStats | null;     // 最活跃角色
  leastActive: CharacterStats | null;    // 最不活跃角色
  risingStars: CharacterStats[];         // 出场趋势上升的角色
  fadingStars: CharacterStats[];         // 出场趋势下降的角色
  balancedCharacters: CharacterStats[];  // 出场均衡的角色
  unbalancedCharacters: CharacterStats[]; // 出场不均衡的角色
  averageAppearanceRate: number;         // 平均出场率
  recommendations: string[];             // 优化建议
}

// ============================================================
// 配置参数
// ============================================================

const CONFIG = {
  // 趋势判断阈值
  trendThreshold: 0.15,        // 上升/下降判定阈值 (15%)
  // 平衡性阈值
  balanceThreshold: {
    underUtilized: 20,         // 出场率低于此值为利用不足
    overUtilized: 80,          // 出场率高于此值为过度使用
  },
  // 最小章节数（用于趋势判断）
  minChaptersForTrend: 3,
};

// ============================================================
// 核心统计函数
// ============================================================

/**
 * 分析角色出场统计
 * @param chapters 章节列表
 * @param characters 角色列表
 * @param plotNodes 情节节点列表（可选，用于补充分析）
 * @returns 统计报告
 */
export function analyzeCharacterStatistics(
  chapters: Chapter[],
  characters: Character[],
  plotNodes?: PlotNode[]
): StatisticsReport {
  // 空数据保护
  if (chapters.length === 0 || characters.length === 0) {
    return createEmptyReport();
  }

  // 按顺序排序章节
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  // 计算总字数
  const totalWordCount = sortedChapters.reduce(
    (sum, ch) => sum + (ch.content?.length || 0),
    0
  );

  // 为每个角色计算统计数据
  const characterStats = characters.map(char =>
    calculateCharacterStats(char, sortedChapters, totalWordCount)
  );

  // 生成摘要
  const summary = generateSummary(characterStats, sortedChapters.length);

  return {
    characters: characterStats,
    totalChapters: sortedChapters.length,
    totalWordCount,
    summary,
    generatedAt: Date.now(),
  };
}

/**
 * 计算单个角色的统计数据
 */
function calculateCharacterStats(
  character: Character,
  chapters: Chapter[],
  totalWordCount: number
): CharacterStats {
  const chapterBreakdown: ChapterBreakdown[] = [];
  let totalAppearances = 0;
  let firstAppearance: number | undefined;
  let lastAppearance: number | undefined;
  let peakCount = 0;
  let peakChapterId: string | undefined;
  let peakChapterTitle: string | undefined;

  // 遍历每个章节统计出场
  chapters.forEach((chapter, index) => {
    const count = countCharacterAppearances(character.name, chapter.content || '');

    if (count > 0) {
      totalAppearances += count;

      // 记录首次和最后出场
      if (firstAppearance === undefined) {
        firstAppearance = index + 1;
      }
      lastAppearance = index + 1;

      // 记录出场最多的章节
      if (count > peakCount) {
        peakCount = count;
        peakChapterId = chapter.id;
        peakChapterTitle = chapter.title;
      }

      // 记录章节明细
      chapterBreakdown.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        count,
        wordCount: chapter.content?.length || 0,
        density: calculateDensity(count, chapter.content?.length || 0),
      });
    }
  });

  // 计算出场占比
  const totalPossibleAppearances = chapters.length;
  const percentage = totalPossibleAppearances > 0
    ? Math.round((chapterBreakdown.length / totalPossibleAppearances) * 100)
    : 0;

  // 计算趋势
  const trend = calculateTrend(chapterBreakdown);

  // 计算平均每章出场次数
  const averagePerChapter = chapters.length > 0
    ? parseFloat((totalAppearances / chapters.length).toFixed(2))
    : 0;

  return {
    characterId: character.id,
    characterName: character.name,
    totalAppearances,
    chapterBreakdown,
    percentage,
    trend,
    firstAppearance,
    lastAppearance,
    averagePerChapter,
    peakChapter: peakChapterId,
    peakChapterTitle,
  };
}

/**
 * 统计角色名在内容中出现的次数
 */
function countCharacterAppearances(characterName: string, content: string): number {
  if (!characterName || !content) return 0;

  // 使用正则表达式全局匹配角色名
  // 考虑角色名可能包含特殊字符，进行转义
  const escapedName = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedName, 'g');
  const matches = content.match(regex);

  return matches ? matches.length : 0;
}

/**
 * 计算出场密度（每千字出场次数）
 */
function calculateDensity(count: number, wordCount: number): number {
  if (wordCount === 0) return 0;
  return parseFloat(((count / wordCount) * 1000).toFixed(2));
}

/**
 * 计算出场趋势
 * 通过比较前半部分和后半部分的出场密度来判断
 */
function calculateTrend(
  breakdown: ChapterBreakdown[]
): 'rising' | 'falling' | 'stable' {
  // 章节数不足，无法判断趋势
  if (breakdown.length < CONFIG.minChaptersForTrend) {
    return 'stable';
  }

  const midPoint = Math.floor(breakdown.length / 2);
  const firstHalf = breakdown.slice(0, midPoint);
  const secondHalf = breakdown.slice(midPoint);

  // 计算前半部分平均密度
  const firstHalfDensity = firstHalf.length > 0
    ? firstHalf.reduce((sum, b) => sum + b.density, 0) / firstHalf.length
    : 0;

  // 计算后半部分平均密度
  const secondHalfDensity = secondHalf.length > 0
    ? secondHalf.reduce((sum, b) => sum + b.density, 0) / secondHalf.length
    : 0;

  // 判断趋势
  const changeRate = firstHalfDensity > 0
    ? (secondHalfDensity - firstHalfDensity) / firstHalfDensity
    : 0;

  if (changeRate > CONFIG.trendThreshold) {
    return 'rising';
  } else if (changeRate < -CONFIG.trendThreshold) {
    return 'falling';
  }

  return 'stable';
}

// ============================================================
// 摘要生成
// ============================================================

/**
 * 生成报告摘要
 */
function generateSummary(
  stats: CharacterStats[],
  totalChapters: number
): ReportSummary {
  // 按出场次数排序
  const sorted = [...stats].sort((a, b) => b.totalAppearances - a.totalAppearances);

  // 最活跃和最不活跃角色
  const mostActive = sorted[0] || null;
  const leastActive = sorted[sorted.length - 1] || null;

  // 分类角色
  const risingStars = stats.filter(s => s.trend === 'rising');
  const fadingStars = stats.filter(s => s.trend === 'falling');

  // 平衡性分类
  const balancedCharacters = stats.filter(
    s => s.percentage >= CONFIG.balanceThreshold.underUtilized &&
         s.percentage <= CONFIG.balanceThreshold.overUtilized
  );
  const unbalancedCharacters = stats.filter(
    s => s.percentage < CONFIG.balanceThreshold.underUtilized ||
         s.percentage > CONFIG.balanceThreshold.overUtilized
  );

  // 计算平均出场率
  const averageAppearanceRate = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + s.percentage, 0) / stats.length)
    : 0;

  // 生成建议
  const recommendations = generateRecommendations(
    stats,
    totalChapters,
    averageAppearanceRate
  );

  return {
    mostActive,
    leastActive,
    risingStars,
    fadingStars,
    balancedCharacters,
    unbalancedCharacters,
    averageAppearanceRate,
    recommendations,
  };
}

/**
 * 生成优化建议
 */
function generateRecommendations(
  stats: CharacterStats[],
  totalChapters: number,
  averageRate: number
): string[] {
  const recommendations: string[] = [];

  // 检查利用不足的角色
  const underUtilized = stats.filter(
    s => s.percentage < CONFIG.balanceThreshold.underUtilized
  );
  if (underUtilized.length > 0) {
    recommendations.push(
      `以下角色出场较少，可考虑增加戏份：${underUtilized.map(c => c.characterName).join('、')}`
    );
  }

  // 检查过度使用的角色
  const overUtilized = stats.filter(
    s => s.percentage > CONFIG.balanceThreshold.overUtilized
  );
  if (overUtilized.length > 0) {
    recommendations.push(
      `以下角色出场过于频繁，可考虑分配给其他角色：${overUtilized.map(c => c.characterName).join('、')}`
    );
  }

  // 检查趋势下降的重要角色
  const fadingImportant = stats.filter(
    s => s.trend === 'falling' && s.percentage > averageRate
  );
  if (fadingImportant.length > 0) {
    recommendations.push(
      `重要角色${fadingImportant.map(c => c.characterName).join('、')}出场呈下降趋势，建议关注其后续发展`
    );
  }

  // 检查突然出现的新角色
  const lateAppearances = stats.filter(
    s => s.firstAppearance && s.firstAppearance > totalChapters * 0.7
  );
  if (lateAppearances.length > 0) {
    recommendations.push(
      `新角色${lateAppearances.map(c => c.characterName).join('、')}在后期才出现，确保有足够的铺垫`
    );
  }

  // 如果没有问题，给出正面反馈
  if (recommendations.length === 0) {
    recommendations.push('角色出场分配均衡，继续保持！');
  }

  return recommendations;
}

/**
 * 创建空报告
 */
function createEmptyReport(): StatisticsReport {
  return {
    characters: [],
    totalChapters: 0,
    totalWordCount: 0,
    summary: {
      mostActive: null,
      leastActive: null,
      risingStars: [],
      fadingStars: [],
      balancedCharacters: [],
      unbalancedCharacters: [],
      averageAppearanceRate: 0,
      recommendations: ['暂无章节数据，请先添加章节内容'],
    },
    generatedAt: Date.now(),
  };
}

// ============================================================
// 辅助导出函数
// ============================================================

/**
 * 获取角色的趋势图标
 */
export function getTrendIcon(trend: 'rising' | 'falling' | 'stable'): string {
  switch (trend) {
    case 'rising': return '↗';
    case 'falling': return '↘';
    case 'stable': return '→';
  }
}

/**
 * 获取角色的趋势中文描述
 */
export function getTrendLabel(trend: 'rising' | 'falling' | 'stable'): string {
  switch (trend) {
    case 'rising': return '上升趋势';
    case 'falling': return '下降趋势';
    case 'stable': return '稳定';
  }
}

/**
 * 获取平衡性评级
 */
export function getBalanceRating(percentage: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  label: string;
  color: string;
} {
  if (percentage >= 40 && percentage <= 70) {
    return { level: 'excellent', label: '优秀', color: 'text-emerald-400' };
  } else if (percentage >= 25 && percentage <= 80) {
    return { level: 'good', label: '良好', color: 'text-green-400' };
  } else if (percentage >= 15 && percentage <= 90) {
    return { level: 'fair', label: '一般', color: 'text-yellow-400' };
  } else {
    return { level: 'poor', label: '需优化', color: 'text-red-400' };
  }
}
