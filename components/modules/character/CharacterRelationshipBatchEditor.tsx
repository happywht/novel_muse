/**
 * CharacterRelationshipBatchEditor - 角色关系批量编辑器
 *
 * 功能：
 * - 多选角色进行批量操作
 * - 批量添加关系
 * - 批量删除关系
 * - 批量修改关系属性
 * - 高级过滤和搜索
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  Download,
  Upload,
  Filter,
  Search,
  X,
} from 'lucide-react';
import type { Character } from '@/types';

// 关系类型选项
const RELATION_TYPES = [
  { value: 'ALLY_OF', label: '盟友', color: 'text-green-400' },
  { value: 'ENEMY_OF', label: '敌对', color: 'text-red-400' },
  { value: 'LOVES', label: '爱慕', color: 'text-pink-400' },
  { value: 'KIN_OF', label: '亲属', color: 'text-blue-400' },
  { value: 'MENTORS', label: '师徒', color: 'text-purple-400' },
  { value: 'RIVAL_OF', label: '竞争', color: 'text-orange-400' },
  { value: 'SERVES', label: '效忠', color: 'text-gray-400' },
  { value: 'FRIEND_OF', label: '朋友', color: 'text-cyan-400' },
  { value: 'RELATED_TO', label: '关联', color: 'text-violet-400' },
];

interface CharacterRelationshipBatchEditorProps {
  characters: Character[];
  onBatchUpdate?: (updates: Array<{
    characterId: string;
    relationships: any[];
  }>) => void;
  onExport?: (format: 'json' | 'csv') => void;
  onImport?: (data: any[]) => void;
  className?: string;
}

export const CharacterRelationshipBatchEditor: React.FC<CharacterRelationshipBatchEditorProps> = ({
  characters,
  onBatchUpdate,
  onExport,
  onImport,
  className = '',
}) => {
  // 选中的角色ID
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());

  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterAlignment, setFilterAlignment] = useState('');

  // 批量操作状态
  const [batchOperation, setBatchOperation] = useState<'add' | 'delete' | 'modify' | null>(null);
  const [batchRelationType, setBatchRelationType] = useState('FRIEND_OF');
  const [batchWeight, setBatchWeight] = useState(50);
  const [batchDescription, setBatchDescription] = useState('');

  // 过滤后的角色列表
  const filteredCharacters = useMemo(() => {
    return characters.filter((char) => {
      // 搜索过滤
      const matchesSearch =
        !searchQuery ||
        char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        char.role.toLowerCase().includes(searchQuery.toLowerCase());

      // 角色过滤
      const matchesRole = !filterRole || char.role === filterRole;

      // 阵营过滤
      const matchesAlignment = !filterAlignment || char.alignment === filterAlignment;

      return matchesSearch && matchesRole && matchesAlignment;
    });
  }, [characters, searchQuery, filterRole, filterAlignment]);

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCharacterIds.size === filteredCharacters.length) {
      setSelectedCharacterIds(new Set());
    } else {
      setSelectedCharacterIds(new Set(filteredCharacters.map((c) => c.id)));
    }
  };

  // 切换角色选择
  const toggleCharacterSelection = (characterId: string) => {
    const newSelection = new Set(selectedCharacterIds);
    if (newSelection.has(characterId)) {
      newSelection.delete(characterId);
    } else {
      newSelection.add(characterId);
    }
    setSelectedCharacterIds(newSelection);
  };

  // 执行批量操作
  const executeBatchOperation = () => {
    if (selectedCharacterIds.size === 0) {
      alert('请先选择要操作的角色');
      return;
    }

    const updates = Array.from(selectedCharacterIds).map((characterId) => {
      const character = characters.find((c) => c.id === characterId);
      if (!character) return { characterId, relationships: [] };

      const existingRelations = character.structuredRelations || [];

      if (batchOperation === 'add') {
        // 添加新关系到所有选中的角色（除了自己）
        const newRelations = Array.from(selectedCharacterIds)
          .filter((id) => id !== characterId)
          .map((targetId) => ({
            id: `rel_${Date.now()}_${characterId}_${targetId}`,
            targetCharacterId: targetId,
            type: batchRelationType,
            weight: batchWeight,
            description: batchDescription,
            trajectory: 'stable' as const,
            isBidirectional: false,
          }));

        return {
          characterId,
          relationships: [...existingRelations, ...newRelations],
        };
      }

      if (batchOperation === 'delete') {
        // 删除指定类型的关系
        const filteredRelations = existingRelations.filter(
          (rel: any) => rel.type !== batchRelationType
        );

        return {
          characterId,
          relationships: filteredRelations,
        };
      }

      if (batchOperation === 'modify') {
        // 修改指定类型的关系属性
        const modifiedRelations = existingRelations.map((rel: any) => {
          if (rel.type === batchRelationType) {
            return {
              ...rel,
              weight: batchWeight,
              description: batchDescription || rel.description,
            };
          }
          return rel;
        });

        return {
          characterId,
          relationships: modifiedRelations,
        };
      }

      return { characterId, relationships: existingRelations };
    });

    onBatchUpdate?.(updates);

    // 重置状态
    setBatchOperation(null);
    setSelectedCharacterIds(new Set());
    setBatchDescription('');
  };

  // 获取唯一值用于过滤选项
  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(characters.map((c) => c.role))).sort();
  }, [characters]);

  const uniqueAlignments = useMemo(() => {
    return Array.from(
      new Set(characters.map((c) => c.alignment).filter(Boolean) as string[])
    ).sort();
  }, [characters]);

  // 导出CSV
  const exportToCSV = () => {
    const headers = ['Source Character', 'Target Character', 'Relation Type', 'Weight', 'Description', 'Trajectory'];
    const rows = characters.flatMap((char) =>
      (char.structuredRelations || []).map((rel: any) => {
        const targetChar = characters.find((c) => c.id === rel.targetCharacterId);
        return [
          char.name,
          targetChar?.name || rel.targetCharacterId,
          rel.type,
          rel.weight || '',
          rel.description || '',
          rel.trajectory || '',
        ];
      })
    );

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `character_relationships_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onExport?.('csv');
  };

  // 导出JSON
  const exportToJSON = () => {
    const data = characters.map((char) => ({
      id: char.id,
      name: char.name,
      role: char.role,
      relationships: char.structuredRelations || [],
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `character_relationships_${Date.now()}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onExport?.('json');
  };

  return (
    <div className={`bg-slate-800/40 rounded-lg border border-slate-700/50 ${className}`}>
      {/* 头部 */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-muse-400" />
            批量关系管理器
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{characters.length} 个角色</span>
            <span>•</span>
            <span>{selectedCharacterIds.size} 已选</span>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索角色名称或角色..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-xs text-white focus:border-muse-500 outline-none"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:border-muse-500 outline-none"
          >
            <option value="">所有角色</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            value={filterAlignment}
            onChange={(e) => setFilterAlignment(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:border-muse-500 outline-none"
          >
            <option value="">所有阵营</option>
            {uniqueAlignments.map((alignment) => (
              <option key={alignment} value={alignment}>
                {alignment}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 批量操作面板 */}
      {selectedCharacterIds.size > 0 && (
        <div className="p-4 bg-muse-950/30 border-b border-muse-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-muse-400">
              已选择 {selectedCharacterIds.size} 个角色
            </span>
            <button
              onClick={() => setSelectedCharacterIds(new Set())}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              清除选择
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setBatchOperation('add')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                batchOperation === 'add'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Plus size={14} className="inline mr-1" />
              批量添加关系
            </button>
            <button
              onClick={() => setBatchOperation('modify')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                batchOperation === 'modify'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Edit2 size={14} className="inline mr-1" />
              批量修改关系
            </button>
            <button
              onClick={() => setBatchOperation('delete')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                batchOperation === 'delete'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Trash2 size={14} className="inline mr-1" />
              批量删除关系
            </button>
          </div>

          {/* 批量操作详情 */}
          {batchOperation && (
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg space-y-3">
              {batchOperation !== 'delete' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">关系类型</label>
                    <select
                      value={batchRelationType}
                      onChange={(e) => setBatchRelationType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-muse-500 outline-none"
                    >
                      {RELATION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">关系强度: {batchWeight}</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={batchWeight}
                      onChange={(e) => setBatchWeight(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">关系描述</label>
                    <input
                      type="text"
                      value={batchDescription}
                      onChange={(e) => setBatchDescription(e.target.value)}
                      placeholder="批量设置的关系描述"
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-muse-500 outline-none"
                    />
                  </div>
                </>
              )}

              {batchOperation === 'delete' && (
                <div className="text-xs text-slate-400">
                  <p>⚠️ 将删除所有选中角色的</p>
                  <p className="font-bold text-red-400 mt-1">
                    {RELATION_TYPES.find((t) => t.value === batchRelationType)?.label}关系
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={executeBatchOperation}
                  className="flex-1 px-4 py-2 bg-muse-600 hover:bg-muse-500 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  确认执行
                </button>
                <button
                  onClick={() => setBatchOperation(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 角色列表 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={toggleSelectAll}
            className="text-xs text-muse-400 hover:text-muse-300 transition-colors flex items-center gap-1"
          >
            {selectedCharacterIds.size === filteredCharacters.length ? (
              <>
                <Square size={14} />
                取消全选
              </>
            ) : (
              <>
                <CheckSquare size={14} />
                全选
              </>
            )}
          </button>
          <span className="text-xs text-slate-500">
            显示 {filteredCharacters.length} 个角色
          </span>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {filteredCharacters.map((character) => {
            const isSelected = selectedCharacterIds.has(character.id);
            const relationCount = (character.structuredRelations || []).length;

            return (
              <div
                key={character.id}
                onClick={() => toggleCharacterSelection(character.id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-muse-900/50 border border-muse-500/50'
                    : 'bg-slate-900/30 border border-transparent hover:bg-slate-800/50'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCharacterSelection(character.id);
                  }}
                  className="flex-shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare size={18} className="text-muse-400" />
                  ) : (
                    <Square size={18} className="text-slate-600" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-300">{character.name}</span>
                    <span className="text-xs text-slate-500">{character.role}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {relationCount} 个关系
                  </div>
                </div>

                {character.alignment && (
                  <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                    {character.alignment}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex gap-2">
          <button
            onClick={exportToJSON}
            className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download size={14} />
            导出 JSON
          </button>
          <button
            onClick={exportToCSV}
            className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download size={14} />
            导出 CSV
          </button>
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json,.csv';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const text = await file.text();
                try {
                  const data = JSON.parse(text);
                  onImport?.(data);
                } catch (err) {
                  alert('文件解析失败，请确保是有效的JSON或CSV格式');
                }
              };
              input.click();
            }}
            className="flex-1 px-3 py-2 bg-muse-600 hover:bg-muse-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={14} />
            导入数据
          </button>
        </div>
      </div>
    </div>
  );
};
