/**
 * 区块编辑面板组件
 *
 * 用于编辑模板区块的内容、条件和顺序
 * 支持拖拽排序
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown, ChevronRight, GripVertical, Eye, EyeOff,
  Edit3, Save, X, AlertCircle, Info
} from 'lucide-react';
import type { TemplateSection } from '../../types/promptTemplate';
import type { BlockOverride, TemplateOverride } from '../../types/templateOverride';

interface BlockEditorPanelProps {
  sections: TemplateSection[];
  override: TemplateOverride | null;
  onUpdateOverride: (updates: Partial<TemplateOverride>) => void;
}

// 可排序区块项的 Props
interface SortableBlockItemProps {
  section: TemplateSection;
  isExpanded: boolean;
  isOverridden: boolean;
  isDisabled: boolean;
  isEditing: boolean;
  blockOverride: BlockOverride | undefined;
  displayTemplate: string;
  displayCondition: string | null | undefined;
  displayOrder: number;
  onToggleExpand: () => void;
  onToggleDisabled: () => void;
  onStartEdit: () => void;
  onResetBlock: () => void;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  getTierColor: (tier?: string) => string;
  getDataSourceLabel: (source?: string) => string;
}

/**
 * 可排序的单个区块项组件
 * 使用 dnd-kit 的 useSortable hook 实现拖拽功能
 */
