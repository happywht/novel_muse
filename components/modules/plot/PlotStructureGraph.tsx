/**
 * PlotStructureGraph - 剧情结构图谱可视化组件
 *
 * Plot模块图谱化增强功能：
 * - 三幕式结构可视化（Setup → Confrontation → Resolution）
 * - 情节节点网络分析（PlotNode依赖关系）
 * - 剧情节奏曲线（Tension/Pacing分析）
 * - 高潮点识别与强度评估
 * - 角色-情节关联度分析
 */

import React, { useState, useMemo } from 'react';
import {
  Film,
  TrendingUp,
  Zap,
  Network,
  Flame,
  Clock,
  BarChart3,
  Target,
  Sparkles,
  Eye,
  ChevronDown,
  AlertTriangle,
  GitBranch,
  Users,
  Calendar,
  Activity,
  Filter,
  X,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface PlotNode {
  id: string;
  title: string;
  content: string;
  order: number;
  conflictScenario?: {
    type: string;
    intensity: number;
    participants: string[];
  };
  act?: 'setup' | 'confrontation' | 'resolution';
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  summary?: string;
  plotNodes?: PlotNode[];
}

interface Character {
  id: string;
  name: string;
  role: string;
}

interface PlotStructureGraphProps {
  chapters: Chapter[];
  plotNodes: PlotNode[];
  characters: Character[];
  className?: string;
}

// ============================================================
// Component
// ============================================================

type ViewMode = 'three-act' | 'node-network' | 'pacing-curve' | 'climax-analysis';

export const PlotStructureGraph: React.FC<PlotStructureGraphProps> = ({
  chapters,
  plotNodes,
  characters,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('three-act');
  const [selectedAct, setSelectedAct] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // 三幕式结构分析
  const threeActStructure = useMemo(() => {
    const totalNodes = plotNodes.length;
    const setupEnd = Math.floor(totalNodes * 0.25);
    const confrontationEnd = Math.floor(totalNodes * 0.75);

    const setupNodes = plotNodes.slice(0, setupEnd);
    const confrontationNodes = plotNodes.slice(setupEnd, confrontationEnd);
    const resolutionNodes = plotNodes.slice(confrontationEnd);

    return {
      setup: {
        nodes: setupNodes,
        percentage: Math.round((setupNodes.length / totalNodes) * 100),
        avgIntensity: setupNodes.reduce((sum, node) => sum + (node.conflictScenario?.intensity || 0), 0) / setupNodes.length || 0,
        color: 'from-blue-500 to-cyan-400',
        label: '第一幕：铺垫（Setup）',
      },
      confrontation: {
        nodes: confrontationNodes,
        percentage: Math.round((confrontationNodes.length / totalNodes) * 100),
        avgIntensity: confrontationNodes.reduce((sum, node) => sum + (node.conflictScenario?.intensity || 0), 0) / confrontationNodes.length || 0,
        color: 'from-orange-500 to-red-500',
        label: '第二幕：对抗（Confrontation）',
      },
      resolution: {
        nodes: resolutionNodes,
        percentage: Math.round((resolutionNodes.length / totalNodes) * 100),
        avgIntensity: resolutionNodes.reduce((sum, node) => sum + (node.conflictScenario?.intensity || 0), 0) / resolutionNodes.length || 0,
        color: 'from-emerald-500 to-teal-400',
        label: '第三幕：结局（Resolution）',
      },
    };
  }, [plotNodes]);

  // 情节节点网络
  const nodeNetwork = useMemo(() => {
    const nodes = plotNodes.map((node) => ({
      ...node,
      relatedChapters: chapters.filter((ch) => ch.plotNodes?.some((pn) => pn.id === node.id)),
      involvedCharacters: characters.filter((char) =>
        node.conflictScenario?.participants.includes(char.id) || node.content.includes(char.name)
      ),
    }));

    // 简单的依赖关系模拟（实际应基于真实数据）
    const connections = nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1].id,
      strength: Math.random() * 100,
    }));

    return { nodes, connections };
  }, [plotNodes, chapters, characters]);

  // 剧情节奏曲线
  const pacingCurve = useMemo(() => {
    return chapters.map((chapter) => {
      const chapterNodes = chapter.plotNodes || plotNodes.filter((pn) => pn.order === chapter.order);
      const avgIntensity = chapterNodes.reduce((sum, node) => sum + (node.conflictScenario?.intensity || 50), 0) / chapterNodes.length || 50;

      return {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        intensity: avgIntensity,
        nodeCount: chapterNodes.length,
      };
    });
  }, [chapters, plotNodes]);

  // 高潮点分析
  const climaxAnalysis = useMemo(() => {
    const climaxNodes = plotNodes
      .filter((node) => node.conflictScenario?.intensity && node.conflictScenario.intensity > 70)
      .sort((a, b) => (b.conflictScenario?.intensity || 0) - (a.conflictScenario?.intensity || 0));

    return climaxNodes.slice(0, 10).map((node) => ({
      ...node,
      chapter: chapters.find((ch) => ch.plotNodes?.some((pn) => pn.id === node.id)),
      intensity: node.conflictScenario?.intensity || 0,
    }));
  }, [plotNodes, chapters]);

  // 获取强度颜色
  const getIntensityColor = (intensity: number) => {
    if (intensity >= 80) return 'bg-red-500';
    if (intensity >= 60) return 'bg-orange-500';
    if (intensity >= 40) return 'bg-yellow-500';
    if (intensity >= 20) return 'bg-blue-400';
    return 'bg-slate-600';
  };

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Film className="w-4 h-4 text-violet-400" />
              剧情结构图谱
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              分析剧情结构、节奏与高潮点分布
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'three-act' as ViewMode, label: '三幕结构', icon: <Film size={14} /> },
            { id: 'node-network' as ViewMode, label: '节点网络', icon: <Network size={14} /> },
            { id: 'pacing-curve' as ViewMode, label: '节奏曲线', icon: <Activity size={14} /> },
            { id: 'climax-analysis' as ViewMode, label: '高潮分析', icon: <Zap size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                viewMode === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {/* Three-Act Structure View */}
        {viewMode === 'three-act' && (
          <div className="space-y-6">
            <p className="text-xs text-slate-500">
              经典三幕式结构分析，展示剧情的宏观架构
            </p>

            {/* Act Cards */}
            <div className="space-y-4">
              {Object.entries(threeActStructure).map(([actKey, actData]: [string, any]) => (
                <div key={actKey} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${actData.color} flex items-center justify-center text-white font-bold`}>
                        {actData.nodes.length}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{actData.label}</h4>
                        <p className="text-xs text-slate-500">
                          {actData.percentage}% 的剧情节点
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">平均强度</p>
                      <p className="text-lg font-bold text-orange-400">
                        {Math.round(actData.avgIntensity)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full bg-gradient-to-r ${actData.color} transition-all duration-500`}
                      style={{ width: `${actData.percentage}%` }}
                    />
                  </div>

                  {/* Nodes in Act */}
                  <div className="flex flex-wrap gap-2">
                    {actData.nodes.slice(0, 5).map((node: PlotNode) => (
                      <div
                        key={node.id}
                        className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400"
                      >
                        {node.title}
                      </div>
                    ))}
                    {actData.nodes.length > 5 && (
                      <div className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-500">
                        +{actData.nodes.length - 5} 更多
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Node Network View */}
        {viewMode === 'node-network' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              情节节点之间的依赖关系与网络结构
            </p>

            <div className="grid gap-4">
              {nodeNetwork.nodes.map((node) => (
                <div key={node.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
                        {node.order}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{node.title}</h4>
                        <p className="text-xs text-slate-500">
                          {node.relatedChapters.length} 章节 • {node.involvedCharacters.length} 角色
                        </p>
                      </div>
                    </div>
                    {node.conflictScenario && (
                      <div className={`w-8 h-8 rounded-full ${getIntensityColor(node.conflictScenario.intensity)}`} />
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{node.content}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {node.involvedCharacters.map((char) => (
                      <div key={char.id} className="px-2 py-1 bg-cyan-950 text-cyan-400 rounded text-xs">
                        <Users size={10} className="inline mr-1" />
                        {char.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pacing Curve View */}
        {viewMode === 'pacing-curve' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              剧情节奏曲线，展示紧张度随章节的变化
            </p>

            <div className="space-y-3">
              {pacingCurve.map((point) => (
                <div key={point.chapterId} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-violet-950 text-violet-400 rounded">
                        第{point.chapterOrder}章
                      </span>
                      <h4 className="text-sm font-bold text-white">{point.chapterTitle}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-500">
                        <Activity size={12} className="inline mr-1" />
                        {point.nodeCount} 节点
                      </div>
                      <div className={`w-10 h-10 rounded-lg ${getIntensityColor(point.intensity)} flex items-center justify-center text-white font-bold text-sm`}>
                        {Math.round(point.intensity)}
                      </div>
                    </div>
                  </div>

                  {/* Intensity Bar */}
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getIntensityColor(point.intensity)}`}
                      style={{ width: `${point.intensity}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-4 border-t border-slate-700/50">
              <span>紧张度:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-slate-600 rounded" />
                <span>低</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-400 rounded" />
                <span>中低</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span>中</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span>高</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span>极高</span>
              </div>
            </div>
          </div>
        )}

        {/* Climax Analysis View */}
        {viewMode === 'climax-analysis' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              识别并分析剧情中的高潮点（强度 &gt; 70）
            </p>

            {climaxAnalysis.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm">暂无高潮点数据</p>
                <p className="text-xs mt-2">高潮点需要情节节点的冲突强度 &gt; 70</p>
              </div>
            ) : (
              <div className="space-y-3">
                {climaxAnalysis.map((node, index) => (
                  <div key={node.id} className="bg-slate-900/50 rounded-lg p-4 border border-red-500/30 relative">
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      #{index + 1}
                    </div>

                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-lg ${getIntensityColor(node.intensity)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {Math.round(node.intensity)}
                      </div>

                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-white mb-1">{node.title}</h4>
                        <p className="text-xs text-slate-400 mb-2 line-clamp-2">{node.content}</p>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {node.chapter && (
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{node.chapter.title}</span>
                            </div>
                          )}
                          {node.conflictScenario?.type && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle size={12} />
                              <span>{node.conflictScenario.type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>总计:</span>
            <span>{plotNodes.length} 情节节点</span>
            <span>•</span>
            <span>{chapters.length} 章节</span>
            <span>•</span>
            <span>{climaxAnalysis.length} 高潮点</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye size={12} />
            <span>点击查看详情</span>
          </div>
        </div>
      </div>
    </div>
  );
};
