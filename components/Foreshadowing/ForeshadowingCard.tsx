/**
 * 伏笔卡片组件
 *
 * 显示单个伏笔的详细信息卡片
 */

import React from 'react';
import { Foreshadowing, ForeshadowingType, ForeshadowingStatus, ForeshadowingPriority } from '@/types/foreshadowing';
import { Button } from '@/components/ui/Button';

interface ForeshadowingCardProps {
  foreshadowing: Foreshadowing;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
}

export const ForeshadowingCard: React.FC<ForeshadowingCardProps> = ({
  foreshadowing,
  isSelected = false,
  onSelect,
  onEdit,
}) => {
  // 获取伏笔类型标签
  const getTypeLabel = (type: ForeshadowingType): string => {
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
  };

  // 获取状态标签
  const getStatusLabel = (status: ForeshadowingStatus): string => {
    const labels: Record<ForeshadowingStatus, string> = {
      [ForeshadowingStatus.UNREVEALED]: '未揭示',
      [ForeshadowingStatus.REVEALED]: '已揭示',
      [ForeshadowingStatus.RESOLVED]: '已解决',
      [ForeshadowingStatus.ABANDONED]: '已废弃',
      [ForeshadowingStatus.ONGOING]: '进行中',
    };
    return labels[status] || status;
  };

  // 获取状态颜色
  const getStatusColor = (status: ForeshadowingStatus): string => {
    const colors: Record<ForeshadowingStatus, string> = {
      [ForeshadowingStatus.UNREVEALED]: '#9ca3af',
      [ForeshadowingStatus.REVEALED]: '#3b82f6',
      [ForeshadowingStatus.RESOLVED]: '#10b981',
      [ForeshadowingStatus.ABANDONED]: '#6b7280',
      [ForeshadowingStatus.ONGOING]: '#f59e0b',
    };
    return colors[status] || '#9ca3af';
  };

  // 获取优先级标签
  const getPriorityLabel = (priority: ForeshadowingPriority): string => {
    const labels: Record<ForeshadowingPriority, string> = {
      [ForeshadowingPriority.CRITICAL]: '核心',
      [ForeshadowingPriority.HIGH]: '重要',
      [ForeshadowingPriority.MEDIUM]: '普通',
      [ForeshadowingPriority.LOW]: '次要',
    };
    return labels[priority] || priority;
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: ForeshadowingPriority): string => {
    const colors: Record<ForeshadowingPriority, string> = {
      [ForeshadowingPriority.CRITICAL]: '#ef4444',
      [ForeshadowingPriority.HIGH]: '#f59e0b',
      [ForeshadowingPriority.MEDIUM]: '#3b82f6',
      [ForeshadowingPriority.LOW]: '#9ca3af',
    };
    return colors[priority] || '#9ca3af';
  };

  return (
    <div
      className={`foreshadowing-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      style={{
        padding: '16px',
        background: 'white',
        borderRadius: '8px',
        border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      {/* 头部：标题和标签 */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '8px',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              margin: 0,
              flex: 1,
              color: '#1f2937',
            }}
          >
            {foreshadowing.title}
          </h3>
          {foreshadowing.hasConflicts && (
            <span
              style={{
                marginLeft: '8px',
                padding: '2px 8px',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ⚠ 矛盾
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '2px 8px',
              background: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            {getTypeLabel(foreshadowing.type)}
          </span>

          <span
            style={{
              padding: '2px 8px',
              background: `${getStatusColor(foreshadowing.status)}20`,
              color: getStatusColor(foreshadowing.status),
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {getStatusLabel(foreshadowing.status)}
          </span>

          <span
            style={{
              padding: '2px 8px',
              background: `${getPriorityColor(foreshadowing.priority)}20`,
              color: getPriorityColor(foreshadowing.priority),
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {getPriorityLabel(foreshadowing.priority)}
          </span>
        </div>
      </div>

      {/* 描述 */}
      <div style={{ marginBottom: '12px' }}>
        <p
          style={{
            fontSize: '14px',
            color: '#4b5563',
            margin: 0,
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {foreshadowing.description}
        </p>
      </div>

      {/* 关联信息 */}
      <div style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {foreshadowing.relatedCharacters.length > 0 && (
            <span>👥 {foreshadowing.relatedCharacters.length} 角色</span>
          )}
          {foreshadowing.relatedEvents.length > 0 && (
            <span>📜 {foreshadowing.relatedEvents.length} 事件</span>
          )}
          {foreshadowing.relatedChapters.length > 0 && (
            <span>📖 {foreshadowing.relatedChapters.length} 章节</span>
          )}
        </div>
      </div>

      {/* 标签 */}
      {foreshadowing.tags.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {foreshadowing.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                style={{
                  padding: '2px 8px',
                  background: '#eff6ff',
                  color: '#3b82f6',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                {tag}
              </span>
            ))}
            {foreshadowing.tags.length > 3 && (
              <span
                style={{
                  padding: '2px 8px',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                +{foreshadowing.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 底部操作栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid #f3f4f6',
        }}
      >
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          {new Date(foreshadowing.updatedAt).toLocaleDateString()}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          data-testid={`edit-foreshadowing-${foreshadowing.id}`}
        >
          编辑
        </Button>
      </div>
    </div>
  );
};
