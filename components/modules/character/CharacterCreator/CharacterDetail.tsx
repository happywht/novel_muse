import React from 'react';
import {
  User,
  Camera,
  MessageCircle,
  X,
  Save,
  Edit2,
  Trash2,
  GitCommit,
  Check,
  HeartHandshake,
  Plus,
  Lightbulb,
  TrendingUp,
  Clock as ClockIcon,
  Users,
  Brain,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { CharacterArcSelector } from '../CharacterArcSelector';
import { Loader } from '@/components/ui/Loader';
import { useCharacterCreator } from './CharacterCreatorContext';
import { isStructuredFormat, getRelationType, getTargetName } from '@/utils/characterRelations';
import { RELATION_TYPE_LABELS } from '@/types';
import { CharacterDepthPanel } from '../CharacterDepthPanel';
import { CharacterWorldRelationSelector } from '../CharacterWorldRelationSelector';
import { CharacterTagCloud } from '../CharacterTagCloud';
import { CharacterRelationshipGraph } from '../CharacterRelationshipGraph';
import { RelationshipTimeline } from '../RelationshipTimeline';
import { CharacterRelationshipBatchEditor } from '../CharacterRelationshipBatchEditor';
import { CharacterArcVisualization } from '../CharacterArcVisualization';
import { CharacterArcVisualization } from '../CharacterArcVisualization';

/**
 * Echo 提案区域
 */
function EchoProposals() {
  const { activeCharEchoes, handleAcceptEcho, handleRejectEcho } = useCharacterCreator();

  if (activeCharEchoes.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {activeCharEchoes.map((echo) => (
        <div
          key={echo.id}
          className="bg-slate-900/80 border border-cyan-900/50 rounded-xl p-4 shadow-[0_0_20px_rgba(34,211,238,0.05)] relative overflow-hidden animate-fade-in"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400/50 to-cyan-500/0"></div>
          <div className="flex items-start gap-3">
            <div className="mt-1 p-1.5 bg-cyan-950 rounded-lg text-cyan-400">
              <GitCommit size={16} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-1 flex items-center gap-2">
                命运回响 (系统洞察)
              </h4>
              <p className="text-sm text-slate-300 mb-2 leading-relaxed">
                AI 观测到在最新剧情中，该角色的命运发生了偏转：
                <br />
                <span className="text-white font-medium">新增特质/经历：[{echo.description}]</span>
              </p>
              <p className="text-xs text-slate-500 italic mb-4 border-l-2 border-slate-700 pl-2">
                "{echo.reason}"
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptEcho(echo)}
                  className="text-xs bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                >
                  <Check size={12} /> 接受并更新
                </button>
                <button
                  onClick={() => handleRejectEcho(echo)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
                >
                  忽略
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 角色画像区域
 */
function CharacterPortrait() {
  const { activeChar, isGeneratingImage, imageStyle, setImageStyle, handleGenerateImage, openChat } =
    useCharacterCreator();

  if (!activeChar) return null;

  return (
    <div className="flex-shrink-0">
      <div className="w-48 h-64 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden relative group shadow-2xl">
        {activeChar.imageUrl ? (
          <img src={activeChar.imageUrl} alt={activeChar.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-slate-600 space-y-2">
            <User size={48} />
            <p className="text-[10px] font-bold uppercase tracking-widest">暂无画像</p>
          </div>
        )}
        <button
          onClick={handleGenerateImage}
          disabled={isGeneratingImage}
          className="absolute inset-x-0 bottom-0 py-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
        >
          {isGeneratingImage ? (
            <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
          ) : (
            <Camera size={14} />
          )}
          {activeChar.imageUrl ? '重新生成' : '生成画像'}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={openChat}
          className="w-full py-2.5 bg-muse-600 hover:bg-muse-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-muse-900/40 transition-all active:scale-95"
        >
          <MessageCircle size={16} /> 沉浸式对话
        </button>
        <div className="flex gap-1">
          <select
            value={imageStyle}
            onChange={(e) => setImageStyle(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-slate-400 px-2 py-1 outline-none"
          >
            <option value="Anime">Anime</option>
            <option value="Realistic">Realistic</option>
            <option value="Cyberpunk">Cyberpunk</option>
            <option value="Oil Painting">Oil Painting</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/**
 * 图谱洞察区域
 */
function GraphInsights() {
  const { activeCharId, graphQuery, useBackend } = useCharacterCreator();

  if (!useBackend || !activeCharId) return null;

  return (
    <div className="space-y-3">
      {/* 图谱特质数据 */}
      {graphQuery.loadingTraits.has(activeCharId) ? (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-center">
          <div className="animate-spin w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full mr-2"></div>
          <span className="text-xs text-slate-400">加载角色特质...</span>
        </div>
      ) : (
        graphQuery.characterTraits.has(activeCharId) && <TraitsSection />
      )}

      {/* 演变历史 */}
      {graphQuery.loadingEvolution.has(activeCharId) ? (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-center">
          <div className="animate-spin w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full mr-2"></div>
          <span className="text-xs text-slate-400">加载演变历史...</span>
        </div>
      ) : (
        graphQuery.characterEvolution.has(activeCharId) &&
        graphQuery.characterEvolution.get(activeCharId)!.length > 0 && <EvolutionSection />
      )}

      {/* 伏笔 */}
      {graphQuery.loadingForeshadowing.has(activeCharId) ? (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-center">
          <div className="animate-spin w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full mr-2"></div>
          <span className="text-xs text-slate-400">加载伏笔...</span>
        </div>
      ) : (
        graphQuery.characterForeshadowing.has(activeCharId) &&
        graphQuery.characterForeshadowing.get(activeCharId)!.length > 0 && <ForeshadowingSection />
      )}
    </div>
  );
}

/**
 * 特质展示区域
 */
function TraitsSection() {
  const { activeCharId, graphQuery } = useCharacterCreator();
  const traits = activeCharId ? graphQuery.characterTraits.get(activeCharId) : null;

  if (!traits) return null;

  return (
    <details className="group" open>
      <summary className="cursor-pointer bg-gradient-to-r from-indigo-950/30 to-purple-950/30 border border-indigo-500/20 rounded-xl p-4 hover:border-indigo-500/40 transition-colors">
        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
          <Lightbulb size={14} />
          图谱洞察 (Graph Insights)
          <span className="ml-auto text-[10px] text-slate-500 group-open:hidden">展开查看</span>
        </h4>
      </summary>
      <div className="mt-2 space-y-2 bg-slate-800/20 border border-indigo-500/10 rounded-xl p-4">
        {traits.desire && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3">
            <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">核心欲望</h5>
            <p className="text-xs text-slate-300">{traits.desire}</p>
          </div>
        )}
        {traits.fear && (
          <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-3">
            <h5 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">核心恐惧</h5>
            <p className="text-xs text-slate-300">{traits.fear}</p>
          </div>
        )}
        {traits.weakness && (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3">
            <h5 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">致命弱点</h5>
            <p className="text-xs text-slate-300">{traits.weakness}</p>
          </div>
        )}
        {traits.signature && (
          <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-3">
            <h5 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">标志特征</h5>
            <p className="text-xs text-slate-300">{traits.signature}</p>
          </div>
        )}
        {traits.contrast && (
          <div className="bg-purple-950/20 border border-purple-500/20 rounded-lg p-3">
            <h5 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">反差萌点</h5>
            <p className="text-xs text-slate-300">{traits.contrast}</p>
          </div>
        )}
      </div>
    </details>
  );
}

/**
 * 演变历史区域
 */
function EvolutionSection() {
  const { activeCharId, graphQuery } = useCharacterCreator();
  const evolutions = activeCharId ? graphQuery.characterEvolution.get(activeCharId) : null;

  if (!evolutions || evolutions.length === 0) return null;

  return (
    <details className="group">
      <summary className="cursor-pointer bg-gradient-to-r from-rose-950/30 to-orange-950/30 border border-rose-500/20 rounded-xl p-4 hover:border-rose-500/40 transition-colors">
        <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
          <TrendingUp size={14} />
          演变历史 ({evolutions.length})
          <span className="ml-auto text-[10px] text-slate-500 group-open:hidden">展开查看</span>
        </h4>
      </summary>
      <div className="mt-2 space-y-2 bg-slate-800/20 border border-rose-500/10 rounded-xl p-4">
        {evolutions.map((evolution, idx) => (
          <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <div className="p-1 bg-rose-950 rounded text-rose-400 mt-0.5">
                <Clock size={12} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 mb-1">
                  {new Date(evolution.timestamp).toLocaleString('zh-CN')}
                </div>
                <div className="text-xs text-white font-medium mb-1">{evolution.description}</div>
                <div className="text-[10px] text-slate-400 italic border-l-2 border-slate-700 pl-2">
                  {evolution.reason}
                </div>
                {evolution.triples && evolution.triples.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {evolution.triples.map((triple: any, tIdx: number) => (
                      <div
                        key={tIdx}
                        className="text-[10px] text-cyan-400 bg-cyan-950/20 px-2 py-1 rounded inline-block mr-1"
                      >
                        {triple.subject} -&gt; {triple.relation} -&gt; {triple.object}
                        {triple.trajectory && (
                          <span
                            className={`ml-1 ${
                              triple.trajectory === 'rising' ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {triple.trajectory === 'rising' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * 伏笔区域
 */
function ForeshadowingSection() {
  const { activeCharId, graphQuery } = useCharacterCreator();
  const foreshadowings = activeCharId ? graphQuery.characterForeshadowing.get(activeCharId) : null;

  if (!foreshadowings || foreshadowings.length === 0) return null;

  return (
    <details className="group">
      <summary className="cursor-pointer bg-gradient-to-r from-amber-950/30 to-yellow-950/30 border border-amber-500/20 rounded-xl p-4 hover:border-amber-500/40 transition-colors">
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
          <Lightbulb size={14} />
          未回收伏笔 ({foreshadowings.length})
          <span className="ml-auto text-[10px] text-slate-500 group-open:hidden">展开查看</span>
        </h4>
      </summary>
      <div className="mt-2 space-y-2 bg-slate-800/20 border border-amber-500/10 rounded-xl p-4">
        {foreshadowings.map((foreshadow, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-3 ${
              foreshadow.status === 'OPEN'
                ? 'bg-amber-950/20 border-amber-500/30'
                : foreshadow.status === 'RESOLVED'
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-slate-700/20 border-slate-600/30'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-[10px] text-white font-medium">
                {foreshadow.subject} -&gt; {foreshadow.relation} -&gt; {foreshadow.object}
              </div>
              <span
                className={`text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${
                  foreshadow.status === 'OPEN'
                    ? 'bg-amber-500/20 text-amber-400'
                    : foreshadow.status === 'RESOLVED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {foreshadow.status === 'OPEN' ? '待回收' : foreshadow.status === 'RESOLVED' ? '已回收' : '已废弃'}
              </span>
            </div>
            {foreshadow.weight !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[10px] text-slate-500">强度:</span>
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${foreshadow.weight}%` }} />
                </div>
                <span className="text-[10px] text-amber-400">{foreshadow.weight}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * 关系展示区域
 */
function RelationshipsSection() {
  const { activeChar, isEditing, updateRelationship } = useCharacterCreator();

  if (!activeChar) return null;

  // 根据关系类型选择颜色
  const getColorMap = (relationType: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      ENEMY_OF: { bg: 'bg-red-950/30', border: 'border-red-500/30', text: 'text-red-400' },
      ALLY_OF: { bg: 'bg-blue-950/30', border: 'border-blue-500/30', text: 'text-blue-400' },
      LOVES: { bg: 'bg-pink-950/30', border: 'border-pink-500/30', text: 'text-pink-400' },
      KIN_OF: { bg: 'bg-amber-950/30', border: 'border-amber-500/30', text: 'text-amber-400' },
      MENTORS: { bg: 'bg-purple-950/30', border: 'border-purple-500/30', text: 'text-purple-400' },
      RIVAL_OF: { bg: 'bg-orange-950/30', border: 'border-orange-500/30', text: 'text-orange-400' },
      SERVES: { bg: 'bg-slate-700/30', border: 'border-slate-500/30', text: 'text-slate-400' },
      FRIEND_OF: { bg: 'bg-emerald-950/30', border: 'border-emerald-500/30', text: 'text-emerald-400' },
      RELATED_TO: { bg: 'bg-slate-700/30', border: 'border-slate-500/30', text: 'text-slate-400' },
    };
    return colorMap[relationType] || colorMap['RELATED_TO'];
  };

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 shadow-inner">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <HeartHandshake size={14} className="text-rose-500" /> 人际羁绊 (Relationships)
      </h3>

      {/* 新格式：结构化关系展示 */}
      {isStructuredFormat(activeChar.structuredRelations) && activeChar.structuredRelations ? (
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>关系网络 ({activeChar.structuredRelations.length} 条)</span>
          </div>
          <div className="grid gap-2">
            {activeChar.structuredRelations.map((rel, idx) => {
              const relationType = getRelationType(rel);
              const typeLabel = RELATION_TYPE_LABELS[relationType] || rel.description || '关联';
              const targetName = getTargetName(rel) || rel.targetCharacterId || '未知对象';
              const colors = getColorMap(relationType);

              return (
                <div
                  key={rel.id || idx}
                  className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg} border ${colors.border} transition-all hover:scale-[1.01]`}
                >
                  <div className="flex-1 flex items-center gap-2">
                    <span className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}>{typeLabel}</span>
                    <span className="text-slate-400">-&gt;</span>
                    <span className="text-sm text-white font-medium">{targetName}</span>
                  </div>
                  {/* 关系强度指示器 */}
                  {rel.weight !== undefined && (
                    <div className="flex items-center gap-1" title={`关系强度: ${rel.weight}`}>
                      <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rel.weight > 70 ? 'bg-rose-500' : rel.weight > 40 ? 'bg-amber-500' : 'bg-slate-500'
                          }`}
                          style={{ width: `${rel.weight}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {/* 关系走向标签 */}
                  {rel.trajectory && rel.trajectory !== 'stable' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        rel.trajectory === 'rising' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {rel.trajectory === 'rising' ? '升温中' : '降温中'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 旧格式：字符串关系编辑（兼容旧数据） */}
      <div className="space-y-2">
        {!isStructuredFormat(activeChar.structuredRelations) && !isEditing && (
          <>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">自由文本描述</label>
            <textarea
              value={activeChar.relationships || ''}
              onChange={(e) => updateRelationship(e.target.value)}
              placeholder="描述该角色与其他人的复杂关系、秘密契约或深仇大恨..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 focus:border-rose-500 outline-none resize-none h-24 transition-colors"
            />
          </>
        )}
        {/* 如果有结构化关系，也显示只读的文本描述作为补充 */}
        {isStructuredFormat(activeChar.structuredRelations) && activeChar.relationships && (
          <details className="group">
            <summary className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-400 uppercase tracking-wider">
              查看原始文本描述
            </summary>
            <div className="mt-2 p-3 bg-slate-900/30 rounded-lg text-xs text-slate-500 italic">
              {activeChar.relationships}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * P1 增强：关系图谱展示区域
 */
function RelationshipGraphSection() {
  const { activeChar, project, setActiveCharId } = useCharacterCreator();
  const [networkData, setNetworkData] = React.useState<{
    nodes: any[];
    edges: any[];
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 获取关系网络数据
  React.useEffect(() => {
    if (!activeChar || !project.id) return;

    const fetchNetworkData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 使用 graphApi 获取角色关系网络
        const { graphApi } = await import('@/services/api');
        const data = await graphApi.getCharacterNetwork(project.id, {
          includeCharacterIds: [activeChar.id, ...getRelatedCharacterIds(activeChar)]
        });

        setNetworkData(data);
      } catch (err: any) {
        console.error('Failed to fetch character network:', err);
        setError(err.message || '加载关系网络失败');
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkData();
  }, [activeChar, project.id]);

  // 获取相关角色ID
  const getRelatedCharacterIds = (char: any): string[] => {
    const relatedIds: string[] = [];

    if (char.structuredRelations) {
      char.structuredRelations.forEach((rel: any) => {
        if (rel.targetCharacterId && !relatedIds.includes(rel.targetCharacterId)) {
          relatedIds.push(rel.targetCharacterId);
        }
      });
    }

    return relatedIds;
  };

  // 处理节点点击
  const handleNodeClick = (node: any) => {
    if (node.id !== activeChar?.id) {
      setActiveCharId(node.id);
    }
  };

  if (!activeChar) return null;

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 shadow-inner">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <HeartHandshake size={14} className="text-rose-500" /> 关系网络图谱 (Relationship Network)
      </h3>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader text="正在加载关系网络..." />
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && networkData && (
        <CharacterRelationshipGraph
          projectId={project.id}
          nodes={networkData.nodes}
          edges={networkData.edges}
          onNodeClick={handleNodeClick}
          width={700}
          height={500}
        />
      )}

      {!loading && !error && !networkData && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">暂无关系网络数据</p>
          <p className="text-xs mt-2">为角色添加关系后将在此处显示关系图谱</p>
        </div>
      )}
    </div>
  );
}

/**
 * P2 增强：关系时间线展示区域
 */
function RelationshipTimelineSection() {
  const { activeChar, project, setActiveCharId } = useCharacterCreator();
  const [timelineData, setTimelineData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 获取关系时间线数据
  React.useEffect(() => {
    if (!activeChar || !project.id) return;

    const fetchTimelineData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 直接调用后端API
        const response = await fetch(`/api/graph/${project.id}/characters/${activeChar.id}/relationship-timeline`);
        if (!response.ok) {
          throw new Error('Failed to fetch relationship timeline');
        }

        const data = await response.json();
        setTimelineData(data);
      } catch (err: any) {
        console.error('Failed to fetch relationship timeline:', err);
        setError(err.message || '加载关系时间线失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [activeChar, project.id]);

  // 处理角色点击
  const handleCharacterClick = (characterId: string) => {
    setActiveCharId(characterId);
  };

  if (!activeChar) return null;

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 shadow-inner">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <ClockIcon size={14} className="text-cyan-400" /> 关系演化历史 (Relationship Timeline)
      </h3>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader text="正在加载关系时间线..." />
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && timelineData.length > 0 && (
        <RelationshipTimeline
          timeline={timelineData}
          onCharacterClick={handleCharacterClick}
          showFullDetails={false}
        />
      )}

      {!loading && !error && timelineData.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <ClockIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm">暂无关系演化历史</p>
          <p className="text-xs mt-2">当角色关系发生变化时将在此处显示时间线</p>
        </div>
      )}
    </div>
  );
}

/**
 * B2 增强：角色成长弧线可视化
 */
function CharacterArcVisualizationSection() {
  const { activeChar, project, updateProject } = useCharacterCreator();

  if (!activeChar) return null;

  const handlePhaseUpdate = (phase: any, progress: number) => {
    if (!activeChar.arc) return;

    updateProject({
      characters: project.characters.map((c) =>
        c.id === activeChar.id
          ? {
              ...c,
              arc: {
                ...c.arc!,
                currentPhase: phase,
                phaseProgress: progress,
                lastUpdated: Date.now(),
              },
            }
          : c
      ),
    });
  };

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 shadow-inner">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Brain size={14} className="text-purple-400" />
        成长弧线可视化 (Character Arc Visualization)
      </h3>

      <CharacterArcVisualization
        character={activeChar}
        relationships={activeChar.structuredRelations || []}
        onPhaseUpdate={handlePhaseUpdate}
      />
    </div>
  );
}

/**
 * P3 增强：批量关系管理对话框
 */
function BatchRelationshipDialog() {
  const { project, updateProject } = useCharacterCreator();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!project.characters || project.characters.length === 0) {
    return null;
  }

  const handleBatchUpdate = (updates: Array<{
    characterId: string;
    relationships: any[];
  }>) => {
    // 更新所有角色的关系数据
    const updatedCharacters = project.characters.map((char: any) => {
      const update = updates.find((u) => u.characterId === char.id);
      if (update) {
        return {
          ...char,
          structuredRelations: update.relationships,
        };
      }
      return char;
    });

    updateProject({
      characters: updatedCharacters,
    });
  };

  const handleExport = (format: 'json' | 'csv') => {
    console.log(`Exporting relationships as ${format}`);
  };

  const handleImport = (data: any[]) => {
    console.log('Importing relationship data:', data);
  };

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 px-6 py-3 bg-muse-600 hover:bg-muse-500 text-white rounded-xl shadow-2xl shadow-muse-900/50 text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 z-40"
      >
        <Users size={18} />
        批量管理关系
      </button>

      {/* 对话框 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* 头部 */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Users className="text-muse-400" />
                  批量关系管理器
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  对多个角色的关系进行批量操作、导出和导入
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <CharacterRelationshipBatchEditor
                characters={project.characters}
                onBatchUpdate={handleBatchUpdate}
                onExport={handleExport}
                onImport={handleImport}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 角色详情组件
 * 展示选中角色的详细信息、编辑功能和图谱数据
 */
export function CharacterDetail() {
  const {
    activeChar,
    activeCharId,
    isEditing,
    editDescription,
    setEditDescription,
    isGeneratingInfo,
    setIsEditing,
    handleSaveEdit,
    deleteChar,
    updateProject,
    project,
  } = useCharacterCreator();

  // 空状态
  if (!activeChar) {
    return (
      <div className="w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-8 overflow-y-auto custom-scrollbar flex flex-col relative">
        <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4">
          <User size={64} className="opacity-20" />
          <p>在左侧填入基本信息并召唤，或选择已有角色。</p>
        </div>

        {isGeneratingInfo && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <Loader text="正在向星辰借火 (雕琢灵魂)..." />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-8 overflow-y-auto custom-scrollbar flex flex-col relative">
      <div className="animate-fade-in space-y-6">
        {/* Echo 提案 */}
        {!isEditing && <EchoProposals />}

        <div className="flex gap-8 items-start">
          {/* 画像区域 */}
          <CharacterPortrait />

          {/* 信息区域 */}
          <div className="flex-1 space-y-6">
            {/* 头部信息和操作按钮 */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 bg-muse-950 text-muse-400 border border-muse-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
                    {activeChar.role}
                  </span>
                  {activeChar.archetype && (
                    <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px]">
                      {activeChar.archetype}
                    </span>
                  )}
                  {activeChar.alignment && (
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded text-[10px]">
                      {activeChar.alignment}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl font-serif font-bold text-white tracking-tight">{activeChar.name}</h1>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                    >
                      <Save size={16} /> 保存
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                      title="编辑角色"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteChar(activeChar.id)}
                      className="p-2 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-700"
                      title="移除角色"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 角色标签 */}
            {activeChar.tags && activeChar.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeChar.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs border border-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 核心驱动 - 欲望与恐惧 */}
            {(activeChar.desire || activeChar.fear) && (
              <div className="grid grid-cols-2 gap-4">
                {activeChar.desire && (
                  <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      核心欲望
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{activeChar.desire}</p>
                  </div>
                )}
                {activeChar.fear && (
                  <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      核心恐惧
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{activeChar.fear}</p>
                  </div>
                )}
              </div>
            )}

            {/* 特征与弱点 */}
            {(activeChar.signature || activeChar.contrast || activeChar.weakness) && (
              <div className="space-y-3">
                {activeChar.signature && (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">标志特征</h4>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                      {activeChar.signature}
                    </p>
                  </div>
                )}
                {activeChar.contrast && (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">反差萌点</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{activeChar.contrast}</p>
                  </div>
                )}
                {activeChar.weakness && (
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">致命弱点</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{activeChar.weakness}</p>
                  </div>
                )}
              </div>
            )}

            {/* 角色成长弧线 */}
            <div className="mt-4">
              <CharacterArcSelector
                currentArc={activeChar.arc}
                onArcChange={(arc) => {
                  updateProject({
                    characters: project.characters.map((c) => (c.id === activeChar.id ? { ...c, arc } : c)),
                  });
                }}
              />
            </div>

            {/* P0 增强: 角色深度属性面板 */}
            {isEditing ? (
              <div className="mt-4">
                <CharacterDepthPanel
                  character={activeChar}
                  onUpdate={(updates) => {
                    updateProject({
                      characters: project.characters.map((c) =>
                        c.id === activeChar.id ? { ...c, ...updates } : c
                      ),
                    });
                  }}
                  readonly={false}
                />
              </div>
            ) : (
              <div className="mt-4">
                <CharacterDepthPanel
                  character={activeChar}
                  onUpdate={() => {}}
                  readonly={true}
                />
              </div>
            )}

            {/* P0 增强: 角色地理关联 */}
            {isEditing ? (
              <div className="mt-4">
                <CharacterWorldRelationSelector
                  character={activeChar}
                  worldSettings={project.worldSettings || []}
                  onUpdate={(updates) => {
                    updateProject({
                      characters: project.characters.map((c) =>
                        c.id === activeChar.id ? { ...c, ...updates } : c
                      ),
                    });
                  }}
                  readonly={false}
                />
              </div>
            ) : (
              <div className="mt-4">
                <CharacterWorldRelationSelector
                  character={activeChar}
                  worldSettings={project.worldSettings || []}
                  onUpdate={() => {}}
                  readonly={true}
                />
              </div>
            )}

            {/* 图谱洞察 */}
            <GraphInsights />

            {/* 灵魂档案 */}
            <div className="space-y-4">
              <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 shadow-inner">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Plus size={12} className="text-muse-500" /> 灵魂档案
                </h3>
                {isEditing ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full h-64 bg-slate-900 border border-slate-600 rounded-xl p-4 text-slate-200 text-sm focus:border-muse-500 outline-none resize-none leading-relaxed"
                  />
                ) : (
                  <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed font-serif text-lg">
                    <MarkdownRenderer content={activeChar.description} />
                  </div>
                )}
              </div>

              {/* 人际关系 */}
              <RelationshipsSection />

              {/* P1 增强：关系网络图谱 */}
              <RelationshipGraphSection />

              {/* P2 增强：关系演化时间线 */}
              <RelationshipTimelineSection />

              {/* B2 增强：角色成长弧线可视化 */}
              <CharacterArcVisualizationSection />
            </div>
          </div>
        </div>
      </div>

      {/* 加载遮罩 */}
      {isGeneratingInfo && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <Loader text="正在向星辰借火 (雕琢灵魂)..." />
        </div>
      )}

      {/* P3 增强：批量关系管理器 */}
      <BatchRelationshipDialog />
    </div>
  );
}

export default CharacterDetail;
