/**
 * CharacterWorldRelationSelector - 角色-世界设定关联选择器
 *
 * 支持编辑的地理关联：
 * - originLocation: 起源地/出生地
 * - residence: 当前居住地
 * - controlledTerritories: 控制领地（多选）
 * - exiledFrom: 流放地（多选）
 */

import React from 'react';
import { MapPin, Home, Crown, Ban, Globe } from 'lucide-react';
import type { Character, WorldSetting } from '@/types';

interface CharacterWorldRelationSelectorProps {
  character: Character;
  worldSettings: WorldSetting[];
  onUpdate: (updates: Partial<Character>) => void;
  readonly?: boolean;
}

export const CharacterWorldRelationSelector: React.FC<CharacterWorldRelationSelectorProps> = ({
  character,
  worldSettings,
  onUpdate,
  readonly = false
}) => {
  // 过滤出地理位置类别的世界设定
  const geographySettings = worldSettings.filter(w => w.category === 'Geography');

  const getLocationLabel = (id: string | undefined) => {
    if (!id) return '未设定';
    const setting = worldSettings.find(w => w.id === id);
    return setting?.title || '未知地点';
  };

  // 检查是否有任何地理关联
  const hasAnyGeographicRelation =
    character.originLocation ||
    character.residence ||
    (character.controlledTerritories && character.controlledTerritories.length > 0) ||
    (character.exiledFrom && character.exiledFrom.length > 0);

  if (!hasAnyGeographicRelation && readonly) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          地理关联
        </h4>
      </div>

      <div className="space-y-3">
        {/* 起源地/出生地 */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-green-400" />
            起源/出生地
          </label>
          {readonly ? (
            <div className="text-sm text-slate-300">
              {getLocationLabel(character.originLocation)}
            </div>
          ) : (
            <select
              value={character.originLocation || ''}
              onChange={(e) => onUpdate({ originLocation: e.target.value || undefined })}
              disabled={readonly}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">未设定</option>
              {geographySettings.map(w => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 当前居住地 */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            当前居住地
          </label>
          {readonly ? (
            <div className="text-sm text-slate-300">
              {getLocationLabel(character.residence)}
            </div>
          ) : (
            <select
              value={character.residence || ''}
              onChange={(e) => onUpdate({ residence: e.target.value || undefined })}
              disabled={readonly}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">未设定</option>
              {geographySettings.map(w => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 控制领地（多选） */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            控制领地
          </label>
          {readonly ? (
            <div className="flex flex-wrap gap-1.5">
              {(character.controlledTerritories || []).map(territoryId => {
                const territory = worldSettings.find(w => w.id === territoryId);
                return (
                  <span
                    key={territoryId}
                    className="px-2.5 py-1 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs"
                  >
                    {territory?.title || territoryId}
                  </span>
                );
              })}
              {(character.controlledTerritories || []).length === 0 && (
                <span className="text-sm text-slate-500">未设定</span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {geographySettings.map(w => {
                const isSelected = (character.controlledTerritories || []).includes(w.id);
                return (
                  <label
                    key={w.id}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all
                      ${isSelected
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                        : 'bg-slate-900 text-slate-500 border border-slate-700 hover:border-slate-600'}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const territories = character.controlledTerritories || [];
                        if (e.target.checked) {
                          onUpdate({ controlledTerritories: [...territories, w.id] });
                        } else {
                          onUpdate({ controlledTerritories: territories.filter(id => id !== w.id) });
                        }
                      }}
                      disabled={readonly}
                      className="hidden"
                    />
                    {w.title}
                  </label>
                );
              })}
              {geographySettings.length === 0 && (
                <span className="text-xs text-slate-500">暂无可用的地理位置设定</span>
              )}
            </div>
          )}
        </div>

        {/* 流放地（多选） */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5 text-red-400" />
            流放地
          </label>
          {readonly ? (
            <div className="flex flex-wrap gap-1.5">
              {(character.exiledFrom || []).map(exiledId => {
                const location = worldSettings.find(w => w.id === exiledId);
                return (
                  <span
                    key={exiledId}
                    className="px-2.5 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-xs"
                  >
                    {location?.title || exiledId}
                  </span>
                );
              })}
              {(character.exiledFrom || []).length === 0 && (
                <span className="text-sm text-slate-500">未设定</span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {geographySettings.map(w => {
                const isSelected = (character.exiledFrom || []).includes(w.id);
                return (
                  <label
                    key={w.id}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all
                      ${isSelected
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                        : 'bg-slate-900 text-slate-500 border border-slate-700 hover:border-slate-600'}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const exiledFrom = character.exiledFrom || [];
                        if (e.target.checked) {
                          onUpdate({ exiledFrom: [...exiledFrom, w.id] });
                        } else {
                          onUpdate({ exiledFrom: exiledFrom.filter(id => id !== w.id) });
                        }
                      }}
                      disabled={readonly}
                      className="hidden"
                    />
                    {w.title}
                  </label>
                );
              })}
              {geographySettings.length === 0 && (
                <span className="text-xs text-slate-500">暂无可用的地理位置设定</span>
              )}
            </div>
          )}
        </div>

        {/* 地理关联统计 */}
        <div className="pt-3 border-t border-slate-700/50 mt-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span>
              共关联了{' '}
              {[
                character.originLocation ? 1 : 0,
                character.residence ? 1 : 0,
                (character.controlledTerritories || []).length,
                (character.exiledFrom || []).length,
              ].reduce((a, b) => a + b, 0)}{' '}
              个地理位置
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
