import React, { useState } from 'react';
import { ProjectState, WorldSetting, CreativeSettings } from '../types';
import { generateText, batchGenerateCharacters, batchGenerateWorldSettingsByCategory, generatePlotFromContext } from '../services/geminiService';
import { Loader } from './Loader';
import { BookOpen, Sparkles, Target, Download, Rocket, CheckCircle, ArrowRight, AlertCircle, X, Sliders, Zap, FileText, Clipboard } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DashboardProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

const WORLD_CATEGORIES: WorldSetting['category'][] = ['Geography', 'Magic/Tech', 'Society', 'History', 'Other'];

export const Dashboard: React.FC<DashboardProps> = ({ project, updateProject }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [brainstormInput, setBrainstormInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  
  // Kickstart State
  const [isKickstarting, setIsKickstarting] = useState(false);
  const [kickstartStep, setKickstartStep] = useState(0); // 0: Idle, 1: Chars, 2: World, 3: Plot
  const [kickstartStatus, setKickstartStatus] = useState('');

  // UI States for Modal and Toast
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success'} | null>(null);

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
      setToast({msg, type});
      setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateSettings = (key: keyof CreativeSettings, value: string | number) => {
    updateProject({
        creativeSettings: {
            ...project.creativeSettings,
            [key]: value
        }
    });
  };

  const handleBrainstorm = async () => {
    if (!brainstormInput.trim()) return;
    setIsGenerating(true);
    try {
      const prompt = `我有一个关于小说的初步想法： "${brainstormInput}". 
      请帮我进行结构化的头脑风暴，包含以下内容：
      1. 潜在的流派类型 (Genre) 和基调 (Tone)
      2. 3个可能的核心冲突 (Core Conflicts)
      3. 一个建议的吸引人的标题 (Title)
      4. 一个简短的“电梯游说”简介 (Premise/Elevator Pitch)
      请使用中文清晰地格式化输出。`;

      const result = await generateText(prompt, "你是一位畅销小说编辑和创意缪斯。", project.creativeSettings);
      setSuggestion(result);
      
      const titleMatch = result.match(/(?:Title|标题)[:：]\s*(.*)/i);
      if (titleMatch && titleMatch[1] && !project.title) {
        updateProject({ title: titleMatch[1].replace(/\*\*/g, '').trim() });
      }

    } catch (e) {
      setSuggestion("生成灵感时出错，请检查您的 API Key。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveIdea = () => {
    if (!suggestion) return;
    const separator = project.premise ? "\n\n---\n\n" : "";
    const newPremise = `${project.premise}${separator}${suggestion}`;
    updateProject({ premise: newPremise });
    setSuggestion('');
    setBrainstormInput('');
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.title || "novel_project"}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("项目数据已备份 (JSON)", 'success');
  };

  const generateMarkdownContent = () => {
    const { title, genre, premise, creativeSettings, characters, worldSettings, plotOutline } = project;
    
    let mdContent = `# ${title || '未命名项目'} - 设定集\n\n`;
    mdContent += `> 生成时间: ${new Date().toLocaleString()}\n`;
    mdContent += `> 创作工具: Muse 架构师\n\n`;
    
    mdContent += `## 📜 基础信息 (Overview)\n\n`;
    mdContent += `- **类型流派**: ${genre || '未定义'}\n`;
    mdContent += `- **叙事基调**: ${creativeSettings.tone}\n`;
    mdContent += `- **文字风格**: ${creativeSettings.style}\n`;
    mdContent += `- **核心梗概**: \n\n${premise || '暂无'}\n\n`;
    
    mdContent += `---\n\n`;
    
    mdContent += `## 👥 人物志 (Characters)\n\n`;
    if (characters.length === 0) mdContent += `*暂无角色数据*\n\n`;
    characters.forEach(char => {
        mdContent += `### ${char.name} (${char.role})\n\n`;
        mdContent += `> ${char.role} | ${char.archetype || '未定义原型'}\n\n`;
        mdContent += `**档案描述**:\n\n${char.description}\n\n`;
        if (char.relationships) {
            mdContent += `**🔗 关系与羁绊**:\n\n${char.relationships}\n\n`;
        }
        mdContent += `---\n\n`;
    });

    mdContent += `## 🌍 世界观 (World Building)\n\n`;
    if (worldSettings.length === 0) mdContent += `*暂无世界观设定*\n\n`;
    // Group by category
    WORLD_CATEGORIES.forEach(cat => {
        const items = worldSettings.filter(w => w.category === cat);
        if (items.length > 0) {
            mdContent += `### ${cat}\n\n`;
            items.forEach(item => {
                mdContent += `#### ${item.title}\n\n${item.content}\n\n`;
            });
        }
    });

    mdContent += `---\n\n`;

    mdContent += `## 📈 剧情大纲 (Plot Outline)\n\n`;
    mdContent += plotOutline ? plotOutline : `*暂无剧情大纲*`;
    
    return mdContent;
  };

  const handleExportMarkdown = () => {
    const mdContent = generateMarkdownContent();
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title || 'novel_project'}_Bible.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("设定集已导出为 Markdown", 'success');
  };

  const handleCopyMarkdown = () => {
      const mdContent = generateMarkdownContent();
      navigator.clipboard.writeText(mdContent);
      showToast("Markdown 内容已复制到剪贴板", 'success');
  };

  // Triggered by button click
  const requestKickstart = () => {
    if (!project.premise) {
        showToast("请先在左侧填写核心梗概 (Premise)，或使用 AI 灵感火花生成一个。", 'error');
        return;
    }
    setShowConfirmModal(true);
  };

  // Actual execution Logic
  const executeKickstart = async () => {
    setShowConfirmModal(false);
    setIsKickstarting(true);
    const genre = project.genre || "通俗小说";

    try {
        // Step 1: Characters (Heavy batch)
        setKickstartStep(1);
        setKickstartStatus("第一步：正在招募 6 位核心演员 (Soul Forge)...");
        const newChars = await batchGenerateCharacters(project.premise, genre, project.creativeSettings);
        const formattedChars = newChars.map(c => ({ ...c, id: Date.now().toString() + Math.random(), archetype: 'Initial' }));
        const updatedChars = [...project.characters, ...formattedChars];
        updateProject({ characters: updatedChars });
        
        // Step 2: World (Parallel execution for each category)
        setKickstartStep(2);
        setKickstartStatus("第二步：正在全景构建世界舞台 (World Loom)...");
        
        // Fire off requests for all categories in parallel
        const worldPromises = WORLD_CATEGORIES.map(category => 
             batchGenerateWorldSettingsByCategory(project.premise, genre, category, project.creativeSettings)
        );
        
        const worldResults = await Promise.all(worldPromises);
        // Flatten the array of arrays
        const newWorlds = worldResults.flat();
        
        const formattedWorlds = newWorlds.map(w => ({ ...w, id: Date.now().toString() + Math.random() }));
        const updatedWorlds = [...project.worldSettings, ...formattedWorlds];
        updateProject({ worldSettings: updatedWorlds });

        // Step 3: Plot (using new heavy context)
        setKickstartStep(3);
        setKickstartStatus("第三步：正在基于庞大设定推演大纲 (Plot Weaver)...");
        const newPlot = await generatePlotFromContext(project.premise, genre, updatedChars, updatedWorlds, project.creativeSettings);
        updateProject({ plotOutline: newPlot });

        setKickstartStatus("宏大叙事构建完成！");
        setTimeout(() => {
            setIsKickstarting(false);
            setKickstartStep(0);
            setKickstartStatus('');
            showToast(`初始化成功！新增 ${formattedChars.length} 角色, ${formattedWorlds.length} 世界观设定。`, 'success');
        }, 1500);

    } catch (e) {
        console.error(e);
        setKickstartStatus("初始化过程中遇到错误，请检查网络或 API Key。");
        showToast("初始化失败，请重试。", 'error');
        setTimeout(() => {
            setIsKickstarting(false);
            setKickstartStep(0);
        }, 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative">
      <header className="flex justify-between items-start">
        <div className="space-y-2">
           <h1 className="text-3xl font-bold text-white font-serif">项目概览 (Project Overview)</h1>
           <p className="text-slate-400">定义你故事的核心灵魂与创作罗盘。</p>
        </div>
        <div className="flex gap-2">
            <button
            onClick={handleCopyMarkdown}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-2 text-sm font-medium"
            title="复制 Markdown 到剪贴板"
            >
            <Clipboard size={16} />
            </button>
            <button
            onClick={handleExportMarkdown}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-2 text-sm font-medium"
            title="导出为 Markdown (适合 Obsidian/Notion)"
            >
            <FileText size={16} /> 导出文档
            </button>
            <button
            onClick={handleExportJSON}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-2 text-sm font-medium"
            title="导出为 JSON (备份数据)"
            >
            <Download size={16} /> 备份数据
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Settings */}
        <div className="lg:col-span-2 space-y-6">
             {/* Main Metadata Form */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">小说标题</label>
                        <input 
                            type="text" 
                            value={project.title} 
                            onChange={(e) => updateProject({ title: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-muse-500 outline-none placeholder-slate-600"
                            placeholder="无题·杰作"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">类型流派</label>
                        <input 
                            type="text" 
                            value={project.genre} 
                            onChange={(e) => updateProject({ genre: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-muse-500 outline-none placeholder-slate-600"
                            placeholder="例如：赛博朋克"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">核心梗概 (Premise)</label>
                    <textarea 
                        value={project.premise} 
                        onChange={(e) => updateProject({ premise: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-muse-500 outline-none placeholder-slate-600 resize-none font-serif leading-relaxed custom-scrollbar min-h-[120px]"
                        placeholder="你的故事是关于什么的？细节越丰富，AI 辅助效果越好。"
                    />
                </div>
            </div>

            {/* Creative Settings (New Feature) */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-muse-300">
                    <Sliders size={20} />
                    <h3 className="font-semibold text-white">创作罗盘 (Creative Compass)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">叙事基调 (Tone)</label>
                        <div className="grid grid-cols-3 gap-2">
                             {['黑暗', '幽默', '史诗', '悬疑', '治愈', '平衡'].map(tone => (
                                 <button
                                    key={tone}
                                    onClick={() => handleUpdateSettings('tone', tone)}
                                    className={`text-xs py-2 rounded-md border transition-all ${project.creativeSettings.tone === tone ? 'bg-muse-600 text-white border-muse-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                 >
                                     {tone}
                                 </button>
                             ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">创意温度 (Creativity): {project.creativeSettings.creativity}</label>
                        <input 
                           type="range"
                           min="0.1"
                           max="1.0"
                           step="0.1"
                           value={project.creativeSettings.creativity}
                           onChange={(e) => handleUpdateSettings('creativity', parseFloat(e.target.value))}
                           className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-muse-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>严谨保守</span>
                            <span>天马行空</span>
                        </div>
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">文字风格 (Style)</label>
                         <input 
                            type="text" 
                            value={project.creativeSettings.style} 
                            onChange={(e) => handleUpdateSettings('style', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:border-muse-500 outline-none"
                            placeholder="例如：华丽辞藻、极简主义..."
                         />
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">目标受众</label>
                         <input 
                            type="text" 
                            value={project.creativeSettings.targetAudience} 
                            onChange={(e) => handleUpdateSettings('targetAudience', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:border-muse-500 outline-none"
                            placeholder="例如：青少年、硬科幻迷..."
                         />
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Brainstorming & Kickstart */}
        <div className="flex flex-col gap-6 h-full">
            {/* Brainstorm Area */}
            <div className="bg-gradient-to-br from-muse-900/40 to-slate-900 p-6 rounded-xl border border-muse-500/30 flex flex-col flex-1 min-h-[300px]">
                <div className="flex items-center space-x-2 mb-4 text-muse-300">
                    <Sparkles size={20} />
                    <h3 className="font-semibold">AI 灵感火花</h3>
                </div>
                
                {!suggestion && !isGenerating && (
                    <div className="flex-1 flex flex-col justify-center">
                    <textarea 
                        value={brainstormInput}
                        onChange={(e) => setBrainstormInput(e.target.value)}
                        className="w-full bg-slate-950/50 border border-muse-500/20 rounded-lg p-4 text-slate-200 focus:ring-1 focus:ring-muse-400 outline-none resize-none mb-4"
                        rows={4}
                        placeholder="例如：一个能通过与鬼魂对话破案的侦探..."
                    />
                    <button 
                        onClick={handleBrainstorm}
                        className="w-full bg-muse-600 hover:bg-muse-500 text-white py-2 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                        <span>点燃灵感</span>
                        <BookOpen size={16} />
                    </button>
                    </div>
                )}

                {isGenerating && (
                    <div className="flex-1 flex items-center justify-center">
                    <Loader text="缪斯女神正在思考..." />
                    </div>
                )}

                {suggestion && !isGenerating && (
                    <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar flex flex-col">
                        <div className="bg-slate-950/50 rounded-lg p-4 text-sm flex-1 mb-4">
                        <MarkdownRenderer content={suggestion} />
                        </div>
                        <div className="flex space-x-2 shrink-0">
                        <button 
                            onClick={() => setSuggestion('')}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors"
                        >
                            清除
                        </button>
                        <button 
                            onClick={handleSaveIdea}
                            className="flex-1 bg-muse-700 hover:bg-muse-600 text-white py-2 rounded-lg text-sm transition-colors flex items-center justify-center font-medium"
                            title="复制到梗概"
                        >
                            <Target size={14} className="mr-1"/> 采纳此创意
                        </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Kickstart Project Area */}
            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden min-h-[140px]">
                <div className="z-10 relative space-y-3 w-full">
                    {!isKickstarting ? (
                        <>
                            <h3 className="text-white font-bold flex items-center justify-center gap-2">
                                <Rocket className="text-muse-400" /> 项目一键初始化
                            </h3>
                            <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                深度生成 6 位核心角色、覆盖全分类的 10+ 条世界观设定，并推演完整大纲。
                            </p>
                            <button
                                onClick={requestKickstart}
                                disabled={!project.premise}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-full font-medium text-sm transition-all shadow-lg shadow-indigo-900/50 flex items-center gap-2 mx-auto"
                            >
                                <span>✨ 启动深度创世纪</span>
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center animate-fade-in w-full px-4">
                             <div className="flex items-center gap-2 mb-3 w-full justify-center">
                                 <div className={`h-2 w-1/4 rounded-full transition-all duration-500 ${kickstartStep >= 1 ? 'bg-muse-500' : 'bg-slate-700'}`}></div>
                                 <div className={`h-2 w-1/4 rounded-full transition-all duration-500 ${kickstartStep >= 2 ? 'bg-muse-500' : 'bg-slate-700'}`}></div>
                                 <div className={`h-2 w-1/4 rounded-full transition-all duration-500 ${kickstartStep >= 3 ? 'bg-muse-500' : 'bg-slate-700'}`}></div>
                             </div>
                             <div className="flex items-center gap-3 text-white font-medium">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>{kickstartStatus}</span>
                             </div>
                        </div>
                    )}
                </div>
                {/* Decorative background pulse */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-muse-900/0 via-muse-500/5 to-muse-900/0 pointer-events-none"></div>
            </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all scale-100">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Rocket className="text-indigo-400" size={24} />
                          启动深度创世纪？
                      </h3>
                      <button onClick={() => setShowConfirmModal(false)} className="text-slate-500 hover:text-white transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="text-slate-300 text-sm leading-relaxed mb-6 space-y-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                      <p className="font-medium text-slate-200">这将基于您的<strong className="text-muse-300">创作罗盘</strong>设置，进行深度初始化：</p>
                      <ul className="space-y-1 ml-1">
                          <li className="flex items-start gap-2">
                              <span className="text-indigo-400 mt-0.5">•</span>
                              <span>生成 <strong>6 位</strong> 核心角色 (主角/反派/导师/配角)</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-indigo-400 mt-0.5">•</span>
                              <span>逐项生成 <strong>5 大类</strong> 世界观设定 (每类 2-3 条)</span>
                          </li>
                          <li className="flex items-start gap-2">
                              <span className="text-indigo-400 mt-0.5">•</span>
                              <span>基于以上庞大内容，推演<strong>完整剧情大纲</strong></span>
                          </li>
                      </ul>
                      <p className="text-xs text-amber-400/80 pt-2 border-t border-slate-700/50 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} />
                          <span>全过程可能需要 1-2 分钟，请勿关闭页面。</span>
                      </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                      <button 
                          onClick={() => setShowConfirmModal(false)}
                          className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                      >
                          取消
                      </button>
                      <button 
                          onClick={executeKickstart}
                          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/50 text-sm flex items-center gap-2"
                      >
                          确认启动 <ArrowRight size={14} />
                      </button>
                  </div>
              </div>
          </div>
      )}

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