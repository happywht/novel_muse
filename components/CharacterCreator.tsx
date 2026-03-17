import React, { useState } from 'react';
import { ProjectState, Character, Echo } from '../types';
import { generateText, generateCharacterImage, chatWithPersona } from '../services/geminiService';
import { Loader } from './Loader';
import { User, Plus, Trash2, Camera, Sparkles, HeartHandshake, MessageCircle, X, Send, GitCommit, Check, Edit2, Save, Search, Palette, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { VirtualList } from './VirtualList';

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
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [isChatting, setIsChatting] = useState(false);

    // Drafting State
    const [draftCharacter, setDraftCharacter] = useState<Character | null>(null);
    const [iterationFeedback, setIterationFeedback] = useState('');
    const [isIterating, setIsIterating] = useState(false);

    // Inputs
    const [nameInput, setNameInput] = useState('');
    const [roleInput, setRoleInput] = useState('主角');
    const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success' } | null>(null);

    const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

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
      
      请包含：外貌特征、核心性格、动机与目标、秘密与缺陷、能力。
      请使用中文输出。`;

            const description = await generateText(prompt, 'character_gen', project.creativeSettings);

            const newChar: Character = {
                id: crypto.randomUUID(),
                name: nameInput || "新角色",
                role: roleInput,
                archetype: '待定',
                description: description,
                relationships: ''
            };

            setDraftCharacter(newChar);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingInfo(false);
        }
    };

    const handleIterate = async () => {
        if (!draftCharacter || !iterationFeedback.trim()) return;
        setIsIterating(true);
        try {
            const prompt = `
      【当前草稿】:
      ${draftCharacter.description}

      【用户反馈意见】:
      ${iterationFeedback}
      
      请结合反馈重写该角色的描述。`;

            const newDescription = await generateText(prompt, 'iteration_refinement', project.creativeSettings);
            setDraftCharacter({ ...draftCharacter, description: newDescription });
            setIterationFeedback('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsIterating(false);
        }
    };

    const handleAcceptDraft = () => {
        if (!draftCharacter) return;
        updateProject({
            characters: [...project.characters, draftCharacter]
        });
        setActiveCharId(draftCharacter.id);
        setDraftCharacter(null);
        setNameInput('');
        showToast("角色已确立并入驻宇宙", 'success');
    };

    const handleManualAdd = () => {
        const newChar: Character = {
            id: crypto.randomUUID(),
            name: nameInput || "新角色",
            role: roleInput,
            archetype: '待定',
            description: '',
            relationships: ''
        };
        setDraftCharacter(newChar);
        setIsEditing(true);
        setEditDescription('');
        setActiveCharId(null);
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
        showToast("档案更新已保存", 'success');
    };

    const updateRelationship = (val: string) => {
        if (!activeChar) return;
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
        showToast("角色已离开该宇宙", 'success');
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
                        <div className="flex gap-2">
                            <button
                                onClick={handleManualAdd}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
                            >
                                <Plus size={16} /> <span>手动创建</span>
                            </button>
                            <button
                                onClick={handleGenerateChar}
                                disabled={isGeneratingInfo}
                                className="flex-[1.5] bg-muse-600 hover:bg-muse-500 text-white py-2 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
                            >
                                {isGeneratingInfo ? <span>正在召唤...</span> : <><Sparkles size={16} /> <span>AI 生成档案</span></>}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {/* 空状态 */}
                    {project.characters.filter(c => c.name.includes(searchQuery) || c.role.includes(searchQuery)).length === 0 && (
                        <p className="text-slate-500 text-xs p-4 text-center">暂无匹配角色</p>
                    )}
                    
                    {/* 虚拟滚动优化 */}
                    {project.characters.filter(c => c.name.includes(searchQuery) || c.role.includes(searchQuery)).length > 0 && (
                        <VirtualList
                            items={project.characters.filter(c => c.name.includes(searchQuery) || c.role.includes(searchQuery))}
                            itemHeight={80}
                            height={window.innerHeight - 400}
                            className="space-y-2"
                            renderItem={(char, idx) => {
                                const hasEcho = (project.echoes || []).some(e => e.targetId === char.id && e.status === 'PENDING');
                                return (
                                    <div
                                        key={char.id}
                                        onClick={() => { setActiveCharId(char.id); setDraftCharacter(null); }}
                                        className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 group transition-all relative overflow-hidden ${
                                            activeCharId === char.id 
                                                ? 'bg-muse-900/50 border border-muse-500/50' 
                                                : 'bg-slate-800 border border-transparent hover:bg-slate-750'
                                        } ${hasEcho && activeCharId !== char.id ? 'shadow-[0_0_15px_rgba(34,211,238,0.15)] border-cyan-900/50' : ''}`}
                                    >
                                        {/* Echo指示器 */}
                                        {hasEcho && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
                                        )}
                                        
                                        {/* 头像 */}
                                        <div className={`w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border ${
                                            hasEcho ? 'border-cyan-500/50' : 'border-slate-600'
                                        }`}>
                                            {char.imageUrl ? (
                                                <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                    <User size={20} />
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* 角色信息 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-slate-200 truncate">
                                                {char.name}
                                                {hasEcho && <span className="ml-2 text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full">待处理</span>}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">{char.role}</div>
                                        </div>
                                        
                                        {/* 删除按钮 */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteChar(char.id); }}
                                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Detail View */}
            <div className="w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-8 overflow-y-auto custom-scrollbar flex flex-col relative">
                {activeChar ? (
                    <div className="animate-fade-in space-y-6">
                        {/* Echo Proposals */}
                        {activeCharEchoes.length > 0 && !isEditing && (
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
                                                    AI 观测到在最新剧情中，该角色的命运发生了偏转：<br />
                                                    <span className="text-white font-medium">新增特质/经历：[{echo.description}]</span>
                                                </p>
                                                <p className="text-xs text-slate-500 italic mb-4 border-l-2 border-slate-700 pl-2">
                                                    "{echo.reason}"
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAcceptEcho(echo)}
                                                        className="text-xs bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/50 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                                                    >
                                                        <Check size={12} /> 接受并更新
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectEcho(echo)}
                                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
                                                    >
                                                        忽略
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-8 items-start">
                            {/* Portrait Section */}
                            <div className="flex-shrink-0">
                                <div className="w-48 h-64 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden relative group shadow-2xl">
                                    {activeChar.imageUrl ? (
                                        <img src={activeChar.imageUrl} alt={activeChar.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full text-slate-600 space-y-2">
                                            <User size={48} />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">暂无画像</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleGenerateImage}
                                        disabled={isGeneratingImage}
                                        className="absolute inset-x-0 bottom-0 py-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                                    >
                                        {isGeneratingImage ? <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div> : <Camera size={14} />}
                                        {activeChar.imageUrl ? "重新生成" : "生成画像"}
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-col gap-2">
                                    <button
                                        onClick={openChat}
                                        className="w-full py-2.5 bg-muse-600 hover:bg-muse-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-muse-900/40 transition-all active:scale-95"
                                    >
                                        <MessageCircle size={16} /> 沉浸式对话
                                    </button>
                                    <div className="flex gap-1">
                                        <select
                                            value={imageStyle}
                                            onChange={(e) => setImageStyle(e.target.value)}
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-slate-400 px-2 py-1 outline-none"
                                        >
                                            <option value="Anime">Anime</option>
                                            <option value="Realistic">Realistic</option>
                                            <option value="Cyberpunk">Cyberpunk</option>
                                            <option value="Oil Painting">Oil Painting</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-muse-950 text-muse-400 border border-muse-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
                                                {activeChar.role}
                                            </span>
                                        </div>
                                        <h1 className="text-4xl font-serif font-bold text-white tracking-tight">{activeChar.name}</h1>
                                    </div>
                                    <div className="flex gap-2">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
                                                >
                                                    <X size={18} />
                                                </button>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                                                >
                                                    <Save size={16} /> 保存
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsEditing(true)}
                                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                                                    title="编辑角色"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => deleteChar(activeChar.id)}
                                                    className="p-2 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-700"
                                                    title="移除角色"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 shadow-inner">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Plus size={12} className="text-muse-500" /> 灵魂档案
                                        </h3>
                                        {isEditing ? (
                                            <textarea
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                className="w-full h-64 bg-slate-900 border border-slate-600 rounded-xl p-4 text-slate-200 text-sm focus:border-muse-500 outline-none resize-none leading-relaxed"
                                            />
                                        ) : (
                                            <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed font-serif text-lg">
                                                <MarkdownRenderer content={activeChar.description} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 shadow-inner">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <HeartHandshake size={14} className="text-rose-500" /> 人际羁绊 (Relationships)
                                        </h3>
                                        <textarea
                                            value={activeChar.relationships || ''}
                                            onChange={(e) => updateRelationship(e.target.value)}
                                            placeholder="描述该角色与其他人的复杂关系、秘密契约或深仇大恨..."
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 focus:border-rose-500 outline-none resize-none h-24 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : draftCharacter ? (
                    <div className="animate-fade-in space-y-6 flex flex-col h-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                    <Sparkles size={20} className="text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">灵魂预览 (Draft)</h2>
                                    <p className="text-xs text-slate-400">这就是刚刚召唤出的生命雏形</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDraftCharacter(null)}
                                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    放弃
                                </button>
                                <button
                                    onClick={handleAcceptDraft}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Check size={18} /> 确认入住该宇宙
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-800/30 border border-slate-700 rounded-2xl p-6 overflow-y-auto custom-scrollbar relative">
                            <div className="prose prose-invert prose-slate max-w-none">
                                <MarkdownRenderer content={draftCharacter.description} />
                            </div>
                            {isIterating && (
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <Loader text="正在根据反馈重塑灵魂..." />
                                </div>
                            )}
                        </div>

                        {/* Iteration Feedback */}
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 shadow-xl">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <Edit2 size={12} /> 提供修改意见 (可选)
                            </div>
                            <div className="flex gap-3">
                                <textarea
                                    value={iterationFeedback}
                                    onChange={(e) => setIterationFeedback(e.target.value)}
                                    placeholder="例如：让他更冷酷一点；或者背景改成落魄贵族..."
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-muse-500 outline-none resize-none h-20"
                                />
                                <button
                                    onClick={handleIterate}
                                    disabled={isIterating || !iterationFeedback.trim()}
                                    className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 transition-colors flex flex-col items-center justify-center gap-1 min-w-[100px]"
                                >
                                    <RotateCcw size={18} />
                                    <span className="text-[10px] font-bold">迭代重塑</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4">
                        <User size={64} className="opacity-20" />
                        <p>在左侧填入基本信息并召唤，或选择已有角色。</p>
                    </div>
                )}

                {isGeneratingInfo && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                        <Loader text="正在向星辰借火 (雕琢灵魂)..." />
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
                                        <div className="flex items-center justify-center w-full h-full"><User size={20} /></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{activeChar.name}</h3>
                                    <p className="text-xs text-muse-300">沉浸式角色扮演中</p>
                                </div>
                            </div>
                            <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
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
                                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
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

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[60] transition-all animate-fade-in font-medium text-sm flex items-center gap-2 border ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'}`}>
                    {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    );
};