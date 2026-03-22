import React, { useMemo, useCallback, useEffect } from 'react';
import { Echo, Character, WorldSetting, Chapter } from '../../types';
import {
  X, Download, Share2, CheckCircle2, AlertTriangle,
  FileText, ChevronRight
} from 'lucide-react';
import {
  checkIntegrity,
  getHealthScoreConfig,
  getSeverityConfig,
  getIssueTypeLabel,
  exportReportAsJSON,
  exportReportAsMarkdown,
  IntegrityReport,
  IntegrityIssue
} from './echoUtils';
import { useToast } from '../../hooks/useToast';

interface EchoIntegrityReportProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  echoes: Echo[];
  characters: Character[];
  worldSettings: WorldSetting[];
  chapters?: Chapter[];
}

/**
 * 圆环进度条组件
 */
const CircularProgress: React.FC<{
  value: number;
  size: number;
  strokeWidth: number;
  color: string;
}> = ({ value, size, strokeWidth, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-800"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* 中心文字 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
    </div>
  );
};

/**
 * 问题卡片组件
 */
const IssueCard: React.FC<{ issue: IntegrityIssue }> = ({ issue }) => {
  const severityConfig = getSeverityConfig(issue.severity);

  return (
    <div className={`p-3 rounded-lg border ${severityConfig.bgClass} ${severityConfig.borderClass}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0">{severityConfig.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-200 text-sm">[{issue.entityName}]</span>
            <span className={`text-xs ${severityConfig.textClass}`}>
              {getIssueTypeLabel(issue.type)}
            </span>
          </div>
          <p className="text-slate-400 text-xs">{issue.description}</p>
          {issue.details && (
            <p className="text-slate-500 text-xs mt-1 pl-2 border-l-2 border-slate-700">
              {issue.details}
            </p>
          )}
          {issue.chapterInfo && (
            <p className="text-slate-600 text-xs mt-1">
              章节: {issue.chapterInfo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 问题类型分组组件
 */
const IssueGroup: React.FC<{
  type: IntegrityIssue['type'];
  issues: IntegrityIssue[];
}> = ({ type, issues }) => {
  const severityConfig = getSeverityConfig(issues[0]?.severity || 'LOW');
  const isGood = issues.length === 0;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{isGood ? '🟢' : severityConfig.icon}</span>
        <span className="text-sm font-bold text-slate-300">
          {getIssueTypeLabel(type)} ({issues.length})
        </span>
        {isGood && <span className="text-emerald-400 text-xs">[无问题]</span>}
      </div>
      {!isGood && (
        <div className="space-y-2 pl-4">
          {issues.map((issue, index) => (
            <IssueCard key={`${issue.type}-${issue.entityId || index}`} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
};

export const EchoIntegrityReport: React.FC<EchoIntegrityReportProps> = ({
  isOpen,
  onClose,
  onConfirm,
  echoes,
  characters,
  worldSettings,
  chapters = []
}) => {
  const { toast } = useToast();
  // 执行完整性检查
  const report = useMemo<IntegrityReport>(() => {
    return checkIntegrity(echoes, characters, worldSettings, chapters);
  }, [echoes, characters, worldSettings, chapters]);

  // 获取健康度配置
  const healthConfig = useMemo(() => {
    return getHealthScoreConfig(report.healthScore);
  }, [report.healthScore]);

  // 按类型分组问题
  const groupedIssues = useMemo(() => {
    const groups: Record<IntegrityIssue['type'], IntegrityIssue[]> = {
      ORPHAN_NODE: [],
      CONTRADICTION: [],
      PENDING_ECHO: []
    };

    report.issues.forEach(issue => {
      groups[issue.type].push(issue);
    });

    return groups;
  }, [report.issues]);

  // 计算百分比
  const getPercentage = (value: number) => {
    return report.stats.total > 0 ? Math.round((value / report.stats.total) * 100) : 0;
  };

  // ESC键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 导出JSON
  const handleExportJSON = useCallback(() => {
    const json = exportReportAsJSON(report);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integrity-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  // 导出Markdown
  const handleExportMarkdown = useCallback(() => {
    const markdown = exportReportAsMarkdown(report);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integrity-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  // 分享功能（复制到剪贴板）
  const handleShare = useCallback(async () => {
    const summary = `关系完整性报告
健康度: ${report.healthScore}/100
总Echo数: ${report.stats.total}
问题数: ${report.issues.length}
- 孤立节点: ${groupedIssues.ORPHAN_NODE.length}
- 矛盾关系: ${groupedIssues.CONTRADICTION.length}
- 待确认Echo: ${groupedIssues.PENDING_ECHO.length}`;

    try {
      await navigator.clipboard.writeText(summary);
      alert('报告摘要已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [report, groupedIssues]);

  // 判断是否可以发布
  const canPublish = report.issues.filter(i => i.severity === 'HIGH').length === 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[90vw] max-w-4xl max-h-[85vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="bg-slate-950/50 border-b border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="text-muse-400" size={24} />
              <h2 className="text-xl font-bold text-white">关系完整性报告</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
                title="导出JSON"
              >
                <Download size={14} />
                JSON
              </button>
              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
                title="导出Markdown"
              >
                <Download size={14} />
                MD
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
                title="分享摘要"
              >
                <Share2 size={14} />
                分享
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800 ml-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* 问题概览 */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              {report.issues.length > 0 ? (
                <AlertTriangle className="text-amber-400" size={20} />
              ) : (
                <CheckCircle2 className="text-emerald-400" size={20} />
              )}
              <span className="text-sm font-bold text-white">
                {report.issues.length > 0
                  ? `发现 ${report.issues.length} 个潜在问题`
                  : '所有检查通过'
                }
              </span>
            </div>

            {/* 问题分组 */}
            <div className="space-y-2">
              <IssueGroup type="ORPHAN_NODE" issues={groupedIssues.ORPHAN_NODE} />
              <IssueGroup type="CONTRADICTION" issues={groupedIssues.CONTRADICTION} />
              <IssueGroup type="PENDING_ECHO" issues={groupedIssues.PENDING_ECHO} />
            </div>
          </div>

          {/* 统计摘要和健康度 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 统计摘要 */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📊</span>
                <span className="text-sm font-bold text-white">统计摘要</span>
              </div>

              <div className="space-y-3">
                {/* 总数 */}
                <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400 text-sm">总Echo数</span>
                  <span className="text-white font-bold">{report.stats.total}</span>
                </div>

                {/* 高置信度自动采纳 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✅</span>
                    <span className="text-slate-300 text-sm">高置信度自动采纳</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold">{report.stats.autoAccepted}</span>
                    <span className="text-slate-500 text-xs ml-1">
                      ({getPercentage(report.stats.autoAccepted)}%)
                    </span>
                  </div>
                </div>

                {/* 人工审核采纳 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 text-xs">👤</span>
                    <span className="text-slate-300 text-sm">人工审核采纳</span>
                  </div>
                  <div className="text-right">
                    <span className="text-blue-400 font-bold">{report.stats.manualAccepted}</span>
                    <span className="text-slate-500 text-xs ml-1">
                      ({getPercentage(report.stats.manualAccepted)}%)
                    </span>
                  </div>
                </div>

                {/* 人工拒绝 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 text-xs">❌</span>
                    <span className="text-slate-300 text-sm">人工拒绝</span>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-400 font-bold">{report.stats.rejected}</span>
                    <span className="text-slate-500 text-xs ml-1">
                      ({getPercentage(report.stats.rejected)}%)
                    </span>
                  </div>
                </div>

                {/* 待处理 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-xs">⏳</span>
                    <span className="text-slate-300 text-sm">待处理</span>
                  </div>
                  <div className="text-right">
                    <span className={`${report.stats.pending === 0 ? 'text-emerald-400' : 'text-amber-400'} font-bold`}>
                      {report.stats.pending}
                    </span>
                    {report.stats.pending === 0 && (
                      <span className="text-emerald-400 text-xs ml-1">✓</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 知识图谱健康度 */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💪</span>
                <span className="text-sm font-bold text-white">知识图谱健康度</span>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <CircularProgress
                    value={report.healthScore}
                    size={120}
                    strokeWidth={10}
                    color={healthConfig.color}
                  />
                  <div className="mt-4">
                    <span className={`text-lg font-bold ${healthConfig.textClass}`}>
                      {healthConfig.label}
                    </span>
                    <p className="text-slate-500 text-xs mt-1">
                      {report.healthScore}/100
                    </p>
                  </div>
                </div>
              </div>

              {/* 健康度说明 */}
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="text-xs text-slate-500 space-y-1">
                  <p>评分规则：</p>
                  <p className="pl-2">• 每个孤立节点: -5分</p>
                  <p className="pl-2">• 每个矛盾关系: -10分</p>
                  <p className="pl-2">• 每个待确认Echo: -3分</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="bg-slate-950/50 border-t border-slate-800 p-4">
          <div className="flex items-center justify-center gap-4">
            {canPublish ? (
              <button
                onClick={onConfirm}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-8 py-3 rounded-lg transition-colors font-bold"
              >
                <CheckCircle2 size={18} />
                已确认，可以发布
              </button>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 bg-slate-700 text-slate-400 text-sm px-8 py-3 rounded-lg cursor-not-allowed font-bold"
              >
                <AlertTriangle size={18} />
                存在严重问题，无法发布
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-6 py-3 rounded-lg transition-colors border border-slate-700"
            >
              返回修改
            </button>
          </div>

          {!canPublish && (
            <p className="text-center text-amber-400 text-xs mt-3">
              请先解决所有高危问题（矛盾关系）后再发布
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EchoIntegrityReport;
