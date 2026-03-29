import React from 'react';
import {
  FolderOpen,
  Plus,
  Upload,
  Download,
  Trash2,
  Clock,
  BookOpen,
  Users,
  Calendar,
} from 'lucide-react';
import { ProjectState, AppSection } from '../types';

interface ProjectLobbyProps {
  projects: ProjectState[];
  currentProjectId: string;
  onSwitchProject: (id: string) => void;
  onCreateProject: () => void;
  onImportProject: () => void;
  onExportProject: (proj: ProjectState) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectLobby: React.FC<ProjectLobbyProps> = ({
  projects,
  currentProjectId,
  onSwitchProject,
  onCreateProject,
  onImportProject,
  onExportProject,
  onDeleteProject,
}) => {
  const sortedProjects = [...projects].sort((a, b) => b.lastModified - a.lastModified);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col animate-fade-in pb-20">
      {/* Header Section */}
      <header className="pt-20 pb-12 px-8 flex flex-col items-center text-center max-w-6xl mx-auto w-full">
        <div className="w-20 h-20 bg-muse-600/20 rounded-3xl flex items-center justify-center mb-6 border border-muse-500/30 shadow-2xl shadow-muse-500/10">
          <FolderOpen size={40} className="text-muse-400" />
        </div>
        <h1 className="text-5xl font-serif font-bold text-white mb-4 tracking-tight">我的宇宙库</h1>
        <p className="text-slate-400 text-lg max-w-2xl mb-10 leading-relaxed">
          欢迎回来。在这里管理你所有的文学宇宙，从宏观设定到微观情节，开启你的下一段创作旅程。
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={onCreateProject}
            className="px-8 py-3.5 bg-muse-600 hover:bg-muse-500 text-white rounded-2xl font-bold flex items-center gap-2.5 transition-all shadow-lg shadow-muse-500/20 active:scale-95 group"
          >
            <Plus size={20} className="transition-transform group-hover:rotate-90" />
            创建新模型 / 宇宙
          </button>
          <button
            onClick={onImportProject}
            className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold flex items-center gap-2.5 transition-all border border-slate-700 active:scale-95"
          >
            <Upload size={20} />
            导入 .muse 档案
          </button>
        </div>
      </header>

      {/* Projects Grid */}
      <main className="flex-1 px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map((project) => (
            <div
              key={project.id}
              className={`group relative bg-slate-900/40 border rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-muse-500/5 hover:-translate-y-1 ${
                currentProjectId === project.id
                  ? 'border-muse-500/60 ring-1 ring-muse-500/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExportProject(project);
                  }}
                  className="p-2.5 bg-slate-800/80 backdrop-blur-md rounded-xl text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition-colors border border-slate-700"
                  title="备份项目"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  className="p-2.5 bg-slate-800/80 backdrop-blur-md rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors border border-slate-700"
                  title="删除归档"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Card Content */}
              <div
                className="p-8 cursor-pointer h-full flex flex-col"
                onClick={() => onSwitchProject(project.id)}
              >
                <div className="mb-6 flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      currentProjectId === project.id
                        ? 'bg-muse-500/20 text-muse-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <BookOpen size={24} />
                  </div>
                  {currentProjectId === project.id && (
                    <span className="text-[10px] uppercase font-black bg-muse-500 text-white px-2.5 py-1 rounded-full tracking-widest shadow-lg shadow-muse-500/30">
                      Active
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-serif font-bold text-white mb-2 line-clamp-1 group-hover:text-muse-400 transition-colors">
                  {project.title || '未命名宇宙'}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-8 leading-relaxed italic">
                  {project.premise || '暂无背景设定。点击进入后在“创世纪”中定义你的宇宙观。'}
                </p>

                <div className="mt-auto pt-6 border-t border-slate-800/50 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={14} className="text-slate-600" />
                    <span>{new Date(project.lastModified).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Users size={14} className="text-slate-600" />
                    <span>{project.characters.length} 个角色</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={14} className="text-slate-600" />
                    <span>{project.genre || '未分类'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <BookOpen size={14} className="text-slate-600" />
                    <span>{project.chapters.length} 章节</span>
                  </div>
                </div>
              </div>

              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-muse-500/0 via-muse-500/0 to-muse-500/5 pointer-events-none" />
            </div>
          ))}

          {/* New Project Empty Card */}
          <button
            onClick={onCreateProject}
            className="group aspect-[4/3] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-muse-500/40 hover:bg-muse-500/5 transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-muse-500 group-hover:text-white transition-all text-slate-500">
              <Plus size={28} />
            </div>
            <span className="font-bold text-slate-500 group-hover:text-muse-400 transition-colors">
              拓展新纪元
            </span>
          </button>
        </div>
      </main>
    </div>
  );
};
