/**
 * CharacterReminder - 写作时角色信息实时提示组件
 *
 * Drafting模块增强功能：
 * - 检测文本中提及的角色
 * - 显示角色关键属性（外貌、性格、背景）
 * - 角色关系快速参考
 * - 角色弧线进度提示
 * - 避免OOC（Out of Character）提示
 */

import React, { useState, useMemo } from 'react';
import {
  User,
  Eye,
  Brain,
  Heart,
  AlertTriangle,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Crown,
  Target,
  Ghost,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import type { Character } from '@/types';

// ============================================================
// Types
// ============================================================

interface CharacterReminderProps {
  text: string;
  characters: Character[];
  onCharacterClick?: (characterId: string) => void;
  className?: string;
}

interface MentionMatch {
  character: Character;
  matchIndex: number;
  confidence: number; // 匹配置信度
}

// ============================================================
// Component
// ============================================================

export const CharacterReminder: React.FC<CharacterReminderProps> = ({
  text,
  characters,
  onCharacterClick,
  className = '',
}) => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  // 检测文本中提及的角色
  const mentionedCharacters = useMemo(() => {
    if (!text) return [];

    const matches: MentionMatch[] = [];

    characters.forEach((char) => {
      // 检查角色名是否在文本中出现
      const nameMatch = text.toLowerCase().includes(char.name.toLowerCase());
      const aliasMatch = char.aliases?.some((alias) =>
        text.toLowerCase().includes(alias.toLowerCase())
      );

      if (nameMatch || aliasMatch) {
        matches.push({
          character: char,
          matchIndex: text.toLowerCase().indexOf(char.name.toLowerCase()),
          confidence: nameMatch ? 1 : 0.8,
        });
      }
    });

    // 按在文本中的出现位置排序
    return matches.sort((a, b) => a.matchIndex - b.matchIndex);
  }, [text, characters]);

  // 切换section展开状态
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (mentionedCharacters.length === 0) {
    return null;
  }

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-300">
              角色信息提示
            </h3>
            <span className="text-xs px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded-full">
              {mentionedCharacters.length} 个角色
            </span>
          </div>
        </div>
      </div>

      {/* Mentioned Characters List */}
      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {mentionedCharacters.map(({ character, confidence }) => (
          <div
            key={character.id}
            className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 hover:border-cyan-500/30 transition-all cursor-pointer"
            onClick={() => {
              setSelectedCharacter(character);
              onCharacterClick?.(character.id);
            }}
          >
            {/* Character Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {character.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{character.name}</h4>
                  <p className="text-xs text-slate-500">{character.role}</p>
                </div>
              </div>
              {confidence < 1 && (
                <span className="text-xs px-2 py-0.5 bg-amber-950 text-amber-400 rounded">
                  可能提及
                </span>
              )}
            </div>

            {/* Basic Info Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {character.age && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Ghost size={12} />
                  <span>{character.age}岁</span>
                </div>
              )}
              {character.residence && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin size={12} />
                  <span>{character.residence}</span>
                </div>
              )}
              {character.faction && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Crown size={12} />
                  <span>{character.faction}</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {character.desire && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded p-2">
                  <div className="flex items-center gap-1 text-emerald-400 mb-1">
                    <Target size={10} />
                    <span className="font-bold">欲望</span>
                  </div>
                  <p className="text-slate-400 line-clamp-1">{character.desire}</p>
                </div>
              )}
              {character.fear && (
                <div className="bg-red-950/20 border border-red-500/20 rounded p-2">
                  <div className="flex items-center gap-1 text-red-400 mb-1">
                    <AlertTriangle size={10} />
                    <span className="font-bold">恐惧</span>
                  </div>
                  <p className="text-slate-400 line-clamp-1">{character.fear}</p>
                </div>
              )}
              {character.arc && (
                <div className="bg-purple-950/20 border border-purple-500/20 rounded p-2">
                  <div className="flex items-center gap-1 text-purple-400 mb-1">
                    <TrendingUp size={10} />
                    <span className="font-bold">弧线</span>
                  </div>
                  <p className="text-slate-400">
                    {character.arc.currentPhase} ({character.arc.phaseProgress}%)
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Character Detail Modal */}
      {selectedCharacter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-cyan-500/30 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-r from-cyan-950 to-blue-950">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {selectedCharacter.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedCharacter.name}</h2>
                  <p className="text-xs text-slate-400">{selectedCharacter.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCharacter(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)] space-y-3">
              {/* Basic Info */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3"
                  onClick={() => toggleSection('basic')}
                >
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">基本信息</h4>
                  </div>
                  {expandedSections.has('basic') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.has('basic') && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {selectedCharacter.age && (
                      <div>
                        <span className="text-slate-500">年龄:</span>
                        <span className="text-white ml-2">{selectedCharacter.age}</span>
                      </div>
                    )}
                    {selectedCharacter.gender && (
                      <div>
                        <span className="text-slate-500">性别:</span>
                        <span className="text-white ml-2">{selectedCharacter.gender}</span>
                      </div>
                    )}
                    {selectedCharacter.residence && (
                      <div>
                        <span className="text-slate-500">居住地:</span>
                        <span className="text-white ml-2">{selectedCharacter.residence}</span>
                      </div>
                    )}
                    {selectedCharacter.originLocation && (
                      <div>
                        <span className="text-slate-500">出身地:</span>
                        <span className="text-white ml-2">{selectedCharacter.originLocation}</span>
                      </div>
                    )}
                    {selectedCharacter.faction && (
                      <div>
                        <span className="text-slate-500">势力:</span>
                        <span className="text-white ml-2">{selectedCharacter.faction}</span>
                      </div>
                    )}
                    {selectedCharacter.occupation && (
                      <div>
                        <span className="text-slate-500">职业:</span>
                        <span className="text-white ml-2">{selectedCharacter.occupation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Personality */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3"
                  onClick={() => toggleSection('personality')}
                >
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-purple-400" />
                    <h4 className="text-sm font-bold text-white">性格特征</h4>
                  </div>
                  {expandedSections.has('personality') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.has('personality') && (
                  <div className="space-y-2 text-xs">
                    {selectedCharacter.personality && (
                      <div>
                        <span className="text-slate-500">性格:</span>
                        <p className="text-white mt-1">{selectedCharacter.personality}</p>
                      </div>
                    )}
                    {selectedCharacter.contrast && (
                      <div className="bg-pink-950/20 border border-pink-500/20 rounded p-2 mt-2">
                        <div className="flex items-center gap-1 text-pink-400 mb-1">
                          <Sparkles size={12} />
                          <span className="font-bold">反差萌点</span>
                        </div>
                        <p className="text-slate-300">{selectedCharacter.contrast}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Motivation */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3"
                  onClick={() => toggleSection('motivation')}
                >
                  <div className="flex items-center gap-2">
                    <Heart size={16} className="text-rose-400" />
                    <h4 className="text-sm font-bold text-white">动机与冲突</h4>
                  </div>
                  {expandedSections.has('motivation') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.has('motivation') && (
                  <div className="space-y-3 text-xs">
                    {selectedCharacter.desire && (
                      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded p-2">
                        <div className="flex items-center gap-1 text-emerald-400 mb-1">
                          <Target size={12} />
                          <span className="font-bold">核心欲望</span>
                        </div>
                        <p className="text-slate-300">{selectedCharacter.desire}</p>
                      </div>
                    )}
                    {selectedCharacter.fear && (
                      <div className="bg-red-950/20 border border-red-500/20 rounded p-2">
                        <div className="flex items-center gap-1 text-red-400 mb-1">
                          <AlertTriangle size={12} />
                          <span className="font-bold">核心恐惧</span>
                        </div>
                        <p className="text-slate-300">{selectedCharacter.fear}</p>
                      </div>
                    )}
                    {selectedCharacter.weakness && (
                      <div className="bg-amber-950/20 border border-amber-500/20 rounded p-2">
                        <div className="flex items-center gap-1 text-amber-400 mb-1">
                          <Ghost size={12} />
                          <span className="font-bold">弱点</span>
                        </div>
                        <p className="text-slate-300">{selectedCharacter.weakness}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Background */}
              {selectedCharacter.background && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <div
                    className="flex items-center justify-between cursor-pointer mb-3"
                    onClick={() => toggleSection('background')}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-amber-400" />
                      <h4 className="text-sm font-bold text-white">背景故事</h4>
                    </div>
                    {expandedSections.has('background') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {expandedSections.has('background') && (
                    <div className="text-xs text-slate-300">
                      <p>{selectedCharacter.background}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Relationships */}
              {selectedCharacter.structuredRelations && selectedCharacter.structuredRelations.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <div
                    className="flex items-center justify-between cursor-pointer mb-3"
                    onClick={() => toggleSection('relationships')}
                  >
                    <div className="flex items-center gap-2">
                      <Eye size={16} className="text-blue-400" />
                      <h4 className="text-sm font-bold text-white">
                        关系网络
                        <span className="ml-2 text-xs text-slate-500 font-normal">
                          ({selectedCharacter.structuredRelations.length} 个关系)
                        </span>
                      </h4>
                    </div>
                    {expandedSections.has('relationships') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {expandedSections.has('relationships') && (
                    <div className="space-y-2">
                      {selectedCharacter.structuredRelations.slice(0, 5).map((rel) => (
                        <div
                          key={rel.targetCharacterId}
                          className="flex items-center justify-between text-xs bg-slate-900/50 rounded p-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">→</span>
                            <span className="text-white">{rel.targetCharacterId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-950 text-blue-400 rounded">
                              {rel.type}
                            </span>
                            <span className="text-slate-500">{rel.weight}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
