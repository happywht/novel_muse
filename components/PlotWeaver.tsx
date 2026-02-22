import React, { useState } from 'react';
import { ProjectState } from '../types';
import { analyzePlot, expandScene, generatePlotFromContext, rewritePlot } from '../services/geminiService';
import { Loader } from './Loader';
import { GitBranch, Activity, Play, AlertTriangle, PenTool, Clipboard, LayoutTemplate, Wand2, Info, X, CheckCircle, AlertCircle, History, RotateCcw, Zap, RefreshCw, Save, Sidebar, User, Globe } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface PlotWeaverProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

type TabMode = 'ANALYSIS' | 'WRITING' | 'OPTIMIZE';

const STRUCTURE_TEMPLATES = [
    { name: "救猫咪 (Save the Cat)", content: "1. 开场画面 (Opening Image): \n2. 主题呈现 (Theme Stated): \n3. 铺垫 (Set-up): \n4. 催化剂 (Catalyst): \n5. 争辩 (Debate): \n6. 进入第二幕 (Break into Two): \n7. B故事 (B Story): \n8. 游戏时间 (Fun and Games): \n9. 中点 (Midpoint): \n10. 坏人逼近 (Bad Guys Close In): \n11. 一无所有 (All Is Lost): \n12. 灵魂黑夜 (Dark Night of the Soul): \n13. 进入第三幕 (Break into Three): \n14. 结局 (Finale): \n15. 终场画面 (Final Image):" }, 
    { name: "英雄之旅 (The Hero's Journey)", content: "1. 平凡世界: \n2. 冒险召唤: \n3. 拒绝召唤: \n4. 遇见导师: \n5. 跨越门槛: \n6. 试炼、盟友与敌人: \n7. 接近洞穴深处: \n8. 严峻考验 (磨难): \n9. 获得嘉奖 (宝剑): \n10. 归路: \n11. 复活 (高潮): \n12. 满载而归:" },
    { name: "三幕式结构 (Three Act)", content: "第一幕 (铺垫): \n- 激励事件: \n- 情节点一: \n\n第二幕 (对抗): \n- 试图解决问题: \n- 中点转折: \n- 一无所有时刻: \n- 情节点二: \n\n第三幕 (结局): \n- 高潮对决: \n- 新的平衡:" }
];

const REWRITE_OPTIONS = [
    { label: "🔥 增加冲突与张力", prompt: "增加剧情的冲突烈度，让反派更具压迫感，让主角的处境更绝望。" },
    { label: "🕵️‍♂️ 增加悬疑与反转", prompt: "埋下更多伏笔，并在结局或中点增加一个意想不到的剧情反转。" },
    { label: "🎭 深化情感羁绊", prompt: "着重描写角色之间的情感纠葛，增加感人或虐心的情节。" },
    { label: "⚡ 加快叙事节奏", prompt: "删除拖沓的过渡情节，让剧情更加紧凑，事件接连发生。" },
];

