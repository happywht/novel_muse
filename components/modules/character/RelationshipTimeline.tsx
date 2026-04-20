/**
 * RelationshipTimeline - 角色关系时间线组件
 *
 * 功能：
 * - 展示角色关系的演化历史
 * - 水平时间轴布局
 * - 支持前后对比视图
 * - 关键事件标记
 */

import React, { useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus, AlertCircle, User } from 'lucide-react';

export interface RelationshipTimelineEntry {
    timestamp: number;
    echoId?: string;
    targetCharacterId: string;
    targetCharacterName: string;
    before?: {
        type: string;
        weight?: number;
        description?: string;
    };
    after?: {
        type: string;
        weight?: number;
        description?: string;
    };
    reason?: string;
    changeType: 'created' | 'updated' | 'deleted';
}

interface RelationshipTimelineProps {
    timeline: RelationshipTimelineEntry[];
    onCharacterClick?: (characterId: string) => void;
    showFullDetails?: boolean;
    className?: string;
}

// 关系类型中文映射
const RELATION_TYPE_LABELS: Record<string, string> = {
    ALLY_OF: '盟友',
    ENEMY_OF: '敌对',
    LOVES: '爱慕',
    KIN_OF: '亲属',
    MENTORS: '师徒',
    RIVAL_OF: '竞争',
    SERVES: '效忠',
    FRIEND_OF: '朋友',
    RELATED_TO: '关联',
};

// 变化类型颜色和图标
const CHANGE_TYPE_CONFIG = {
    created: {
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: TrendingUp,
        label: '建立关系',
    },
    updated: {
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: AlertCircle,
        label: '关系变化',
    },
    deleted: {
        color: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: Minus,
        label: '关系解除',
    },
};

