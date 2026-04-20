/**
 * 性能优化示例组件
 *
 * 展示如何使用新的 Store API 来优化组件性能
 */

import React, { memo } from 'react';
import { useProjectStore } from './index';
import {
  selectProjectTitle,
  selectProjectCharacters,
  selectActiveSection,
  selectUpdateProject,
  selectProjectInfo,
  selectSyncStatus,
  createSectionChecker,
  createCharacterGraphSelector,
} from './selectors';
import { AppSection } from '../types';

// ============================================================
// ❌ 性能较差的组件（订阅过多不必要的状态）
// ============================================================

export const BadPerformanceComponent: React.FC = () => {
  // 这个组件订阅了整个 state，任何状态变化都会导致重渲染
  const { project, activeSection, useBackend, isSaving, lastError } = useProjectStore();

  return (
    <div>
      <h1>{project.title}</h1>
      <p>当前页面: {activeSection}</p>
      {useBackend && <p>后端模式</p>}
      {isSaving && <p>保存中...</p>}
      {lastError && <p className="error">{lastError}</p>}
    </div>
  );
};

// ============================================================
// ✅ 性能优化后的组件（精确订阅）
// ============================================================

export const GoodPerformanceComponent: React.FC = () => {
  // 只订阅需要的状态，避免不必要的重渲染
  const title = useProjectStore(selectProjectTitle);
  const activeSection = useProjectStore(selectActiveSection);
  const useBackend = useProjectStore(state => state.useBackend);
  const isSaving = useProjectStore(selectIsSaving);
  const lastError = useProjectStore(selectLastError);

  return (
    <div>
      <h1>{title}</h1>
      <p>当前页面: {activeSection}</p>
      {useBackend && <p>后端模式</p>}
      {isSaving && <p>保存中...</p>}
      {lastError && <p className="error">{lastError}</p>}
    </div>
  );
};

// ============================================================
// ✅ 使用复合 Selectors 的组件
// ============================================================

export const OptimizedHeaderComponent: React.FC = () => {
  // 使用复合 selector 一次获取多个相关属性
  const projectInfo = useProjectStore(selectProjectInfo);
  const syncStatus = useProjectStore(selectSyncStatus);

  return (
    <header className="project-header">
      <h1>{projectInfo.title}</h1>
      <div className="meta">
        <span>类型: {projectInfo.genre}</span>
        <span>最后修改: {new Date(projectInfo.lastModified).toLocaleString()}</span>
        {syncStatus.useBackend && (
          <span className="sync-indicator">
            {syncStatus.isSaving ? '💾 保存中...' : '☁️ 已同步'}
          </span>
        )}
        {syncStatus.lastError && (
          <span className="error">❌ {syncStatus.lastError}</span>
        )}
      </div>
    </header>
  );
};

// ============================================================
// ✅ 使用专用 Hooks 的组件
// ============================================================

import { useProjectInfo, useSyncStatus, useUIActions } from './index';

export const ModernComponent: React.FC = () => {
  // 使用专用 hooks，代码更简洁
  const projectInfo = useProjectInfo();
  const syncStatus = useSyncStatus();
  const { setActiveSection } = useUIActions();

  const handleNavigateToDashboard = () => {
    setActiveSection(AppSection.DASHBOARD);
  };

  return (
    <div>
      <h1>{projectInfo.title}</h1>
      <button onClick={handleNavigateToDashboard}>
        前往仪表盘
      </button>
      {syncStatus.isSaving && <p>保存中...</p>}
    </div>
  );
};

// ============================================================
// ✅ 条件渲染优化
// ============================================================

export const ConditionalRenderComponent: React.FC = () => {
  // 使用 selector 创建器检查特定条件
  const isDashboard = useProjectStore(createSectionChecker(AppSection.DASHBOARD));
  const isCharacters = useProjectStore(createSectionChecker(AppSection.CHARACTERS));

  return (
    <div>
      {isDashboard && <DashboardView />}
      {isCharacters && <CharactersView />}
      {!isDashboard && !isCharacters && <DefaultView />}
    </div>
  );
};

