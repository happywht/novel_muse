/**
 * CharacterTagCloud - 角色标签云组件
 *
 * 功能：
 * - 统计所有角色的标签及其出现次数
 * - 按频率排序展示标签云
 * - 点击标签可筛选角色
 * - 标签大小根据频率调整
 */

import React from 'react';
import { Tag, X } from 'lucide-react';
import type { Character } from '@/types';

interface CharacterTagCloudProps {
  characters: Character[];
  selectedTags?: string[];
  onTagSelect?: (tag: string) => void;
  onTagDeselect?: (tag: string) => void;
  onCharacterSelect?: (characterId: string) => void;
  maxTags?: number;
}

export const CharacterTagCloud: React.FC<CharacterTagCloudProps> = ({
  characters,
  selectedTags = [],
  onTagSelect,
  onTagDeselect,
  onCharacterSelect,
  maxTags = 20
}) => {
  // 收集所有标签及其出现次数
  const tagCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};

    characters.forEach(char => {
      (char.tags || []).forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    return counts;
  }, [characters]);

  // 按出现次数排序并限制数量
  const sortedTags = React.useMemo(() => {
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTags);
  }, [tagCounts, maxTags]);

  // 计算标签字体大小（基于频率）
  const getTagStyle = (count: number) => {
    const maxCount = Math.max(...Object.values(tagCounts));
    const minSize = 0.75; // 最小字体大小（rem）
    const maxSize = 1.25; // 最大字体大小（rem）

    const normalizedCount = count / maxCount;
    const fontSize = minSize + (maxSize - minSize) * normalizedCount;

    return {
      fontSize: `${fontSize}rem`,
      opacity: 0.6 + (0.4 * normalizedCount), // 频率越高越不透明
    };
  };

  // 处理标签点击
  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagDeselect?.(tag);
    } else {
      onTagSelect?.(tag);
    }
  };

  // 获取匹配选定标签的角色
  const getFilteredCharacters = (tag: string) => {
    return characters.filter(c => (c.tags || []).includes(tag));
  };

  if (sortedTags.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 text-center">
        <Tag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">暂无角色标签</p>
        <p className="text-xs text-slate-600 mt-1">为角色添加标签后将在此处显示</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Tag className="w-4 h-4 text-cyan-400" />
          角色标签云
        </h4>
        <span className="text-xs text-slate-500">{sortedTags.length} 个标签</span>
      </div>

      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <div className="mb-4 pb-4 border-b border-slate-700/50">
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="px-3 py-1.5 bg-muse-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-muse-500 transition-colors"
              >
                {tag}
                <X size={12} />
              </button>
            ))}
          </div>
          {onCharacterSelect && (
            <button
              onClick={() => {
                const filteredChars = characters.filter(c =>
                  selectedTags.every(tag => (c.tags || []).includes(tag))
                );
                if (filteredChars.length === 1) {
                  onCharacterSelect(filteredChars[0].id);
                }
              }}
              className="mt-2 text-xs text-muse-400 hover:text-muse-300 transition-colors"
            >
              {(() => {
                const filteredChars = characters.filter(c =>
                  selectedTags.every(tag => (c.tags || []).includes(tag))
                );
                return `查看匹配角色 (${filteredChars.length})`;
              })()}
            </button>
          )}
        </div>
      )}

      {/* 标签云 */}
      <div className="flex flex-wrap gap-2">
        {sortedTags.map(([tag, count]) => {
          const isSelected = selectedTags.includes(tag);
          const filteredCharacters = getFilteredCharacters(tag);

          return (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-muse-600 text-white shadow-lg shadow-muse-900/40'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-300 border border-slate-700'}
              `}
              style={isSelected ? undefined : getTagStyle(count)}
              title={`${count} 个角色: ${filteredCharacters.map(c => c.name).join(', ')}`}
            >
              {tag}
              <span className={`
                ml-1.5 px-1.5 py-0.5 rounded text-[10px]
                ${isSelected
                  ? 'bg-muse-500 text-white'
                  : 'bg-slate-800 text-slate-500'}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 标签统计 */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-300">{sortedTags.length}</div>
            <div className="text-slate-500">标签总数</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-300">
              {characters.filter(c => c.tags && c.tags.length > 0).length}
            </div>
            <div className="text-slate-500">有标签角色</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-300">
              {Math.round(
                characters.reduce((sum, c) => sum + (c.tags?.length || 0), 0) /
                (characters.length || 1) * 10
              ) / 10}
            </div>
            <div className="text-slate-500">平均标签数</div>
          </div>
        </div>
      </div>
    </div>
  );
};
