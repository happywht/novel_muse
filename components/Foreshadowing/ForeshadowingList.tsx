/**
 * 伏笔列表组件
 *
 * 显示所有伏笔的列表视图，支持筛选、排序和搜索
 */

import React, { useMemo, useState } from 'react';
import { useProjectStore } from '@/store';
import {
  Foreshadowing,
  ForeshadowingType,
  ForeshadowingStatus,
  ForeshadowingPriority,
} from '@/types/foreshadowing';
import { ForeshadowingCard } from './ForeshadowingCard';
import { ForeshadowingFilters } from './ForeshadowingFilters';
import { ForeshadowingForm } from './ForeshadowingForm';
import { Button } from '@/components/ui/Button';

interface ForeshadowingListProps {
  onForeshadowingSelect?: (foreshadowing: Foreshadowing) => void;
  onForeshadowingEdit?: (foreshadowing: Foreshadowing) => void;
}

export const ForeshadowingList: React.FC<ForeshadowingListProps> = ({
  onForeshadowingSelect,
  onForeshadowingEdit,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingForeshadowing, setEditingForeshadowing] = useState<Foreshadowing | null>(null);

  const foreshadowings = useProjectStore((state) => state.getFilteredForeshadowings());
  const statistics = useProjectStore((state) => state.getStatistics());
  const selectedId = useProjectStore((state) => state.selectedForeshadowingId);
  const setSelectedId = useProjectStore((state) => state.setSelectedForeshadowingId);

  // 计算统计信息
  const stats = useMemo(() => {
    return {
      total: statistics.total,
      resolved: statistics.resolved,
      ongoing: statistics.ongoing,
      unrevealed: statistics.unrevealed,
      withConflicts: statistics.withConflicts,
    };
  }, [statistics]);

  // 处理选择伏笔
  const handleSelect = (foreshadowing: Foreshadowing) => {
    setSelectedId(foreshadowing.id);
    onForeshadowingSelect?.(foreshadowing);
  };

  // 处理编辑伏笔
  const handleEdit = (foreshadowing: Foreshadowing) => {
    setEditingForeshadowing(foreshadowing);
    setShowForm(true);
    onForeshadowingEdit?.(foreshadowing);
  };

  // 处理创建新伏笔
  const handleCreate = () => {
    setEditingForeshadowing(null);
    setShowForm(true);
  };

  // 处理表单关闭
  const handleFormClose = () => {
    setShowForm(false);
    setEditingForeshadowing(null);
  };

  return (
    <div className="foreshadowing-list-container" style={{ padding: '20px' }}>
      {/* 统计信息 */}
      <div className="foreshadowing-stats" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 'bold' }}>
          伏笔统计
        </h3>
        <div
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            className="stat-card"
            style={{
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>总数</div>
          </div>

          <div
            className="stat-card"
            style={{
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              {stats.resolved}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>已解决</div>
          </div>

          <div
            className="stat-card"
            style={{
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.ongoing}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>进行中</div>
          </div>

          <div
            className="stat-card"
            style={{
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
              {stats.withConflicts}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>有矛盾</div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div style={{ marginBottom: '20px' }}>
        <ForeshadowingFilters />
      </div>

      {/* 操作栏 */}
      <div
        className="actions-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
            伏笔列表
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            共 {foreshadowings.length} 个伏笔
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="create-foreshadowing-button">
          + 创建伏笔
        </Button>
      </div>

      {/* 伏笔列表 */}
      <div
        className="foreshadowing-list"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px',
        }}
      >
        {foreshadowings.length === 0 ? (
          <div
            className="empty-state"
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '2px dashed #e5e7eb',
            }}
            data-testid="empty-state"
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3
              style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}
            >
              暂无伏笔
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              点击"创建伏笔"按钮开始添加您的第一个伏笔
            </p>
            <Button onClick={handleCreate}>创建第一个伏笔</Button>
          </div>
        ) : (
          foreshadowings.map((foreshadowing) => (
            <ForeshadowingCard
              key={foreshadowing.id}
              foreshadowing={foreshadowing}
              isSelected={selectedId === foreshadowing.id}
              onSelect={() => handleSelect(foreshadowing)}
              onEdit={() => handleEdit(foreshadowing)}
              data-testid={`foreshadowing-card-${foreshadowing.id}`}
            />
          ))
        )}
      </div>

      {/* 表单对话框 */}
      {showForm && (
        <ForeshadowingForm
          foreshadowing={editingForeshadowing}
          onClose={handleFormClose}
          data-testid="foreshadowing-form-modal"
        />
      )}
    </div>
  );
};
