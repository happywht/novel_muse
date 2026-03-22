import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ProjectState, WorldSetting, WorldGenConfig, Echo } from '../../types';
import { generateText, expandWorldLore } from '../../services/geminiService';
import { useDebouncedValue } from '../../hooks/useDebouncedConfig';
import { UI_CONFIG } from '../../config/constants';

// ============================================================
// 类型定义
// ============================================================

export type WorldCategory = WorldSetting['category'];

export interface CategoryInfo {
  id: WorldCategory;
  label: string;
  icon: React.FC<any>;
}

export interface ToastState {
  msg: string;
  type: 'error' | 'success';
}

export interface WorldBuilderContextValue {
  // 项目数据
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
  genConfig: WorldGenConfig;

  // 分类相关
  categories: CategoryInfo[];
  selectedCategory: WorldCategory;
  setSelectedCategory: (category: WorldCategory) => void;

  // 条目相关
  activeItemId: string | null;
  setActiveItemId: (id: string | null) => void;
  activeItem: WorldSetting | undefined;

  // 搜索相关
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearchQuery: string;

  // 表单相关
  newItemTitle: string;
  setNewItemTitle: (title: string) => void;

  // 草稿相关
  draftLore: WorldSetting | null;
  setDraftLore: (draft: WorldSetting | null) => void;
  iterationFeedback: string;
  setIterationFeedback: (feedback: string) => void;

  // 编辑相关
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  editContent: string;
  setEditContent: (content: string) => void;

  // 配置面板
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;

  // 加载状态
  isGenerating: boolean;
  isExpanding: boolean;
  isIterating: boolean;

  // Toast
  toast: ToastState | null;
  showToast: (msg: string, type?: 'error' | 'success') => void;

  // 操作方法
  updateConfig: (key: keyof WorldGenConfig, value: string) => void;
  handleGenerateLore: () => Promise<void>;
  handleIterateLore: () => Promise<void>;
  handleAcceptLore: () => void;
  handleExpandLore: () => Promise<void>;
  handleSaveEdit: () => void;
  deleteLore: (id: string) => void;
  handleAcceptEcho: (echo: Echo) => void;
  handleRejectEcho: (echo: Echo) => void;
  handleManualAdd: () => void;

  // 派生数据
  filteredSettings: WorldSetting[];
  activeItemEchoes: Echo[];
}

const WorldBuilderContext = createContext<WorldBuilderContextValue | null>(null);

// ============================================================
// SparklesIcon 组件
// ============================================================

export function SparklesIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

// ============================================================
// 分类配置
// ============================================================

import { Map, Users, Scroll, Globe } from 'lucide-react';

const CATEGORIES: CategoryInfo[] = [
  { id: 'Geography', label: '地理地貌', icon: Map },
  { id: 'Magic/Tech', label: '魔法/科技', icon: SparklesIcon },
  { id: 'Society', label: '社会人文', icon: Users },
  { id: 'History', label: '历史传说', icon: Scroll },
  { id: 'Other', label: '其他设定', icon: Globe },
];

// ============================================================
// Provider 组件
// ============================================================

interface WorldBuilderProviderProps {
  project: ProjectState;
  updateProject: (data: Partial<ProjectState>) => void;
  children: ReactNode;
}

