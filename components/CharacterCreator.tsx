import React from 'react';
import { ProjectState } from '../types';
import {
  CharacterCreatorProvider,
  useCharacterCreator,
} from './CharacterCreator/CharacterCreatorContext';
import { CharacterList } from './CharacterCreator/CharacterList';
import { CharacterDetail } from './CharacterCreator/CharacterDetail';
import { CharacterChat } from './CharacterCreator/CharacterChat';
import { CharacterDraftZone } from './CharacterCreator/CharacterDraftZone';
import { PromptPanelWrapper } from './CharacterCreator/PromptPanelWrapper';

interface CharacterCreatorProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

/**
 * 角色创建器主组件
 *
 * 职责：
 * - 提供 Context Provider
 * - 组合所有子组件
 * - 协调布局
 *
 * 子组件：
 * - CharacterList: 角色列表和创建表单
 * - CharacterDetail: 角色详情展示和编辑
 * - CharacterChat: 角色扮演聊天窗口
 * - CharacterDraftZone: AI 生成草稿展示
 */
export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ project, updateProject }) => {
  return (
    <CharacterCreatorProvider project={project} updateProject={updateProject}>
      <CharacterCreatorContent />
    </CharacterCreatorProvider>
  );
};

/**
 * 内部内容组件
 * 使用 Context 中的状态来决定显示内容
 */
function CharacterCreatorContent() {
  const { draftCharacter } = useCharacterCreator();

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
      {/* 左侧：角色列表 */}
      <CharacterList />

      {/* 中间：详情或草稿 */}
      <div className="flex-1">{draftCharacter ? <CharacterDraftZone /> : <CharacterDetail />}</div>

      {/* 右侧：可折叠的 Prompt 配置面板 */}
      <PromptPanelWrapper />

      {/* 聊天弹窗 */}
      <CharacterChat />
    </div>
  );
}

export default CharacterCreator;
