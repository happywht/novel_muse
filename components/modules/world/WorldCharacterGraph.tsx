/**
 * WorldCharacterGraph - 世界观与角色关系联动图谱
 *
 * B3增强功能：
 * - 地理-角色关系图：角色在不同地理位置的关系网络
 * - 势力关系网络：角色所属势力及其冲突/联盟关系
 * - 世界观规则影响分析：世界规则如何塑造角色行为
 * - 跨模块数据整合：WorldBuilder + Character + Plot
 */

import React, { useState, useMemo } from 'react';
import {
  Globe,
  Castle,
  Users,
  Network,
  MapPin,
  Shield,
  Gavel,
  Sparkles,
  Flame,
  Zap,
  Eye,
  Filter,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  GitBranch,
  Crown,
  Swords,
  Heart,
  Link2,
  Layers,
  RefreshCw,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface WorldSetting {
  id: string;
  title: string;
  category: string;
  content: string;
  type?: 'location' | 'faction' | 'rule' | 'history' | 'culture';
}

interface Character {
  id: string;
  name: string;
  role: string;
  alignment?: string;
  structuredRelations?: Array<{
    targetCharacterId: string;
    type: string;
    weight: number;
    trajectory?: string;
  }>;
  originLocation?: string;
  residence?: string;
  controlledTerritories?: string[];
  exiledFrom?: string[];
}

interface Faction {
  id: string;
  name: string;
  alignment?: string;
  territory?: string[];
  members?: string[];
  ideology?: string;
}

interface WorldRule {
  id: string;
  name: string;
  impact: 'high' | 'medium' | 'low';
  affects: string[];
  description: string;
}

interface WorldCharacterGraphProps {
  worldSettings: WorldSetting[];
  characters: Character[];
  factions?: Faction[];
  worldRules?: WorldRule[];
  className?: string;
}

// ============================================================
// Component
// ============================================================

type ViewMode = 'geographic' | 'faction' | 'rules' | 'holistic';

export const WorldCharacterGraph: React.FC<WorldCharacterGraphProps> = ({
  worldSettings,
  characters,
  factions = [],
  worldRules = [],
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('holistic');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(true);

  // 提取地理信息
  const locations = useMemo(() => {
    return worldSettings.filter((ws) => ws.type === 'location');
  }, [worldSettings]);

  // 提取势力信息
  const locationFactions = useMemo(() => {
    return worldSettings.filter((ws) => ws.type === 'faction');
  }, [worldSettings]);

  // 地理-角色关系网络
  const geographicNetwork = useMemo(() => {
    const network: Record<string, {
      location: WorldSetting;
      characters: Character[];
      connections: Array<{ from: Character; to: Character; type: string; weight: number }>;
    }> = {};

    // 初始化网络
    locations.forEach((loc) => {
      network[loc.id] = {
        location: loc,
        characters: [],
        connections: [],
      };
    });

    // 分配角色到地理位置
    characters.forEach((char) => {
      const primaryLocation = char.residence || char.originLocation;
      if (primaryLocation && network[primaryLocation]) {
        network[primaryLocation].characters.push(char);
      }
    });

    // 计算跨地理位置的关系连接
    Object.keys(network).forEach((locId) => {
      const locationCharacters = network[locId].characters;

      locationCharacters.forEach((fromChar) => {
        fromChar.structuredRelations?.forEach((rel) => {
          const toChar = characters.find((c) => c.id === rel.targetCharacterId);
          if (!toChar) return;

          const toCharLocation = toChar.residence || toChar.originLocation;
          if (toCharLocation && toCharLocation !== locId && network[toCharLocation]) {
            network[locId].connections.push({
              from: fromChar,
              to: toChar,
              type: rel.type,
              weight: rel.weight,
            });
          }
        });
      });
    });

    return network;
  }, [locations, characters]);

  // 势力关系网络
  const factionNetwork = useMemo(() => {
    const network: Record<string, {
      faction: WorldSetting;
      members: Character[];
      alliances: Array<{ factionId: string; type: 'alliance' | 'conflict' | 'neutral'; strength: number }>;
      conflicts: Array<{ characterId: string; reason: string }>;
    }> = {};

    // 初始化势力网络
    locationFactions.forEach((faction) => {
      network[faction.id] = {
        faction,
        members: [],
        alliances: [],
        conflicts: [],
      };
    });

    // 分配角色到势力
    characters.forEach((char) => {
      if (char.alignment && network[char.alignment]) {
        network[char.alignment].members.push(char);
      }
    });

    // 计算势力间关系
    Object.keys(network).forEach((factionId) => {
      const factionMembers = network[factionId].members;

      factionMembers.forEach((member) => {
        member.structuredRelations?.forEach((rel) => {
          const targetChar = characters.find((c) => c.id === rel.targetCharacterId);
          if (!targetChar || !targetChar.alignment) return;

          const targetFactionId = targetChar.alignment;
          if (targetFactionId && targetFactionId !== factionId) {
            // 检查是否已存在关系
            const existingAlliance = network[factionId].alliances.find(
              (a) => a.factionId === targetFactionId
            );

            if (!existingAlliance) {
              // 根据关系类型确定势力关系
              let allianceType: 'alliance' | 'conflict' | 'neutral' = 'neutral';
              if (rel.type === 'ENEMY_OF' || rel.type === 'RIVAL_OF') {
                allianceType = 'conflict';
              } else if (rel.type === 'ALLY_OF' || rel.type === 'FRIEND_OF' || rel.type === 'KIN_OF') {
                allianceType = 'alliance';
              }

              network[factionId].alliances.push({
                factionId: targetFactionId,
                type: allianceType,
                strength: rel.weight,
              });
            }
          }
        });
      });
    });

    return network;
  }, [locationFactions, characters]);

  // 世界规则影响分析
  const ruleImpactAnalysis = useMemo(() => {
    return worldRules.map((rule) => {
      const affectedCharacters = characters.filter((char) => {
        // 检查角色是否受规则影响（基于属性、关系等）
        return rule.affects.some((affect) => {
          if (affect === 'alignment') return !!char.alignment;
          if (affect === 'relationships') return (char.structuredRelations?.length || 0) > 0;
          return true;
        });
      });

      // 分析规则对角色关系的影响
      const relationshipImpacts = affectedCharacters.flatMap((char) =>
        (char.structuredRelations || []).map((rel) => ({
          character: char.name,
          targetCharacterId: rel.targetCharacterId,
          type: rel.type,
          impact: rule.impact,
        }))
      );

      return {
        ...rule,
        affectedCharacters,
        relationshipImpacts,
      };
    });
  }, [worldRules, characters]);

  // 全局视角数据
  const holisticViewData = useMemo(() => {
    return {
      totalCharacters: characters.length,
      totalLocations: locations.length,
      totalFactions: locationFactions.length,
      activeRules: worldRules.length,
      geographicNetwork: Object.keys(geographicNetwork).length,
      factionNetwork: Object.keys(factionNetwork).length,
    };
  }, [characters, locations, locationFactions, worldRules, geographicNetwork, factionNetwork]);

  // 获取关系类型颜色
  const getRelationColor = (type: string) => {
    const colors: Record<string, string> = {
      'ENEMY_OF': 'text-red-400 bg-red-950/30 border-red-500/30',
      'ALLY_OF': 'text-blue-400 bg-blue-950/30 border-blue-500/30',
      'LOVES': 'text-pink-400 bg-pink-950/30 border-pink-500/30',
      'KIN_OF': 'text-green-400 bg-green-950/30 border-green-500/30',
      'MENTORS': 'text-purple-400 bg-purple-950/30 border-purple-500/30',
      'RIVAL_OF': 'text-orange-400 bg-orange-950/30 border-orange-500/30',
      'SERVES': 'text-cyan-400 bg-cyan-950/30 border-cyan-500/30',
      'FRIEND_OF': 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30',
      'RELATED_TO': 'text-slate-400 bg-slate-950/30 border-slate-500/30',
    };
    return colors[type] || 'text-slate-400 bg-slate-950/30 border-slate-500/30';
  };

  // 获取势力关系类型颜色
  const getAllianceColor = (type: string) => {
    const colors: Record<string, string> = {
      'alliance': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'conflict': 'bg-red-500/20 text-red-400 border-red-500/30',
      'neutral': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[type] || 'text-slate-400';
  };

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              B3增强：世界观与角色关系联动
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              多层级图谱系统 - 整合地理、势力、规则与角色关系
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetail(!showDetail)}
              className={`p-2 rounded-lg transition-colors ${
                showDetail
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
              title="切换详情视图"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => {/* 刷新数据 */}}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-400 rounded-lg transition-colors"
              title="刷新数据"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'holistic' as ViewMode, label: '全局视角', icon: <Globe size={14} /> },
            { id: 'geographic' as ViewMode, label: '地理关系', icon: <MapPin size={14} /> },
            { id: 'faction' as ViewMode, label: '势力网络', icon: <Castle size={14} /> },
            { id: 'rules' as ViewMode, label: '规则影响', icon: <Gavel size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                viewMode === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
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
        {/* Holistic View */}
        {viewMode === 'holistic' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-950/30 to-cyan-950/30 rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">总角色数</span>
                <Users size={16} className="text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{holisticViewData.totalCharacters}</div>
              <div className="text-xs text-slate-500 mt-1">活跃角色</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/30 to-green-950/30 rounded-lg p-4 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">地理位置</span>
                <MapPin size={16} className="text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white">{holisticViewData.totalLocations}</div>
              <div className="text-xs text-slate-500 mt-1">世界地点</div>
            </div>

            <div className="bg-gradient-to-br from-purple-950/30 to-pink-950/30 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">势力阵营</span>
                <Castle size={16} className="text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white">{holisticViewData.totalFactions}</div>
              <div className="text-xs text-slate-500 mt-1">政治实体</div>
            </div>

            <div className="bg-gradient-to-br from-amber-950/30 to-orange-950/30 rounded-lg p-4 border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">世界规则</span>
                <Gavel size={16} className="text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-white">{holisticViewData.activeRules}</div>
              <div className="text-xs text-slate-500 mt-1">生效规则</div>
            </div>
          </div>
        )}

        {/* Geographic View */}
        {viewMode === 'geographic' && (
          <div className="space-y-4">
            {Object.entries(geographicNetwork).map(([locId, data]) => (
              <div
                key={locId}
                className={`bg-slate-900/50 rounded-lg p-4 border transition-all ${
                  selectedLocation === locId
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-slate-700/50'
                }`}
              >
                {/* Location Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">{data.location.title}</h4>
                  </div>
                  <div className="text-xs text-slate-500">
                    {data.characters.length} 个角色
                  </div>
                </div>

                {/* Characters at this location */}
                {data.characters.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-2">驻留角色:</p>
                    <div className="flex flex-wrap gap-2">
                      {data.characters.map((char) => (
                        <div
                          key={char.id}
                          className="px-3 py-1.5 bg-violet-950 text-violet-400 rounded-lg text-xs flex items-center gap-2"
                        >
                          <span>{char.name}</span>
                          <span className="text-violet-500">({char.role})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cross-location connections */}
                {data.connections.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">跨地域关系:</p>
                    <div className="space-y-2">
                      {data.connections.slice(0, 5).map((conn, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${getRelationColor(conn.type)}`}
                        >
                          <span className="font-medium">{conn.from.name}</span>
                          <Link2 size={12} />
                          <span className="font-medium">{conn.to.name}</span>
                          <span className="ml-auto">{conn.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Faction View */}
        {viewMode === 'faction' && (
          <div className="space-y-4">
            {Object.entries(factionNetwork).map(([factionId, data]) => (
              <div
                key={factionId}
                className={`bg-slate-900/50 rounded-lg p-4 border transition-all ${
                  selectedFaction === factionId
                    ? 'border-purple-500/50 bg-purple-950/20'
                    : 'border-slate-700/50'
                }`}
              >
                {/* Faction Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Castle size={16} className="text-purple-400" />
                    <h4 className="text-sm font-bold text-white">{data.faction.title}</h4>
                  </div>
                  <div className="text-xs text-slate-500">
                    {data.members.length} 个成员
                  </div>
                </div>

                {/* Faction Members */}
                {data.members.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-2">势力成员:</p>
                    <div className="flex flex-wrap gap-2">
                      {data.members.map((member) => (
                        <div
                          key={member.id}
                          className="px-3 py-1.5 bg-purple-950 text-purple-400 rounded-lg text-xs flex items-center gap-2"
                        >
                          <Crown size={12} />
                          <span>{member.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Faction Alliances/Conflicts */}
                {data.alliances.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">势力关系:</p>
                    <div className="space-y-2">
                      {data.alliances.map((alliance, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${getAllianceColor(alliance.type)}`}
                        >
                          {alliance.type === 'alliance' && <Heart size={12} />}
                          {alliance.type === 'conflict' && <Swords size={12} />}
                          {alliance.type === 'neutral' && <Link2 size={12} />}
                          <span className="font-medium">
                            {locationFactions.find((f) => f.id === alliance.factionId)?.title || alliance.factionId}
                          </span>
                          <span className="ml-auto text-xs opacity-75">强度: {alliance.strength}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rules View */}
        {viewMode === 'rules' && (
          <div className="space-y-4">
            {ruleImpactAnalysis.map((rule) => (
              <div
                key={rule.id}
                className={`bg-slate-900/50 rounded-lg p-4 border transition-all ${
                  selectedRule === rule.id
                    ? 'border-amber-500/50 bg-amber-950/20'
                    : 'border-slate-700/50'
                }`}
              >
                {/* Rule Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Gavel size={16} className="text-amber-400" />
                    <h4 className="text-sm font-bold text-white">{rule.name}</h4>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    rule.impact === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : rule.impact === 'medium'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {rule.impact === 'high' ? '高影响' : rule.impact === 'medium' ? '中影响' : '低影响'}
                  </div>
                </div>

                {/* Rule Description */}
                <p className="text-xs text-slate-400 mb-3">{rule.description}</p>

                {/* Affected Characters */}
                {rule.affectedCharacters.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-2">受影响角色:</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.affectedCharacters.map((char) => (
                        <div
                          key={char.id}
                          className="px-3 py-1.5 bg-amber-950 text-amber-400 rounded-lg text-xs"
                        >
                          {char.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relationship Impacts */}
                {rule.relationshipImpacts.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">关系影响:</p>
                    <div className="space-y-2">
                      {rule.relationshipImpacts.slice(0, 5).map((impact, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${getRelationColor(impact.type)}`}
                        >
                          <span className="font-medium">{impact.character}</span>
                          <ChevronRight size={12} />
                          <span className="text-slate-400">影响</span>
                          <span className={`ml-auto px-2 py-0.5 rounded ${
                            impact.impact === 'high'
                              ? 'bg-red-500/30 text-red-400'
                              : 'bg-slate-500/30 text-slate-400'
                          }`}>
                            {impact.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>视图模式:</span>
            <span className="flex items-center gap-1">
              <Globe size={12} />
              全局视角
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              地理关系
            </span>
            <span className="flex items-center gap-1">
              <Castle size={12} />
              势力网络
            </span>
            <span className="flex items-center gap-1">
              <Gavel size={12} />
              规则影响
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={12} />
            <span>跨模块数据整合</span>
          </div>
        </div>
      </div>
    </div>
  );
};
