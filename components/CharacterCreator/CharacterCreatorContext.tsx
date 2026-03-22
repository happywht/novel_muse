import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ProjectState, Character, Echo } from '../../types';
import { generateText, generateCharacterImage, chatWithPersona } from '../../services/geminiService';
import { generateSingleCharacter } from '../../services/gemini/world';
import { useProjectStore } from '../../store/useProjectStore';
import { isStructuredFormat, parseLegacyRelationships } from '../../utils/characterRelations';
import { RELATION_TYPE_LABELS } from '../../types';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { UI_CONFIG } from '../../config/constants';

/**
 * 图谱查询状态类型定义
 */
interface GraphQueryState {
  characterTraits: Map<string, any>;
  characterEvolution: Map<string, any[]>;
  characterForeshadowing: Map<string, any[]>;
  loadingTraits: Set<string>;
  loadingEvolution: Set<string>;
  loadingForeshadowing: Set<string>;
}

/**
 * 角色创建器 Context 状态接口
 */
interface CharacterCreatorState {
  // 项目数据
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;

  // 当前选中的角色
  activeCharId: string | null;
  activeChar: Character | undefined;

  // 加载状态
  isGeneratingInfo: boolean;
  isGeneratingImage: boolean;
  isIterating: boolean;
  isChatting: boolean;

  // 编辑状态
  isEditing: boolean;
  editDescription: string;
  setEditDescription: (value: string) => void;

  // 搜索
  searchQuery: string;
  setSearchQuery: (value: string) => void;

  // 图片风格
  imageStyle: string;
  setImageStyle: (value: string) => void;

  // 聊天
  showChat: boolean;
  setShowChat: (value: boolean) => void;
  chatInput: string;
  setChatInput: (value: string) => void;
  chatHistory: { role: 'user' | 'model'; content: string }[];
  setChatHistory: React.Dispatch<React.SetStateAction<{ role: 'user' | 'model'; content: string }[]>>;

  // 草稿
  draftCharacter: Character | null;
  setDraftCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  iterationFeedback: string;
  setIterationFeedback: (value: string) => void;

  // 输入
  nameInput: string;
  setNameInput: (value: string) => void;
  roleInput: string;
  setRoleInput: (value: string) => void;

  // 图谱查询
  graphQuery: GraphQueryState;
  useBackend: boolean;

  // 当前角色的 Echo 列表
  activeCharEchoes: Echo[];

  // 操作方法
  setActiveCharId: (id: string | null) => void;
  setIsEditing: (value: boolean) => void;
  handleGenerateChar: () => Promise<void>;
  handleManualAdd: () => void;
  handleAcceptDraft: () => void;
  handleIterate: () => Promise<void>;
  handleGenerateImage: () => Promise<void>;
  handleSaveEdit: () => void;
  deleteChar: (id: string) => Promise<void>;
  openChat: () => void;
  handleSendMessage: () => Promise<void>;
  handleAcceptEcho: (echo: Echo) => void;
  handleRejectEcho: (echo: Echo) => void;
  updateRelationship: (val: string) => void;
  updateStructuredRelations: (relations: Character['structuredRelations']) => void;
}

const CharacterCreatorContext = createContext<CharacterCreatorState | null>(null);

/**
 * 使用角色创建器 Context 的 Hook
 */
export function useCharacterCreator() {
  const context = useContext(CharacterCreatorContext);
  if (!context) {
    throw new Error('useCharacterCreator must be used within CharacterCreatorProvider');
  }
  return context;
}

interface CharacterCreatorProviderProps {
  children: ReactNode;
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
}

/**
 * 角色创建器 Provider 组件
 * 管理所有共享状态和方法
 */