const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
  section,
  isExpanded,
  isOverridden,
  isDisabled,
  isEditing,
  displayTemplate,
  displayCondition,
  displayOrder,
  onToggleExpand,
  onToggleDisabled,
  onStartEdit,
  onResetBlock,
  editContent,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
  getTierColor,
  getDataSourceLabel,
}) => {
  // 设置可排序属性
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  // 拖拽样式
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border transition-all ${
        isDisabled
          ? 'bg-slate-900/30 border-slate-800/50 opacity-60'
          : isOverridden
            ? 'bg-purple-900/10 border-purple-500/20'
            : 'bg-slate-800/30 border-slate-700/50'
      } ${isDisabled ? '' : 'hover:border-slate-600'} ${
        isDragging ? 'shadow-2xl shadow-teal-500/20 border-teal-500/50' : ''
      }`}
    >
      {/* 区块头部 */}
      <div className="flex items-center gap-3 p-4">
        {/* 拖拽手柄 */}
        <div
          {...attributes}
          {...listeners}
          className={`cursor-grab active:cursor-grabbing transition-colors ${
            isDragging ? 'text-teal-400' : 'text-slate-600 hover:text-slate-400'
          }`}
        >
          <GripVertical size={16} />
        </div>

        {/* 展开/收起按钮 */}
        <button
          onClick={onToggleExpand}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* 区块信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${isDisabled ? 'line-through text-slate-500' : 'text-white'}`}>
              {section.label}
            </span>
            {isOverridden && !isDisabled && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                已修改
              </span>
            )}
            {isDisabled && (
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-500/20 text-slate-400 rounded border border-slate-500/30">
                已禁用
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>顺序: {displayOrder}</span>
            {section.metadata?.tier && (
              <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getTierColor(section.metadata.tier)}`}>
                {section.metadata.tier}
              </span>
            )}
            {section.metadata?.dataSource && (
              <span className="text-slate-600">
                来源: {getDataSourceLabel(section.metadata.dataSource)}
              </span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleDisabled}
            className={`p-1.5 rounded-lg transition-colors ${
              isDisabled
                ? 'bg-slate-700 text-slate-300'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
            }`}
            title={isDisabled ? '启用区块' : '禁用区块'}
          >
            {isDisabled ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {!isDisabled && (
            <button
              onClick={onStartEdit}
              className="p-1.5 text-slate-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
              title="编辑区块"
            >
              <Edit3 size={14} />
            </button>
          )}
          {isOverridden && (
            <button
              onClick={onResetBlock}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="重置区块"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          {/* 描述 */}
          {section.metadata?.description && (
            <div className="mt-3 p-2 bg-slate-900/50 rounded-lg flex items-start gap-2">
              <Info size={12} className="text-slate-500 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400">{section.metadata.description}</p>
            </div>
          )}

          {/* 条件表达式 */}
          {displayCondition && (
            <div className="mt-3">
              <label className="text-xs text-slate-500 mb-1 block">显示条件</label>
              <code className="text-xs bg-slate-900/50 px-2 py-1 rounded text-cyan-400 font-mono">
                {displayCondition}
              </code>
            </div>
          )}

          {/* 模板内容编辑 */}
          {isEditing ? (
            <div className="mt-3">
              <label className="text-xs text-slate-500 mb-2 block">模板内容</label>
              <textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                className="w-full h-48 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 font-mono resize-none focus:outline-none focus:border-teal-500"
                placeholder="输入模板内容，使用 {{variable}} 插入变量..."
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={onSaveEdit}
                  className="px-3 py-1.5 text-xs bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <Save size={12} />
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <label className="text-xs text-slate-500 mb-1 block">模板内容</label>
              <pre className="text-xs bg-slate-900/50 p-3 rounded-lg text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
                {displayTemplate || <span className="text-slate-600 italic">（空模板）</span>}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BlockEditorPanel: React.FC<BlockEditorPanelProps> = ({
  sections,
  override,
  onUpdateOverride,
}) => {
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [localSections, setLocalSections] = useState<TemplateSection[]>([]);

  // 同步外部 sections 到本地状态
  React.useEffect(() => {
    // 根据覆盖的 order 属性排序区块
    const sortedSections = [...sections].sort((a, b) => {
      const orderA = override?.blocks?.[a.id]?.order ?? a.order;
      const orderB = override?.blocks?.[b.id]?.order ?? b.order;
      return orderA - orderB;
    });
    setLocalSections(sortedSections);
  }, [sections, override]);

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需要移动 8px 才开始拖拽，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 获取区块的覆盖状态
  const getBlockOverride = (blockId: string): BlockOverride | undefined => {
    return override?.blocks?.[blockId];
  };

  // 检查区块是否被覆盖
  const isBlockOverridden = (blockId: string): boolean => {
    const blockOverride = getBlockOverride(blockId);
    return blockOverride !== undefined && Object.keys(blockOverride).length > 0;
  };

  // 检查区块是否被禁用
  const isBlockDisabled = (blockId: string): boolean => {
    return getBlockOverride(blockId)?.disabled === true;
  };

  // 更新区块覆盖
  const updateBlockOverride = useCallback((blockId: string, updates: Partial<BlockOverride>) => {
    const currentBlocks = override?.blocks || {};
    const currentBlockOverride = currentBlocks[blockId] || {};

    onUpdateOverride({
      blocks: {
        ...currentBlocks,
        [blockId]: {
          ...currentBlockOverride,
          ...updates,
        },
      },
    });
  }, [override, onUpdateOverride]);

  // 切换区块禁用状态
  const toggleBlockDisabled = (blockId: string) => {
    const currentDisabled = isBlockDisabled(blockId);
    updateBlockOverride(blockId, { disabled: !currentDisabled });
  };

  // 开始编辑区块
  const startEditing = (blockId: string, currentTemplate: string) => {
    setEditingBlockId(blockId);
    setEditContent(currentTemplate || '');
  };

  // 保存编辑
  const saveEdit = () => {
    if (editingBlockId) {
      updateBlockOverride(editingBlockId, { template: editContent });
      setEditingBlockId(null);
      setEditContent('');
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingBlockId(null);
    setEditContent('');
  };

  // 重置区块
  const resetBlock = (blockId: string) => {
    const currentBlocks = { ...override?.blocks };
    delete currentBlocks[blockId];
    onUpdateOverride({ blocks: currentBlocks });
  };

  // 处理拖拽结束事件
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localSections.findIndex(s => s.id === active.id);
      const newIndex = localSections.findIndex(s => s.id === over.id);

      // 更新本地状态以立即反映视觉变化
      const newSections = arrayMove(localSections, oldIndex, newIndex);
      setLocalSections(newSections);

      // 更新所有受影响区块的 order 属性
      const orderUpdates: Record<string, BlockOverride> = {};
      newSections.forEach((section, index) => {
        orderUpdates[section.id] = {
          ...override?.blocks?.[section.id],
          order: index,
        };
      });

      // 批量更新所有区块的 order
      onUpdateOverride({
        blocks: {
          ...override?.blocks,
          ...orderUpdates,
        },
      });
    }
  };

  // 获取层级标签颜色
  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'task': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'context': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'style': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'constraint': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'format': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  // 获取数据来源标签
  const getDataSourceLabel = (source?: string) => {
    switch (source) {
      case 'static': return '静态';
      case 'user_input': return '用户输入';
      case 'computed': return '计算';
      case 'derived': return '派生';
      default: return '未知';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localSections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {localSections.map((section) => {
              const isExpanded = expandedBlockId === section.id;
              const isOverridden = isBlockOverridden(section.id);
              const isDisabled = isBlockDisabled(section.id);
              const isEditing = editingBlockId === section.id;
              const blockOverride = getBlockOverride(section.id);

              // 使用覆盖的模板或原始模板
              const displayTemplate = blockOverride?.template ?? section.template ?? '';
              const displayCondition = blockOverride?.condition !== undefined
                ? blockOverride.condition
                : section.condition;
              const displayOrder = blockOverride?.order ?? section.order;

              return (
                <SortableBlockItem
                  key={section.id}
                  section={section}
                  isExpanded={isExpanded}
                  isOverridden={isOverridden}
                  isDisabled={isDisabled}
                  isEditing={isEditing}
                  blockOverride={blockOverride}
                  displayTemplate={displayTemplate}
                  displayCondition={displayCondition}
                  displayOrder={displayOrder}
                  onToggleExpand={() => setExpandedBlockId(isExpanded ? null : section.id)}
                  onToggleDisabled={() => toggleBlockDisabled(section.id)}
                  onStartEdit={() => startEditing(section.id, displayTemplate)}
                  onResetBlock={() => resetBlock(section.id)}
                  editContent={editContent}
                  onEditContentChange={setEditContent}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  getTierColor={getTierColor}
                  getDataSourceLabel={getDataSourceLabel}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default BlockEditorPanel;
