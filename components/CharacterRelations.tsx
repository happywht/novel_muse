/**
 * CharacterRelations - 角色关系可视化组件
 *
 * 功能：
 * - 支持新旧两种关系格式展示
 * - 不同关系类型使用不同颜色标识
 * - 点击关系可跳转到目标角色
 * - 鼠标悬停显示关系描述
 */

import React, { useMemo } from 'react';
import {
  Character,
  CharacterRelation,
  CharacterRelationType,
  RELATION_TYPE_LABELS,
} from '../types';
import {
  parseLegacyRelationships,
  getRelationType,
  getTargetName,
  convertLegacyToStructured,
} from '../utils/characterRelations';
import {
  Heart,
  Swords,
  Users,
  Sparkles,
  Target,
  Crown,
  Handshake,
  UserCircle,
  Link,
} from 'lucide-react';

interface CharacterRelationsProps {
  character: Character;
  allCharacters: Character[];
  onNavigateToCharacter?: (characterId: string) => void;
  onEdit?: () => void;
}

/**
 * 关系类型对应的颜色配置
 */
const RELATION_COLORS: Record<CharacterRelationType, { bg: string; text: string; border: string }> =
  {
    ENEMY_OF: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
    },
    ALLY_OF: {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      border: 'border-green-500/30',
    },
    LOVES: {
      bg: 'bg-pink-500/10',
      text: 'text-pink-400',
      border: 'border-pink-500/30',
    },
    KIN_OF: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
    },
    MENTORS: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
    },
    RIVAL_OF: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
    },
    SERVES: {
      bg: 'bg-gray-500/10',
      text: 'text-gray-400',
      border: 'border-gray-500/30',
    },
    FRIEND_OF: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
    },
    RELATED_TO: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
    },
  };

/**
 * 关系类型对应的图标
 */
const RELATION_ICONS: Record<CharacterRelationType, React.ElementType> = {
  ENEMY_OF: Swords,
  ALLY_OF: Handshake,
  LOVES: Heart,
  KIN_OF: Users,
  MENTORS: Sparkles,
  RIVAL_OF: Target,
  SERVES: Crown,
  FRIEND_OF: UserCircle,
  RELATED_TO: Link,
};

/**
 * 单个关系卡片组件
 */
interface RelationCardProps {
  relation: CharacterRelation;
  targetCharacter?: Character;
  onNavigate?: (characterId: string) => void;
}

const RelationCard: React.FC<RelationCardProps> = ({ relation, targetCharacter, onNavigate }) => {
  const relationType = getRelationType(relation);
  const targetName = getTargetName(relation);
  const colors = RELATION_COLORS[relationType];
  const Icon = RELATION_ICONS[relationType];
  const typeLabel = RELATION_TYPE_LABELS[relationType];

  const handleClick = () => {
    if (targetCharacter && onNavigate) {
      onNavigate(targetCharacter.id);
    }
  };

  const hasTarget = !!targetCharacter;

  return (
    <div
      className={`
        ${colors.bg} ${colors.border} ${colors.text}
        border rounded-lg p-3
        transition-all duration-200
        ${hasTarget ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'opacity-75'}
      `}
      onClick={handleClick}
      title={relation.description || `${typeLabel}: ${targetName}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-medium opacity-80">{typeLabel}</span>
      </div>
      <div className="font-semibold text-sm truncate">{targetName}</div>
      {relation.description && relation.description !== typeLabel && (
        <div className="text-xs opacity-70 mt-1 truncate">{relation.description}</div>
      )}
      {relation.weight !== undefined && relation.weight !== 50 && (
        <div className="flex items-center gap-1 mt-2">
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.text.replace('text', 'bg')}`}
              style={{ width: `${relation.weight}%` }}
            />
          </div>
          <span className="text-xs opacity-60">{relation.weight}</span>
        </div>
      )}
      {relation.trajectory && relation.trajectory !== 'stable' && (
        <div className="text-xs opacity-60 mt-1 flex items-center gap-1">
          {relation.trajectory === 'rising' ? '↑' : '↓'}
          {relation.trajectory === 'rising' ? '关系上升' : '关系下降'}
        </div>
      )}
    </div>
  );
};

/**
 * 主组件：角色关系可视化
 */
export const CharacterRelations: React.FC<CharacterRelationsProps> = ({
  character,
  allCharacters,
  onNavigateToCharacter,
  onEdit,
}) => {
  // 统一处理关系数据（支持新旧格式）
  const relations = useMemo(() => {
    // 优先使用结构化关系
    if (character.structuredRelations && character.structuredRelations.length > 0) {
      return character.structuredRelations;
    }

    // 回退到旧格式字符串
    if (character.relationships) {
      const parsed = parseLegacyRelationships(character.relationships);
      return convertLegacyToStructured(parsed, allCharacters);
    }

    return [];
  }, [character.structuredRelations, character.relationships, allCharacters]);

  // 查找目标角色的辅助函数
  const findTargetCharacter = (relation: CharacterRelation): Character | undefined => {
    const targetName = getTargetName(relation);
    return allCharacters.find(
      (c) =>
        c.id === relation.targetCharacterId ||
        c.name === targetName ||
        c.name.includes(targetName) ||
        targetName.includes(c.name)
    );
  };

  // 空状态
  if (relations.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 text-center">
        <Link className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-slate-500 text-sm">暂无关系数据</p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="mt-3 px-4 py-2 bg-muse-600 hover:bg-muse-700 text-white rounded-lg text-sm transition-colors"
          >
            添加关系
          </button>
        )}
      </div>
    );
  }

  // 按关系类型分组
  const groupedRelations = useMemo(() => {
    const groups: Record<CharacterRelationType, CharacterRelation[]> = {
      ENEMY_OF: [],
      ALLY_OF: [],
      LOVES: [],
      KIN_OF: [],
      MENTORS: [],
      RIVAL_OF: [],
      SERVES: [],
      FRIEND_OF: [],
      RELATED_TO: [],
    };

    relations.forEach((rel) => {
      const type = getRelationType(rel);
      groups[type].push(rel);
    });

    return groups;
  }, [relations]);

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muse-400" />
          <span className="text-sm text-slate-400">共 {relations.length} 条关系</span>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-muse-600 hover:bg-muse-700 text-white rounded-lg text-xs transition-colors"
          >
            编辑关系
          </button>
        )}
      </div>

      {/* 分组展示关系 */}
      {(Object.entries(groupedRelations) as [CharacterRelationType, CharacterRelation[]][])
        .filter(([_, rels]) => rels.length > 0)
        .map(([type, rels]) => {
          const colors = RELATION_COLORS[type];
          const Icon = RELATION_ICONS[type];

          return (
            <div key={type} className="space-y-2">
              {/* 分组标题 */}
              <div className={`flex items-center gap-2 ${colors.text}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{RELATION_TYPE_LABELS[type]}</span>
                <span className="text-xs opacity-60">({rels.length})</span>
              </div>

              {/* 关系列表 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rels.map((relation, index) => (
                  <RelationCard
                    key={relation.id || `${type}-${index}`}
                    relation={relation}
                    targetCharacter={findTargetCharacter(relation)}
                    onNavigate={onNavigateToCharacter}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {/* 未找到目标角色的提示 */}
      {relations.some((rel) => !findTargetCharacter(rel)) && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-xs flex items-center gap-2">
            <span>⚠️</span>
            部分角色未在角色列表中找到，可能需要创建或更新角色信息
          </p>
        </div>
      )}
    </div>
  );
};

export default CharacterRelations;