export function CharacterCreatorProvider({
  children,
  project,
  updateProject,
}: CharacterCreatorProviderProps) {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const { graphQuery, fetchCharacterTraits, fetchCharacterEvolution, fetchCharacterForeshadowing, useBackend } = useProjectStore();

  // 基本状态
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [isGeneratingInfo, setIsGeneratingInfo] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // 编辑和搜索状态
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [imageStyle, setImageStyle] = useState('Anime');

  // 聊天状态
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  // 草稿状态
  const [draftCharacter, setDraftCharacter] = useState<Character | null>(null);
  const [iterationFeedback, setIterationFeedback] = useState('');
  const [isIterating, setIsIterating] = useState(false);

  // 输入状态
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState('主角');

  // 计算属性
  const activeChar = project.characters.find((c) => c.id === activeCharId);
  const activeCharEchoes = (project.echoes || []).filter(
    (e) => e.targetId === activeCharId && e.status === 'PENDING'
  );

  // 当角色切换时更新编辑状态
  useEffect(() => {
    if (activeChar) {
      setEditDescription(activeChar.description);
      setEditDesire(activeChar.desire || '');
      setEditFear(activeChar.fear || '');
      setEditSignature(activeChar.signature || '');
      setEditContrast(activeChar.contrast || '');
      setEditWeakness(activeChar.weakness || '');
      setIsEditing(false);
    }
  }, [activeCharId, activeChar]);

  // 当角色切换时加载图谱数据
  useEffect(() => {
    if (activeCharId && useBackend) {
      fetchCharacterTraits(activeCharId);
      fetchCharacterEvolution(activeCharId);
      fetchCharacterForeshadowing(activeCharId);
    }
  }, [activeCharId, useBackend, fetchCharacterTraits, fetchCharacterEvolution, fetchCharacterForeshadowing]);

  // 生成角色 - 使用深度生成函数获取完整字段
  const handleGenerateChar = useCallback(async () => {
    setIsGeneratingInfo(true);
    try {
      // 调用新的深度生成函数
      const charData = await generateSingleCharacter(
        nameInput || '新角色',
        roleInput,
        project.premise,
        project.genre,
        project.creativeSettings
      );

      if (!charData) {
        throw new Error('角色数据生成失败');
      }

      // 构建完整的 Character 对象
      const newChar: Character = {
        id: crypto.randomUUID(),
        name: charData.name || nameInput || '新角色',
        role: charData.role || roleInput,
        archetype: charData.archetype || '待定',
        description: charData.description || '',
        // 深度字段
        alignment: charData.alignment,
        desire: charData.desire,
        fear: charData.fear,
        signature: charData.signature,
        contrast: charData.contrast,
        weakness: charData.weakness,
        // 关系字段
        relationships: charData.relationships || '',
        structuredRelations: charData.structuredRelations || [],
      };

      setDraftCharacter(newChar);
      toast.success('角色档案已生成，包含深度字段');
    } catch (e) {
      console.error(e);
      toast.error('角色生成失败，请稍后重试');
    } finally {
      setIsGeneratingInfo(false);
    }
  }, [project, roleInput, nameInput, toast]);

  // 迭代草稿
  const handleIterate = useCallback(async () => {
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
      toast.success('角色已根据反馈重塑');
    } catch (e) {
      console.error(e);
      toast.error('迭代重塑失败');
    } finally {
      setIsIterating(false);
    }
  }, [draftCharacter, iterationFeedback, project.creativeSettings, toast]);

  // 接受草稿
  const handleAcceptDraft = useCallback(() => {
    if (!draftCharacter) return;
    updateProject({
      characters: [...project.characters, draftCharacter],
    });
    setActiveCharId(draftCharacter.id);
    setDraftCharacter(null);
    setNameInput('');
    toast.success('角色已确立并入驻宇宙');
  }, [draftCharacter, project.characters, updateProject, toast]);

  // 手动添加角色
  const handleManualAdd = useCallback(() => {
    const newChar: Character = {
      id: crypto.randomUUID(),
      name: nameInput || '新角色',
      role: roleInput,
      archetype: '待定',
      description: '',
      relationships: '',
      structuredRelations: [],
    };
    setDraftCharacter(newChar);
    setIsEditing(true);
    setEditDescription('');
    setActiveCharId(null);
  }, [nameInput, roleInput]);

  // 生成图片
  const handleGenerateImage = useCallback(async () => {
    if (!activeChar) return;
    setIsGeneratingImage(true);
    try {
      const visualPrompt = `(${imageStyle} style) Character portrait of ${activeChar.name}, ${activeChar.role}. Context: ${project.genre}. Based on description: ${activeChar.description.slice(0, UI_CONFIG.IMAGE_PROMPT_DESCRIPTION_LENGTH)}...`;
      const base64Image = await generateCharacterImage(visualPrompt);

      const updatedChars = project.characters.map((c) =>
        c.id === activeChar.id ? { ...c, imageUrl: base64Image } : c
      );
      updateProject({ characters: updatedChars });
      toast.success('角色画像生成成功');
    } catch (e) {
      toast.error('图片生成失败。请确保您已设置 API Key。');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [activeChar, imageStyle, project, updateProject, toast]);

  // 保存编辑 - 添加深度字段
  const handleSaveEdit = useCallback(() => {
    if (!activeChar) return;
    const updatedChars = project.characters.map((c) =>
      c.id === activeChar.id ? {
        ...c,
        description: editDescription,
        // 深度字段
        desire: editDesire,
        fear: editFear,
        signature: editSignature,
        contrast: editContrast,
        weakness: editWeakness,
      } : c
    );
    updateProject({ characters: updatedChars });
    setIsEditing(false);
    toast.success('档案更新已保存');
  }, [activeChar, editDescription, editDesire, editFear, editFear, editSignature, editSignature, editContrast, editContrast, editWeakness, project.characters, updateProject, toast]
);

  // 删除角色
  const deleteChar = useCallback(
    async (id: string) => {
      const confirmed = await confirm({
        title: '删除角色',
        message: '确定要删除这个角色吗？此操作不可撤销。',
        variant: 'danger',
        confirmText: '删除',
        cancelText: '取消',
      });

      if (!confirmed) return;

      updateProject({
        characters: project.characters.filter((c) => c.id !== id),
      });
      if (activeCharId === id) setActiveCharId(null);
      toast.success('角色已离开该宇宙');
    },
    [activeCharId, confirm, project.characters, updateProject, toast]
  );

  // 打开聊天
  const openChat = useCallback(() => {
    setChatHistory([]);
    setShowChat(true);
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || !activeChar) return;

    const newHistory = [...chatHistory, { role: 'user' as const, content: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await chatWithPersona(activeChar, chatInput, chatHistory);
      setChatHistory([...newHistory, { role: 'model' as const, content: response }]);
    } catch (e) {
      setChatHistory([...newHistory, { role: 'model' as const, content: '(对话连接中断...)' }]);
    } finally {
      setIsChatting(false);
    }
  }, [chatInput, activeChar, chatHistory]);

  // 接受 Echo
  const handleAcceptEcho = useCallback(
    (echo: Echo) => {
      if (!activeChar) return;
      const updatedChars = project.characters.map((c) => {
        if (c.id === echo.targetId) {
          const time = new Date(echo.timestamp).toLocaleDateString();
          const newDesc = `${c.description}\n\n> [命运回响 ${time}] ${echo.description}`;
          return { ...c, description: newDesc };
        }
        return c;
      });
      const updatedEchoes = (project.echoes || []).map((e) =>
        e.id === echo.id ? { ...e, status: 'ACCEPTED' as const } : e
      );
      updateProject({ characters: updatedChars, echoes: updatedEchoes });
      toast.success('命运回响已接受');
    },
    [activeChar, project.echoes, project.characters, updateProject, toast]
  );

  // 拒绝 Echo
  const handleRejectEcho = useCallback(
    (echo: Echo) => {
      const updatedEchoes = (project.echoes || []).map((e) =>
        e.id === echo.id ? { ...e, status: 'REJECTED' as const } : e
      );
      updateProject({ echoes: updatedEchoes });
      toast.info('命运回响已忽略');
    },
    [project.echoes, updateProject, toast]
  );

  // 更新关系（文本格式）
  const updateRelationship = useCallback(
    (val: string) => {
      if (!activeChar) return;
      const updatedChars = project.characters.map((c) => {
        if (c.id === activeChar.id) {
          if (!isStructuredFormat(c.structuredRelations)) {
            return { ...c, relationships: val };
          } else {
            // 新格式：将文本解析为结构化关系
            const parsed = parseLegacyRelationships(val);
            const structured = parsed.map((rel, idx) => ({
              id: `rel_${Date.now()}_${idx}`,
              targetName: rel.targetName,
              type: 'RELATED_TO' as const,
              description: rel.type,
              weight: 50,
              trajectory: 'stable' as const,
            }));
            return { ...c, relationships: val, structuredRelations: structured };
          }
        }
        return c;
      });
      updateProject({ characters: updatedChars });
    },
    [activeChar, project.characters, updateProject]
  );

  // 更新结构化关系
  const updateStructuredRelations = useCallback(
    (relations: Character['structuredRelations']) => {
      if (!activeChar) return;
      const updatedChars = project.characters.map((c) => {
        if (c.id === activeChar.id) {
          const displayText =
            relations && relations.length > 0
              ? relations
                  .map((rel) => {
                    const type = rel.type || 'RELATED_TO';
                    const label = RELATION_TYPE_LABELS[type] || rel.description || '关联';
                    const targetName = rel.targetName || rel.targetCharacterName || '未知';
                    return `${label}: ${targetName}`;
                  })
                  .join('；')
              : '';
          return { ...c, structuredRelations: relations, relationships: displayText };
        }
        return c;
      });
      updateProject({ characters: updatedChars });
    },
    [activeChar, updateProject]
  );

  const contextValue: CharacterCreatorState = {
    // 项目数据
    project,
    updateProject,

    // 当前选中角色
    activeCharId,
    activeChar,

    // 加载状态
    isGeneratingInfo,
    isGeneratingImage,
    isIterating,
    isChatting,

    // 编辑状态
    isEditing,
    editDescription,
    setEditDescription,

    // 搜索
    searchQuery,
    setSearchQuery,

    // 图片风格
    imageStyle,
    setImageStyle,

    // 聊天
    showChat,
    setShowChat,
    chatInput,
    setChatInput,
    chatHistory,
    setChatHistory,

    // 草稿
    draftCharacter,
    setDraftCharacter,
    iterationFeedback,
    setIterationFeedback,

    // 输入
    nameInput,
    setNameInput,
    roleInput,
    setRoleInput,

    // 图谱查询
    graphQuery,
    useBackend,

    // Echo
    activeCharEchoes,

    // 操作方法
    setActiveCharId,
    setIsEditing,
    handleGenerateChar,
    handleManualAdd,
    handleAcceptDraft,
    handleIterate,
    handleGenerateImage,
    handleSaveEdit,
    deleteChar,
    openChat,
    handleSendMessage,
    handleAcceptEcho,
    handleRejectEcho,
    updateRelationship,
    updateStructuredRelations,
  };

  return (
    <CharacterCreatorContext.Provider value={contextValue}>
      {children}
    </CharacterCreatorContext.Provider>
  );
}

export default CharacterCreatorContext;
