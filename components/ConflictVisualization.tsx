import React, { useState } from 'react';
import { PlotNode, Chapter, Character } from '../types';
import {
  generateConflictVisualization,
  ConflictVisualizationReport,
  getConflictIntensityColor,
  getConflictTypeLabel,
  getConflictPatternDescription,
  determinePrimaryConflictType,
} from '../services/conflictVisualization';
import { Zap, Flame, Users, Activity, Target, AlertCircle } from 'lucide-react';

interface ConflictVisualizationProps {
  plotNodes: PlotNode[];
  chapters: Chapter[];
  characters: Character[];
}

export const ConflictVisualization: React.FC<ConflictVisualizationProps> = ({
  plotNodes,
  chapters,
  characters,
}) => {
  const report = generateConflictVisualization(plotNodes, chapters, characters);
  const [selectedTab, setSelectedTab] = useState<
    'heatmap' | 'stress' | 'distribution' | 'timeline' | 'climax'
  >('heatmap');

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">冲突场景可视化</h2>
          <p className="text-slate-400 mt-1">分析冲突分布、角色压力与叙事节奏</p>
        </div>

        {/* Conflict Stats */}
        <div className="flex gap-4">
          <StatCard
            label="总冲突数"
            value={report.distribution.total.toString()}
            color="text-orange-400"
            icon={<Flame className="w-4 h-4" />}
          />
          <StatCard
            label="修罗场节点"
            value={report.climaxNodes.length.toString()}
            color="text-red-400"
            icon={<Zap className="w-4 h-4" />}
          />
          <StatCard
            label="最激烈章节"
            value={report.insights.mostIntenseChapter || '-'}
            color="text-purple-400"
            icon={<Target className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'heatmap', label: '冲突热力图', icon: <Flame className="w-4 h-4" /> },
          { id: 'stress', label: '角色压力', icon: <Activity className="w-4 h-4" /> },
          { id: 'distribution', label: '类型分布', icon: <Zap className="w-4 h-4" /> },
          { id: 'timeline', label: '时间线', icon: <Users className="w-4 h-4" /> },
          { id: 'climax', label: '修罗场节点', icon: <AlertCircle className="w-4 h-4" /> },
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
      <div className="min-h-[500px]">
        {/* Heatmap Tab */}
        {selectedTab === 'heatmap' && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">章节冲突热力分布</h3>
              <div className="space-y-3">
                {report.heatmap.chapters.map((chapterTitle, idx) => {
                  const intensity = report.heatmap.intensities[idx];
                  const count = report.heatmap.conflictCounts[idx];
                  const color = getConflictIntensityColor(intensity);

                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-32 text-sm text-slate-300 truncate">{chapterTitle}</div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-24 bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(intensity * 10, 100)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8">{intensity.toFixed(1)}</span>
                        <span className="text-xs text-slate-500">{count} 场景</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {getConflictTypeLabel(report.heatmap.types[idx])}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pattern Analysis */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">冲突模式分析</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div
                    className={`text-lg font-bold ${
                      report.insights.conflictPattern === 'EVEN'
                        ? 'text-emerald-400'
                        : report.insights.conflictPattern === 'CLUSTERED'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                    }`}
                  >
                    {report.insights.conflictPattern}
                  </div>
                  <div className="text-xs text-slate-400">分布模式</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {report.insights.mostIntenseChapter || '-'}
                  </div>
                  <div className="text-xs text-slate-400">最激烈章节</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {getConflictTypeLabel(
                      determinePrimaryConflictType(
                        plotNodes.filter((n) => n.beatTag?.includes('conflict'))
                      )
                    )}
                  </div>
                  <div className="text-xs text-slate-400">主要类型</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stress Tab */}
        {selectedTab === 'stress' && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">角色压力曲线</h3>
              <div className="space-y-4">
                {report.characterStress.map((char) => (
                  <div key={char.characterId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          <Users className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="font-medium text-white">{char.characterName}</span>
                      </div>
                      <div className="text-sm text-slate-400">
                        峰值: {char.peakChapters.length > 0 ? char.peakChapters.join(', ') : '无'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1">
                        {char.stressCurve.map((stress, idx) => (
                          <div
                            key={idx}
                            className="flex-1 h-6 rounded flex items-center justify-center"
                            style={{
                              backgroundColor: getConflictIntensityColor(stress),
                              opacity: 0.8,
                            }}
                            title={`章节${idx + 1}: 压力值${stress.toFixed(1)}`}
                          >
                            <span className="text-xs text-white font-bold">
                              {stress >= 8 ? stress.toFixed(0) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Stressed Character */}
            {report.insights.mostStressedCharacter && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <h4 className="font-semibold">压力最大角色</h4>
                </div>
                <p className="text-sm text-slate-300">
                  {report.insights.mostStressedCharacter}{' '}
                  在多个章节中承受高压力，建议适当调整冲突分配
                </p>
              </div>
            )}
          </div>
        )}

        {/* Distribution Tab */}
        {selectedTab === 'distribution' && (
          <div className="space-y-6">
            <div className="bg-slate-800/30 rounded-lg p-6">
              <h3 className="font-semibold text-white mb-6 text-center">冲突类型分布</h3>
              <div className="flex justify-center">
                <PieChart
                  data={[
                    { label: '内心冲突', value: report.distribution.inner, color: '#8b5cf6' },
                    {
                      label: '人际冲突',
                      value: report.distribution.interpersonal,
                      color: '#f97316',
                    },
                    { label: '外部冲突', value: report.distribution.external, color: '#ef4444' },
                  ]}
                />
              </div>
              <div className="flex justify-center gap-6 mt-6">
                <LegendItem color="#8b5cf6" label={`内心冲突 (${report.distribution.inner})`} />
                <LegendItem
                  color="#f97316"
                  label={`人际冲突 (${report.distribution.interpersonal})`}
                />
                <LegendItem color="#ef4444" label={`外部冲突 (${report.distribution.external})`} />
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">分布洞察</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-purple-400">
                    {Math.round((report.distribution.inner / report.distribution.total) * 100)}%
                  </div>
                  <div className="text-xs text-slate-400">内心冲突占比</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-400">
                    {Math.round(
                      (report.distribution.interpersonal / report.distribution.total) * 100
                    )}
                    %
                  </div>
                  <div className="text-xs text-slate-400">人际冲突占比</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-400">
                    {Math.round((report.distribution.external / report.distribution.total) * 100)}%
                  </div>
                  <div className="text-xs text-slate-400">外部冲突占比</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {selectedTab === 'timeline' && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">冲突时间线</h3>
              <div className="h-64">
                <LineChart
                  data={report.timeline.chapterOrders.map((order, idx) => ({
                    x: `章节${order}`,
                    y: report.timeline.conflictDensity[idx],
                  }))}
                />
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">张力曲线</h4>
              <div className="space-y-2">
                {report.timeline.tensionCurve.map((tension, idx) => {
                  const chapter = chapters.find(
                    (ch) => ch.order === report.timeline.chapterOrders[idx]
                  );
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-20 text-sm text-slate-400">章节{idx + 1}</div>
                      <div className="flex-1 bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${tension * 10}%`,
                            backgroundColor: getConflictIntensityColor(tension),
                          }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 w-8">{tension.toFixed(1)}</div>
                      {chapter && (
                        <div className="text-xs text-slate-500 truncate flex-1">
                          {chapter.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Climax Tab */}
        {selectedTab === 'climax' && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">修罗场节点</h3>
              {report.climaxNodes.length > 0 ? (
                <div className="space-y-3">
                  {report.climaxNodes.map((climax, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-orange-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getConflictIntensityColor(climax.intensity) }}
                          />
                          <span className="font-bold text-white">{climax.chapterTitle}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/50 text-orange-400 border border-orange-800/50">
                            强度 {climax.intensity}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          节点 ID: {climax.nodeId.slice(0, 8)}
                        </div>
                      </div>

                      {climax.involvedCharacters.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-slate-400 mb-1">涉及角色:</div>
                          <div className="flex flex-wrap gap-1">
                            {climax.involvedCharacters.map((charId) => {
                              const char = characters.find((c) => c.id === charId);
                              return char ? (
                                <span
                                  key={charId}
                                  className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-200"
                                >
                                  {char.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-slate-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-300 mb-2">暂无修罗场节点</h4>
                  <p className="text-slate-500 max-w-md mx-auto">
                    建议在设计情节时增加高强度冲突场景（intensity ≥ 8），提升故事张力
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-muse-400" />
          智能洞察
        </h3>
        <div className="space-y-2">
          {report.insights.suggestions.length > 0 ? (
            report.insights.suggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-muse-400 mt-1">•</span>
                <span>{suggestion}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">暂无特殊洞察</p>
          )}
        </div>
      </div>
    </div>
  );
};

// 统计卡片组件
const StatCard = ({
  value,
  label,
  color,
  icon,
}: {
  value: string;
  label: string;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="text-center">
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1 justify-center">
      {icon}
      {label}
    </div>
  </div>
);

// 图例组件
const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
    <span className="text-sm text-slate-300">{label}</span>
  </div>
);

// 简单的图表组件（在实际项目中使用完整图表库如Chart.js或D3.js）
const LineChart = ({ data }: { data: Array<{ x: string; y: number }> }) => {
  const maxY = Math.max(...data.map((d) => d.y), 1);

  return (
    <div className="w-full h-full">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={100 - y}
            x2="100"
            y2={100 - y}
            stroke="#334155"
            strokeWidth="0.5"
          />
        ))}

        {/* Line */}
        <polyline
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          points={data
            .map((point, idx) => {
              const x = (idx / (data.length - 1)) * 100;
              const y = 100 - (point.y / maxY) * 100;
              return `${x},${y}`;
            })
            .join(' ')}
        />

        {/* Points */}
        {data.map((point, idx) => {
          const x = (idx / (data.length - 1)) * 100;
          const y = 100 - (point.y / maxY) * 100;
          return <circle key={idx} cx={x} cy={y} r="2" fill="#8b5cf6" />;
        })}
      </svg>
    </div>
  );
};

const PieChart = ({ data }: { data: Array<{ label: string; value: number; color: string }> }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <div className="w-64 h-64 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {data.map((item, idx) => {
          const percentage = item.value / total;
          const angle = percentage * 360;
          const startAngle = currentAngle;
          const endAngle = startAngle + angle;
          currentAngle += angle;

          const x1 = 50 + 35 * Math.cos(((startAngle - 90) * Math.PI) / 180);
          const y1 = 50 + 35 * Math.sin(((startAngle - 90) * Math.PI) / 180);
          const x2 = 50 + 35 * Math.cos(((endAngle - 90) * Math.PI) / 180);
          const y2 = 50 + 35 * Math.sin(((endAngle - 90) * Math.PI) / 180);
          const largeArcFlag = angle > 180 ? 1 : 0;

          return (
            <path
              key={idx}
              d={`M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={item.color}
              stroke="white"
              strokeWidth="0.5"
            />
          );
        })}
      </svg>
    </div>
  );
};
