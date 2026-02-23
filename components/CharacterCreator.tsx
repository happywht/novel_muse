import React, { useState } from 'react';
import { ProjectState, Character, Echo } from '../types';
import { generateText, generateCharacterImage, chatWithPersona } from '../services/geminiService';
import { Loader } from './Loader';
import { User, Plus, Trash2, Camera, Sparkles, HeartHandshake, MessageCircle, X, Send, GitCommit, Check, Edit2, Save, Search, Palette } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface CharacterCreatorProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ project, updateProject }) => {
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [isGeneratingInfo, setIsGeneratingInfo] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Edit & Search State
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [imageStyle, setImageStyle] = useState('Anime'); // Default style

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  
  // Inputs
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('主角');

  const activeChar = project.characters.find(c => c.id === activeCharId);

  React.useEffect(() => {
      if (activeChar) {
          setEditDescription(activeChar.description);
          setIsEditing(false);
      }
  }, [activeCharId]);

  const handleGenerateChar = async () => {
    setIsGeneratingInfo(true);
    try {
      const prompt = `为一部类型为 "${project.genre}" 的小说创建一个详细的角色档案。
      角色定位: ${roleInput}
      名字: "${nameInput || '未命名'}" 
      小说核心梗概: ${project.premise}.
      
      请包含以下内容，并使用 Markdown 格式的二级标题：
      1. **外貌特征 (Physical Appearance)**: 包含标志性特征 (Signature Feature)。
      2. **核心性格特质 (Key Personality Traits)**: 包含道德阵营 (Alignment)。
      3. **动机与目标 (Motivation & Goals)**: 优先明确核心欲望 (Desire) 和深层恐惧 (Fear)。
      4. **秘密与缺陷 (Secret or Flaw)**: 一个不为人知的秘密或致命弱点。
      5. **能力与技能 (Abilities)**: 专业技能或具体的战斗技能（可选，多为普通视角，酌情设定）。
      
      请使用中文输出，确保人物立体。`;

      const description = await generateText(prompt, "你是一位大师级的人物设计师。");
      
      // Attempt to extract name if not provided
      const finalName = nameInput || "新角色";

      const newChar: Character = {
        id: Date.now().toString(),
        name: finalName,
        role: roleInput,
        archetype: '待定',
        description: description,
        relationships: ''
      };

      updateProject({
        characters: [...project.characters, newChar]
      });
      setActiveCharId(newChar.id);
      setNameInput('');

    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingInfo(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!activeChar) return;
    setIsGeneratingImage(true);
    try {
        const visualPrompt = `(${imageStyle} style) Character portrait of ${activeChar.name}, ${activeChar.role}. Context: ${project.genre}. Based on description: ${activeChar.description.slice(0, 200)}...`;
        const base64Image = await generateCharacterImage(visualPrompt);
        
        const updatedChars = project.characters.map(c => 
            c.id === activeChar.id ? { ...c, imageUrl: base64Image } : c
        );
        updateProject({ characters: updatedChars });

    } catch (e) {
        alert("图片生成失败。请确保您已设置 API Key。");
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleSaveEdit = () => {
      if (!activeChar) return;
      const updatedChars = project.characters.map(c => 
          c.id === activeChar.id ? { ...c, description: editDescription } : c
      );
      updateProject({ characters: updatedChars });
      setIsEditing(false);
  };

  const updateRelationship = (val: string) => {
    if(!activeChar) return;
    const updatedChars = project.characters.map(c => 
        c.id === activeChar.id ? { ...c, relationships: val } : c
    );
    updateProject({ characters: updatedChars });
  };

  const deleteChar = (id: string) => {
    if (!window.confirm("确定要删除这个角色吗？")) return;
    updateProject({
        characters: project.characters.filter(c => c.id !== id)
    });
    if (activeCharId === id) setActiveCharId(null);
  };

  const openChat = () => {
      setChatHistory([]);
      setShowChat(true);
  };

  const handleAcceptEcho = (echo: Echo) => {
      if (!activeChar) return;
      const updatedChars = project.characters.map(c => {
          if (c.id === echo.targetId) {
              const time = new Date(echo.timestamp).toLocaleDateString();
              const newDesc = `${c.description}\n\n> [命运回响 ${time}] ${echo.description}`;
              return { ...c, description: newDesc };
          }
          return c;
      });
      const updatedEchoes = (project.echoes || []).map(e => e.id === echo.id ? { ...e, status: 'ACCEPTED' as const } : e);
      updateProject({ characters: updatedChars, echoes: updatedEchoes });
  };

  const handleRejectEcho = (echo: Echo) => {
      const updatedEchoes = (project.echoes || []).map(e => e.id === echo.id ? { ...e, status: 'REJECTED' as const } : e);
      updateProject({ echoes: updatedEchoes });
  };

  const activeCharEchoes = (project.echoes || []).filter(e => e.targetId === activeCharId && e.status === 'PENDING');

  const handleSendMessage = async () => {
      if (!chatInput.trim() || !activeChar) return;
      
      const newHistory = [...chatHistory, { role: 'user' as const, content: chatInput }];
      setChatHistory(newHistory);
      setChatInput('');
      setIsChatting(true);

      try {
          const response = await chatWithPersona(activeChar, chatInput, chatHistory);
          setChatHistory([...newHistory, { role: 'model' as const, content: response }]);
      } catch (e) {
          setChatHistory([...newHistory, { role: 'model' as const, content: "(对话连接中断...)" }]);
      } finally {
          setIsChatting(false);
      }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
       {/* List Sidebar */}
       <div className="w-1/3 flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
             <h2 className="font-serif font-bold text-lg text-white mb-4">角色名录</h2>
             
             {/* Search */}
             <div className="relative mb-4">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                 <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索角色..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-xs text-white focus:border-muse-500 outline-none"
                 />
             </div>

             <div className="space-y-2">
                <input 
                    type="text" 
                    value={nameInput} 
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="角色姓名 (可选)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-muse-500 outline-none"
                />
                <select 
                    value={roleInput}
                    onChange={e => setRoleInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-300 focus:border-muse-500 outline-none"
                >
                    <option value="主角">主角 (Protagonist)</option>
                    <option value="反派">反派 (Antagonist)</option>
                    <option value="伙伴">伙伴 (Ally/Sidekick)</option>
                    <option value="导师">导师 (Mentor)</option>
                    <option value="守护者">守护者 (Guardian) - 阻碍与测试</option>
                    <option value="变形者">变形者 (Shapeshifter) - 亦正亦邪</option>
                    <option value="捣蛋鬼">捣蛋鬼 (Trickster) - 喜剧/变数</option>
                    <option value="信使">信使 (Herald) - 开启剧情</option>
                </select>
                <button 
                    onClick={handleGenerateChar}
                    disabled={isGeneratingInfo}
                    className="w-full bg-muse-600 hover:bg-muse-500 text-white py-2 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
                >
                    {isGeneratingInfo ? <span>正在召唤...</span> : <><Sparkles size={16} /> <span>生成角色档案</span></>}
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {project.characters.filter(c => c.name.includes(searchQuery) || c.role.includes(searchQuery)).map(char => {
                 const hasEcho = (project.echoes || []).some(e => e.targetId === char.id && e.status === 'PENDING');
                 return (
                 <div 
                    key={char.id}
                    onClick={() => setActiveCharId(char.id)}
                    className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 group transition-all relative overflow-hidden ${activeCharId === char.id ? 'bg-muse-900/50 border border-muse-500/50' : 'bg-slate-800 border border-transparent hover:bg-slate-750'} ${hasEcho && activeCharId !== char.id ? 'shadow-[0_0_15px_rgba(34,211,238,0.15)] border-cyan-900/50' : ''}`}
                 >
                    {hasEcho && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
                    )}
                    <div className={`w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border ${hasEcho ? 'border-cyan-500/50' : 'border-slate-600'}`}>
                        {char.imageUrl ? (
                            <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <User size={20} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${hasEcho ? 'text-cyan-100' : 'text-slate-200'}`}>{char.name}</p>
                        <p className="text-xs text-slate-500 truncate">{char.role}</p>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteChar(char.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1"
                    >
                        <Trash2 size={16} />
                    </button>
                 </div>
             )})}
          </div>
       </div>

       {/* Detail View */}
       <div className="w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-8 overflow-y-auto custom-scrollbar flex flex-col relative">
          {activeChar ? (
              <div className="animate-fade-in space-y-6">
                 <div className="flex gap-6 items-start">
                    {/* Portrait Section */}
                    <div className="w-48 flex-shrink-0 space-y-3">
                        <div className="w-48 h-48 rounded-lg bg-slate-800 border-2 border-slate-700 overflow-hidden relative group">
                            {activeChar.imageUrl ? (
                                <img src={activeChar.imageUrl} alt={activeChar.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                    <User size={48} />
                                </div>
                            )}
                            
                            {/* Loading Overlay for Image */}
                            {isGeneratingImage && (
                                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                                    <div className="animate-spin w-8 h-8 border-4 border-muse-500 border-t-transparent rounded-full"></div>
                                </div>
                            )}
                        </div>
                        
                        {/* Style Selector */}
                        <div className="grid grid-cols-2 gap-1 mb-1">
                            {[
                                { id: 'Anime', label: '二次元' },
                                { id: 'Realistic', label: '写实厚涂' },
                                { id: 'Oil Painting', label: '古典油画' },
                                { id: 'Pixel Art', label: '像素艺术' },
                                { id: 'Cyberpunk', label: '赛博朋克' },
                                { id: 'Ink Wash', label: '水墨国风' }
                            ].map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => setImageStyle(style.id)}
                                    className={`text-[10px] py-1 rounded border ${imageStyle === style.id ? 'bg-muse-900 border-muse-500 text-muse-200' : 'bg-slate-800 border-transparent text-slate-500'}`}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImage}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Camera size={14} />
                            {activeChar.imageUrl ? "重新生成立绘" : "生成角色立绘"}
                        </button>
                        <button 
                            onClick={openChat}
                            className="w-full bg-muse-700 hover:bg-muse-600 text-white text-sm py-2 rounded border border-muse-600 flex items-center justify-center gap-2 transition-colors shadow-lg"
                        >
                            <MessageCircle size={14} />
                            进入角色访谈
                        </button>
                    </div>

                    {/* Header Info */}
                    <div className="flex-1">
                        {/* Echo Proposals */}
                        {activeCharEchoes.length > 0 && (
                            <div className="mb-6 space-y-3">
                                {activeCharEchoes.map(echo => (
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
                                                    <span className="text-white font-medium">新增状态：[{echo.description}]</span>
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

                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-serif font-bold text-white">{activeChar.name}</h1>
                                <span className="bg-muse-900 text-muse-300 text-xs px-2 py-1 rounded border border-muse-800">{activeChar.role}</span>
                             </div>
                             <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"><X size={16}/></button>
                                        <button onClick={handleSaveEdit} className="p-2 text-emerald-400 hover:text-emerald-300 bg-emerald-900/30 border border-emerald-500/30 rounded-lg"><Save size={16}/></button>
                                    </>
                                ) : (
                                    <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"><Edit2 size={16}/></button>
                                )}
                             </div>
                        </div>
                        <p className="text-slate-400 italic mb-4">{project.genre}</p>
                        
                        {isEditing ? (
                            <textarea 
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full h-64 bg-slate-950/50 border border-slate-700 rounded-lg p-4 text-slate-300 font-serif leading-relaxed resize-none focus:border-muse-500 outline-none custom-scrollbar mb-6"
                            />
                        ) : (
                            <div className="prose prose-invert prose-slate max-w-none mb-6">
                                <MarkdownRenderer content={activeChar.description} />
                            </div>
                        )}

                         {/* Relationship Editor */}
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                                <HeartHandshake size={16} className="text-muse-400"/> 人物关系与羁绊
                            </h3>
                            <textarea 
                                value={activeChar.relationships || ''}
                                onChange={(e) => updateRelationship(e.target.value)}
                                placeholder="例如：与主角是失散多年的兄弟；对反派怀有深刻的仇恨但因血誓无法动手..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-slate-300 text-sm focus:border-muse-500 outline-none resize-none h-24"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                * 此处定义的关系将被 AI 剧情助手在分析和续写时作为关键上下文读取。
                            </p>
                        </div>
                    </div>
                 </div>
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4">
                  <User size={64} className="opacity-20" />
                  <p>选择一个角色以查看详细档案。</p>
              </div>
          )}

          {isGeneratingInfo && (
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                 <Loader text="正在雕琢灵魂..." />
             </div>
          )}
       </div>

       {/* Character Chat Modal */}
       {showChat && activeChar && (
           <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl relative overflow-hidden">
                   {/* Chat Header */}
                   <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center z-10">
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-slate-500">
                               {activeChar.imageUrl ? (
                                   <img src={activeChar.imageUrl} alt={activeChar.name} className="w-full h-full object-cover" />
                               ) : (
                                   <div className="flex items-center justify-center w-full h-full"><User size={20}/></div>
                               )}
                           </div>
                           <div>
                               <h3 className="font-bold text-white">{activeChar.name}</h3>
                               <p className="text-xs text-muse-300">沉浸式角色扮演中</p>
                           </div>
                       </div>
                       <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                   </div>

                   {/* Chat Area */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
                       {chatHistory.length === 0 && (
                           <div className="text-center text-slate-500 mt-10 text-sm">
                               <p>试着问问 {activeChar.name} 关于它的过去、动机或对其他人的看法。</p>
                           </div>
                       )}
                       {chatHistory.map((msg, idx) => (
                           <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                               <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                                   msg.role === 'user' 
                                   ? 'bg-muse-600 text-white rounded-tr-none' 
                                   : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                               }`}>
                                   {msg.content}
                               </div>
                           </div>
                       ))}
                       {isChatting && (
                           <div className="flex justify-start">
                               <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-700">
                                   <div className="flex gap-1">
                                       <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                                       <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                                       <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                                   </div>
                               </div>
                           </div>
                       )}
                   </div>

                   {/* Input Area */}
                   <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                       <input 
                           type="text"
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                           onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                           placeholder={`与 ${activeChar.name} 对话...`}
                           className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-white focus:border-muse-500 outline-none"
                           autoFocus
                       />
                       <button 
                           onClick={handleSendMessage}
                           disabled={isChatting || !chatInput.trim()}
                           className="bg-muse-600 hover:bg-muse-500 text-white p-2.5 rounded-full disabled:opacity-50 transition-transform active:scale-95"
                       >
                           <Send size={18} />
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};