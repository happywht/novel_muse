import React, { useState } from 'react';
import { Chapter, Character, PlotNode } from '../types';
import { analyzeChapterBalance, generateOptimizationSuggestions, BalanceReport, OptimizationSuggestion } from '../services/chapterBalanceAlgorithm';
import { Wand2, AlertCircle, CheckCircle, Info, TrendingUp, Users, BookOpen, Zap } from 'lucide-react';

interface ChapterBalanceAnalyzerProps {
  chapters: Chapter[];
  characters: Character[];
  plotNodes: PlotNode[];
  onApplySuggestion: (suggestion: OptimizationSuggestion) => void;
}

export const ChapterBalanceAnalyzer: React.FC<ChapterBalanceAnalyzerProps> = ({
  chapters,
  characters,
  plotNodes,
  onApplySuggestion
}) => {
  const [report] = useState(() => analyzeChapterBalance(chapters, characters, plotNodes));
  const [suggestions] = useState(() => generateOptimizationSuggestions(report, chapters, characters));
  const [selectedTab, setSelectedTab] = useState<'overview' | 'wordcount' | 'conflict' | 'characters' | 'pov' | 'suggestions'>('overview');
  const [selectedSuggestion, setSelectedSuggestion] = useState<OptimizationSuggestion | null>(null);

  const getOverallScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 75) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'LOW': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  };

  const getSuggestionIcon = (type: OptimizationSuggestion['type']) => {
    switch (type) {
      case 'SPLIT': return <BookOpen className="w-4 h-4" />;
      case 'MERGE': return <TrendingUp className="w-4 h-4" />;
      case 'ADD_CONFLICT': return <Zap className="w-4 h-4" />;
      case 'REDUCE_CONFLICT': return <Zap className="w-4 h-4 opacity-50" />;
      case 'BALANCE_CHARACTERS': return <Users className="w-4 h-4" />;
      case 'ADJUST_POV': return <BookOpen className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">章节平衡分析</h2>
          <p className="text-slate-400 mt-1">智能分析章节结构，提供优化建议</p>
        </div>
        
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${getOverallScoreColor(report.overallBalance.score)}`}>
            {report.overallBalance.score}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            {report.overallBalance.level}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: '概览', icon: <Info className="w-4 h-4" /> },
          { id: 'wordcount', label: '字数分析', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'conflict', label: '冲突密度', icon: <Zap className="w-4 h-4" /> },
          { id: 'characters', label: '角色平衡', icon: <Users className="w-4 h-4" /> },
          { id: 'pov', label: 'POV分布', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'suggestions', label: '优化建议', icon: <Wand2 className="w-4 h-4" /> },
        ].map(tab => (
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
          <div className="space-y-6">
            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="font-semibold">优势</h3>
                </div>
                <ul className="space-y-2">
                  {report.overallBalance.strengths.length > 0 ? (
                    report.overallBalance.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">✓</span>
                        {strength}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-500">暂无显著优势</li>
                  )}
                </ul>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400 mb-3">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="font-semibold">改进点</h3>
                </div>
                <ul className="space-y-2">
                  {report.overallBalance.weaknesses.length > 0 ? (
                    report.overallBalance.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-red-400 mt-1">!</span>
                        {weakness}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-500">暂无显著问题</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {report.wordCountStats.total.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">总字数</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {report.wordCountStats.average.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">平均字数</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {report.conflictAnalysis.totalScenes}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">冲突场景</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {report.characterBalance.totalCharacters}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">角色总数</div>
              </div>
            </div>
          </div>
        )}

        {/* Word Count Tab */}
        {selectedTab === 'wordcount' && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">字数分布</h3>
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-400">
                    {report.wordCountStats.min.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">最小值</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">
                    {report.wordCountStats.average.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">平均值</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-400">
                    {report.wordCountStats.median.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">中位数</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-400">
                    {report.wordCountStats.max.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">最大值</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-pink-400">
                    {report.wordCountStats.stdDev.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">标准差</div>
                </div>
              </div>
            </div>

            {/* Outliers */}
            <div className="space-y-3">
              {report.wordCountStats.outliers.tooLong.length > 0 && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <h4 className="font-semibold">过长章节（建议拆分）</h4>
                  </div>
                  <ul className="space-y-1">
                    {report.wordCountStats.outliers.tooLong.map(chapter => (
                      <li key={chapter.id} className="text-sm text-slate-300">
                        {chapter.title} ({chapter.content?.length.toLocaleString()} 字)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.wordCountStats.outliers.tooShort.length > 0 && (
                <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Info className="w-4 h-4" />
                    <h4 className="font-semibold">过短章节（建议合并）</h4>
                  </div>
                  <ul className="space-y-1">
                    {report.wordCountStats.outliers.tooShort.map(chapter => (
                      <li key={chapter.id} className="text-sm text-slate-300">
                        {chapter.title} ({chapter.content?.length.toLocaleString()} 字)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conflict Tab */}
        {selectedTab === 'conflict' && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">冲突分布</h3>
              <div className="space-y-2">
                {report.conflictAnalysis.distribution.map(item => {
                  const densityPercent = Math.round(item.density * 100);
                  return (
                    <div key={item.chapterId} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-300">{item.chapterTitle}</span>
                          <span className="text-slate-400">{item.conflictCount} 场景</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-orange-400 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(densityPercent * 10, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {report.conflictAnalysis.hotspots.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-400 mb-2">冲突热点（可能过多）</h4>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {report.conflictAnalysis.hotspots.map(id => {
                      const chapter = chapters.find(c => c.id === id);
                      return chapter ? (
                        <li key={id}>{chapter.title}</li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}

              {report.conflictAnalysis.coldspots.length > 0 && (
                <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-400 mb-2">冲突冷点（可能不足）</h4>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {report.conflictAnalysis.coldspots.map(id => {
                      const chapter = chapters.find(c => c.id === id);
                      return chapter ? (
                        <li key={id}>{chapter.title}</li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Characters Tab */}
        {selectedTab === 'characters' && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">角色出场统计</h3>
              <div className="space-y-2">
                {Object.values(report.characterBalance.appearances)
                  .sort((a, b) => b.count - a.count)
                  .map(char => (
                    <div key={char.characterId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{char.name}</div>
                          <div className="text-sm text-slate-400">{char.count} 次出场</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          char.balanceScore >= 80 ? 'text-emerald-400' :
                          char.balanceScore >= 60 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {char.balanceScore}
                        </div>
                        <div className="text-xs text-slate-400">平衡评分</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {report.characterBalance.imbalance.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <h4 className="font-semibold">出场不均衡的角色</h4>
                </div>
                <p className="text-sm text-slate-300">
                  以下角色出场频率异常，建议调整：
                  {report.characterBalance.imbalance.map(id => {
                    const char = characters.find(c => c.id === id);
                    return char ? ` ${char.name}` : '';
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* POV Tab */}
        {selectedTab === 'pov' && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">POV视角分布</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  {Object.entries(report.povDistribution.chaptersByPOV).map(([pov, count]) => (
                    <div key={pov} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="font-medium text-white">{pov}</span>
                      <span className="text-lg font-bold text-muse-400">
                        {count} 章
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col justify-center items-center">
                  <div className={`text-2xl font-bold ${
                    report.povDistribution.rotationPattern === 'GOOD' ? 'text-emerald-400' :
                    report.povDistribution.rotationPattern === 'FAIR' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {report.povDistribution.rotationPattern}
                  </div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mt-2">
                    轮换模式
                  </div>
                </div>
              </div>
            </div>

            {report.povDistribution.suggestions.length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">POV优化建议</h4>
                <ul className="space-y-2">
                  {report.povDistribution.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-muse-400 mt-1">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {selectedTab === 'suggestions' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <Wand2 className="w-5 h-5 text-muse-400" />
              <h3 className="font-semibold">优化建议 ({suggestions.length})</h3>
            </div>
            
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedSuggestion?.chapterId === suggestion.chapterId
                      ? 'bg-slate-800/70 border-muse-500'
                      : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800/50'
                  }`}
                  onClick={() => setSelectedSuggestion(suggestion)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${getPriorityColor(suggestion.priority)}`}>
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">
                          {suggestion.chapterTitle || '整体优化'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(suggestion.priority)}`}>
                          {suggestion.priority}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-300 mb-2">
                        {suggestion.description}
                      </p>
                      
                      <div className="text-xs text-slate-400 bg-slate-900/50 rounded p-2">
                        <strong>预期效果：</strong> {suggestion.expectedImprovement}
                      </div>
                    </div>
                  </div>
                  
                  {selectedSuggestion?.chapterId === suggestion.chapterId && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplySuggestion(suggestion);
                        }}
                        className="px-3 py-1.5 bg-muse-600 hover:bg-muse-500 text-white text-sm rounded-lg transition-colors"
                      >
                        应用建议
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSuggestion(null);
                        }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {suggestions.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white mb-2">章节平衡性良好</h4>
                <p className="text-slate-400">暂无优化建议，继续保持！</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

