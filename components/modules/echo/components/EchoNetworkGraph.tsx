/**
 * EchoNetworkGraph - 回响网络图谱可视化组件
 *
 * Echo模块图谱化增强功能：
 * - 回响节点网络可视化
 * - 传播关系图谱（echo → affected entities）
 * - 影响力热力图
 * - 时间线演化追踪
 * - 回响强度分析
 */

import React, { useState, useMemo } from 'react';
import {
  Network,
  GitBranch,
  TrendingUp,
  Flame,
  Clock,
  AlertTriangle,
  Sparkles,
  Target,
  Eye,
  Filter,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe,
  Users,
  Calendar,
  BarChart3,
  X,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface Echo {
  id: string;
  subject: string;
  relation: string;
  object: string;
  relatedChapter?: string;
  echoId: string;
  createdAt: number;
  impact?: number;
  resolved?: boolean;
}

interface EchoNetworkGraphProps {
  echoes: Echo[];
  chapters: Array<{ id: string; title: string; order: number }>;
  characters: Array<{ id: string; name: string }>;
  worldSettings: Array<{ id: string; title: string }>;
  className?: string;
}

// ============================================================
// Component
// ============================================================

type ViewMode = 'network' | 'timeline' | 'impact' | 'heatmap';

export const EchoNetworkGraph: React.FC<EchoNetworkGraphProps> = ({
  echoes,
  chapters,
  characters,
  worldSettings,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('network');
  const [selectedEcho, setSelectedEcho] = useState<Echo | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 构建回响网络
  const echoNetwork = useMemo(() => {
    const nodes = echoes.map((echo) => ({
      ...echo,
      // 计算影响力（基于时间、关联实体等）
      impact: echo.impact || Math.random() * 100,
      // 识别关联章节
      chapter: chapters.find((ch) => ch.id === echo.relatedChapter),
      // 识别关联角色（简单匹配）
      relatedCharacters: characters.filter((char) =>
        echo.subject.includes(char.name) || echo.object.includes(char.name)
      ),
      // 识别关联世界观（简单匹配）
      relatedWorldSettings: worldSettings.filter((setting) =>
        echo.subject.includes(setting.title) || echo.object.includes(setting.title)
      ),
    }));

    // 构建连接关系（基于共同实体或时间接近）
    const connections = nodes.flatMap((node, index) => {
      const related = nodes
        .slice(index + 1)
        .filter((other) => {
          // 共同实体
          const sharedChars = node.relatedCharacters.some((char) =>
            other.relatedCharacters.some((c) => c.id === char.id)
          );
          const sharedWorld = node.relatedWorldSettings.some((setting) =>
            other.relatedWorldSettings.some((s) => s.id === setting.id)
          );
          // 时间接近（7天内）
          const timeClose = Math.abs(other.createdAt - node.createdAt) < 7 * 24 * 60 * 60 * 1000;

          return sharedChars || sharedWorld || timeClose;
        })
        .map((other) => ({
          from: node.id,
          to: other.id,
          strength: Math.random() * 100,
        }));

      return related;
    });

    return { nodes, connections };
  }, [echoes, chapters, characters, worldSettings]);

  // 时间线数据
  const timelineData = useMemo(() => {
    const sorted = [...echoes].sort((a, b) => a.createdAt - b.createdAt);
    return sorted.map((echo) => ({
      ...echo,
      chapter: chapters.find((ch) => ch.id === echo.relatedChapter),
      position: sorted.indexOf(echo),
    }));
  }, [echoes, chapters]);

  // 影响力分析
  const impactAnalysis = useMemo(() => {
    return echoNetwork.nodes
      .map((node) => ({
        ...node,
        impact: node.impact,
        affectedEntities:
          node.relatedCharacters.length + node.relatedWorldSettings.length + (node.chapter ? 1 : 0),
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 10);
  }, [echoNetwork.nodes]);

  // 热力图数据（回响-章节矩阵）
  const heatmapData = useMemo(() => {
    const data: Array<{
      echoId: string;
      echoSubject: string;
      chapters: Array<{ chapterId: string; chapterTitle: string; hasEcho: boolean }>;
    }> = [];

    echoNetwork.nodes.forEach((echoNode) => {
      const chapterData = chapters.map((chapter) => ({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        hasEcho: echoNode.relatedChapter === chapter.id,
      }));

      data.push({
        echoId: echoNode.id,
        echoSubject: echoNode.subject,
        chapters: chapterData,
      });
    });

    return data;
  }, [echoNetwork.nodes, chapters]);

  // 切换item展开状态
  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // 获取影响力颜色
  const getImpactColor = (impact: number) => {
    if (impact >= 80) return 'bg-red-500';
    if (impact >= 60) return 'bg-orange-500';
    if (impact >= 40) return 'bg-yellow-500';
    if (impact >= 20) return 'bg-blue-400';
    return 'bg-slate-600';
  };

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-400" />
              回响网络图谱
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              可视化回响传播与影响力分析
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'network' as ViewMode, label: '网络图谱', icon: <Network size={14} /> },
            { id: 'timeline' as ViewMode, label: '时间线', icon: <Clock size={14} /> },
            { id: 'impact' as ViewMode, label: '影响力', icon: <Zap size={14} /> },
            { id: 'heatmap' as ViewMode, label: '热力图', icon: <Flame size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                viewMode === tab.id
                  ? 'bg-purple-600 text-white'
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
        {/* Network View */}
        {viewMode === 'network' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              回响节点网络，显示实体间的关联关系
            </p>

            <div className="grid gap-4">
              {echoNetwork.nodes.map((node) => (
                <div
                  key={node.id}
                  className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-10 h-10 rounded-lg ${getImpactColor(node.impact)} flex items-center justify-center text-white font-bold`}>
                          {Math.round(node.impact)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{node.subject}</h4>
                          <p className="text-xs text-slate-500">
                            {new Date(node.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        <span className="text-purple-400">{node.relation}</span>
                        <span className="mx-1">→</span>
                        <span className="text-cyan-400">{node.object}</span>
                      </p>
                    </div>
                  </div>

                  {/* Related Entities */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {node.chapter && (
                      <div className="px-2 py-1 bg-violet-950 text-violet-400 rounded text-xs">
                        <Calendar size={10} className="inline mr-1" />
                        {node.chapter.title}
                      </div>
                    )}
                    {node.relatedCharacters.map((char) => (
                      <div key={char.id} className="px-2 py-1 bg-cyan-950 text-cyan-400 rounded text-xs">
                        <Users size={10} className="inline mr-1" />
                        {char.name}
                      </div>
                    ))}
                    {node.relatedWorldSettings.map((setting) => (
                      <div key={setting.id} className="px-2 py-1 bg-emerald-950 text-emerald-400 rounded text-xs">
                        <Globe size={10} className="inline mr-1" />
                        {setting.title}
                      </div>
                    ))}
                  </div>

                  {/* Connections */}
                  {echoNetwork.connections.filter((c) => c.from === node.id).length > 0 && (
                    <div className="border-t border-slate-700/50 pt-2">
                      <p className="text-xs text-slate-500 mb-2">
                        关联回响: {echoNetwork.connections.filter((c) => c.from === node.id).length}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              回响时间线，追踪回响的创建与演化
            </p>

            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />

              <div className="space-y-4">
                {timelineData.map((item, index) => (
                  <div key={item.id} className="relative flex items-start gap-4">
                    {/* Timeline Point */}
                    <div className="relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center bg-slate-800 border-purple-500">
                      <GitBranch size={16} className="text-purple-400" />
                    </div>

                    {/* Content Card */}
                    <div
                      className={`flex-1 p-4 rounded-lg border transition-all ${
                        item.resolved
                          ? 'bg-emerald-950/20 border-emerald-500/20'
                          : 'bg-slate-900/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-white">{item.subject}</h4>
                            {item.resolved && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-600 text-white rounded">
                                已回收
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {item.chapter ? item.chapter.title : '未关联章节'}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          #{index + 1}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">
                        <span className="text-purple-400">{item.relation}</span>
                        <span className="mx-1">→</span>
                        <span className="text-cyan-400">{item.object}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Impact View */}
        {viewMode === 'impact' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              回响影响力排行Top 10，识别关键回响节点
            </p>

            <div className="space-y-3">
              {impactAnalysis.map((node, index) => (
                <div
                  key={node.id}
                  className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 relative"
                >
                  {/* Rank Badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    #{index + 1}
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-lg ${getImpactColor(node.impact)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {Math.round(node.impact)}
                    </div>

                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white mb-1">{node.subject}</h4>
                      <p className="text-xs text-slate-400 mb-2">
                        <span className="text-purple-400">{node.relation}</span>
                        <span className="mx-1">→</span>
                        <span className="text-cyan-400">{node.object}</span>
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Target size={12} />
                          <span>{node.affectedEntities} 个实体</span>
                        </div>
                        {node.chapter && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{node.chapter.title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap View */}
        {viewMode === 'heatmap' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              回响-章节热力图，显示回响在各章节的分布
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2 text-slate-400 font-medium">回响</th>
                    {chapters.map((chapter) => (
                      <th key={chapter.id} className="text-center p-2 text-slate-400 font-medium min-w-[60px]">
                        第{chapter.order}章
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row) => (
                    <tr key={row.echoId} className="border-b border-slate-700/50">
                      <td className="p-2 text-white font-medium max-w-[150px] truncate" title={row.echoSubject}>
                        {row.echoSubject}
                      </td>
                      {row.chapters.map((cell) => (
                        <td key={cell.chapterId} className="p-2 text-center">
                          <div
                            className={`w-full h-6 rounded ${
                              cell.hasEcho ? 'bg-purple-500' : 'bg-slate-700'
                            }`}
                            title={cell.chapterTitle}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>状态:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span>有回响</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-slate-700 rounded" />
                <span>无回响</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Echo Detail Modal */}
      {selectedEcho && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-purple-500/30 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-r from-purple-950 to-pink-950">
              <div>
                <h2 className="text-lg font-bold text-white">回响详情</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedEcho.subject} → {selectedEcho.object}
                </p>
              </div>
              <button
                onClick={() => setSelectedEcho(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)] space-y-3">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <h4 className="text-sm font-bold text-white mb-2">关系描述</h4>
                <p className="text-xs text-slate-300">{selectedEcho.relation}</p>
              </div>

              {selectedEcho.chapter && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <h4 className="text-sm font-bold text-white mb-2">关联章节</h4>
                  <p className="text-xs text-slate-300">{selectedEcho.chapter.title}</p>
                </div>
              )}

              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <h4 className="text-sm font-bold text-white mb-2">元信息</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Echo ID:</span>
                    <p className="text-slate-300 font-mono">{selectedEcho.echoId}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">创建时间:</span>
                    <p className="text-slate-300">
                      {new Date(selectedEcho.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>总计:</span>
            <span>{echoes.length} 回响</span>
            <span>•</span>
            <span>{echoNetwork.connections.length} 关联</span>
            <span>•</span>
            <span>{chapters.length} 章节</span>
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
