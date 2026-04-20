import React, { useState, useEffect } from 'react';
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    MapPin,
    Shield,
    Layers,
    FileText,
    RefreshCw,
    Wrench
} from 'lucide-react';
import { ProjectState } from '@/types';

// 一致性问题类型定义
interface ConsistencyIssue {
    id: string;
    type: 'SPATIAL_CONFLICT' | 'HIERARCHY_CYCLE' | 'LOGICAL_CONTRADICTION';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    entities: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    details?: string;
    suggestion?: string;
}

// 问题类型标签
const TYPE_LABELS: Record<ConsistencyIssue['type'], string> = {
    'SPATIAL_CONFLICT': '地理空间冲突',
    'HIERARCHY_CYCLE': '层级循环',
    'LOGICAL_CONTRADICTION': '逻辑矛盾'
};

// 严重程度标签
const SEVERITY_LABELS: Record<ConsistencyIssue['severity'], string> = {
    'HIGH': '高',
    'MEDIUM': '中',
    'LOW': '低'
};

interface WorldConsistencyPanelProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

/**
 * 世界观一致性检测面板
 */
export const WorldConsistencyPanel: React.FC<WorldConsistencyPanelProps> = ({
    project,
    updateProject
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
    const [activeCategory, setActiveCategory] = useState<'all' | 'SPATIAL_CONFLICT' | 'HIERARCHY_CYCLE' | 'LOGICAL_CONTRADICTION'>('all');
    const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

    // 获取问题类型图标
    const getTypeIcon = (type: ConsistencyIssue['type']) => {
        switch (type) {
            case 'SPATIAL_CONFLICT':
                return <MapPin className="w-4 h-4 text-red-400" />;
            case 'HIERARCHY_CYCLE':
                return <Layers className="w-4 h-4 text-yellow-400" />;
            case 'LOGICAL_CONTRADICTION':
                return <FileText className="w-4 h-4 text-purple-400" />;
            default:
                return <AlertCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    // 获取严重程度图标
    const getSeverityIcon = (severity: ConsistencyIssue['severity']) => {
        switch (severity) {
            case 'HIGH':
                return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'MEDIUM':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            case 'LOW':
            default:
                return <CheckCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    // 运行一致性检测（模拟）
    const runCheck = async () => {
        setIsLoading(true);

        // 模拟检测逻辑 - 基于现有数据检测
        await new Promise(resolve => setTimeout(resolve, 1000));

        const detectedIssues: ConsistencyIssue[] = [];

        // 检测世界设定层级关系
        const worldSettings = project.worldSettings || [];

        // 检测自引用（自己作为父级）
        worldSettings.forEach(setting => {
            if (setting.parentId === setting.id) {
                detectedIssues.push({
                    id: `self-ref-${setting.id}`,
                    type: 'HIERARCHY_CYCLE',
                    severity: 'HIGH',
                    description: `"${setting.title}" 设定了自己作为父级`,
                    entities: [{ id: setting.id, name: setting.title, type: 'WorldSetting' }],
                    details: '层级关系不能自引用',
                    suggestion: '请移除自引用，选择其他设定作为父级'
                });
            }
        });

        // 检测层级循环（A→B→A）
        const checkCycle = (startId: string, currentId: string, visited: Set<string>): boolean => {
            if (visited.has(currentId)) return currentId === startId;
            visited.add(currentId);

            const current = worldSettings.find(s => s.id === currentId);
            if (!current || !current.parentId) return false;

            return checkCycle(startId, current.parentId, visited);
        };

        worldSettings.forEach(setting => {
            if (setting.parentId && checkCycle(setting.id, setting.parentId, new Set())) {
                detectedIssues.push({
                    id: `cycle-${setting.id}`,
                    type: 'HIERARCHY_CYCLE',
                    severity: 'HIGH',
                    description: `"${setting.title}" 存在层级循环引用`,
                    entities: [{ id: setting.id, name: setting.title, type: 'WorldSetting' }],
                    details: '层级关系形成了循环',
                    suggestion: '请检查并修正层级关系，避免循环引用'
                });
            }
        });

        // 按严重程度排序
        const sortedIssues = detectedIssues.sort((a, b) => {
            const severityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });

        setIssues(sortedIssues);
        setIsLoading(false);
    };

    // 筛选后的问题列表
    const filteredIssues = activeCategory === 'all'
        ? issues
        : issues.filter(issue => issue.type === activeCategory);

    // 统计信息
    const stats = {
        total: issues.length,
        high: issues.filter(i => i.severity === 'HIGH').length,
        medium: issues.filter(i => i.severity === 'MEDIUM').length,
        low: issues.filter(i => i.severity === 'LOW').length
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg font-bold text-white">世界观一致性检测</h2>
                </div>

                <button
                    onClick={runCheck}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        isLoading
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    {isLoading ? '检测中...' : '运行检测'}
                </button>
            </div>

            {/* 统计概览 */}
            {!isLoading && issues.length > 0 && (
                <div className="flex items-center gap-4 px-4 py-3 bg-slate-800/30 border-b border-slate-700/30">
                    <span className="text-xs text-slate-400">发现问题：</span>
                    <span className="text-xs text-red-400">{stats.high} 高危</span>
                    <span className="text-xs text-yellow-400">{stats.medium} 中等</span>
                    <span className="text-xs text-slate-400">{stats.low} 低危</span>
                </div>
            )}

            {/* 类别筛选 */}
            {!isLoading && issues.length > 0 && (
                <div className="flex gap-2 px-4 py-2 border-b border-slate-700/30">
                    {[
                        { type: 'all' as const, label: '全部' },
                        { type: 'SPATIAL_CONFLICT' as const, label: '地理空间' },
                        { type: 'HIERARCHY_CYCLE' as const, label: '层级循环' },
                        { type: 'LOGICAL_CONTRADICTION' as const, label: '逻辑矛盾' }
                    ].map(cat => (
                        <button
                            key={cat.type}
                            onClick={() => setActiveCategory(cat.type)}
                            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                                activeCategory === cat.type
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-700/50 text-slate-400 hover:text-white'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 问题列表 */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mb-3" />
                        <p className="text-sm text-slate-400">正在检测世界观一致性...</p>
                    </div>
                ) : filteredIssues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
                        <p className="text-slate-300 font-medium mb-1">
                            {issues.length === 0 ? '点击"运行检测"开始检查' : '太棒了！未发现此类问题'}
                        </p>
                        <p className="text-xs text-slate-500">
                            世界观一致性检测帮助您发现设定中的矛盾和冲突
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredIssues.map((issue) => (
                            <div
                                key={issue.id}
                                className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-slate-500 ${
                                    issue.severity === 'HIGH' ? 'border-red-500/50 bg-red-900/20' :
                                    issue.severity === 'MEDIUM' ? 'border-yellow-500/50 bg-yellow-900/20' :
                                    'border-slate-600/50 bg-slate-800/30'
                                }`}
                                onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                            >
                                {/* 问题头部 */}
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getSeverityIcon(issue.severity)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {getTypeIcon(issue.type)}
                                            <span className="text-xs text-slate-400">
                                                {TYPE_LABELS[issue.type]}
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                issue.severity === 'HIGH' ? 'bg-red-900/50 text-red-300' :
                                                issue.severity === 'MEDIUM' ? 'bg-yellow-900/50 text-yellow-300' :
                                                'bg-slate-700 text-slate-400'
                                            }`}>
                                                {SEVERITY_LABELS[issue.severity]}风险
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-200">{issue.description}</p>
                                    </div>
                                    <ChevronDown
                                        className={`w-4 h-4 text-slate-400 transition-transform ${
                                            expandedIssue === issue.id ? 'rotate-180' : ''
                                        }`}
                                    />
                                </div>

                                {/* 展开详情 */}
                                {expandedIssue === issue.id && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                                        {issue.details && (
                                            <div className="text-xs">
                                                <span className="text-slate-500">详情：</span>
                                                <p className="text-slate-300 mt-1">{issue.details}</p>
                                            </div>
                                        )}

                                        {issue.suggestion && (
                                            <div className="flex items-start gap-2 p-2 bg-violet-900/20 rounded-lg">
                                                <Wrench className="w-3 h-3 text-violet-400 mt-0.5" />
                                                <div>
                                                    <span className="text-xs text-violet-300 font-medium">修复建议</span>
                                                    <p className="text-xs text-slate-300 mt-1">{issue.suggestion}</p>
                                                </div>
                                            </div>
                                        )}

                                        {issue.entities.length > 0 && (
                                            <div className="text-xs">
                                                <span className="text-slate-500">相关实体：</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {issue.entities.map((entity, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2 py-0.5 bg-slate-700/50 rounded text-slate-300"
                                                        >
                                                            {entity.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorldConsistencyPanel;
