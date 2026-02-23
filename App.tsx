import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSection, ProjectState, WorldGenConfig } from './types';
import { Dashboard } from './components/Dashboard';
import { WorldBuilder } from './components/WorldBuilder';
import { CharacterCreator } from './components/CharacterCreator';
import { PlotWeaver } from './components/PlotWeaver';
import { DraftingRoom } from './components/DraftingRoom';
import { EchoChamber } from './components/EchoChamber';
import { UserGuide } from './components/UserGuide';
import { Layout, Feather, Globe, Users, BookOpen, Menu, HelpCircle, FolderOpen, Plus, Trash2, Save, X, Check, PenTool, Activity, Download, Upload, Settings, Database, HardDrive, GitBranch } from 'lucide-react';
import { SettingsPanel } from './components/SettingsPanel';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { isBackendAvailable, fetchProjectList, fetchProject, syncProject, deleteProjectApi } from './services/apiService';

const INITIAL_PROJECT: ProjectState = {
  id: 'default-project',
  lastModified: Date.now(),
  title: '',
  genre: '',
  premise: '',
  creativeSettings: {
    tone: '平衡 (Balanced)',
    style: '通俗易懂 (Standard)',
    creativity: 0.8,
    targetAudience: '大众读者'
  },
  worldGenConfig: {
    detailLevel: 'Standard',
    focus: 'Balanced'
  },
  characters: [],
  worldSettings: [],
  plotOutline: '',
  plotHistory: [],
  drafts: [],
  chapters: [],
  echoes: [],
  timeline: [],
  currentWorldDate: '元年'
};

