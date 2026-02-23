import React, { useState, useEffect } from 'react';
import { ProjectState, WorldSetting, WorldGenConfig, Echo } from '../types';
import { generateText, expandWorldLore } from '../services/geminiService';
import { Loader } from './Loader';
import { Globe, Plus, Trash2, Map, Shield, Users, Scroll, BookPlus, AlertCircle, CheckCircle, Settings2, Eye, Cpu, BookOpen, GitCommit, Check, Edit2, Save, X, Search } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface WorldBuilderProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

// Mapped for UI display
const CATEGORIES: {id: WorldSetting['category'], label: string, icon: React.FC<any>}[] = [
  { id: 'Geography', label: '地理地貌', icon: Map },
  { id: 'Magic/Tech', label: '魔法/科技', icon: SparklesIcon }, 
  { id: 'Society', label: '社会人文', icon: Users },
  { id: 'History', label: '历史传说', icon: Scroll },
  { id: 'Other', label: '其他设定', icon: Globe },
];

function SparklesIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
}

export const WorldBuilder: React.FC<WorldBuilderProps> = ({ project, updateProject }) => {
  const [selectedCategory, setSelectedCategory] = useState<WorldSetting['category']>('Geography');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [activeLoreId, setActiveLoreId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Form State
  const [newItemTitle, setNewItemTitle] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success'} | null>(null);

  const activeLore = project.worldSettings.find(w => w.id === activeLoreId);
  // Default config if not present (migration safety)
  const genConfig = project.worldGenConfig || { detailLevel: 'Standard', focus: 'Balanced' };

  // Sync edit content when active lore changes
  useEffect(() => {
      if (activeLore) {
          setEditContent(activeLore.content);
          setIsEditing(false);
      }
  }, [activeLoreId]);

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
      setToast({msg, type});
      setTimeout(() => setToast(null), 3000);
  };

  const updateConfig = (key: keyof WorldGenConfig, value: string) => {
      updateProject({
          worldGenConfig: {
              ...genConfig,
              [key]: value
          }
      });
  };

  const handleGenerateLore = async () => {
    if (!project.premise) {
        showToast("请先在“基础设定”页面完善小说核心梗概。", 'error');
        return;
    }
    
    setIsGenerating(true);
    try {
      // Construct prompt with config
      let configInstruction = "";
      if (genConfig.detailLevel === 'Brief') configInstruction += "生成的描述要简短精炼，不超过200字。";
      if (genConfig.detailLevel === 'Detailed') configInstruction += "生成的描述要非常详尽，包含大量细节，至少500字。";
      
      if (genConfig.focus === 'Sensory') configInstruction += " 重点描写视觉、听觉、嗅觉等感官体验，营造沉浸感。";
      if (genConfig.focus === 'Logic') configInstruction += " 重点解释其运作原理、规则逻辑和合理性。";
      if (genConfig.focus === 'History') configInstruction += " 重点描述其历史起源和随着时间的演变。";

      const prompt = `基于小说梗概: "${project.premise}" 和类型: "${project.genre}".
      请为一个小说创建一个详细的世界观设定条目，类别为: ${selectedCategory}.
      
      主题: ${newItemTitle || '该世界的一个关键要素'}
      
      【生成配置要求】：
      ${configInstruction}
      
      通用要求：
      1. 保持内部逻辑一致性。
      2. 包含有趣的钩子或设定。
      3. 请使用中文输出。`;

      const content = await generateText(prompt, "你是一位擅长奇幻和科幻小说的世界观架构师。", project.creativeSettings);
      
      const newSetting: WorldSetting = {
        id: Date.now().toString(),
        category: selectedCategory,
        title: newItemTitle || `自动生成的${selectedCategory}设定`,
        content: content
      };

      updateProject({
        worldSettings: [...project.worldSettings, newSetting]
      });
      setActiveLoreId(newSetting.id);
      setNewItemTitle('');

    } catch (e) {
      console.error(e);
      showToast("生成失败，请重试。", 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExpandLore = async () => {
      if (!activeLore) return;
      setIsExpanding(true);
      try {
          const addedContent = await expandWorldLore(activeLore.title, activeLore.content, project.genre, project.creativeSettings);
          
          const updatedContent = `${activeLore.content}\n\n---\n\n### 📜 历史渊源与文化影响\n\n${addedContent}`;
          
          const updatedSettings = project.worldSettings.map(s => 
              s.id === activeLore.id ? { ...s, content: updatedContent } : s
          );

          updateProject({ worldSettings: updatedSettings });
          setEditContent(updatedContent); // Update edit buffer
      } catch (e) {
          console.error(e);
          showToast("扩展内容失败，请重试。", 'error');
      } finally {
          setIsExpanding(false);
      }
  };

  const handleSaveEdit = () => {
      if (!activeLore) return;
      const updatedSettings = project.worldSettings.map(s => 
          s.id === activeLore.id ? { ...s, content: editContent } : s
      );
      updateProject({ worldSettings: updatedSettings });
      setIsEditing(false);
      showToast("设定已保存", 'success');
  };

  const deleteLore = (id: string) => {
    if (!window.confirm("确定要删除这个设定条目吗？此操作无法撤销。")) return;
    
    updateProject({
        worldSettings: project.worldSettings.filter(w => w.id !== id)
    });
    if (activeLoreId === id) setActiveLoreId(null);
    showToast("设定已删除", 'success');
  };

  const handleAcceptEcho = (echo: Echo) => {
      if (!activeLore) return;
      const updatedSettings = project.worldSettings.map(w => {
          if (w.id === echo.targetId) {
              const time = new Date(echo.timestamp).toLocaleDateString();
              const newContent = `${w.content}\n\n> [命运回响 ${time}] ${echo.description}`;
              return { ...w, content: newContent };
          }
          return w;
      });
      const updatedEchoes = (project.echoes || []).map(e => e.id === echo.id ? { ...e, status: 'ACCEPTED' as const } : e);
      updateProject({ worldSettings: updatedSettings, echoes: updatedEchoes });
  };

  const handleRejectEcho = (echo: Echo) => {
      const updatedEchoes = (project.echoes || []).map(e => e.id === echo.id ? { ...e, status: 'REJECTED' as const } : e);
      updateProject({ echoes: updatedEchoes });
  };

  const activeLoreEchoes = (project.echoes || []).filter(e => e.targetId === activeLoreId && e.status === 'PENDING');

  // Filter settings based on category AND search query
  const filteredSettings = project.worldSettings.filter(w => 
      w.category === selectedCategory && 
      w.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
       {/* Sidebar */}
       <div className="w-1/3 flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden relative">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex flex-col gap-3">
             <div className="flex justify-between items-center">
                 <h2 className="font-serif font-bold text-lg text-white">世界观档案</h2>
                 <button 
                    onClick={() => setShowConfig(!showConfig)}
                    className={`p-1.5 rounded-lg transition-colors ${showConfig ? 'bg-muse-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    title="生成配置"
                 >
                     <Settings2 size={18} />
                 </button>
             </div>
             
             {/* Config Panel (Collapsible) */}
             {showConfig && (
                 <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-700 space-y-3 animate-fade-in text-sm">
                     <div>
                         <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">详略程度</label>
                         <div className="flex gap-1">
                             {['Brief', 'Standard', 'Detailed'].map((level) => (
                                 <button 
                                    key={level}
                                    onClick={() => updateConfig('detailLevel', level)}
                                    className={`flex-1 py-1 px-2 rounded text-xs border ${genConfig.detailLevel === level ? 'bg-muse-900 border-muse-500 text-muse-200' : 'bg-slate-800 border-transparent text-slate-400'}`}
                                 >
                                     {level === 'Brief' ? '简短' : level === 'Standard' ? '标准' : '详尽'}
                                 </button>
                             ))}
                         </div>
                     </div>
                     <div>
                         <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">侧重方向</label>
                         <div className="grid grid-cols-2 gap-1">
                             {[
                                 {k: 'Balanced', l: '平衡', i: BookOpen},
                                 {k: 'Sensory', l: '感官描写', i: Eye},
                                 {k: 'Logic', l: '逻辑原理', i: Cpu},
                                 {k: 'History', l: '历史渊源', i: Scroll}
                             ].map((opt) => (
                                 <button 
                                    key={opt.k}
                                    onClick={() => updateConfig('focus', opt.k)}
                                    className={`flex items-center justify-center gap-1 py-1 px-2 rounded text-xs border ${genConfig.focus === opt.k ? 'bg-muse-900 border-muse-500 text-muse-200' : 'bg-slate-800 border-transparent text-slate-400'}`}
                                 >
                                     <opt.i size={10} /> {opt.l}
                                 </button>
                             ))}
                         </div>
                     </div>
                  </div>
             )}

             {/* Category Tabs */}
             <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide pt-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors min-w-[40px] ${selectedCategory === cat.id ? 'bg-muse-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                        title={cat.label}
                    >
                        <cat.icon size={18} />
                    </button>
                ))}
             </div>
             
             {/* Search Bar */}
             <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                 <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`搜索${CATEGORIES.find(c => c.id === selectedCategory)?.label}...`}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:border-muse-500 outline-none"
                 />
             </div>
          </div>

          {/* List of Items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             <div className="p-2">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="新建词条标题..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-muse-500 outline-none"
                    />
                    <button 
                        onClick={handleGenerateLore}
                        disabled={isGenerating}
                        className="bg-muse-600 hover:bg-muse-500 text-white p-2 rounded-md disabled:opacity-50"
                    >
                        {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Plus size={18} />}
                    </button>
                </div>
             </div>

             {filteredSettings.map(lore => {
                 const hasEcho = (project.echoes || []).some(e => e.targetId === lore.id && e.status === 'PENDING');
                 return (
                 <div 
                    key={lore.id}
                    onClick={() => setActiveLoreId(lore.id)}
                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group relative overflow-hidden ${activeLoreId === lore.id ? 'bg-muse-900/50 border border-muse-500/50' : 'bg-slate-800 hover:bg-slate-750 border border-transparent'} ${hasEcho && activeLoreId !== lore.id ? 'shadow-[0_0_15px_rgba(34,211,238,0.15)] border-cyan-900/50' : ''}`}
                 >
                    {hasEcho && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
                    )}
                    <span className={`font-medium truncate ${hasEcho ? 'text-cyan-100' : 'text-slate-200'}`}>{lore.title}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteLore(lore.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                    >
                        <Trash2 size={16} />
                    </button>
                 </div>
             )})}

             {filteredSettings.length === 0 && (
                 <div className="text-center text-slate-500 text-sm mt-8 italic">
                     {searchQuery ? "未找到匹配条目" : "暂无条目"}
                 </div>
             )}
          </div>
       </div>

       {/* Content Area */}
       <div className="w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-8 overflow-y-auto relative custom-scrollbar shadow-inner flex flex-col">
            {activeLore ? (
                <div className="animate-fade-in flex-1 flex flex-col">
                     {/* Echo Proposals */}
                     {activeLoreEchoes.length > 0 && !isEditing && (
                         <div className="mb-6 space-y-3">
                             {activeLoreEchoes.map(echo => (
                                 <div key={echo.id} className="bg-slate-900/80 border border-cyan-900/50 rounded-xl p-4 shadow-[0_0_20px_rgba(34,211,238,0.05)] relative overflow-hidden animate-fade-in">
                                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400/50 to-cyan-500/0"></div>
                                     <div className="flex items-start gap-3">
                                         <div className="mt-1 p-1.5 bg-cyan-950 rounded-lg text-cyan-400">
                                             <GitCommit size={16} />
                                         </div>
                                         <div className="flex-1">
                                             <h4 className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-1 flex items-center gap-2">
                                                 🌌 命运回响 (系统洞察)
                                             </h4>
                                             <p className="text-sm text-slate-300 mb-2 leading-relaxed">
                                                 AI 观测到在最新剧情中，世界线发生了变动：<br/>
                                                 <span className="text-white font-medium">新增规则/状态：[{echo.description}]</span>
                                             </p>
                                             <p className="text-xs text-slate-500 italic mb-4 border-l-2 border-slate-700 pl-2">
                                                 "{echo.reason}"
                                             </p>
                                             <div className="flex gap-2">
                                                 <button 
                                                     onClick={() => handleAcceptEcho(echo)}
                                                     className="text-xs bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                                                 >
                                                     <Check size={12} /> 接受并铭刻
                                                 </button>
                                                 <button 
                                                     onClick={() => handleRejectEcho(echo)}
                                                     className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
                                                 >
                                                     忽略，这只是平行宇宙的幻影
                                                 </button>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}

                    <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                        <div>
                            <span className="text-xs font-bold tracking-wider text-muse-400 uppercase bg-muse-900/30 px-2 py-1 rounded">
                                {CATEGORIES.find(c => c.id === activeLore.category)?.label}
                            </span>
                            <h1 className="text-3xl font-serif font-bold text-white mt-2">{activeLore.title}</h1>
                        </div>
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-all flex items-center gap-2"
                                    >
                                        <X size={16} /> 取消
                                    </button>
                                    <button 
                                        onClick={handleSaveEdit}
                                        className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg border border-emerald-500 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                                    >
                                        <Save size={16} /> 保存
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-all flex items-center gap-2"
                                    >
                                        <Edit2 size={16} /> 编辑
                                    </button>
                                    <button 
                                        onClick={handleExpandLore}
                                        disabled={isExpanding || isGenerating}
                                        className="text-sm bg-slate-800 hover:bg-muse-900 text-muse-300 hover:text-white px-3 py-2 rounded-lg border border-slate-700 hover:border-muse-500 transition-all flex items-center gap-2"
                                    >
                                        {isExpanding ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div> : <BookPlus size={16} />}
                                        扩展历史与文化
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {isEditing ? (
                        <textarea 
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="flex-1 w-full bg-slate-950/50 border border-slate-700 rounded-lg p-4 text-slate-300 font-serif leading-relaxed text-lg resize-none focus:border-muse-500 outline-none custom-scrollbar"
                        />
                    ) : (
                        <div className="prose prose-invert prose-slate max-w-none pb-20">
                            <MarkdownRenderer content={activeLore.content} />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4">
                    <Globe size={64} className="opacity-20" />
                    <p>选择或生成一个设定条目以查看详情。</p>
                </div>
            )}
            
            {(isGenerating || isExpanding) && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader text={isExpanding ? "正在挖掘历史..." : `正在编织${CATEGORIES.find(c => c.id === selectedCategory)?.label}...`} />
                </div>
            )}
       </div>

       {/* Toast Notification */}
      {toast && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 transition-all animate-fade-in font-medium text-sm flex items-center gap-2 border ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'}`}>
              {toast.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle size={16}/>}
              <span>{toast.msg}</span>
          </div>
      )}
    </div>
  );
};