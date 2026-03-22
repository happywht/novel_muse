import React, { useState, useMemo } from 'react';
import { Chapter, Character, PlotNode } from '../types';
import {
  analyzeCharacterStatistics,
  CharacterStats,
  StatisticsReport,
  getTrendLabel,
  getBalanceRating,
} from '../utils/characterStatistics';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  BookOpen,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Target,
  Lightbulb,
  PieChart,
} from 'lucide-react';

interface CharacterStatisticsPanelProps {
  chapters: Chapter[];
  characters: Character[];
  plotNodes?: PlotNode[];
}

/**
 * 角色出场统计面板 - 紧凑版
 * 可折叠嵌入到角色管理页面
 */
export const CharacterStatisticsPanel: React.FC<CharacterStatisticsPanelProps> = ({
  chapters,
  characters,
  plotNodes,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'ranking'>('overview');

  // 统计报告
  const report = useMemo(
    () => analyzeCharacterStatistics(chapters, characters, plotNodes),
    [chapters, characters, plotNodes]
  );

  // 趋势图标
  const TrendIcon = ({ trend, size = 4 }: { trend: CharacterStats['trend']; size?: number }) => {
    const iconSize = size === 4 ? 'w-4 h-4' : 'w-3 h-3';
    switch (trend) {
      case 'rising':
        return <TrendingUp className={`${iconSize} text-emerald-400`} />;
      case 'falling':
        return <TrendingDown className={`${iconSize} text-red-400`} />;
      case 'stable':
        return <Minus className={`${iconSize} text-slate-400`} />;
    }
  };

  // 空数据
  if (chapters.length === 0 || characters.length === 0) {
    return null;
  }

  const { summary } = report;

  // 按出场排序
  const sortedCharacters = [...report.characters].sort(
    (a, b) => b.totalAppearances - a.totalAppearances
  );

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* 头部 - 始终可见 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muse-500/20 rounded-lg">
            <PieChart className="w-5 h-5 text-muse-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">角色出场统计</h3>
            <p className="text-xs text-slate-400">
              {report.totalChapters} 章 · {characters.length} 角色 · 平均出场率 {summary.averageAppearanceRate}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* 快速指标 */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3 h-3" /> {summary.risingStars.length}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <TrendingDown className="w-3 h-3" /> {summary.fadingStars.length}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="border-t border-slate-700/50 p-4 space-y-4">
          {/* 视图切换 */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedView('overview')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedView === 'overview'
                  ? 'bg-muse-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              概览
            </button>
            <button
              onClick={() => setSelectedView('ranking')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedView === 'ranking'
                  ? 'bg-muse-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              排行榜
            </button>
          </div>

          {/* 概览视图 */}
          {selectedView === 'overview' && (
            <div className="space-y-4">
              {/* 核心指标 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-white">
                    {summary.averageAppearanceRate}%
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">平均出场率</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-emerald-400">
                    {summary.risingStars.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">上升趋势</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-red-400">
                    {summary.fadingStars.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">下降趋势</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-yellow-400">
                    {summary.unbalancedCharacters.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">需关注</div>
                </div>
              </div>

              {/* 最活跃/最不活跃 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-3">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold mb-2">
                    最活跃
                  </div>
                  {summary.mostActive ? (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white text-sm">
                        {summary.mostActive.characterName}
                      </span>
                      <span className="text-emerald-400 text-xs">
                        {summary.mostActive.totalAppearances}次
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">暂无数据</span>
                  )}
                </div>
                <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-2">
                    出场最少
                  </div>
                  {summary.leastActive ? (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white text-sm">
                        {summary.leastActive.characterName}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {summary.leastActive.totalAppearances}次
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">暂无数据</span>
                  )}
                </div>
              </div>

              {/* 优化建议 */}
              {summary.recommendations.length > 0 && (
                <div className="bg-slate-900/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muse-400 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">建议</span>
                  </div>
                  <ul className="space-y-1">
                    {summary.recommendations.slice(0, 3).map((rec, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-muse-400 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 不均衡角色 */}
              {summary.unbalancedCharacters.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">出场不均衡</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.unbalancedCharacters.map((char) => (
                      <span
                        key={char.characterId}
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          char.percentage < 20
                            ? 'bg-blue-900/50 text-blue-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {char.characterName} ({char.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 排行榜视图 */}
          {selectedView === 'ranking' && (
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {sortedCharacters.map((char, index) => {
                const rating = getBalanceRating(char.percentage);
                return (
                  <div
                    key={char.characterId}
                    className="flex items-center gap-3 p-2 bg-slate-900/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    {/* 排名 */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        index === 0
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : index === 1
                          ? 'bg-slate-400/20 text-slate-300'
                          : index === 2
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-slate-700 text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* 角色名 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm truncate">
                          {char.characterName}
                        </span>
                        <TrendIcon trend={char.trend} size={3} />
                      </div>
                    </div>

                    {/* 出场次数 */}
                    <div className="text-right">
                      <span className="text-xs text-slate-400">{char.totalAppearances}次</span>
                    </div>

                    {/* 出场率 */}
                    <div className="w-16">
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            rating.level === 'excellent'
                              ? 'bg-emerald-400'
                              : rating.level === 'good'
                              ? 'bg-green-400'
                              : rating.level === 'fair'
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                          }`}
                          style={{ width: `${char.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* 评级 */}
                    <span className={`text-[10px] font-medium ${rating.color}`}>
                      {rating.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterStatisticsPanel;
