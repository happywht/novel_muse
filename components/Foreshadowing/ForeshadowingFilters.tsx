/**
 * 伏笔筛选器组件
 *
 * 提供筛选、排序和搜索功能
 */

import React, { useState } from 'react';
import { useProjectStore } from '@/store';
import {
  ForeshadowingFilter,
  ForeshadowingType,
  ForeshadowingStatus,
  ForeshadowingPriority,
} from '@/types/foreshadowing';

export const ForeshadowingFilters: React.FC = () => {
  const filter = useProjectStore((state) => state.filter);
  const setFilter = useProjectStore((state) => state.setFilter);
  const clearFilter = useProjectStore((state) => state.clearFilter);
  const statistics = useProjectStore((state) => state.getStatistics());

  const [searchQuery, setSearchQuery] = useState(filter.searchQuery || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 处理搜索
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setFilter({ searchQuery: value });
  };

  // 处理状态筛选
  const handleStatusToggle = (status: ForeshadowingStatus) => {
    const currentStatuses = filter.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    setFilter({ statuses: newStatuses.length > 0 ? newStatuses : undefined });
  };

  // 处理类型筛选
  const handleTypeToggle = (type: ForeshadowingType) => {
    const currentTypes = filter.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    setFilter({ types: newTypes.length > 0 ? newTypes : undefined });
  };

  // 处理优先级筛选
  const handlePriorityToggle = (priority: ForeshadowingPriority) => {
    const currentPriorities = filter.priorities || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter((p) => p !== priority)
      : [...currentPriorities, priority];

    setFilter({ priorities: newPriorities.length > 0 ? newPriorities : undefined });
  };

  // 处理排序
  const handleSortChange = (sortBy: ForeshadowingFilter['sortBy']) => {
    const sortOrder = filter.sortBy === sortBy && filter.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilter({ sortBy, sortOrder });
  };

  // 处理清除所有筛选
  const handleClearAll = () => {
    setSearchQuery('');
    clearFilter();
  };

  // 检查是否有活动筛选
  const hasActiveFilters =
    (filter.statuses && filter.statuses.length > 0) ||
    (filter.types && filter.types.length > 0) ||
    (filter.priorities && filter.priorities.length > 0) ||
    filter.onlyWithConflicts ||
    filter.searchQuery;

  return (
    <div className="foreshadowing-filters">
      {/* 搜索栏 */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="搜索伏笔标题、描述或标签..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
            data-testid="foreshadowing-search-input"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            padding: '10px 16px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
          data-testid="toggle-advanced-filters"
        >
          {showAdvanced ? '收起' : '高级筛选'}
        </button>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            style={{
              padding: '10px 16px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#dc2626',
            }}
            data-testid="clear-all-filters"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 高级筛选 */}
      {showAdvanced && (
        <div
          style={{
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '16px',
          }}
          data-testid="advanced-filters-panel"
        >
          {/* 状态筛选 */}
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#374151',
              }}
            >
              状态
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.values(ForeshadowingStatus).map((status) => {
                const isSelected = filter.statuses?.includes(status);
                const count = statistics.byStatus[status] || 0;

                return (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    disabled={count === 0}
                    style={{
                      padding: '6px 12px',
                      background: isSelected ? '#3b82f6' : '#e5e7eb',
                      color: isSelected ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: count > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      opacity: count === 0 ? 0.5 : 1,
                    }}
                    data-testid={`filter-status-${status}`}
                  >
                    {getStatusLabel(status)} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 类型筛选 */}
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#374151',
              }}
            >
              类型
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.values(ForeshadowingType).map((type) => {
                const isSelected = filter.types?.includes(type);
                const count = statistics.byType[type] || 0;

                return (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    disabled={count === 0}
                    style={{
                      padding: '6px 12px',
                      background: isSelected ? '#10b981' : '#e5e7eb',
                      color: isSelected ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: count > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      opacity: count === 0 ? 0.5 : 1,
                    }}
                    data-testid={`filter-type-${type}`}
                  >
                    {getTypeLabel(type)} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 优先级筛选 */}
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#374151',
              }}
            >
              优先级
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.values(ForeshadowingPriority).map((priority) => {
                const isSelected = filter.priorities?.includes(priority);
                const count = statistics.byPriority[priority] || 0;

                return (
                  <button
                    key={priority}
                    onClick={() => handlePriorityToggle(priority)}
                    disabled={count === 0}
                    style={{
                      padding: '6px 12px',
                      background: isSelected ? '#f59e0b' : '#e5e7eb',
                      color: isSelected ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: count > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      opacity: count === 0 ? 0.5 : 1,
                    }}
                    data-testid={`filter-priority-${priority}`}
                  >
                    {getPriorityLabel(priority)} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 其他筛选 */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={filter.onlyWithConflicts || false}
                onChange={(e) => setFilter({ onlyWithConflicts: e.target.checked || undefined })}
                style={{ cursor: 'pointer' }}
                data-testid="filter-only-with-conflicts"
              />
              <span style={{ fontSize: '14px', color: '#374151' }}>
                只显示有矛盾的伏笔 ({statistics.withConflicts})
              </span>
            </label>
          </div>
        </div>
      )}

      {/* 排序选项 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '14px',
          color: '#6b7280',
        }}
      >
        <span>排序：</span>
        <button
          onClick={() => handleSortChange('updatedAt')}
          style={{
            padding: '4px 8px',
            background: filter.sortBy === 'updatedAt' ? '#e5e7eb' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
          data-testid="sort-by-updated-at"
        >
          更新时间 {filter.sortBy === 'updatedAt' && (filter.sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSortChange('priority')}
          style={{
            padding: '4px 8px',
            background: filter.sortBy === 'priority' ? '#e5e7eb' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
          data-testid="sort-by-priority"
        >
          优先级 {filter.sortBy === 'priority' && (filter.sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSortChange('title')}
          style={{
            padding: '4px 8px',
            background: filter.sortBy === 'title' ? '#e5e7eb' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
          data-testid="sort-by-title"
        >
          标题 {filter.sortBy === 'title' && (filter.sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>
    </div>
  );
};

// Helper functions
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

function getPriorityLabel(priority: ForeshadowingPriority): string {
  const labels: Record<ForeshadowingPriority, string> = {
    [ForeshadowingPriority.CRITICAL]: '核心',
    [ForeshadowingPriority.HIGH]: '重要',
    [ForeshadowingPriority.MEDIUM]: '普通',
    [ForeshadowingPriority.LOW]: '次要',
  };
  return labels[priority] || priority;
}
