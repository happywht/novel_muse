import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  Flame,
  GitBranch,
  Users,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import {
  fetchChapterDependencies,
  fetchChapterCharacterNetwork,
  fetchConflictHeatmap,
} from '../../services/apiService';
import { RELATION_TYPE_LABELS, CharacterRelationType } from '../../types';

// ============================================================
// Types
// ============================================================

interface ChapterDependencies {
  chapter: {
    id: string;
    title: string;
    order: number;
    summary?: string;
  };
  plotNode?: {
    id: string;
    title: string;
    content: string;
    conflictScenario?: {
      type: string;
      intensity: number;
      participants: string[];
    };
  };
  involvedCharacters: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  setLocation?: {
    id: string;
    title: string;
    category: string;
  };
  beats: Array<{
    id: string;
    type: string;
    description: string;
  }>;
  predecessor?: {
    id: string;
    title: string;
    order: number;
  };
  successor?: {
    id: string;
    title: string;
    order: number;
  };
}

interface CharacterNetwork {
  characters: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  relationships: Array<{
    subject: string;
    relation: string;
    object: string;
    weight: number;
    trajectory?: string;
  }>;
}

interface ConflictHeatmapItem {
  chapterId: string;
  chapterTitle: string;
  intensity: number;
  conflictType: string;
  participants: string[];
}

type VisualizationMode = 'dependencies' | 'network' | 'heatmap';

// ============================================================
// Component
// ============================================================

interface ChapterGraphVisualizationProps {
  projectId: string;
  chapterId: string;
  onClose: () => void;
}