export const PlotWeaver: React.FC<PlotWeaverProps> = ({ project, updateProject }) => {
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPlot, setIsGeneratingPlot] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  const [showReference, setShowReference] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<TabMode>('ANALYSIS');
  
  // Writing State
  const [scenePrompt, setScenePrompt] = useState('');
  const [generatedScene, setGeneratedScene] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  // Optimization State
  const [customRewritePrompt, setCustomRewritePrompt] = useState('');

  // UI States
  // Payload for template can now be just text OR trigger AI gen
  const [pendingAction, setPendingAction] = useState<{ type: 'GENERATE' | 'TEMPLATE' | 'RESTORE', payload?: any } | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success'} | null>(null);

  const plotOutline = project.plotOutline || '';
  
  // Helper to save history before updating
  const updatePlotWithHistory = (newContent: string, note: string) => {
      const historyEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          content: plotOutline, // Save the OLD content
          note: note || `自动保存`
      };
      
      const newHistory = plotOutline ? [historyEntry, ...project.plotHistory].slice(0, 20) : project.plotHistory; 
      
      updateProject({ 
          plotOutline: newContent,
          plotHistory: newHistory
      });
  };

  const handleManualSave = () => {
      if (!plotOutline.trim()) {
          showToast("大纲内容为空，无法保存。", 'error');
          return;
      }
      const historyEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          content: plotOutline,
          note: saveNote || "手动存档"
      };
      
      const newHistory = [historyEntry, ...project.plotHistory].slice(0, 20);
      updateProject({ plotHistory: newHistory });
      
      setSaveNote('');
      setShowSaveModal(false);
      showToast("已保存为历史版本", 'success');
  };

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
      setToast({msg, type});
      setTimeout(() => setToast(null), 3000);
  };

  const handleAnalyze = async () => {
    if (!plotOutline.trim()) return;
    setIsAnalyzing(true);
    setActiveTab('ANALYSIS');
    try {
        const result = await analyzePlot(project.premise, plotOutline, project.characters, project.worldSettings, project.creativeSettings);
        setAnalysis(result);
    } catch (e) {
        console.error(e);
        showToast("分析失败，请重试。", 'error');
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleGeneratePlotClick = () => {
      if (!project.premise) {
          showToast("请先完善小说核心梗概。", 'error');
          return;
      }
      if (plotOutline) {
          setPendingAction({ type: 'GENERATE' });
      } else {
          performGeneratePlot();
      }
  };

  const performGeneratePlot = async (template?: string) => {
      setPendingAction(null);
      setIsGeneratingPlot(true);
      const label = template ? "AI 模版填充" : "AI 智能生成";
      try {
          const result = await generatePlotFromContext(project.premise, project.genre, project.characters, project.worldSettings, project.creativeSettings, template);
          updatePlotWithHistory(result, label);
      } catch (e) {
          console.error(e);
          showToast("生成失败，请重试。", 'error');
      } finally {
          setIsGeneratingPlot(false);
      }
  };

  const handleWriteScene = async () => {
      if (!scenePrompt.trim()) return;
      setIsWriting(true);
      try {
          const result = await expandScene(project.premise, project.genre, plotOutline, scenePrompt, project.characters, project.worldSettings, project.creativeSettings);
          setGeneratedScene(result);
      } catch (e) {
          console.error(e);
          showToast("写作失败，请重试。", 'error');
      } finally {
          setIsWriting(false);
      }
  };

  const handleRewrite = async (prompt: string, label: string) => {
      if (!plotOutline) return;
      setIsGeneratingPlot(true);
      try {
          const result = await rewritePlot(plotOutline, prompt, project.genre, project.characters, project.worldSettings, project.creativeSettings);
          updatePlotWithHistory(result, label);
          showToast("重写完成！旧版本已保存至历史。", "success");
      } catch (e) {
          showToast("重写失败", "error");
      } finally {
          setIsGeneratingPlot(false);
      }
  };

  const handleAutoFix = async () => {
      if (!analysis) {
          showToast("请先点击'分析'按钮生成诊断报告。", "error");
          setActiveTab('ANALYSIS');
          return;
      }
      handleRewrite(`请根据以下的分析报告，修正剧情中的逻辑漏洞和节奏问题：\n${analysis}`, "基于分析报告的智能修复");
  };

  const handleRestoreHistory = (entry: any) => {
      if (plotOutline) {
          setPendingAction({ type: 'RESTORE', payload: entry });
      } else {
          performRestore(entry);
      }
  };

  const performRestore = (entry: any) => {
      // When restoring, save CURRENT as history too
      updatePlotWithHistory(entry.content, `还原自: ${entry.note}`);
      setPendingAction(null);
      setShowHistory(false);
  };

  const confirmAction = () => {
      if (pendingAction?.type === 'GENERATE') {
          // If payload exists, it's a template structure string to be filled by AI
          const template = typeof pendingAction.payload === 'string' ? pendingAction.payload : undefined;
          performGeneratePlot(template);
          setShowTemplates(false);
      } else if (pendingAction?.type === 'TEMPLATE') {
          // THIS IS NOW DEPRECATED IN FAVOR OF AI GENERATION, 
          // But kept if we wanted a "Paste Only" feature (not implemented in UI for simplicity now)
          updatePlotWithHistory(pendingAction.payload, "应用模版");
          setShowTemplates(false);
          setPendingAction(null);
      } else if (pendingAction?.type === 'RESTORE') {
          performRestore(pendingAction.payload);
      }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
      {/* Reference Sidebar (Collapsible) */}
      <div 
        className={`fixed right-0 top-16 bottom-0 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 transition-all duration-300 transform ${showReference ? 'translate-x-0 w-80' : 'translate-x-full w-0'}`}
      >
          <div className="flex flex-col h-full w-80">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                  <h3 className="font-bold text-white flex items-center gap-2"><Sidebar size={18}/> 设定参考</h3>
                  <button onClick={() => setShowReference(false)}><X size={18} className="text-slate-400 hover:text-white"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                  <div>
                      <h4 className="text-muse-400 text-xs font-bold uppercase mb-2 flex items-center gap-1"><User size={12}/> 核心角色</h4>
                      {project.characters.length === 0 && <p className="text-slate-600 text-xs">暂无角色。</p>}
                      <div className="space-y-3">
                          {project.characters.map(c => (
                              <div key={c.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                  <div className="flex justify-between">
                                      <span className="text-slate-200 font-bold text-sm">{c.name}</span>
                                      <span className="text-xs text-slate-500">{c.role}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-3">{c.description}</p>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h4 className="text-muse-400 text-xs font-bold uppercase mb-2 flex items-center gap-1"><Globe size={12}/> 世界观设定</h4>
                      {project.worldSettings.length === 0 && <p className="text-slate-600 text-xs">暂无设定。</p>}
                      <div className="space-y-3">
                          {project.worldSettings.map(w => (
                              <div key={w.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                  <div className="flex justify-between">
                                      <span className="text-slate-200 font-bold text-sm">{w.title}</span>
                                      <span className="text-xs text-slate-500 truncate max-w-[80px]">{w.category}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-3">{w.content}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Editor Side */}
      <div className="w-1/2 flex flex-col space-y-4">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex-1 flex flex-col relative">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                    <GitBranch className="text-muse-400" size={20}/> 剧情大纲
                </h2>
                <div className="flex gap-2">
                     <button 
                        onClick={() => setShowReference(!showReference)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border ${showReference ? 'bg-muse-900 border-muse-500 text-muse-300' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}
                        title="查看参考资料"
                    >
                        <Sidebar size={16} /> <span className="hidden xl:inline">参考</span>
                    </button>
                     <button 
                        onClick={() => setShowSaveModal(true)}
                        disabled={!plotOutline}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border border-slate-600 disabled:opacity-50"
                        title="保存当前版本"
                    >
                        <Save size={16} /> 存版本
                    </button>
                     <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border ${showHistory ? 'bg-muse-900 border-muse-500 text-muse-300' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}
                        title="历史版本时光机"
                    >
                        <History size={16} />
                    </button>
                    <div className="relative">
                        <button 
                            onClick={() => setShowTemplates(!showTemplates)}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border border-slate-600"
                            title="使用结构模版"
                        >
                            <LayoutTemplate size={16} /> 模版
                        </button>
                        {showTemplates && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 py-1">
                                <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-700 font-bold uppercase">选择模版以让 AI 填充</div>
                                {STRUCTURE_TEMPLATES.map((t, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { 
                                            // When template is clicked, we trigger GENERATE action with the template content as payload
                                            setPendingAction({ type: 'GENERATE', payload: t.content }); 
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 last:border-0"
                                    >
                                        <div className="font-medium text-muse-300">{t.name}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{t.content.substring(0, 40)}...</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                     <button 
                        onClick={handleGeneratePlotClick}
                        disabled={isGeneratingPlot}
                        className="bg-muse-800 hover:bg-muse-700 text-muse-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all border border-muse-700"
                        title="AI 智能演绎大纲"
                    >
                        <Wand2 size={16} /> <span className="hidden xl:inline">自由生成</span>
                    </button>
                </div>
            </div>
            
            <div className="relative flex-1 flex flex-col">
                <textarea 
                    value={plotOutline}
                    onChange={(e) => updateProject({ plotOutline: e.target.value })}
                    placeholder="在此构建你的故事骨架... "
                    className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-300 focus:ring-1 focus:ring-muse-500 outline-none resize-none font-serif leading-relaxed custom-scrollbar"
                />
                
                <div className="absolute bottom-4 right-4 pointer-events-none opacity-80">
                     <div className="bg-slate-800/90 text-xs text-slate-400 px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2 shadow-lg backdrop-blur-sm">
                        <Info size={12} className="text-muse-400" />
                        <span>AI 已连接: {project.characters.length} 角色 · {project.worldSettings.length} 设定</span>
                     </div>
                </div>

                {isGeneratingPlot && (
                     <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                         <Loader text="AI 正在推演命运的齿轮..." />
                     </div>
                )}
                
                {/* History Overlay */}
                {showHistory && (
                    <div className="absolute top-0 right-0 w-72 h-full bg-slate-800 border-l border-slate-700 shadow-2xl z-20 overflow-y-auto custom-scrollbar animate-fade-in">
                        <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 sticky top-0">
                            <span className="text-xs font-bold text-slate-400 uppercase">版本历史 (Plot Timeline)</span>
                            <button onClick={() => setShowHistory(false)}><X size={14} className="text-slate-500 hover:text-white"/></button>
                        </div>
                        {project.plotHistory.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-500">暂无历史记录</div>
                        )}
                        {project.plotHistory.map((ver) => (
                            <div key={ver.id} className="p-3 border-b border-slate-700/50 hover:bg-slate-700/50 group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs text-muse-400 font-mono">{new Date(ver.timestamp).toLocaleString()}</span>
                                    <button 
                                        onClick={() => handleRestoreHistory(ver)}
                                        className="text-xs bg-slate-700 hover:bg-muse-600 text-slate-300 hover:text-white px-2 py-0.5 rounded transition-colors"
                                    >
                                        恢复
                                    </button>
                                </div>
                                <p className="text-sm text-white font-bold mb-1">{ver.note}</p>
                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-3 bg-slate-900/50 p-2 rounded border border-slate-700/30 font-serif">
                                    {ver.content.substring(0, 80)}...
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
        {/* Analysis Buttons Row */}
         <div className="flex justify-end gap-2 px-2">
            <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !plotOutline}
                className="bg-muse-600 hover:bg-muse-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-muse-900/20"
            >
                <Activity size={16} /> 执行深度评估 (Analysis)
            </button>
         </div>
      </div>

      {/* Right Side: Analysis & Writing Assistant & Optimizer */}
      <div className="w-1/2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden relative">
        <div className="flex border-b border-slate-800 bg-slate-900/50">
            <button
                onClick={() => setActiveTab('ANALYSIS')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'ANALYSIS' ? 'text-muse-400 border-b-2 border-muse-500 bg-muse-900/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <AlertTriangle size={16} /> 诊断报告
            </button>
            <button
                onClick={() => setActiveTab('OPTIMIZE')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'OPTIMIZE' ? 'text-muse-400 border-b-2 border-muse-500 bg-muse-900/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Zap size={16} /> 优化与重写
            </button>
            <button
                onClick={() => setActiveTab('WRITING')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'WRITING' ? 'text-muse-400 border-b-2 border-muse-500 bg-muse-900/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <PenTool size={16} /> 写作助手
            </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative">
            {activeTab === 'ANALYSIS' && (
                <>
                    {analysis ? (
                        <div className="prose prose-invert prose-slate max-w-none animate-fade-in">
                            <MarkdownRenderer content={analysis} />
                            <div className="mt-8 pt-4 border-t border-slate-700 flex justify-center">
                                <button 
                                    onClick={handleAutoFix}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg"
                                >
                                    <Zap size={16} /> 
                                    根据此报告自动修复剧情
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600">
                            <Activity size={48} className="opacity-20 mb-4" />
                            <p className="text-center max-w-xs text-sm">
                                点击下方的“深度评估”按钮。<br/>
                                AI 将从<strong className="text-muse-400">情感弧光</strong>、<strong className="text-muse-400">节奏张力</strong>和<strong className="text-muse-400">逻辑自洽性</strong>三个维度对大纲进行审计。
                            </p>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'OPTIMIZE' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><RefreshCw size={16}/> 快捷重写指令</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {REWRITE_OPTIONS.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleRewrite(opt.prompt, `Rewrite: ${opt.label}`)}
                                    className="text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition-all group"
                                >
                                    <div className="font-medium text-slate-200 group-hover:text-muse-400">{opt.label}</div>
                                    <div className="text-xs text-slate-500 mt-1">{opt.prompt}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <h3 className="text-sm font-bold text-white mb-2">自定义重写</h3>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={customRewritePrompt}
                                onChange={(e) => setCustomRewritePrompt(e.target.value)}
                                placeholder="例如：把结局改成悲剧，让主角牺牲..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-muse-500 outline-none"
                            />
                            <button
                                onClick={() => handleRewrite(customRewritePrompt, `Custom: ${customRewritePrompt}`)}
                                disabled={!customRewritePrompt}
                                className="bg-muse-700 hover:bg-muse-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                            >
                                执行
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'WRITING' && (
                <div className="flex flex-col h-full space-y-4 animate-fade-in">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3 shrink-0">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">扩写指令</label>
                         <div className="flex gap-2">
                             <input 
                                type="text"
                                value={scenePrompt}
                                onChange={(e) => setScenePrompt(e.target.value)}
                                placeholder="例如：扩写第三幕中英雄与反派的对峙对话..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-muse-500 outline-none"
                             />
                             <button
                                onClick={handleWriteScene}
                                disabled={isWriting || !scenePrompt}
                                className="bg-muse-600 hover:bg-muse-500 text-white p-2 rounded-md disabled:opacity-50"
                             >
                                 <Play size={18} fill="currentColor" />
                             </button>
                         </div>
                    </div>
                    
                    <div className="flex-1 bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 overflow-y-auto custom-scrollbar relative">
                        {generatedScene ? (
                             <>
                                <div className="absolute top-2 right-2">
                                     <button 
                                        onClick={() => navigator.clipboard.writeText(generatedScene)}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                        title="复制内容"
                                     >
                                        <Clipboard size={14} />
                                     </button>
                                </div>
                                <MarkdownRenderer content={generatedScene} />
                             </>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                <PenTool size={32} className="opacity-20 mb-3" />
                                <p className="text-sm text-center max-w-xs">输入指令，让 AI 基于<br/>当前大纲、人物关系及世界观<br/>为您撰写片段。</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {(isAnalyzing || isWriting) && (
                 <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-20">
                     <Loader text={isAnalyzing ? "正在进行逻辑审计..." : "正在奋笔疾书..."} />
                 </div>
            )}
        </div>
      </div>

      {/* Save Version Modal */}
      {showSaveModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Save className="text-muse-400" size={20} />
                          保存历史版本
                      </h3>
                      <button onClick={() => setShowSaveModal(false)} className="text-slate-500 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="block text-sm text-slate-400 mb-1">版本备注</label>
                          <input 
                            type="text" 
                            value={saveNote}
                            onChange={(e) => setSaveNote(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-muse-500 outline-none"
                            placeholder="例如：第一稿、增加反转后..."
                          />
                      </div>
                      <p className="text-xs text-slate-500">此操作将当前的大纲内容归档，方便日后回溯。您仍可以在编辑器中继续修改。</p>
                  </div>

                  <div className="flex gap-3 justify-end">
                      <button 
                          onClick={() => setShowSaveModal(false)}
                          className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                      >
                          取消
                      </button>
                      <button 
                          onClick={handleManualSave}
                          className="px-4 py-2 rounded-lg bg-muse-600 hover:bg-muse-500 text-white font-medium shadow-lg text-sm"
                      >
                          确认存档
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Confirmation Modal (Overwrite/Restore/Generate) */}
      {pendingAction && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <AlertTriangle className="text-amber-400" size={20} />
                          {pendingAction.type === 'GENERATE' && plotOutline ? '覆盖确认' : '操作确认'}
                      </h3>
                      <button onClick={() => setPendingAction(null)} className="text-slate-500 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="text-slate-300 text-sm mb-6">
                      {pendingAction.type === 'GENERATE' && plotOutline && (
                          <p>当前剧情大纲不为空。继续操作将<strong>覆盖现有内容</strong>，旧版本将自动保存至历史记录。是否继续？</p>
                      )}
                      {pendingAction.type === 'RESTORE' && (
                          <p>确定要回滚到此历史版本吗？当前进度将保存为新的历史记录。</p>
                      )}
                      {/* For template generation on empty buffer, we might skip modal, but logic handles it generic */}
                      {pendingAction.type === 'GENERATE' && !plotOutline && (
                         <p>即将在空大纲上生成内容。确定开始吗？</p>
                      )}
                  </div>

                  <div className="flex gap-3 justify-end">
                      <button 
                          onClick={() => setPendingAction(null)}
                          className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                      >
                          取消
                      </button>
                      <button 
                          onClick={confirmAction}
                          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg text-sm"
                      >
                          确认
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Toast */}
      {toast && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 transition-all animate-fade-in font-medium text-sm flex items-center gap-2 border ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'}`}>
              {toast.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle size={16}/>}
              <span>{toast.msg}</span>
          </div>
      )}
    </div>
  );
};