const MUSE_FILE_VERSION = '1.0';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [project, setProject] = useState<ProjectState>(INITIAL_PROJECT);
  const [showGuide, setShowGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const importFileRef = React.useRef<HTMLInputElement>(null);

  // Backend state
  const [useBackend, setUseBackend] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(true); // Prevent auto-save during initial load

  // Project Management State
  const [showProjectList, setShowProjectList] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ProjectState[]>([]);

  // Load projects on mount: try backend first, fallback to localStorage
  useEffect(() => {
    const init = async () => {
      isLoadingRef.current = true;
      const backendOk = await isBackendAvailable();
      setUseBackend(backendOk);

      if (backendOk) {
        console.log('🚀 Backend connected! Loading from MySQL...');
        try {
          const list = await fetchProjectList();
          if (list.length > 0) {
            // Load the most recent project
            const sorted = list.sort((a, b) => b.lastModified - a.lastModified);
            const fullProject = await fetchProject(sorted[0].id);
            const merged = { ...INITIAL_PROJECT, ...fullProject };
            setProject(merged);
            // Build savedProjects from summaries (lightweight)
            setSavedProjects(list.map(s => ({ ...INITIAL_PROJECT, id: s.id, title: s.title, genre: s.genre, lastModified: s.lastModified } as ProjectState)));
          } else {
            // No projects in DB — check localStorage for migration
            const stored = localStorage.getItem('muse_projects');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('📦 Migrating localStorage projects to MySQL...');
                for (const proj of parsed) {
                  await syncProject(proj);
                }
                const mostRecent = parsed.sort((a: any, b: any) => b.lastModified - a.lastModified)[0];
                setProject({ ...INITIAL_PROJECT, ...mostRecent });
                setSavedProjects(parsed);
                isLoadingRef.current = false;
                return;
              }
            }
            // Brand new user
            const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
            await syncProject(newProj);
            setProject(newProj);
            setSavedProjects([newProj]);
          }
        } catch (err) {
          console.warn('Backend load failed, falling back to localStorage', err);
          setUseBackend(false);
          loadFromLocalStorage();
        }
      } else {
        console.log('💾 Backend unavailable, using localStorage');
        loadFromLocalStorage();
      }
      isLoadingRef.current = false;
    };

    const loadFromLocalStorage = () => {
      const stored = localStorage.getItem('muse_projects');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedProjects(parsed);
            const mostRecent = parsed.sort((a: any, b: any) => b.lastModified - a.lastModified)[0];
            setProject({ ...INITIAL_PROJECT, ...mostRecent });
          } else {
            const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
            setProject(newProj);
            setSavedProjects([newProj]);
          }
        } catch (e) {
          console.error('Failed to load projects', e);
        }
      } else {
        const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
        setProject(newProj);
        setSavedProjects([newProj]);
      }
    };

    init();
  }, []);

  // Auto-save effect: debounced, saves to both localStorage AND backend
  useEffect(() => {
    if (!project.id || isLoadingRef.current) return;

    // Always update localStorage immediately
    setSavedProjects(prev => {
      const index = prev.findIndex(p => p.id === project.id);
      let newList;
      const updatedProject = { ...project, lastModified: Date.now() };
      if (index >= 0) {
        newList = [...prev];
        newList[index] = updatedProject;
      } else {
        newList = [...prev, updatedProject];
      }
      localStorage.setItem('muse_projects', JSON.stringify(newList));
      return newList;
    });

    // Debounced backend sync (2 seconds after last change)
    if (useBackend) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await syncProject({ ...project, lastModified: Date.now() });
        } catch (err) {
          console.warn('Backend sync failed:', err);
        }
      }, 2000);
    }
  }, [project, useBackend]);

  const updateProject = (data: Partial<ProjectState>) => {
    setProject(prev => ({ ...prev, ...data }));
  };

  const handleCreateProject = () => {
    const newProj: ProjectState = {
      ...INITIAL_PROJECT,
      id: Date.now().toString(),
      title: '未命名项目',
      lastModified: Date.now()
    };
    setProject(newProj);
    setSavedProjects(prev => [...prev, newProj]);
    setShowProjectList(false);
    setActiveSection(AppSection.DASHBOARD);
    // Sync to backend
    if (useBackend) {
      syncProject(newProj).catch(err => console.warn('Backend create sync failed:', err));
    }
  };

  const handleSwitchProject = async (id: string) => {
    if (useBackend) {
      try {
        const fullProject = await fetchProject(id);
        setProject({ ...INITIAL_PROJECT, ...fullProject });
        setShowProjectList(false);
        setActiveSection(AppSection.DASHBOARD);
        return;
      } catch (err) {
        console.warn('Backend fetch failed, using local copy', err);
      }
    }
    // Fallback to local copy
    const target = savedProjects.find(p => p.id === id);
    if (target) {
      setProject({ ...INITIAL_PROJECT, ...target });
      setShowProjectList(false);
      setActiveSection(AppSection.DASHBOARD);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (savedProjects.length <= 1) {
      alert('至少保留一个项目。');
      return;
    }
    if (window.confirm('确定要删除这个项目吗？此操作无法撤销。')) {
      const newList = savedProjects.filter(p => p.id !== id);
      setSavedProjects(newList);
      localStorage.setItem('muse_projects', JSON.stringify(newList));
      if (useBackend) {
        deleteProjectApi(id).catch(err => console.warn('Backend delete failed:', err));
      }
      if (project.id === id) {
        if (useBackend) {
          try {
            const fullProject = await fetchProject(newList[0].id);
            setProject({ ...INITIAL_PROJECT, ...fullProject });
            return;
          } catch { /* fallback below */ }
        }
        setProject(newList[0]);
      }
    }
  };

  // =====================
  // Import / Export Logic
  // =====================

  const handleExportProject = (e: React.MouseEvent, proj: ProjectState) => {
    e.stopPropagation();
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

  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
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

        setSavedProjects(prev => {
          const newList = [...prev, importedProject];
          localStorage.setItem('muse_projects', JSON.stringify(newList));
          return newList;
        });

        setProject(importedProject);
        setShowProjectList(false);
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

  const navItems = [
    { id: AppSection.DASHBOARD, label: '创世纪 (Genesis)', icon: Feather },
    { id: AppSection.WORLD, label: '万象织机 (World)', icon: Globe, hasEchoes: project.echoes?.some(e => e.type === 'WORLD' && e.status === 'PENDING') },
    { id: AppSection.CHARACTERS, label: '灵魂熔炉 (Cast)', icon: Users, hasEchoes: project.echoes?.some(e => e.type === 'CHARACTER' && e.status === 'PENDING') },
    { id: AppSection.PLOT, label: '情节罗盘 (Plot)', icon: BookOpen },
    { id: AppSection.DRAFTING, label: '自动工坊 (Forge)', icon: PenTool },
    { id: AppSection.ECHOES, label: '命运回响 (Echoes)', icon: Activity },
    { id: AppSection.GRAPH, label: '星图引擎 (Graph)', icon: GitBranch },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-muse-500/30 selection:text-muse-100 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {/* Project Switcher Trigger */}
          <button
            onClick={() => setShowProjectList(true)}
            className="flex items-center gap-3 hover:bg-slate-800 p-2 rounded-lg transition-colors group"
          >
            <div className="w-8 h-8 bg-gradient-to-tr from-muse-600 to-muse-400 rounded-lg flex items-center justify-center shadow-lg shadow-muse-500/20 group-hover:scale-105 transition-transform">
              <FolderOpen className="text-white" size={16} />
            </div>
            <div className="text-left hidden sm:block">
              <h1 className="font-serif font-bold text-sm tracking-tight text-white leading-tight">{project.title || "未命名项目"}</h1>
              <span className="text-[10px] text-slate-500 font-mono">点击切换项目</span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeSection === item.id
                ? 'bg-muse-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
            >
              <item.icon size={16} />
              <span className="hidden md:inline">{item.label}</span>
              {item.hasEchoes && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              )}
            </button>
          ))}
        </div>

        <div className="w-auto flex items-center gap-4 text-right">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${useBackend ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`} title={useBackend ? '数据存储在 MySQL 数据库中' : '数据存储在浏览器本地'}>
            {useBackend ? <Database size={12} /> : <HardDrive size={12} />}
            <span className="hidden sm:inline">{useBackend ? 'MySQL' : '本地'}</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="text-slate-400 hover:text-muse-400 transition-colors flex items-center gap-1 text-sm font-medium"
            title="全局设置"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">设置</span>
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="text-slate-400 hover:text-muse-400 transition-colors flex items-center gap-1 text-sm font-medium"
            title="使用说明"
          >
            <HelpCircle size={18} />
            <span className="hidden sm:inline">说明书</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-hidden max-w-7xl mx-auto w-full">
        {activeSection === AppSection.DASHBOARD && (
          <Dashboard project={project} updateProject={updateProject} />
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
        {activeSection === AppSection.DRAFTING && (
          <DraftingRoom project={project} updateProject={updateProject} />
        )}
        {activeSection === AppSection.ECHOES && (
          <EchoChamber project={project} updateProject={updateProject} />
        )}
        {activeSection === AppSection.GRAPH && (
          <KnowledgeGraph projectId={project.id} useBackend={useBackend} />
        )}
      </main>

      {/* Project List Modal */}
      {showProjectList && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                <FolderOpen size={20} className="text-muse-400" />
                我的项目库
              </h3>
              <button onClick={() => setShowProjectList(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar flex-1">
              {savedProjects.sort((a, b) => b.lastModified - a.lastModified).map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSwitchProject(p.id)}
                  className={`p-4 rounded-xl cursor-pointer flex justify-between items-center group transition-all border ${project.id === p.id ? 'bg-muse-900/30 border-muse-500/50' : 'bg-slate-800/50 border-transparent hover:bg-slate-800'}`}
                >
                  <div className="flex-1">
                    <h4 className={`font-bold ${project.id === p.id ? 'text-muse-200' : 'text-slate-200 group-hover:text-white'}`}>
                      {p.title || "未命名项目"}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>{new Date(p.lastModified).toLocaleString()}</span>
                      <span>• {p.genre || "未定义类型"}</span>
                      <span>• {p.characters.length} 角色</span>
                    </div>
                  </div>
                  {project.id === p.id && <Check size={18} className="text-muse-400 mr-2" />}
                  <button
                    onClick={(e) => handleExportProject(e, p)}
                    className="p-2 text-slate-600 hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-colors"
                    title="导出为 .muse 文件"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProject(e, p.id)}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="删除项目"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-950/30 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 bg-muse-600 hover:bg-muse-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <Plus size={18} /> 新建项目
                </button>
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 border border-slate-600"
                >
                  <Upload size={18} /> 导入 .muse
                </button>
              </div>
              <input
                ref={importFileRef}
                type="file"
                accept=".muse,.json"
                onChange={handleImportProject}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* User Guide Modal */}
      {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}

      {/* Settings Panel Modal */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default App;