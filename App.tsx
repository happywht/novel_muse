import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { AppSection, ProjectState, WorldGenConfig } from './types';
// 懒加载主要业务模块以优化首屏性能
import { Sidebar } from '@/components/layout/Sidebar';
import { FolderOpen, Plus, Trash2, Save, X, Check, Download, Upload, Database, HardDrive, RefreshCw, BookOpen, AlertCircle } from 'lucide-react';
import { useProjectStore, INITIAL_PROJECT } from '@/store';
import { storageService, STORAGE_KEYS } from '@/services/storageService';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useFeature } from '@/hooks/useFeature';
import { ConfirmDialogProvider } from '@/hooks/useConfirm';
import { FeatureFlagProvider } from '@/contexts/FeatureFlagContext';
import { PromptConfirmDialog } from '@/components/modules/shared/common/PromptConfirmDialog';
import { Loader } from '@/components/ui/Loader';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { DataSourceIndicator } from '@/components/ui/DataSourceIndicator';

// ==================== 懒加载组件 ====================
// 主要业务模块 - 按需加载，减少首屏 bundle 大小
// 统一使用 m.default 访问默认导出，确保React.lazy()能正确识别
const Dashboard = lazy(() => import('@/components/Dashboard').then(m => ({ default: m.default })));
const WorldBuilder = lazy(() => import('@/components/modules/world').then(m => ({ default: m.default })));
const CharacterCreator = lazy(() => import('@/components/modules/character').then(m => ({ default: m.default })));
const PlotWeaver = lazy(() => import('@/components/modules/plot').then(m => ({ default: m.default })));
const ChapterOutliner = lazy(() => import('@/components/modules/plot/chapters/ChapterOutliner').then(m => ({ default: m.default })));
const DraftingRoom = lazy(() => import('@/components/modules/drafting').then(m => ({ default: m.default })));
const EchoChamber = lazy(() => import('@/components/modules/echo').then(m => ({ default: m.default })));
const UserGuide = lazy(() => import('@/components/UserGuide').then(m => ({ default: m.default })));
const SettingsPanel = lazy(() => import('@/components/modules/shared/SettingsPanel/index').then(m => ({ default: m.default })));
const KnowledgeGraph = lazy(() => import('@/components/KnowledgeGraph').then(m => ({ default: m.default })));
const PromptTuner = lazy(() => import('@/components/modules/shared/PromptTuner').then(m => ({ default: m.default })));
const CreativeCompassView = lazy(() => import('@/components/modules/drafting/CreativeCompassView').then(m => ({ default: m.default })));
const ProjectLobby = lazy(() => import('@/components/layout/ProjectLobby').then(m => ({ default: m.default })));
const TemplateEditor = lazy(() => import('@/components/modules/shared/TemplateEditor').then(m => ({ default: m.default })));

// 加载状态组件
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px] w-full">
    <Loader text="加载中..." />
  </div>
);

const MUSE_FILE_VERSION = '1.0';