export const ChapterGraphVisualization: React.FC<ChapterGraphVisualizationProps> = ({
  projectId,
  chapterId,
  onClose,
}) => {
  const [mode, setMode] = useState<VisualizationMode>('dependencies');
  const [dependencies, setDependencies] = useState<ChapterDependencies | null>(null);
  const [network, setNetwork] = useState<CharacterNetwork | null>(null);
  const [heatmap, setHeatmap] = useState<ConflictHeatmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    characters: true,
    location: true,
    beats: true,
    navigation: true,
  });

  // Fetch data based on mode
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'dependencies') {
        const data = await fetchChapterDependencies(projectId, chapterId);
        setDependencies(data);
      } else if (mode === 'network') {
        const data = await fetchChapterCharacterNetwork(projectId, chapterId);
        setNetwork(data);
      } else if (mode === 'heatmap') {
        const data = await fetchConflictHeatmap(projectId);
        setHeatmap(data);
      }
    } catch (err) {
      console.error(`Failed to fetch ${mode} data:`, err);
      setError(
        `加载${mode === 'dependencies' ? '依赖关系' : mode === 'network' ? '角色网络' : '冲突热力图'}失败`
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, chapterId, mode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Get conflict intensity color
  const getIntensityColor = (intensity: number) => {
    if (intensity >= 8) return 'bg-red-500';
    if (intensity >= 6) return 'bg-orange-500';
    if (intensity >= 4) return 'bg-yellow-500';
    if (intensity >= 2) return 'bg-blue-400';
    return 'bg-slate-500';
  };

  // Get relationship type color
  const getRelationColor = (relation: string) => {
    const colors: Record<string, string> = {
      ENEMY_OF: 'text-red-400',
      ALLY_OF: 'text-blue-400',
      LOVES: 'text-pink-400',
      KIN_OF: 'text-green-400',
      MENTORS: 'text-purple-400',
      RIVAL_OF: 'text-orange-400',
      SERVES: 'text-cyan-400',
      FRIEND_OF: 'text-emerald-400',
      RELATED_TO: 'text-slate-400',
    };
    return colors[relation] || 'text-slate-400';
  };

  // Get trajectory icon
  const getTrajectoryIcon = (trajectory?: string) => {
    if (trajectory === 'rising') return <span className="text-green-400">+</span>;
    if (trajectory === 'falling') return <span className="text-red-400">-</span>;
    return <span className="text-slate-400">=</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-muse-400" />
            章节图谱可视化
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="刷新数据"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <AlertCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 p-3 bg-slate-950/50 border-b border-slate-800">
          {[
            { id: 'dependencies', label: '依赖关系', icon: <GitBranch className="w-4 h-4" /> },
            { id: 'network', label: '角色网络', icon: <Users className="w-4 h-4" /> },
            { id: 'heatmap', label: '冲突热力图', icon: <Flame className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id as VisualizationMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                mode === tab.id
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
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muse-400" />
              <span className="ml-3 text-slate-400">加载数据中...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-400">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>{error}</p>
              <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors"
              >
                重试
              </button>
            </div>
          ) : (
            <>
              {/* Dependencies View */}
              {mode === 'dependencies' && dependencies && (
                <div className="space-y-4">
                  {/* Chapter Info */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <h3 className="text-lg font-bold text-white mb-2">
                      {dependencies.chapter?.title || '未知章节'}
                    </h3>
                    {dependencies.plotNode && (
                      <p className="text-sm text-slate-400">
                        关联情节: {dependencies.plotNode.title}
                      </p>
                    )}
                    {dependencies.chapter?.summary && (
                      <p className="text-sm text-slate-300 mt-2 italic line-clamp-2">
                        "{dependencies.chapter.summary}"
                      </p>
                    )}
                  </div>

                  {/* Navigation */}
                  {dependencies.predecessor || dependencies.successor ? (
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                      <button
                        onClick={() => toggleSection('navigation')}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-2 text-sky-400">
                          <ArrowLeft className="w-4 h-4" />
                          <span className="font-semibold">章节导航</span>
                        </div>
                        {expandedSections.navigation ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      {expandedSections.navigation && (
                        <div className="mt-3 flex justify-between">
                          {dependencies.predecessor ? (
                            <div className="flex-1 bg-slate-900/50 rounded-lg p-3 mr-2">
                              <div className="text-xs text-slate-500 uppercase">前置章节</div>
                              <div className="text-sm text-white font-medium">
                                {dependencies.predecessor.title}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1" />
                          )}
                          {dependencies.successor ? (
                            <div className="flex-1 bg-slate-900/50 rounded-lg p-3 ml-2">
                              <div className="text-xs text-slate-500 uppercase">后继章节</div>
                              <div className="text-sm text-white font-medium">
                                {dependencies.successor.title}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1" />
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Involved Characters */}
                  {dependencies.involvedCharacters.length > 0 && (
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                      <button
                        onClick={() => toggleSection('characters')}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-2 text-violet-400">
                          <Users className="w-4 h-4" />
                          <span className="font-semibold">
                            涉及角色 ({dependencies.involvedCharacters.length})
                          </span>
                        </div>
                        {expandedSections.characters ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      {expandedSections.characters && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {dependencies.involvedCharacters.map((char) => (
                            <div
                              key={char.id}
                              className="bg-slate-900/50 rounded-lg p-3 flex items-center gap-2"
                            >
                              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">
                                {char.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm text-white font-medium">{char.name}</div>
                                <div className="text-xs text-slate-500">{char.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {dependencies.setLocation && (
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                      <button
                        onClick={() => toggleSection('location')}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-2 text-emerald-400">
                          <MapPin className="w-4 h-4" />
                          <span className="font-semibold">场景地点</span>
                        </div>
                        {expandedSections.location ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      {expandedSections.location && (
                        <div className="mt-3 bg-slate-900/50 rounded-lg p-3">
                          <div className="text-sm text-white font-medium">
                            {dependencies.setLocation.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {dependencies.setLocation.category}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Beats */}
                  {dependencies.beats.length > 0 && (
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                      <button
                        onClick={() => toggleSection('beats')}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-2 text-amber-400">
                          <GitBranch className="w-4 h-4" />
                          <span className="font-semibold">
                            场景节拍 ({dependencies.beats.length})
                          </span>
                        </div>
                        {expandedSections.beats ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      {expandedSections.beats && (
                        <div className="mt-3 space-y-2">
                          {dependencies.beats.map((beat, idx) => (
                            <div key={beat.id} className="flex gap-3 items-start">
                              <div
                                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                  beat.type === 'TWIST'
                                    ? 'bg-rose-500'
                                    : beat.type === 'ACTION'
                                      ? 'bg-amber-500'
                                      : beat.type === 'DIALOGUE'
                                        ? 'bg-sky-500'
                                        : 'bg-slate-500'
                                }`}
                              />
                              <div className="flex-1">
                                <span className="text-xs text-slate-500 mr-2">[{beat.type}]</span>
                                <span className="text-sm text-slate-300">{beat.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conflict Info */}
                  {dependencies.plotNode?.conflictScenario && (
                    <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-xl p-4 border border-red-800/30">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <Flame className="w-4 h-4" />
                        <span className="font-semibold">冲突场景</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-red-400">
                            {dependencies.plotNode.conflictScenario.intensity}
                          </div>
                          <div className="text-xs text-slate-500">冲突强度</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-orange-400">
                            {dependencies.plotNode.conflictScenario.type}
                          </div>
                          <div className="text-xs text-slate-500">冲突类型</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-amber-400">
                            {dependencies.plotNode.conflictScenario.participants?.length || 0}
                          </div>
                          <div className="text-xs text-slate-500">参与角色</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Network View */}
              {mode === 'network' && network && (
                <div className="space-y-4">
                  {/* Characters */}
                  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center gap-2 text-violet-400 mb-3">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold">角色列表 ({network.characters.length})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {network.characters.map((char) => (
                        <div key={char.id} className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-lg font-bold mx-auto mb-2">
                            {char.name.charAt(0)}
                          </div>
                          <div className="text-sm text-white font-medium">{char.name}</div>
                          <div className="text-xs text-slate-500">{char.role}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relationships */}
                  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center gap-2 text-pink-400 mb-3">
                      <Network className="w-4 h-4" />
                      <span className="font-semibold">
                        角色关系 ({network.relationships.length})
                      </span>
                    </div>
                    {network.relationships.length > 0 ? (
                      <div className="space-y-2">
                        {network.relationships.map((rel, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{rel.subject}</span>
                              <ArrowRight className="w-4 h-4 text-slate-600" />
                              <span className={`${getRelationColor(rel.relation)} font-medium`}>
                                {RELATION_TYPE_LABELS[rel.relation] || rel.relation}
                              </span>
                              <ArrowRight className="w-4 h-4 text-slate-600" />
                              <span className="text-white font-medium">{rel.object}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getTrajectoryIcon(rel.trajectory)}
                              <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-pink-500 rounded-full"
                                  style={{ width: `${rel.weight}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-8">{rel.weight}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-4">暂无角色关系数据</p>
                    )}
                  </div>
                </div>
              )}

              {/* Heatmap View */}
              {mode === 'heatmap' && (
                <div className="space-y-4">
                  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center gap-2 text-orange-400 mb-4">
                      <Flame className="w-4 h-4" />
                      <span className="font-semibold">全项目冲突热力图</span>
                    </div>

                    {/* Heatmap Grid */}
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {heatmap.map((item) => (
                        <div
                          key={item.chapterId}
                          className={`relative rounded-lg p-2 text-center cursor-pointer transition-all hover:scale-105 ${
                            item.chapterId === chapterId ? 'ring-2 ring-muse-500' : ''
                          }`}
                          style={{
                            backgroundColor: `rgba(${item.intensity >= 6 ? '239, 68, 68' : item.intensity >= 4 ? '249, 115, 22' : item.intensity >= 2 ? '234, 179, 8' : '100, 116, 139'}, ${Math.max(0.2, item.intensity / 10)})`,
                          }}
                        >
                          <div className="text-xs text-white font-bold truncate">
                            {item.chapterTitle}
                          </div>
                          <div className="text-[10px] text-white/70">
                            {item.conflictType || 'NONE'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-slate-500" />
                        <span>无冲突</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-500" />
                        <span>轻微</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-orange-500" />
                        <span>中等</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span>激烈</span>
                      </div>
                    </div>
                  </div>

                  {/* Detail List */}
                  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                    <div className="font-semibold text-white mb-3">冲突详情</div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {heatmap.map((item) => (
                        <div
                          key={item.chapterId}
                          className={`bg-slate-900/50 rounded-lg p-3 flex items-center justify-between ${
                            item.chapterId === chapterId ? 'border border-muse-500' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <div className="text-sm text-white font-medium">
                              {item.chapterTitle}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.conflictType || '无冲突'} | 参与者:{' '}
                              {item.participants?.join(', ') || '无'}
                            </div>
                          </div>
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getIntensityColor(item.intensity)}`}
                          >
                            {item.intensity}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterGraphVisualization;
