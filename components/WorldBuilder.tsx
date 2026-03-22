import React from 'react';
import { ProjectState } from '../types';
import {
  WorldBuilderProvider,
  WorldList,
  WorldDetail,
  WorldForm,
  WorldDraftZone,
  WorldToast,
  WorldLoadingOverlay,
  useWorldBuilder,
} from './WorldBuilder/index';

// ============================================================
// 类型定义
// ============================================================

interface WorldBuilderProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

// ============================================================
// 内部组件 - 负责渲染内容区域
// ============================================================

const WorldBuilderContent: React.FC = () => {
  const { activeItem, draftLore } = useWorldBuilder();

  // 根据状态决定显示哪个组件
  const renderContent = () => {
    if (activeItem) {
      return <WorldDetail />;
    }
    if (draftLore) {
      return <WorldDraftZone />;
    }
    return <WorldForm />;
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
      {/* 侧边栏 */}
      <WorldList />

      {/* 内容区域 */}
      <div className="w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-8 overflow-y-auto relative custom-scrollbar shadow-inner flex flex-col">
        {renderContent()}
      </div>

      {/* 加载遮罩 */}
      <WorldLoadingOverlay />

      {/* Toast 通知 */}
      <WorldToast />
    </div>
  );
};

// ============================================================
// 主组件
// ============================================================

export const WorldBuilder: React.FC<WorldBuilderProps> = ({ project, updateProject }) => {
  return (
    <WorldBuilderProvider project={project} updateProject={updateProject}>
      <WorldBuilderContent />
    </WorldBuilderProvider>
  );
};

export default WorldBuilder;
