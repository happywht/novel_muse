/**
 * 伏笔统计仪表板组件
 *
 * 可视化展示伏笔的各项统计数据
 */

import React, { useMemo } from 'react';
import { useProjectStore } from '@/store';
import {
  ForeshadowingType,
  ForeshadowingStatus,
  ForeshadowingPriority,
} from '@/types/foreshadowing';

export const ForeshadowingStats: React.FC = () => {
  const statistics = useProjectStore((state) => state.getStatistics());
  const foreshadowings = useProjectStore((state) => state.foreshadowings);
  const relationships = useProjectStore((state) => state.relationships);
  const conflictReport = useProjectStore((state) => state.getConflictReport());

  // 计算额外的统计信息
  const advancedStats = useMemo(() => {
    // 按类型分布
    const typeDistribution = Object.entries(statistics.byType).map(([type, count]) => ({
      key: type,
      count,
      percentage: statistics.total > 0 ? (count / statistics.total) * 100 : 0,
    }));

    // 按状态分布
    const statusDistribution = Object.entries(statistics.byStatus).map(([status, count]) => ({
      key: status,
      count,
      percentage: statistics.total > 0 ? (count / statistics.total) * 100 : 0,
    }));

    // 按优先级分布
    const priorityDistribution = Object.entries(statistics.byPriority).map(([priority, count]) => ({
      key: priority,
      count,
      percentage: statistics.total > 0 ? (count / statistics.total) * 100 : 0,
    }));

    // 网络密度
    const networkDensity = statistics.total > 1
      ? (statistics.totalRelationships / (statistics.total * (statistics.total - 1) / 2)) * 100
      : 0;

    return {
      typeDistribution,
      statusDistribution,
      priorityDistribution,
      networkDensity,
    };
  }, [statistics]);

  return (
    <div className="foreshadowing-stats" style={{ padding: '20px' }}>
      {/* 总览卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <StatCard
          title="总伏笔数"
          value={statistics.total}
          icon="📝"
          color="#3b82f6"
          trend={null}
        />

        <StatCard
          title="已解决"
          value={statistics.resolved}
          icon="✅"
          color="#10b981"
          percentage={statistics.total > 0 ? Math.round((statistics.resolved / statistics.total) * 100) : 0}
        />

        <StatCard
          title="进行中"
          value={statistics.ongoing}
          icon="🔄"
          color="#f59e0b"
          percentage={statistics.total > 0 ? Math.round((statistics.ongoing / statistics.total) * 100) : 0}
        />

        <StatCard
          title="有矛盾"
          value={statistics.withConflicts}
          icon="⚠️"
          color="#ef4444"
          percentage={statistics.total > 0 ? Math.round((statistics.withConflicts / statistics.total) * 100) : 0}
        />
      </div>

      {/* 详细分布 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* 按类型分布 */}
        <DistributionCard
          title="按类型分布"
          distribution={advancedStats.typeDistribution}
          getColor={(type) => getTypeColor(type as ForeshadowingType)}
          getLabel={(type) => getTypeLabel(type as ForeshadowingType)}
        />

        {/* 按状态分布 */}
        <DistributionCard
          title="按状态分布"
          distribution={advancedStats.statusDistribution}
          getColor={(status) => getStatusColor(status as ForeshadowingStatus)}
          getLabel={(status) => getStatusLabel(status as ForeshadowingStatus)}
        />

        {/* 按优先级分布 */}
        <DistributionCard
          title="按优先级分布"
          distribution={advancedStats.priorityDistribution}
          getColor={(priority) => getPriorityColor(priority as ForeshadowingPriority)}
          getLabel={(priority) => getPriorityLabel(priority as ForeshadowingPriority)}
        />
      </div>

      {/* 网络分析 */}
      <div
        style={{
          marginBottom: '32px',
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '16px',
          }}
        >
          网络分析
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <NetworkStat
            label="关联关系"
            value={statistics.totalRelationships}
            icon="🔗"
          />

          <NetworkStat
            label="网络密度"
            value={`${advancedStats.networkDensity.toFixed(1)}%`}
            icon="📊"
          />

          <NetworkStat
            label="平均重要性"
            value={`${Math.round(statistics.avgImportanceScore)}分`}
            icon="⭐"
          />

          <NetworkStat
            label="矛盾总数"
            value={conflictReport.totalConflicts}
            icon="⚠️"
            highlight={conflictReport.highSeverityConflicts > 0}
          />
        </div>

        {conflictReport.summary && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: conflictReport.totalConflicts > 0 ? '#fee2e2' : '#f0fdf4',
              borderRadius: '8px',
              border: `1px solid ${conflictReport.totalConflicts > 0 ? '#fca5a5' : '#86efac'}`,
              fontSize: '14px',
              color: conflictReport.totalConflicts > 0 ? '#991b1b' : '#166534',
          }}
          >
            {conflictReport.summary}
          </div>
        )}
      </div>
    </div>
  );
};

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  percentage?: number;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  percentage,
}) => {
  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color }}>
            {value}
          </div>
          {percentage !== undefined && (
            <div
              style={{
                fontSize: '12px',
                color,
                marginTop: '4px',
                fontWeight: '500',
              }}
            >
              {percentage}%
            </div>
          )}
        </div>
        <div style={{ fontSize: '32px' }}>{icon}</div>
      </div>
    </div>
  );
};

