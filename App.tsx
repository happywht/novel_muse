import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSection, ProjectState, WorldGenConfig } from './types';
import { Dashboard } from './components/Dashboard';
import { WorldBuilder } from './components/WorldBuilder';
import { CharacterCreator } from './components/CharacterCreator';
import { PlotWeaver } from './components/PlotWeaver';
import { ChapterOutliner } from './components/ChapterOutliner/ChapterOutliner';
import { DraftingRoom } from './components/DraftingRoom';
import { EchoChamber } from './components/EchoChamber';
import { UserGuide } from './components/UserGuide';
import { Sidebar } from './components/Sidebar';
import { FolderOpen, Plus, Trash2, Save, X, Check, Download, Upload, Database, HardDrive, RefreshCw, BookOpen, AlertCircle } from 'lucide-react';
import { SettingsPanel } from './components/SettingsPanel/index';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { PromptTuner } from './components/PromptTuner';
import { CreativeCompassView } from './components/CreativeCompassView';
import { ProjectLobby } from './components/ProjectLobby';
import { useProjectStore, INITIAL_PROJECT } from './store/useProjectStore';
import { storageService, STORAGE_KEYS } from './services/storageService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useFeature } from './hooks/useFeature';
import { ConfirmDialogProvider } from './hooks/useConfirm';
import { PromptConfirmDialog } from './components/common/PromptConfirmDialog';

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

  const importFileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // Validate basic structure
        if (!parsed.project || !parsed.project.title === undefined) {
          alert('无效的 .muse 文件格式。请检查文件内容。');
          return;
        }

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
        <ProjectLobby
          projects={savedProjects}
          currentProjectId={project.id}
          onSwitchProject={handleSwitchProject}
          onCreateProject={handleCreateProject}
          onImportProject={() => importFileRef.current?.click()}
          onExportProject={handleExportProject}
          onDeleteProject={(id) => deleteProject(id)}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
        <main className="flex-1 p-6 overflow-auto">
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
        </main>
      </div>

      {/* User Guide Modal */}
      {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}

      {/* Settings Panel Modal */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Prompt Tuner Modal */}
      {showPromptTuner && <PromptTuner onClose={() => setShowPromptTuner(false)} />}

      {/* AI Call Confirmation Dialog (Global) */}
      <PromptConfirmDialog />
    </div>
    </ConfirmDialogProvider>
    </ErrorBoundary>
  );
};

export default App;