export const WorldBuilderProvider: React.FC<WorldBuilderProviderProps> = ({
  project,
  updateProject,
  children,
}) => {
  // 状态管理
  const [selectedCategory, setSelectedCategory] = useState<WorldCategory>('Geography');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  // 草稿状态
  const [draftLore, setDraftLore] = useState<WorldSetting | null>(null);
  const [iterationFeedback, setIterationFeedback] = useState('');
  const [isIterating, setIsIterating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 'search');

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // 表单状态
  const [newItemTitle, setNewItemTitle] = useState('');

  // Toast 状态
  const [toast, setToast] = useState<ToastState | null>(null);

  // 派生数据
  const activeItem = project.worldSettings.find(w => w.id === activeItemId);
  const genConfig = project.worldGenConfig || { detailLevel: 'Standard', focus: 'Balanced' };

  // 同步编辑内容
  useEffect(() => {
    if (activeItem) {
      setEditContent(activeItem.content);
      setIsEditing(false);
    }
  }, [activeItemId, activeItem?.id]);

  // Toast 方法
  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), UI_CONFIG.TOAST_DURATION);
  }, []);

  // 更新配置
  const updateConfig = useCallback((key: keyof WorldGenConfig, value: string) => {
    updateProject({
      worldGenConfig: {
        ...genConfig,
        [key]: value
      }
    });
  }, [genConfig, updateProject]);

  // 生成设定
  const handleGenerateLore = useCallback(async () => {
    if (!project.premise) {
      showToast("请先在「基础设定」页面完善小说核心梗概。", 'error');
      return;
    }

    const generationConfig = genConfig.focus === 'Sensory' ? 'Creative' : 'Logic';
    setIsGenerating(true);

    try {
      const configInstruction = generationConfig === 'Creative'
        ? "注重独特性和奇观感，可以包含一些尚未被人类解释的自然现象或超自然规则。"
        : "注重逻辑严密性和细节，描述其在世界观中的功能和角色。";

      const prompt = `基于小说梗概: "${project.premise}" 和类型: "${project.genre}".
请为一个小说创建一个详细的世界观设定条目，类别为: ${selectedCategory}.

主题: ${newItemTitle || '该世界的一个关键要素'}

【生成要求】：
${configInstruction}
保持内部逻辑一致性，包含有趣的叙事钩子。`;

      const content = await generateText(prompt, 'world_gen', project.creativeSettings);

      const newItem: WorldSetting = {
        id: `world-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: newItemTitle || `未命名的 ${selectedCategory}`,
        category: selectedCategory,
        content: content
      };

      setDraftLore(newItem);
    } catch (e) {
      console.error(e);
      showToast("生成失败，请重试。", 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [project.premise, project.genre, project.creativeSettings, genConfig.focus, selectedCategory, newItemTitle, showToast]);

  // 迭代优化
  const handleIterateLore = useCallback(async () => {
    if (!draftLore || !iterationFeedback.trim()) return;
    setIsIterating(true);
    try {
      const prompt = `
【当前草稿】:
${draftLore.content}

【用户反馈意见】:
${iterationFeedback}

请结合反馈重写该设定条目的内容。`;

      const newContent = await generateText(prompt, 'iteration_refinement', project.creativeSettings);
      setDraftLore({ ...draftLore, content: newContent });
      setIterationFeedback('');
    } catch (e) {
      console.error(e);
      showToast("迭代失败，请重试。", 'error');
    } finally {
      setIsIterating(false);
    }
  }, [draftLore, iterationFeedback, project.creativeSettings, showToast]);

  // 接受草稿
  const handleAcceptLore = useCallback(() => {
    if (!draftLore) return;
    updateProject({
      worldSettings: [...project.worldSettings, draftLore]
    });
    setActiveItemId(draftLore.id);
    const titleToClear = draftLore.title;
    setDraftLore(null);
    setNewItemTitle('');
    showToast(`已确立: ${titleToClear}`, 'success');
  }, [draftLore, project.worldSettings, updateProject, showToast]);

  // 扩展设定
  const handleExpandLore = useCallback(async () => {
    if (!activeItem) return;
    setIsExpanding(true);
    try {
      const addedContent = await expandWorldLore(activeItem.title, activeItem.content, project.genre, project.creativeSettings);

      const updatedContent = `${activeItem.content}\n\n---\n\n### 📜 历史渊源与文化影响\n\n${addedContent}`;

      const updatedSettings = project.worldSettings.map(s =>
        s.id === activeItem.id ? { ...s, content: updatedContent } : s
      );

      updateProject({ worldSettings: updatedSettings });
      setEditContent(updatedContent);
    } catch (e) {
      console.error(e);
      showToast("扩展内容失败，请重试。", 'error');
    } finally {
      setIsExpanding(false);
    }
  }, [activeItem, project.genre, project.worldSettings, project.creativeSettings, updateProject, showToast]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (!activeItem) return;
    const updatedSettings = project.worldSettings.map(s =>
      s.id === activeItem.id ? { ...s, content: editContent } : s
    );
    updateProject({ worldSettings: updatedSettings });
    setIsEditing(false);
    showToast("设定已保存", 'success');
  }, [activeItem, editContent, project.worldSettings, updateProject, showToast]);

  // 删除设定
  const deleteLore = useCallback((id: string) => {
    updateProject({
      worldSettings: project.worldSettings.filter(w => w.id !== id)
    });
    if (activeItemId === id) setActiveItemId(null);
    showToast("设定已删除", 'success');
  }, [activeItemId, project.worldSettings, updateProject, showToast]);

  // 接受回响
  const handleAcceptEcho = useCallback((echo: Echo) => {
    if (!activeItem) return;
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
    showToast("回响已铭刻！", 'success');
  }, [activeItem, project.worldSettings, project.echoes, updateProject, showToast]);

  // 拒绝回响
  const handleRejectEcho = useCallback((echo: Echo) => {
    const updatedEchoes = (project.echoes || []).map(e => e.id === echo.id ? { ...e, status: 'REJECTED' as const } : e);
    updateProject({ echoes: updatedEchoes });
    showToast("回响已忽略。", 'success');
  }, [project.echoes, updateProject, showToast]);

  // 手动添加
  const handleManualAdd = useCallback(() => {
    const newItem: WorldSetting = {
      id: `world-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newItemTitle || `未命名的 ${selectedCategory}`,
      category: selectedCategory,
      content: ''
    };
    setDraftLore(newItem);
    setIsEditing(true);
    setEditContent('');
    setActiveItemId(null);
  }, [newItemTitle, selectedCategory]);

  // 过滤设置
  const filteredSettings = project.worldSettings.filter(w =>
    w.category === selectedCategory &&
    w.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  // 活跃条目的回响
  const activeItemEchoes = (project.echoes || []).filter(e => e.targetId === activeItemId && e.status === 'PENDING');

  const value: WorldBuilderContextValue = {
    project,
    updateProject,
    genConfig,
    categories: CATEGORIES,
    selectedCategory,
    setSelectedCategory,
    activeItemId,
    setActiveItemId,
    activeItem,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    newItemTitle,
    setNewItemTitle,
    draftLore,
    setDraftLore,
    iterationFeedback,
    setIterationFeedback,
    isEditing,
    setIsEditing,
    editContent,
    setEditContent,
    showConfig,
    setShowConfig,
    isGenerating,
    isExpanding,
    isIterating,
    toast,
    showToast,
    updateConfig,
    handleGenerateLore,
    handleIterateLore,
    handleAcceptLore,
    handleExpandLore,
    handleSaveEdit,
    deleteLore,
    handleAcceptEcho,
    handleRejectEcho,
    handleManualAdd,
    filteredSettings,
    activeItemEchoes,
  };

  return (
    <WorldBuilderContext.Provider value={value}>
      {children}
    </WorldBuilderContext.Provider>
  );
};

// ============================================================
// Hook
// ============================================================

export const useWorldBuilder = (): WorldBuilderContextValue => {
  const context = useContext(WorldBuilderContext);
  if (!context) {
    throw new Error('useWorldBuilder must be used within a WorldBuilderProvider');
  }
  return context;
};

export default WorldBuilderContext;