// 分布卡片组件
interface DistributionCardProps {
  title: string;
  distribution: Array<{
    key: string;
    count: number;
    percentage: number;
  }>;
  getColor: (key: string) => string;
  getLabel: (key: string) => string;
}

const DistributionCard: React.FC<DistributionCardProps> = ({
  title,
  distribution,
  getColor,
  getLabel,
}) => {
  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '16px',
        }}
      >
        {title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {distribution.map(({ key, count, percentage }) => (
          <div key={key}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
                fontSize: '14px',
              }}
            >
              <span style={{ color: '#374151' }}>{getLabel(key)}</span>
              <span style={{ color: '#6b7280' }}>
                {count} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div
              style={{
                height: '8px',
                background: '#f3f4f6',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${percentage}%`,
                  background: getColor(key),
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 网络统计组件
interface NetworkStatProps {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}

const NetworkStat: React.FC<NetworkStatProps> = ({ label, value, icon, highlight }) => {
  return (
    <div
      style={{
        padding: '16px',
        background: highlight ? '#fee2e2' : '#f9fafb',
        borderRadius: '8px',
        border: highlight ? '1px solid #fca5a5' : '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
        {icon} {label}
      </div>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: highlight ? '#dc2626' : '#1f2937',
        }}
      >
        {value}
      </div>
    </div>
  );
};

// 辅助函数
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

function getTypeColor(type: ForeshadowingType): string {
  const colors: Record<ForeshadowingType, string> = {
    [ForeshadowingType.SUSPENSE]: '#8b5cf6',
    [ForeshadowingType.PROPHECY]: '#ec4899',
    [ForeshadowingType.SETUP]: '#3b82f6',
    [ForeshadowingType.HINT]: '#6366f1',
    [ForeshadowingType.FORESHADOWING]: '#8b5cf6',
    [ForeshadowingType.PAYOFF]: '#10b981',
    [ForeshadowingType.TWIST]: '#f59e0b',
    [ForeshadowingType.RED_HERRING]: '#ef4444',
  };
  return colors[type] || '#9ca3af';
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

function getStatusColor(status: ForeshadowingStatus): string {
  const colors: Record<ForeshadowingStatus, string> = {
    [ForeshadowingStatus.UNREVEALED]: '#9ca3af',
    [ForeshadowingStatus.REVEALED]: '#3b82f6',
    [ForeshadowingStatus.RESOLVED]: '#10b981',
    [ForeshadowingStatus.ABANDONED]: '#6b7280',
    [ForeshadowingStatus.ONGOING]: '#f59e0b',
  };
  return colors[status] || '#9ca3af';
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

function getPriorityColor(priority: ForeshadowingPriority): string {
  const colors: Record<ForeshadowingPriority, string> = {
    [ForeshadowingPriority.CRITICAL]: '#ef4444',
    [ForeshadowingPriority.HIGH]: '#f59e0b',
    [ForeshadowingPriority.MEDIUM]: '#3b82f6',
    [ForeshadowingPriority.LOW]: '#9ca3af',
  };
  return colors[priority] || '#9ca3af';
}