// ============================================================
// ✅ 列表渲染优化
// ============================================================

interface CharacterCardProps {
  id: string;
  name: string;
  role: string;
  onUpdate: (id: string, data: any) => void;
}

// 使用 memo 避免不必要的重渲染
const CharacterCard: React.FC<CharacterCardProps> = memo(({ id, name, role, onUpdate }) => {
  return (
    <div className="character-card">
      <h3>{name}</h3>
      <p>角色: {role}</p>
      <button onClick={() => onUpdate(id, { name: `${name} (已更新)` })}>
        更新
      </button>
    </div>
  );
});

export const OptimizedCharacterList: React.FC = () => {
  // 只订阅角色列表和更新函数
  const characters = useProjectStore(selectProjectCharacters);
  const updateProject = useProjectStore(selectUpdateProject);

  const handleUpdateCharacter = (id: string, data: any) => {
    const updatedCharacters = characters.map(char =>
      char.id === id ? { ...char, ...data } : char
    );
    updateProject({ characters: updatedCharacters });
  };

  return (
    <div className="character-list">
      {characters.map(char => (
        <CharacterCard
          key={char.id}
          id={char.id}
          name={char.name}
          role={char.role}
          onUpdate={handleUpdateCharacter}
        />
      ))}
    </div>
  );
};

// ============================================================
// ✅ 复杂组件优化示例
// ============================================================

export const ComplexComponent: React.FC = () => {
  // 分别订阅不同的状态域，避免相互影响
  const title = useProjectStore(selectProjectTitle);
  const activeSection = useProjectStore(selectActiveSection);
  const characters = useProjectStore(selectProjectCharacters);

  // 只订阅需要的操作函数
  const updateProject = useProjectStore(selectUpdateProject);
  const setActiveSection = useProjectStore(selectSetActiveSection);

  const handleTitleChange = (newTitle: string) => {
    updateProject({ title: newTitle });
  };

  const handleSectionChange = (section: AppSection) => {
    setActiveSection(section);
  };

  return (
    <div>
      <input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="项目标题"
      />
      <nav>
        <button
          className={activeSection === AppSection.DASHBOARD ? 'active' : ''}
          onClick={() => handleSectionChange(AppSection.DASHBOARD)}
        >
          仪表盘
        </button>
        <button
          className={activeSection === AppSection.CHARACTERS ? 'active' : ''}
          onClick={() => handleSectionChange(AppSection.CHARACTERS)}
        >
          角色
        </button>
      </nav>
      <div className="character-count">
        角色数量: {characters.length}
      </div>
    </div>
  );
};

// ============================================================
// ✅ 图谱数据查询优化
// ============================================================

export const CharacterGraphComponent: React.FC<{ characterId: string }> = ({ characterId }) => {
  // 使用专用的图谱数据 selector
  const characterGraph = useProjectStore(
    createCharacterGraphSelector(characterId)
  );

  if (characterGraph.isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div className="character-graph">
      <h3>角色图谱数据</h3>
      {characterGraph.traits && (
        <div>
          <h4>特征</h4>
          <p>欲望: {characterGraph.traits.desire || '未知'}</p>
          <p>恐惧: {characterGraph.traits.fear || '未知'}</p>
        </div>
      )}
      {characterGraph.evolution && (
        <div>
          <h4>演化历史</h4>
          <ul>
            {characterGraph.evolution.map((item, index) => (
              <li key={index}>{item.description}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 辅助组件
// ============================================================

const DashboardView: React.FC = () => <div>仪表盘视图</div>;
const CharactersView: React.FC = () => <div>角色视图</div>;
const DefaultView: React.FC = () => <div>默认视图</div>;

export default {
  BadPerformanceComponent,
  GoodPerformanceComponent,
  OptimizedHeaderComponent,
  ModernComponent,
  ConditionalRenderComponent,
  OptimizedCharacterList,
  ComplexComponent,
  CharacterGraphComponent,
};
