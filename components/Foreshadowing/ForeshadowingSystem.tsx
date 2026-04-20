/**
 * 伏笔追踪系统主组件
 *
 * 整合所有伏笔相关功能的入口组件
 */

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/store';
import { ForeshadowingList } from './ForeshadowingList';
import { ForeshadowingStats } from './ForeshadowingStats';
import { Button } from '@/components/ui/Button';

type ViewMode = 'list' | 'stats' | 'timeline';

export const ForeshadowingSystem: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 初始化时自动分析关联关系
  useEffect(() => {
    const { foreshadowings, relationships, analyzeAllRelationships } = useProjectStore.getState();

    // 只在首次加载且没有关联关系时分析
    if (foreshadowings.length > 0 && relationships.length === 0) {
      analyzeAllRelationships();
    }
  }, []);

  return (
    <div className="foreshadowing-system" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航 */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          background: 'white',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
              伏笔追踪系统
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              管理、分析、检测伏笔的完整生命周期
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('list')}
            >
              📝 列表
            </Button>
            <Button
              variant={viewMode === 'stats' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('stats')}
            >
              📊 统计
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('timeline')}
              disabled
            >
              ⏳ 时间线
            </Button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {viewMode === 'list' && <ForeshadowingList />}
        {viewMode === 'stats' && <ForeshadowingStats />}
        {viewMode === 'timeline' && (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              时间线视图
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              此功能正在开发中，敬请期待...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
