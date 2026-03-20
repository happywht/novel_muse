/**
 * CharacterRelations 组件集成示例
 *
 * 本文件展示如何在现有组件中集成和使用 CharacterRelations 组件
 */

import React, { useState } from 'react';
import { Character, ProjectState } from '../types';
import { CharacterRelations } from './CharacterRelations';
import { User, X } from 'lucide-react';

/**
 * 示例1: 在角色详情面板中使用
 */
interface CharacterDetailPanelProps {
  character: Character;
  allCharacters: Character[];
  onClose: () => void;
  onNavigateToCharacter: (id: string) => void;
}

export const CharacterDetailPanel: React.FC<CharacterDetailPanelProps> = ({
  character,
  allCharacters,
  onClose,
  onNavigateToCharacter,
}) => {
  const [isEditingRelations, setIsEditingRelations] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-muse-400" />
            <h2 className="text-2xl font-bold">{character.name}</h2>
            <span className="text-sm text-slate-400">({character.role})</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 角色描述 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-300">角色描述</h3>
            <p className="text-slate-400">{character.description}</p>
          </div>

          {/* 角色关系 - 使用我们的新组件 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-300">角色关系</h3>
            <CharacterRelations
              character={character}
              allCharacters={allCharacters}
              onNavigateToCharacter={onNavigateToCharacter}
              onEdit={() => setIsEditingRelations(true)}
            />
          </div>
        </div>
      </div>

      {/* 关系编辑对话框（示例） */}
      {isEditingRelations && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">编辑角色关系</h3>
            <p className="text-slate-400 text-sm mb-4">
              这里可以集成关系编辑表单...
            </p>
            <button
              onClick={() => setIsEditingRelations(false)}
              className="w-full px-4 py-2 bg-muse-600 hover:bg-muse-700 rounded-lg"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 示例2: 在角色列表中快速预览关系
 */
interface CharacterListItemProps {
  character: Character;
  allCharacters: Character[];
  onSelect: () => void;
}

export const CharacterListItem: React.FC<CharacterListItemProps> = ({
  character,
  allCharacters,
  onSelect,
}) => {
  const [showRelations, setShowRelations] = useState(false);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-muse-400" />
          <div>
            <h4 className="font-semibold">{character.name}</h4>
            <p className="text-sm text-slate-400">{character.role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRelations(!showRelations)}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            {showRelations ? '隐藏关系' : '查看关系'}
          </button>
          <button
            onClick={onSelect}
            className="px-3 py-1.5 text-sm bg-muse-600 hover:bg-muse-700 rounded-lg transition-colors"
          >
            查看详情
          </button>
        </div>
      </div>

      {/* 展开关系视图 */}
      {showRelations && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <CharacterRelations
            character={character}
            allCharacters={allCharacters}
            onNavigateToCharacter={(id) => {
              // 可以在这里实现导航逻辑
              console.log('Navigate to character:', id);
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * 示例3: 在 Zustand Store 中集成
 */
import { useProjectStore } from '../store/useProjectStore';

export const CharacterManagerWithStore: React.FC = () => {
  const { project, updateProject } = useProjectStore();
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);

  const activeCharacter = project.characters.find((c) => c.id === activeCharacterId);

  const handleNavigateToCharacter = (characterId: string) => {
    setActiveCharacterId(characterId);
    // 或者滚动到对应位置
    const element = document.getElementById(`character-${characterId}`);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEditRelations = () => {
    // 打开关系编辑对话框
    console.log('Open relation editor for:', activeCharacterId);
  };

  if (!activeCharacter) {
    return (
      <div className="p-6">
        <p className="text-slate-400">请选择一个角色查看关系</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CharacterRelations
        character={activeCharacter}
        allCharacters={project.characters}
        onNavigateToCharacter={handleNavigateToCharacter}
        onEdit={handleEditRelations}
      />
    </div>
  );
};

/**
 * 示例4: 与现有 CharacterCreator 组件集成
 *
 * 在 CharacterCreator.tsx 中添加关系展示:
 */
export const IntegrationWithCharacterCreator: React.FC<{
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}> = ({ project, updateProject }) => {
  // ... 现有的 CharacterCreator 代码 ...

  // 在角色详情部分添加关系组件
  const renderCharacterDetails = (char: Character) => {
    return (
      <div className="space-y-6">
        {/* 现有的角色信息展示 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">基本信息</h3>
          <p className="text-slate-400">{char.description}</p>
        </div>

        {/* 添加关系展示 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">人际关系</h3>
          <CharacterRelations
            character={char}
            allCharacters={project.characters}
            onNavigateToCharacter={(id) => {
              // 跳转到对应角色
              const charElement = document.querySelector(`[data-character-id="${id}"]`);
              charElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            onEdit={() => {
              // 打开关系编辑界面
              // 这里可以调用现有的编辑逻辑
            }}
          />
        </div>
      </div>
    );
  };

  return null; // 实际使用时返回完整的组件
};

/**
 * 使用建议：
 *
 * 1. 在角色详情页展示完整关系
 * 2. 在角色列表中提供快速预览
 * 3. 在知识图谱中作为侧边栏详情
 * 4. 在关系编辑器中作为只读预览
 */