export const RelationshipTimeline: React.FC<RelationshipTimelineProps> = ({
    timeline,
    onCharacterClick,
    showFullDetails = false,
    className = ''
}) => {
    const [selectedEntry, setSelectedEntry] = useState<RelationshipTimelineEntry | null>(null);

    // 格式化时间戳
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 获取权重变化趋势
    const getWeightTrend = (before?: number, after?: number) => {
        if (before === undefined || after === undefined) return null;
        if (after > before) return 'up';
        if (after < before) return 'down';
        return 'stable';
    };

    // 过滤时间线条目
    const filteredTimeline = timeline.filter(entry =>
        entry.after || entry.before
    );

    if (filteredTimeline.length === 0) {
        return (
            <div className={`bg-slate-800/50 rounded-lg p-8 border border-slate-700/50 text-center ${className}`}>
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">暂无关系演化历史</p>
                <p className="text-xs text-slate-600 mt-2">当角色关系发生变化时将在此处显示</p>
            </div>
        );
    }

    return (
        <div className={`bg-slate-800/40 rounded-lg border border-slate-700/50 ${className}`}>
            {/* 头部 */}
            <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        关系演化时间线
                    </h3>
                    <span className="text-xs text-slate-500">
                        {filteredTimeline.length} 条记录
                    </span>
                </div>
            </div>

            {/* 时间轴 */}
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredTimeline.map((entry, index) => {
                    const config = CHANGE_TYPE_CONFIG[entry.changeType];
                    const Icon = config.icon;
                    const weightTrend = getWeightTrend(entry.before?.weight, entry.after?.weight);

                    return (
                        <div key={`${entry.timestamp}-${index}`} className="relative">
                            {/* 时间线连接线 */}
                            {index < filteredTimeline.length - 1 && (
                                <div className="absolute left-[19px] top-8 w-0.5 h-full bg-slate-700/50 -z-10" />
                            )}

                            {/* 时间线条目 */}
                            <div className="flex gap-4">
                                {/* 时间点标记 */}
                                <div className="flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-full ${config.color} border flex items-center justify-center`}>
                                        <Icon size={16} />
                                    </div>
                                </div>

                                {/* 内容卡片 */}
                                <div
                                    className={`flex-1 bg-slate-900/50 rounded-lg border border-slate-700/50 p-4 hover:border-slate-600 transition-all cursor-pointer ${
                                        selectedEntry === entry ? 'ring-2 ring-cyan-500/50' : ''
                                    }`}
                                    onClick={() => setSelectedEntry(selectedEntry === entry ? null : entry)}
                                >
                                    {/* 头部信息 */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {formatTimestamp(entry.timestamp)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-slate-500" />
                                                <span
                                                    className="text-sm text-slate-300 font-medium hover:text-cyan-400 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onCharacterClick?.(entry.targetCharacterId);
                                                    }}
                                                >
                                                    {entry.targetCharacterName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 关系变化对比 */}
                                    <div className="space-y-2">
                                        {/* 变化前 */}
                                        {entry.before && (
                                            <div className="text-xs">
                                                <span className="text-slate-500">之前:</span>
                                                <span className="text-slate-400 ml-2">
                                                    {RELATION_TYPE_LABELS[entry.before.type] || entry.before.type}
                                                </span>
                                                {entry.before.weight !== undefined && (
                                                    <span className="text-slate-500 ml-2">
                                                        (强度: {entry.before.weight})
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* 变化指示器 */}
                                        <div className="flex items-center gap-2">
                                            {weightTrend === 'up' && (
                                                <div className="flex items-center gap-1 text-emerald-400 text-xs">
                                                    <TrendingUp size={12} />
                                                    <span>关系升温</span>
                                                    <span className="text-slate-500">
                                                        {entry.before?.weight} → {entry.after?.weight}
                                                    </span>
                                                </div>
                                            )}
                                            {weightTrend === 'down' && (
                                                <div className="flex items-center gap-1 text-red-400 text-xs">
                                                    <TrendingDown size={12} />
                                                    <span>关系降温</span>
                                                    <span className="text-slate-500">
                                                        {entry.before?.weight} → {entry.after?.weight}
                                                    </span>
                                                </div>
                                            )}
                                            {weightTrend === 'stable' && (
                                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                                    <Minus size={12} />
                                                    <span>关系稳定</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* 变化后 */}
                                        {entry.after && (
                                            <div className="text-xs">
                                                <span className="text-slate-500">之后:</span>
                                                <span className="text-slate-300 ml-2">
                                                    {RELATION_TYPE_LABELS[entry.after.type] || entry.after.type}
                                                </span>
                                                {entry.after.weight !== undefined && (
                                                    <span className="text-slate-400 ml-2">
                                                        (强度: {entry.after.weight})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 详细描述 */}
                                    {(showFullDetails || selectedEntry === entry) && (
                                        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                                            {entry.before?.description && (
                                                <div className="text-xs">
                                                    <span className="text-slate-500">之前描述: </span>
                                                    <span className="text-slate-400">{entry.before.description}</span>
                                                </div>
                                            )}
                                            {entry.after?.description && (
                                                <div className="text-xs">
                                                    <span className="text-slate-500">当前描述: </span>
                                                    <span className="text-slate-300">{entry.after.description}</span>
                                                </div>
                                            )}
                                            {entry.reason && (
                                                <div className="text-xs">
                                                    <span className="text-slate-500">变化原因: </span>
                                                    <span className="text-cyan-400">{entry.reason}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 统计信息 */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-900/30">
                <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="text-center">
                        <div className="text-lg font-bold text-emerald-400">
                            {filteredTimeline.filter(e => e.changeType === 'created').length}
                        </div>
                        <div className="text-slate-500">新建关系</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">
                            {filteredTimeline.filter(e => e.changeType === 'updated').length}
                        </div>
                        <div className="text-slate-500">关系变化</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-red-400">
                            {filteredTimeline.filter(e => e.changeType === 'deleted').length}
                        </div>
                        <div className="text-slate-500">解除关系</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