const App: React.FC = () => {
  // 切片化订阅 - 只订阅需要的部分，避免重渲染
  const project = useProjectStore(state => state.project);
  const activeSection = useProjectStore(state => state.activeSection);
  const savedProjects = useProjectStore(state => state.savedProjects);
  const useBackend = useProjectStore(state => state.useBackend);
  const isSaving = useProjectStore(state => state.isSaving);
  const isLoading = useProjectStore(state => state.isLoading);
  const showGuide = useProjectStore(state => state.showGuide);
  const showSettings = useProjectStore(state => state.showSettings);
  const showPromptTuner = useProjectStore(state => state.showPromptTuner);

  const setActiveSection = useProjectStore(state => state.setActiveSection);
  const setShowGuide = useProjectStore(state => state.setShowGuide);
  const setShowSettings = useProjectStore(state => state.setShowSettings);
  const setShowPromptTuner = useProjectStore(state => state.setShowPromptTuner);
  const updateProject = useProjectStore(state => state.updateProject);
  const initialize = useProjectStore(state => state.initialize);
  const createProject = useProjectStore(state => state.createProject);
  const switchProject = useProjectStore(state => state.switchProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const forceSync = useProjectStore(state => state.forceSync);
  const lastError = useProjectStore(state => state.lastError);

  // Feature flags from global config
  const enableEchoSystem = useFeature('enableEchoSystem');
  const enableKnowledgeGraph = useFeature('enableKnowledgeGraph');

  // 性能优化：网络状态监控
  const isOnline = useNetworkStatus();

  const importFileRef = React.useRef<HTMLInputElement>(null);

  // 模态框焦点管理refs
  const settingsPanelRef = React.useRef<HTMLDivElement>(null);
  const promptTunerRef = React.useRef<HTMLDivElement>(null);
  const userGuideRef = React.useRef<HTMLDivElement>(null);

  // 为模态框应用焦点陷阱
  useFocusTrap(showSettings, settingsPanelRef);
  useFocusTrap(showPromptTuner, promptTunerRef);
  useFocusTrap(showGuide, userGuideRef);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // 🚀 优化：在初始化期间显示骨架屏而不是白屏
  if (isLoading && activeSection === AppSection.LOBBY) {
    return <LoadingSkeleton />;
  }

  const handleCreateProject = () => {
    createProject();
    setActiveSection(AppSection.DASHBOARD);
  };

  const handleSwitchProject = (id: string) => {
    switchProject(id);
    setActiveSection(AppSection.DASHBOARD);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个项目吗？此操作无法撤销。')) {
      deleteProject(id);
    }
  };

  // =====================
  // Import / Export Logic
  // =====================

  const handleExportProject = (proj: ProjectState) => {
    const exportData = {
      _museFileVersion: MUSE_FILE_VERSION,
      _exportedAt: new Date().toISOString(),
      project: proj,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.title || '未命名项目'}_${new Date().toISOString().slice(0, 10)}.muse`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ Import: No file selected');
      return;
    }

    console.log('✅ Import: File selected:', file.name, file.size, 'bytes');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        console.log('📄 Import: File content loaded, length:', text.length);

        const parsed = JSON.parse(text);
        console.log('📦 Import: Parsed JSON:', parsed);

        // Validate basic structure (FIXED: corrected logic)
        if (!parsed.project || parsed.project.title === undefined) {
          console.error('❌ Import: Invalid file structure', { hasProject: !!parsed.project, hasTitle: parsed.project?.title });
          alert('无效的 .muse 文件格式。请检查文件内容。');
          return;
        }

        console.log('✅ Import: Validation passed');

        const importedProject: ProjectState = {
          ...INITIAL_PROJECT, // Ensure all fields exist (schema safety)
          ...parsed.project,
          id: Date.now().toString(), // Assign new unique ID to avoid collisions
          lastModified: Date.now(),
        };

        console.log('🆕 Import: Created project:', importedProject);

        const { setSavedProjects, setProject, setActiveSection, savedProjects } = useProjectStore.getState();
        const newList = [...savedProjects, importedProject];

        console.log('💾 Import: Saving to storage...', newList.length, 'projects');

        await storageService.setItem(STORAGE_KEYS.PROJECTS, newList);
        setSavedProjects(newList);

        console.log('✅ Import: Storage updated, switching to project');

        setProject(importedProject);
        setActiveSection(AppSection.DASHBOARD);
        alert(`成功导入项目「${importedProject.title}」！`);
      } catch (err) {
        console.error('❌ Import failed:', err);
        alert('导入失败：文件内容不是有效的 JSON 格式。');
      }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be imported again
    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

        const importedProject: ProjectState = {
          ...INITIAL_PROJECT, // Ensure all fields exist (schema safety)
          ...parsed.project,
          id: Date.now().toString(), // Assign new unique ID to avoid collisions
          lastModified: Date.now(),
        };

        const { setSavedProjects, setProject, setActiveSection, savedProjects } = useProjectStore.getState();
        const newList = [...savedProjects, importedProject];

        await storageService.setItem(STORAGE_KEYS.PROJECTS, newList);
        setSavedProjects(newList);

        setProject(importedProject);
        setActiveSection(AppSection.DASHBOARD);
        alert(`成功导入项目「${importedProject.title}」！`);
      } catch (err) {
        console.error('Import failed:', err);
        alert('导入失败：文件内容不是有效的 JSON 格式。');
      }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be imported again
    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

  if (activeSection === AppSection.LOBBY) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <ProjectLobby
            projects={savedProjects}
            currentProjectId={project.id}
            onSwitchProject={handleSwitchProject}
            onCreateProject={handleCreateProject}
            onImportProject={() => importFileRef.current?.click()}
            onExportProject={handleExportProject}
            onDeleteProject={(id) => deleteProject(id)}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <FeatureFlagProvider>
      <ConfirmDialogProvider>
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-muse-500/30 selection:text-muse-100 flex">
      {/* Hidden file input for import */}
      <input
        ref={importFileRef}
        type="file"
        accept=".muse,.json"
        onChange={handleImportProject}
        className="hidden"
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onOpenSettings={() => setShowSettings(true)}
        onOpenPromptTuner={() => setShowPromptTuner(true)}
        onOpenGuide={() => setShowGuide(true)}
        hasCharEchoes={project.echoes?.some(e => e.type === 'CHARACTER' && e.status === 'PENDING')}
        hasWorldEchoes={project.echoes?.some(e => e.type === 'WORLD' && e.status === 'PENDING')}
        useBackend={useBackend}
        isOnline={isOnline}
      />

      {/* Main wrapper (offset by sidebar) */}
      <div className="flex-1 flex flex-col ml-[68px] min-h-screen">
        {/* New Enhanced Topbar */}
        <header className="h-14 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <BookOpen size={16} className="text-muse-400" />
              <span className="text-xs font-bold uppercase tracking-widest opacity-50">Project</span>
            </div>
            <h1 className="font-serif font-bold text-base text-white tracking-tight">{project.title || "未命名宇宙"}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* 数据来源指示器 - 性能优化版 */}
            <DataSourceIndicator useBackend={useBackend} isOnline={isOnline} />

            {/* Sync Hub */}
            <div className="flex items-center bg-slate-950/50 rounded-2xl border border-slate-800/50 p-1 pr-3 gap-3">
              <div className={`flex items-center gap-1.5 text-[10px] uppercase font-bold px-3 py-1.5 rounded-xl border ${useBackend ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-amber-400 border-amber-500/20 bg-amber-500/5'}`}>
                {useBackend ? <Database size={10} /> : <HardDrive size={10} />}
                <span>{useBackend ? 'MySQL Sync' : 'IndexedDB'}</span>
              </div>

              <div className="flex items-center gap-2">
                {isSaving ? (
                  <div className="flex items-center gap-2 px-1">
                    <RefreshCw size={14} className="text-muse-400 animate-spin" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Syncing...</span>
                  </div>
                ) : (
                  <button
                    onClick={forceSync}
                    className="flex items-center gap-2 px-1 group text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    <Check size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Saved</span>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => handleExportProject(project)}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              title="导出当前宇宙"
            >
              <Download size={18} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 p-6 overflow-auto" tabIndex={-1}>
          <Suspense fallback={<LoadingFallback />}>
            {activeSection === AppSection.DASHBOARD && (
              <Dashboard project={project} updateProject={updateProject} onImportProject={() => importFileRef.current?.click()} />
            )}
            {activeSection === AppSection.WORLD && (
              <WorldBuilder project={project} updateProject={updateProject} />
            )}
            {activeSection === AppSection.CHARACTERS && (
              <CharacterCreator project={project} updateProject={updateProject} />
            )}
            {activeSection === AppSection.PLOT && (
              <PlotWeaver project={project} updateProject={updateProject} />
            )}
            {activeSection === AppSection.OUTLINER && (
              <ChapterOutliner project={project} updateProject={updateProject} />
            )}
            {activeSection === AppSection.DRAFTING && (
              <DraftingRoom project={project} updateProject={updateProject} />
            )}
            {activeSection === AppSection.ECHOES && (
              enableEchoSystem ? (
                <EchoChamber project={project} updateProject={updateProject} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-[#0b1222] animate-fade-in p-6">
                  <AlertCircle size={48} className="text-slate-600 mb-4" />
                  <h3 className="text-lg font-bold text-slate-400 mb-2">Echo系统已禁用</h3>
                  <p className="text-sm text-slate-500">请在「设置 → 高级 → 功能开关」中启用Echo系统</p>
                </div>
              )
            )}
            {activeSection === AppSection.GRAPH && (
              enableKnowledgeGraph ? (
                <div className="flex-1 flex flex-col min-h-0 bg-[#0b1222] animate-fade-in relative z-10 p-6">
                  <KnowledgeGraph projectId={project.id} useBackend={useBackend} projectData={project} updateProject={updateProject} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-[#0b1222] animate-fade-in p-6">
                  <AlertCircle size={48} className="text-slate-600 mb-4" />
                  <h3 className="text-lg font-bold text-slate-400 mb-2">知识图谱已禁用</h3>
                  <p className="text-sm text-slate-500">请在「设置 → 高级 → 功能开关」中启用知识图谱</p>
                </div>
              )
            )}
            {activeSection === AppSection.CREATIVE_COMPASS && (
              <CreativeCompassView project={project} updateProject={updateProject} />
            )}
            {activeSection === AppSection.TEMPLATE_EDITOR && (
              <TemplateEditor project={project} updateProject={updateProject} />
            )}
          </Suspense>
        </main>
      </div>

      {/* User Guide Modal */}
      {showGuide && (
        <Suspense fallback={<LoadingFallback />}>
          <div ref={userGuideRef} role="dialog" aria-modal="true" aria-labelledby="user-guide-title">
            <UserGuide onClose={() => setShowGuide(false)} />
          </div>
        </Suspense>
      )}

      {/* Settings Panel Modal */}
      {showSettings && (
        <Suspense fallback={<LoadingFallback />}>
          <div ref={settingsPanelRef} role="dialog" aria-modal="true" aria-labelledby="settings-panel-title">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        </Suspense>
      )}

      {/* Prompt Tuner Modal */}
      {showPromptTuner && (
        <Suspense fallback={<LoadingFallback />}>
          <div ref={promptTunerRef} role="dialog" aria-modal="true" aria-labelledby="prompt-tuner-title">
            <PromptTuner onClose={() => setShowPromptTuner(false)} />
          </div>
        </Suspense>
      )}

      {/* AI Call Confirmation Dialog (Global) */}
      <PromptConfirmDialog />
    </div>
    </ConfirmDialogProvider>
    </FeatureFlagProvider>
    </ErrorBoundary>
  );
};

export default App;