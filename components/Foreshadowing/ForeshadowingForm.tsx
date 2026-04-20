/**
 * 伏笔表单组件
 *
 * 用于创建和编辑伏笔的模态表单
 */

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store';
import {
  Foreshadowing,
  ForeshadowingFormData,
  ForeshadowingType,
  ForeshadowingStatus,
  ForeshadowingPriority,
  ForeshadowingImpact,
} from '@/types/foreshadowing';
import { Button } from '@/components/ui/Button';

interface ForeshadowingFormProps {
  foreshadowing?: Foreshadowing | null;
  onClose?: () => void;
}

export const ForeshadowingForm: React.FC<ForeshadowingFormProps> = ({
  foreshadowing,
  onClose,
}) => {
  const addForeshadowing = useProjectStore((state) => state.addForeshadowing);
  const updateForeshadowing = useProjectStore((state) => state.updateForeshadowing);
  const project = useProjectStore((state) => state.project);

  const isEditing = !!foreshadowing;

  // 表单状态
  const [formData, setFormData] = useState<ForeshadowingFormData>({
    title: '',
    description: '',
    type: ForeshadowingType.FORESHADOWING,
    status: ForeshadowingStatus.UNREVEALED,
    priority: ForeshadowingPriority.MEDIUM,
    impact: ForeshadowingImpact.MEDIUM,
    relatedCharacters: [],
    relatedEvents: [],
    relatedChapters: [],
    relatedForeshadowings: [],
    tags: [],
    notes: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (foreshadowing) {
      setFormData({
        title: foreshadowing.title,
        description: foreshadowing.description,
        type: foreshadowing.type,
        status: foreshadowing.status,
        priority: foreshadowing.priority,
        impact: foreshadowing.impact,
        relatedCharacters: foreshadowing.relatedCharacters,
        relatedEvents: foreshadowing.relatedEvents,
        relatedChapters: foreshadowing.relatedChapters,
        relatedForeshadowings: foreshadowing.relatedForeshadowings,
        tags: foreshadowing.tags,
        notes: foreshadowing.notes || '',
      });
    }
  }, [foreshadowing]);

  // 处理表单字段变更
  const handleFieldChange = (
    field: keyof ForeshadowingFormData,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 处理标签添加
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
      setTagInput('');
    }
  };

  // 处理标签删除
  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    }

    if (!formData.description.trim()) {
      newErrors.description = '描述不能为空';
    }

    if (formData.description.length < 10) {
      newErrors.description = '描述至少需要10个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && foreshadowing) {
        updateForeshadowing(foreshadowing.id, formData);
      } else {
        addForeshadowing(formData);
      }

      onClose?.();
    } catch (error) {
      console.error('保存伏笔失败:', error);
      setErrors({
        form: '保存失败，请重试',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="foreshadowing-form-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="foreshadowing-form-content"
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {isEditing ? '编辑伏笔' : '创建伏笔'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            ×
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          {/* 标题 */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                fontSize: '14px',
              }}
            >
              标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="给伏笔起个简洁的标题"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.title ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '14px',
              }}
              data-testid="foreshadowing-title-input"
            />
            {errors.title && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.title}
              </div>
            )}
          </div>

          {/* 描述 */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                fontSize: '14px',
              }}
            >
              详细描述 *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="详细描述这个伏笔的内容、作用和预期效果..."
              rows={5}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.description ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
              data-testid="foreshadowing-description-input"
            />
            {errors.description && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.description}
              </div>
            )}
          </div>

          {/* 类型、状态、优先级、重要程度 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                类型
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleFieldChange('type', e.target.value as ForeshadowingType)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                data-testid="foreshadowing-type-select"
              >
                {Object.values(ForeshadowingType).map((type) => (
                  <option key={type} value={type}>
                    {getTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value as ForeshadowingStatus)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                data-testid="foreshadowing-status-select"
              >
                {Object.values(ForeshadowingStatus).map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                优先级
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value as ForeshadowingPriority)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                data-testid="foreshadowing-priority-select"
              >
                {Object.values(ForeshadowingPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {getPriorityLabel(priority)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                重要程度
              </label>
              <select
                value={formData.impact}
                onChange={(e) => handleFieldChange('impact', e.target.value as ForeshadowingImpact)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                data-testid="foreshadowing-impact-select"
              >
                {Object.values(ForeshadowingImpact).map((impact) => (
                  <option key={impact} value={impact}>
                    {getImpactLabel(impact)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 标签 */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                fontSize: '14px',
              }}
            >
              标签
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="输入标签后按回车添加"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                data-testid="foreshadowing-tag-input"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="secondary"
                data-testid="add-tag-button"
              >
                添加
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '4px 8px',
                      background: '#eff6ff',
                      color: '#3b82f6',
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        lineHeight: 1,
                        color: '#3b82f6',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 备注 */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                fontSize: '14px',
              }}
            >
              备注（可选）
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="添加额外的备注信息..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
              data-testid="foreshadowing-notes-input"
            />
          </div>

          {/* 错误信息 */}
          {errors.form && (
            <div
              style={{
                padding: '12px',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            >
              {errors.form}
            </div>
          )}

          {/* 操作按钮 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="submit-foreshadowing-form"
            >
              {isSubmitting ? '保存中...' : isEditing ? '保存修改' : '创建伏笔'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper functions
function getTypeLabel(type: ForeshadowingType): string {
  const labels: Record<ForeshadowingType, string> = {
    [ForeshadowingType.SUSPENSE]: '悬念',
    [ForeshadowingType.PROPHECY]: '预言',
    [ForeshadowingType.SETUP]: '伏线',
    [ForeshadowingType.HINT]: '暗示',
    [ForeshadowingType.FORESHADOWING]: '伏笔',
    [ForeshadowingType.PAYOFF]: '回报',
    [ForeshadowingType.TWIST]: '反转',
    [ForeshadowingType.RED_HERRING]: '红鲱鱼',
  };
  return labels[type] || type;
}

function getStatusLabel(status: ForeshadowingStatus): string {
  const labels: Record<ForeshadowingStatus, string> = {
    [ForeshadowingStatus.UNREVEALED]: '未揭示',
    [ForeshadowingStatus.REVEALED]: '已揭示',
    [ForeshadowingStatus.RESOLVED]: '已解决',
    [ForeshadowingStatus.ABANDONED]: '已废弃',
    [ForeshadowingStatus.ONGOING]: '进行中',
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: ForeshadowingPriority): string {
  const labels: Record<ForeshadowingPriority, string> = {
    [ForeshadowingPriority.CRITICAL]: '核心',
    [ForeshadowingPriority.HIGH]: '重要',
    [ForeshadowingPriority.MEDIUM]: '普通',
    [ForeshadowingPriority.LOW]: '次要',
  };
  return labels[priority] || priority;
}

function getImpactLabel(impact: ForeshadowingImpact): string {
  const labels: Record<ForeshadowingImpact, string> = {
    [ForeshadowingImpact.EXTREME]: '极高',
    [ForeshadowingImpact.HIGH]: '高',
    [ForeshadowingImpact.MEDIUM]: '中',
    [ForeshadowingImpact.LOW]: '低',
  };
  return labels[impact] || impact;
}
