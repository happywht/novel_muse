/**
 * CharacterDepthPanel - 角色深度属性编辑面板
 *
 * 支持编辑的深度属性：
 * - alignment: 道德阵营
 * - tags: 角色标签
 * - desire: 核心欲望
 * - fear: 核心恐惧
 * - signature: 标志性特征
 * - contrast: 反差萌点
 * - weakness: 弱点/缺陷
 */

import React, { useState } from 'react';
import { Sparkles, Tag, Heart, AlertTriangle, Frown, Smile, Shield } from 'lucide-react';
import type { Character } from '@/types';

interface CharacterDepthPanelProps {
  character: Character;
  onUpdate: (updates: Partial<Character>) => void;
  readonly?: boolean;
}

export const CharacterDepthPanel: React.FC<CharacterDepthPanelProps> = ({
  character,
  onUpdate,
  readonly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // 道德阵营选项
  const alignmentOptions = [
    { value: '守序善良', label: '守序善良', color: 'text-green-400' },
    { value: '中立善良', label: '中立善良', color: 'text-green-300' },
    { value: '混乱善良', label: '混乱善良', color: 'text-lime-400' },
    { value: '守序中立', label: '守序中立', color: 'text-blue-400' },
    { value: '绝对中立', label: '绝对中立', color: 'text-gray-300' },
    { value: '混乱中立', label: '混乱中立', color: 'text-cyan-400' },
    { value: '守序邪恶', label: '守序邪恶', color: 'text-red-400' },
    { value: '中立邪恶', label: '中立邪恶', color: 'text-orange-400' },
    { value: '混乱邪恶', label: '混乱邪恶', color: 'text-pink-400' },
  ];

  if (readonly && !isEditing) {
    // 只读展示模式
    const hasAnyDepthAttribute =
      character.alignment ||
      (character.tags && character.tags.length > 0) ||
      character.desire ||
      character.fear ||
      character.signature ||
      character.contrast ||
      character.weakness;

    if (!hasAnyDepthAttribute) {
      return null;
    }

    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muse-400" />
            角色深度属性
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {character.alignment && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">阵营:</span>
              <span className={alignmentOptions.find(a => a.value === character.alignment)?.color || 'text-slate-300'}>
                {character.alignment}
              </span>
            </div>
          )}
          {character.desire && (
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3 text-orange-400" />
              <span className="text-slate-300 truncate" title={character.desire}>{character.desire}</span>
            </div>
          )}
          {character.fear && (
            <div className="flex items-center gap-2">
              <Frown className="w-3 h-3 text-purple-400" />
              <span className="text-slate-300 truncate" title={character.fear}>{character.fear}</span>
            </div>
          )}
          {character.signature && (
            <div className="flex items-center gap-2 col-span-2">
              <Smile className="w-3 h-3 text-yellow-400" />
              <span className="text-slate-300 line-clamp-2" title={character.signature}>{character.signature}</span>
            </div>
          )}
          {character.tags && character.tags.length > 0 && (
            <div className="col-span-2 flex flex-wrap gap-1">
              {character.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-muse-600/20 text-muse-400 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 编辑模式
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muse-400" />
          角色深度属性
        </h4>
        {!readonly && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-muse-400 hover:text-muse-300 transition-colors"
          >
            {isEditing ? '完成' : '编辑'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          {/* 道德阵营 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              道德阵营
            </label>
            <select
              value={character.alignment || ''}
              onChange={(e) => onUpdate({ alignment: e.target.value || undefined })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-muse-500 outline-none"
            >
              <option value="">未设定</option>
              {alignmentOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 核心欲望 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Heart className="w-3 h-3 text-orange-400" />
              核心欲望
            </label>
            <input
              type="text"
              value={character.desire || ''}
              onChange={(e) => onUpdate({ desire: e.target.value || undefined })}
              placeholder="角色最想得到什么？"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-600 focus:border-muse-500 outline-none"
            />
          </div>

          {/* 核心恐惧 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Frown className="w-3 h-3 text-purple-400" />
              核心恐惧
            </label>
            <input
              type="text"
              value={character.fear || ''}
              onChange={(e) => onUpdate({ fear: e.target.value || undefined })}
              placeholder="角色最害怕什么？"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-600 focus:border-muse-500 outline-none"
            />
          </div>

          {/* 标志性特征 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Smile className="w-3 h-3 text-yellow-400" />
              标志性特征
            </label>
            <textarea
              value={character.signature || ''}
              onChange={(e) => onUpdate({ signature: e.target.value || undefined })}
              placeholder="外貌、行为、习惯、说话方式等"
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-600 focus:border-muse-500 outline-none resize-none"
            />
          </div>

          {/* 角色标签 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-cyan-400" />
              角色标签
            </label>
            <input
              type="text"
              value={(character.tags || []).join(', ')}
              onChange={(e) => {
                const tags = e.target.value
                  .split(',')
                  .map(t => t.trim())
                  .filter(t => t.length > 0);
                onUpdate({ tags: tags.length > 0 ? tags : undefined });
              }}
              placeholder="高智商低情商, 洁癖晚期, 腹黑（用逗号分隔）"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-600 focus:border-muse-500 outline-none"
            />
            {(character.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {character.tags?.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-muse-600/20 text-muse-400 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 反差萌点 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              反差萌点
            </label>
            <input
              type="text"
              value={character.contrast || ''}
              onChange={(e) => onUpdate({ contrast: e.target.value || undefined })}
              placeholder="与表面形象形成反差的特质"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-600 focus:border-muse-500 outline-none"
            />
          </div>

          {/* 弱点/缺陷 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              弱点/缺陷
            </label>
            <input
              type="text"
              value={character.weakness || ''}
              onChange={(e) => onUpdate({ weakness: e.target.value || undefined })}
              placeholder="角色的致命缺陷"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-slate-600 focus:border-muse-500 outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {character.alignment && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">阵营:</span>
              <span className={alignmentOptions.find(a => a.value === character.alignment)?.color || 'text-slate-300'}>
                {character.alignment}
              </span>
            </div>
          )}
          {character.desire && (
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3 text-orange-400" />
              <span className="text-slate-300 truncate" title={character.desire}>{character.desire}</span>
            </div>
          )}
          {character.fear && (
            <div className="flex items-center gap-2">
              <Frown className="w-3 h-3 text-purple-400" />
              <span className="text-slate-300 truncate" title={character.fear}>{character.fear}</span>
            </div>
          )}
          {character.signature && (
            <div className="flex items-center gap-2 col-span-2">
              <Smile className="w-3 h-3 text-yellow-400" />
              <span className="text-slate-300 line-clamp-2" title={character.signature}>{character.signature}</span>
            </div>
          )}
          {character.tags && character.tags.length > 0 && (
            <div className="col-span-2 flex flex-wrap gap-1">
              {character.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-muse-600/20 text-muse-400 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
