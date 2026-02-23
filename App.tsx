import React, { useState, useEffect } from 'react';
import { AppSection, ProjectState, WorldGenConfig } from './types';
import { Dashboard } from './components/Dashboard';
import { WorldBuilder } from './components/WorldBuilder';
import { CharacterCreator } from './components/CharacterCreator';
import { PlotWeaver } from './components/PlotWeaver';
import { DraftingRoom } from './components/DraftingRoom';
import { EchoChamber } from './components/EchoChamber';
import { UserGuide } from './components/UserGuide';
import { Layout, Feather, Globe, Users, BookOpen, Menu, HelpCircle, FolderOpen, Plus, Trash2, Save, X, Check, PenTool, Activity } from 'lucide-react';

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

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [project, setProject] = useState<ProjectState>(INITIAL_PROJECT);
  const [showGuide, setShowGuide] = useState(false);
  
  // Project Management State
  const [showProjectList, setShowProjectList] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ProjectState[]>([]);

  // Load projects from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('muse_projects');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
           setSavedProjects(parsed);
           // Load the most recent project
           const mostRecent = parsed.sort((a, b) => b.lastModified - a.lastModified)[0];
           setProject({ ...INITIAL_PROJECT, ...mostRecent }); // Merge to ensure new fields like drafts exist
        } else {
           // Initialize with a fresh project if list is empty but exists
           const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
           setProject(newProj);
           setSavedProjects([newProj]);
        }
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    } else {
       // First time user
       const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
       setProject(newProj);
       setSavedProjects([newProj]);
    }
  }, []);

  // Auto-save effect: Update the specific project in the list whenever 'project' changes
  useEffect(() => {
    if (!project.id) return;

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
  }, [project]); // Dependency on 'project' means it saves on every edit. 
  // In a real app, you might want to debounce this, but for local state it's usually fine.

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
  };

  const handleSwitchProject = (id: string) => {
      const target = savedProjects.find(p => p.id === id);
      if (target) {
          setProject({ ...INITIAL_PROJECT, ...target }); // Merge to ensure schema safety
          setShowProjectList(false);
          setActiveSection(AppSection.DASHBOARD);
      }
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (savedProjects.length <= 1) {
          alert("至少保留一个项目。");
          return;
      }
      if (window.confirm("确定要删除这个项目吗？此操作无法撤销。")) {
          const newList = savedProjects.filter(p => p.id !== id);
          setSavedProjects(newList);
          localStorage.setItem('muse_projects', JSON.stringify(newList));
          
          if (project.id === id) {
              setProject(newList[0]);
          }
      }
  };

  const navItems = [
    { id: AppSection.DASHBOARD, label: '创世纪 (Genesis)', icon: Feather },
    { id: AppSection.WORLD, label: '万象织机 (World)', icon: Globe, hasEchoes: project.echoes?.some(e => e.type === 'WORLD' && e.status === 'PENDING') },
    { id: AppSection.CHARACTERS, label: '灵魂熔炉 (Cast)', icon: Users, hasEchoes: project.echoes?.some(e => e.type === 'CHARACTER' && e.status === 'PENDING') },
    { id: AppSection.PLOT, label: '情节罗盘 (Plot)', icon: BookOpen },
    { id: AppSection.DRAFTING, label: '自动工坊 (Forge)', icon: PenTool },
    { id: AppSection.ECHOES, label: '命运回响 (Echoes)', icon: Activity },
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
                className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeSection === item.id 
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
                    <button onClick={() => setShowProjectList(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar flex-1">
                    {savedProjects.sort((a,b) => b.lastModified - a.lastModified).map(p => (
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
                                onClick={(e) => handleDeleteProject(e, p.id)}
                                className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                title="删除项目"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-950/30">
                    <button 
                        onClick={handleCreateProject}
                        className="w-full bg-muse-600 hover:bg-muse-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        <Plus size={18} /> 新建创作项目
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* User Guide Modal */}
      {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export default App;