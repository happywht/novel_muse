import React, { useState, useMemo } from 'react';
import { Chapter, Character, PlotNode } from '@/types';
import {
  analyzeCharacterStatistics,
  CharacterStats,
  StatisticsReport,
  getTrendLabel,
  getBalanceRating,
} from '@/utils/characterStatistics';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Award,
  Target,
  Lightbulb,
} from 'lucide-react';

interface CharacterStatisticsProps {
  chapters: Chapter[];
  characters: Character[];
  plotNodes?: PlotNode[];
}

/**
 * 角色出场统计面板
 * 帮助新手作家平衡角色戏份
 */
export const CharacterStatistics: React.FC<CharacterStatisticsProps> = ({
  chapters,
  characters,
  plotNodes,
}) => {
  // 统计报告（使用 useMemo 避免重复计算）
  const report = useMemo(
    () => analyzeCharacterStatistics(chapters, characters, plotNodes),
    [chapters, characters, plotNodes]
  );

  // UI 状态
  const [selectedTab, setSelectedTab] = useState<'overview' | 'ranking' | 'trends' | 'chapters'>('overview');
  const [expandedCharacter, setExpandedCharacter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'appearances' | 'percentage' | 'trend'>('appearances');

  // 空数据提示
  if (chapters.length === 0 || characters.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">暂无统计数据</h3>
          <p className="text-slate-400">
            {chapters.length === 0
              ? '请先添加章节内容，才能统计角色出场情况'
              : '请先创建角色，才能统计出场情况'}
          </p>
        </div>
      </div>
    );
  }

  // 获取趋势图标组件
  const TrendIcon = ({ trend }: { trend: CharacterStats['trend'] }) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'falling':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  // 排序后的角色列表
  const sortedCharacters = useMemo(() => {
    const sorted = [...report.characters];
    switch (sortBy) {
      case 'appearances':
        return sorted.sort((a, b) => b.totalAppearances - a.totalAppearances);
      case 'percentage':
        return sorted.sort((a, b) => b.percentage - a.percentage);
      case 'trend':
        return sorted.sort((a, b) => {
          const order = { rising: 0, stable: 1, falling: 2 };
          return order[a.trend] - order[b.trend];
        });
      default:
        return sorted;
    }
  }, [report.characters, sortBy]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">角色出场统计</h2>
          <p className="text-slate-400 mt-1">分析角色在各章节的出场情况，帮助平衡戏份</p>
        </div>

        {/* 快速统计 */}
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg">
            <div className="text-2xl font-bold text-white">{report.totalChapters}</div>
            <div className="text-xs text-slate-400">总章节</div>
          </div>
          <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg">
            <div className="text-2xl font-bold text-white">{characters.length}</div>
            <div className="text-xs text-slate-400">角色数</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: '概览', icon: <Info className="w-4 h-4" /> },
          { id: 'ranking', label: '出场排行', icon: <Award className="w-4 h-4" /> },
          { id: 'trends', label: '趋势分析', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'chapters', label: '章节明细', icon: <BookOpen className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedTab === tab.id
                ? 'bg-muse-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <OverviewTab report={report} TrendIcon={TrendIcon} />
        )}

        {/* Ranking Tab */}
        {selectedTab === 'ranking' && (
          <RankingTab
            characters={sortedCharacters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            TrendIcon={TrendIcon}
          />
        )}

        {/* Trends Tab */}
        {selectedTab === 'trends' && (
          <TrendsTab report={report} TrendIcon={TrendIcon} />
        )}

        {/* Chapters Tab */}
        {selectedTab === 'chapters' && (
          <ChaptersTab
            characters={sortedCharacters}
            chapters={chapters}
            expandedCharacter={expandedCharacter}
            setExpandedCharacter={setExpandedCharacter}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// 子组件：概览标签页
// ============================================================

interface TabProps {
  report: StatisticsReport;
  TrendIcon: React.FC<{ trend: CharacterStats['trend'] }>;
}

const OverviewTab: React.FC<TabProps> = ({ report, TrendIcon }) => {
  const { summary } = report;

  // 辅助函数：获取均衡角色列表
  const balancedCharacters = report.characters.filter(
    (s) => s.percentage >= 20 && s.percentage <= 80
  );

  return (
    <div className="space-y-6">
      {/* 核心指标 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {summary.averageAppearanceRate}%
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">平均出场率</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {balancedCharacters.length}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">均衡角色</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">
            {summary.risingStars.length}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">上升趋势</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {summary.fadingStars.length}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">下降趋势</div>
        </div>
      </div>

      {/* 最活跃 / 最不活跃 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-3">
            <Award className="w-5 h-5" />
            <h3 className="font-semibold">最活跃角色</h3>
          </div>
          {summary.mostActive ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white text-lg">
                  {summary.mostActive.characterName}
                </div>
                <div className="text-sm text-slate-400">
                  出场 {summary.mostActive.totalAppearances} 次 · {summary.mostActive.percentage}% 章节覆盖
                </div>
              </div>
              <TrendIcon trend={summary.mostActive.trend} />
            </div>
          ) : (
            <p className="text-slate-500">暂无数据</p>
          )}
        </div>

        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Target className="w-5 h-5" />
            <h3 className="font-semibold">出场最少</h3>
          </div>
          {summary.leastActive ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white text-lg">
                  {summary.leastActive.characterName}
                </div>
                <div className="text-sm text-slate-400">
                  出场 {summary.leastActive.totalAppearances} 次 · {summary.leastActive.percentage}% 章节覆盖
                </div>
              </div>
              <TrendIcon trend={summary.leastActive.trend} />
            </div>
          ) : (
            <p className="text-slate-500">暂无数据</p>
          )}
        </div>
      </div>

      {/* 优化建议 */}
      <div className="bg-slate-800/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muse-400 mb-3">
          <Lightbulb className="w-5 h-5" />
          <h3 className="font-semibold">优化建议</h3>
        </div>
        <ul className="space-y-2">
          {summary.recommendations.map((rec, idx) => (
            <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
              <span className="text-muse-400 mt-1">•</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* 不均衡角色警告 */}
      {summary.unbalancedCharacters.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <h4 className="font-semibold">出场不均衡的角色</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.unbalancedCharacters.map((char) => (
              <span
                key={char.characterId}
                className={`px-2 py-1 rounded text-xs ${
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
  );
};

// ============================================================
// 子组件：排行标签页
// ============================================================

interface RankingTabProps {
  characters: CharacterStats[];
  sortBy: 'appearances' | 'percentage' | 'trend';
  setSortBy: (sort: 'appearances' | 'percentage' | 'trend') => void;
  TrendIcon: React.FC<{ trend: CharacterStats['trend'] }>;
}

const RankingTab: React.FC<RankingTabProps> = ({
  characters,
  sortBy,
  setSortBy,
  TrendIcon,
}) => {
  return (
    <div className="space-y-4">
      {/* 排序控制 */}
      <div className="flex gap-2">
        <span className="text-sm text-slate-400">排序方式：</span>
        {[
          { key: 'appearances', label: '出场次数' },
          { key: 'percentage', label: '出场率' },
          { key: 'trend', label: '趋势' },
        ].map((option) => (
          <button
            key={option.key}
            onClick={() => setSortBy(option.key as any)}
            className={`px-2 py-1 text-xs rounded ${
              sortBy === option.key
                ? 'bg-muse-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 排行列表 */}
      <div className="space-y-2">
        {characters.map((char, index) => {
          const rating = getBalanceRating(char.percentage);
          return (
            <div
              key={char.characterId}
              className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              {/* 排名 */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : index === 1
                    ? 'bg-slate-400/20 text-slate-300'
                    : index === 2
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {index + 1}
              </div>

              {/* 角色信息 */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{char.characterName}</span>
                  <TrendIcon trend={char.trend} />
                </div>
                <div className="text-sm text-slate-400">
                  出场 {char.totalAppearances} 次 · 平均每章 {char.averagePerChapter} 次
                </div>
              </div>

              {/* 出场率进度条 */}
              <div className="w-32">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">章节覆盖</span>
                  <span className={rating.color}>{char.percentage}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
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

              {/* 评级标签 */}
              <div
                className={`px-2 py-1 rounded text-xs font-medium ${rating.color} bg-slate-800`}
              >
                {rating.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// 子组件：趋势标签页
// ============================================================

const TrendsTab: React.FC<TabProps> = ({ report, TrendIcon }) => {
  const { summary } = report;

  return (
    <div className="space-y-6">
      {/* 上升趋势 */}
      <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-emerald-400 mb-3">
          <TrendingUp className="w-5 h-5" />
          <h3 className="font-semibold">上升趋势 ({summary.risingStars.length})</h3>
        </div>
        {summary.risingStars.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {summary.risingStars.map((char) => (
              <div
                key={char.characterId}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-white">{char.characterName}</div>
                  <div className="text-sm text-slate-400">
                    出场 {char.totalAppearances} 次
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">{char.percentage}%</div>
                  <div className="text-xs text-slate-400">章节覆盖</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">暂无上升趋势的角色</p>
        )}
      </div>

      {/* 下降趋势 */}
      <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400 mb-3">
          <TrendingDown className="w-5 h-5" />
          <h3 className="font-semibold">下降趋势 ({summary.fadingStars.length})</h3>
        </div>
        {summary.fadingStars.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {summary.fadingStars.map((char) => (
              <div
                key={char.characterId}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-white">{char.characterName}</div>
                  <div className="text-sm text-slate-400">
                    出场 {char.totalAppearances} 次
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold">{char.percentage}%</div>
                  <div className="text-xs text-slate-400">章节覆盖</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">暂无下降趋势的角色</p>
        )}
      </div>

      {/* 趋势说明 */}
      <div className="bg-slate-800/30 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">趋势判断说明</h4>
        <p className="text-sm text-slate-400">
          系统通过比较角色在前后半部分章节的出场密度来判断趋势。
          如果后半部分密度比前半部分高出15%以上，则判定为上升趋势；
          反之则判定为下降趋势。
        </p>
      </div>
    </div>
  );
};

// ============================================================
// 子组件：章节明细标签页
// ============================================================

interface ChaptersTabProps {
  characters: CharacterStats[];
  chapters: Chapter[];
  expandedCharacter: string | null;
  setExpandedCharacter: (id: string | null) => void;
}

const ChaptersTab: React.FC<ChaptersTabProps> = ({
  characters,
  chapters,
  expandedCharacter,
  setExpandedCharacter,
}) => {
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        点击角色查看在各章节的详细出场情况
      </p>

      {characters.map((char) => {
        const isExpanded = expandedCharacter === char.characterId;

        return (
          <div
            key={char.characterId}
            className="bg-slate-800/30 rounded-lg overflow-hidden"
          >
            {/* 角色头部 */}
            <button
              onClick={() => setExpandedCharacter(isExpanded ? null : char.characterId)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">{char.characterName}</div>
                  <div className="text-sm text-slate-400">
                    共 {char.chapterBreakdown.length} 章出场 · {char.totalAppearances} 次
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-muse-400">{char.percentage}%</div>
                  <div className="text-xs text-slate-400">覆盖章节</div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* 展开的章节明细 */}
            {isExpanded && (
              <div className="border-t border-slate-700 p-4">
                <div className="space-y-2">
                  {char.chapterBreakdown.length > 0 ? (
                    char.chapterBreakdown.map((chapter) => (
                      <div
                        key={chapter.chapterId}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-slate-500 w-6">
                            #{chapter.chapterOrder}
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm">
                              {chapter.chapterTitle}
                            </div>
                            <div className="text-xs text-slate-400">
                              {chapter.wordCount.toLocaleString()} 字
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="font-bold text-white">{chapter.count}</div>
                            <div className="text-xs text-slate-400">出场</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-muse-400">
                              {chapter.density}
                            </div>
                            <div className="text-xs text-slate-400">密度</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-4">
                      该角色暂无出场记录
                    </p>
                  )}
                </div>

                {/* 峰值章节 */}
                {char.peakChapterTitle && (
                  <div className="mt-3 p-3 bg-muse-900/20 border border-muse-800/50 rounded-lg">
                    <div className="text-xs text-muse-400 mb-1">出场最多的章节</div>
                    <div className="font-medium text-white">{char.peakChapterTitle}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CharacterStatistics;
