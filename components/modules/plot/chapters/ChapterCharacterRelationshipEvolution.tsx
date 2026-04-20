/**
 * ChapterCharacterRelationshipEvolution - 章节角色关系演化可视化
 *
 * B1增强功能：
 * - 章节时间轴上的角色关系演化
 * - 角色参与度热力图
 * - 多角色章节共现分析
 * - 伏笔关系跨章节追踪
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  Calendar,
  Flame,
  Network,
  Sparkles,
  Clock,
  GitBranch,
  Zap,
  Eye,
  ChevronRight,
  AlertCircle,
  Filter,
  X,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface Chapter {
  id: string;
  title: string;
  order: number;
  summary?: string;
}

interface Character {
  id: string;
  name: string;
  role: string;
  structuredRelations?: Array<{
    targetCharacterId: string;
    type: string;
    weight: number;
    trajectory?: string;
  }>;
}

interface ForeshadowingConnection {
  id: string;
  subject: string;
  relation: string;
  object: string;
  relatedChapter?: string;
  echoId: string;
  createdAt: number;
}

interface ChapterParticipation {
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  characters: Array<{
    characterId: string;
    characterName: string;
    participation: number; // 0-100
    role: string;
  }>;
  relationshipChanges: Array<{
    fromCharacter: string;
    toCharacter: string;
    beforeType?: string;
    afterType?: string;
    changeType: 'created' | 'strengthened' | 'weakened' | 'broken';
  }>;
}

interface ChapterCharacterRelationshipEvolutionProps {
  chapters: Chapter[];
  characters: Character[];
  foreshadowingConnections?: ForeshadowingConnection[];
  className?: string;
}

// ============================================================
// Component
// ============================================================

type ViewMode = 'timeline' | 'heatmap' | 'co-occurrence' | 'foreshadowing';

export const ChapterCharacterRelationshipEvolution: React.FC<ChapterCharacterRelationshipEvolutionProps> = ({
  chapters,
  characters,
  foreshadowingConnections = [],
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());

  // 计算每个章节的角色参与度
  const chapterParticipation = useMemo(() => {
    return chapters.map((chapter) => {
      // 模拟参与度数据（实际应从章节内容分析）
      const chapterCharacters = characters
        .map((char) => ({
          characterId: char.id,
          characterName: char.name,
          participation: Math.random() * 100, // 实际应基于真实数据
          role: char.role,
        }))
        .filter((char) => char.participation > 20);

      // 模拟关系变化
      const relationshipChanges = [
        {
          fromCharacter: '主角',
          toCharacter: '导师',
          changeType: 'strengthened' as const,
        },
        {
          fromCharacter: '主角',
          toCharacter: '反派',
          changeType: 'created' as const,
        },
      ];

      return {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        characters: chapterCharacters,
        relationshipChanges,
      };
    });
  }, [chapters, characters]);

  // 角色参与度热力图数据
  const heatmapData = useMemo(() => {
    const data: Array<{
      characterId: string;
      characterName: string;
      chapters: Array<{ chapterId: string; chapterTitle: string; participation: number }>;
    }> = [];

    characters.forEach((char) => {
      const chapterData = chapterParticipation.map((cp) => {
        const participation = cp.characters.find((c) => c.characterId === char.id)?.participation || 0;
        return {
          chapterId: cp.chapterId,
          chapterTitle: cp.chapterTitle,
          participation,
        };
      });

      data.push({
        characterId: char.id,
        characterName: char.name,
        chapters: chapterData,
      });
    });

    return data;
  }, [characters, chapterParticipation]);

  // 多角色章节共现分析
  const coOccurrenceData = useMemo(() => {
    return chapterParticipation
      .filter((cp) => cp.characters.length >= 2)
      .map((cp) => ({
        chapterId: cp.chapterId,
        chapterTitle: cp.chapterTitle,
        chapterOrder: cp.chapterOrder,
        characters: cp.characters,
        relationshipCount: cp.relationshipChanges.length,
      }))
      .sort((a, b) => b.characters.length - a.characters.length);
  }, [chapterParticipation]);

  // 伏笔关系追踪
  const foreshadowingData = useMemo(() => {
    const chapterMap = new Map(chapters.map((c) => [c.id, c]));

    return foreshadowingConnections.map((fc) => ({
      ...fc,
      chapter: chapterMap.get(fc.relatedChapter || ''),
    }));
  }, [foreshadowingConnections, chapters]);

  // 切换角色选择
  const toggleCharacter = (characterId: string) => {
    const newSelection = new Set(selectedCharacters);
    if (newSelection.has(characterId)) {
      newSelection.delete(characterId);
    } else {
      newSelection.add(characterId);
    }
    setSelectedCharacters(newSelection);
  };

  // 获取参与度颜色
  const getParticipationColor = (participation: number) => {
    if (participation >= 80) return 'bg-red-500';
    if (participation >= 60) return 'bg-orange-500';
    if (participation >= 40) return 'bg-yellow-500';
    if (participation >= 20) return 'bg-blue-400';
    return 'bg-slate-600';
  };

  // 获取关系变化类型颜色
  const getChangeTypeColor = (changeType: string) => {
    const colors: Record<string, string> = {
      created: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      strengthened: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      weakened: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      broken: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[changeType] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              章节角色关系演化
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              追踪角色关系在章节时间轴上的变化
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'timeline' as ViewMode, label: '时间轴', icon: <Clock size={14} /> },
            { id: 'heatmap' as ViewMode, label: '参与度热图', icon: <Flame size={14} /> },
            { id: 'co-occurrence' as ViewMode, label: '角色共现', icon: <Users size={14} /> },
            { id: 'foreshadowing' as ViewMode, label: '伏笔追踪', icon: <GitBranch size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                viewMode === tab.id
                  ? 'bg-cyan-600 text-white'
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
        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="space-y-4">
            {chapterParticipation.map((cp) => (
              <div key={cp.chapterId} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                {/* Chapter Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded">
                      第{cp.chapterOrder}章
                    </span>
                    <h4 className="text-sm font-bold text-white">{cp.chapterTitle}</h4>
                  </div>
                  <div className="text-xs text-slate-500">
                    {cp.characters.length} 个角色参与
                  </div>
                </div>

                {/* Characters in Chapter */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {cp.characters.map((char) => (
                    <div
                      key={char.characterId}
                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                        selectedCharacters.has(char.characterId)
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                      onClick={() => toggleCharacter(char.characterId)}
                    >
                      <span>{char.characterName}</span>
                      <span className={`w-2 h-2 rounded-full ${getParticipationColor(char.participation)}`} />
                    </div>
                  ))}
                </div>

                {/* Relationship Changes */}
                {cp.relationshipChanges.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-medium">关系变化:</p>
                    {cp.relationshipChanges.map((change, idx) => (
                      <div key={idx} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${getChangeTypeColor(change.changeType)}`}>
                        <span className="font-medium">{change.fromCharacter}</span>
                        <ChevronRight size={12} />
                        <span className="font-medium">{change.toCharacter}</span>
                        <span className="ml-auto px-2 py-0.5 bg-black/20 rounded text-[10px] uppercase">
                          {change.changeType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Heatmap View */}
        {viewMode === 'heatmap' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2 text-slate-400 font-medium">角色</th>
                    {chapters.map((chapter) => (
                      <th key={chapter.id} className="text-center p-2 text-slate-400 font-medium min-w-[60px]">
                        第{chapter.order}章
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row) => (
                    <tr key={row.characterId} className="border-b border-slate-700/50">
                      <td className="p-2 text-white font-medium">{row.characterName}</td>
                      {row.chapters.map((cell) => (
                        <td key={cell.chapterId} className="p-2 text-center">
                          <div
                            className={`w-full h-6 rounded ${getParticipationColor(cell.participation)} ${
                              selectedCharacters.has(row.characterId) ? 'ring-2 ring-cyan-400' : ''
                            }`}
                            title={`${cell.chapterTitle}: ${Math.round(cell.participation)}%`}
                            onClick={() => toggleCharacter(row.characterId)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>参与度:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-slate-600 rounded" />
                <span>低</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-400 rounded" />
                <span>中</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span>高</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span>极高</span>
              </div>
            </div>
          </div>
        )}

        {/* Co-occurrence View */}
        {viewMode === 'co-occurrence' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              识别关键多角色对手戏章节（按角色数量排序）
            </p>
            {coOccurrenceData.map((item) => (
              <div key={item.chapterId} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">
                      第{item.chapterOrder}章
                    </span>
                    <span className="text-sm text-slate-400">{item.chapterTitle}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Users size={12} />
                      <span>{item.characters.length}人</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Network size={12} />
                      <span>{item.relationshipCount}关系</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.characters.map((char) => (
                    <div
                      key={char.characterId}
                      className="px-3 py-1.5 bg-violet-950 text-violet-400 rounded-lg text-xs flex items-center gap-2"
                    >
                      <span>{char.characterName}</span>
                      <span className="text-violet-500">({char.role})</span>
                      <span
                        className={`w-2 h-2 rounded-full ${getParticipationColor(char.participation)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Foreshadowing View */}
        {viewMode === 'foreshadowing' && (
          <div className="space-y-3">
            {foreshadowingData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <GitBranch className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm">暂无伏笔关系数据</p>
                <p className="text-xs mt-2">伏笔将通过角色关系跨章节追踪</p>
              </div>
            ) : (
              foreshadowingData.map((fc) => (
                <div
                  key={fc.id}
                  className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                      <GitBranch size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-white">
                          {fc.subject}
                        </span>
                        <span className="text-slate-500">→</span>
                        <span className="text-sm font-medium text-white">
                          {fc.object}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{fc.relation}</p>
                      {fc.chapter && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar size={12} />
                          <span>{fc.chapter.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>关系变化:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>新建</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>加强</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>减弱</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>解除</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye size={12} />
            <span>点击角色/单元格查看详情</span>
          </div>
        </div>
      </div>
    </div>
  );
};
