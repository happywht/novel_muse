/**
 * CharacterArcVisualization - 角色成长弧线可视化组件
 *
 * 功能：
 * - 展示角色成长阶段时间轴
 * - 关键转折点标记
 * - 内在冲突可视化（desire vs fear）
 * - 成长预测分析
 * - 与关系网络联动
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  Heart,
  Zap,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Clock,
  Brain,
  Swords,
  GitBranch,
  RefreshCw,
} from 'lucide-react';
import type { Character, CharacterArc, ArcPhase } from '@/types';

// 弧线阶段配置
const ARC_PHASE_CONFIG: Record<ArcPhase, {
  label: string;
  color: string;
  icon: any;
  description: string;
}> = {
  setup: {
    label: '铺垫期',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Target,
    description: '角色现状和目标确立',
  },
  'rising-action': {
    label: '上升行动',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: TrendingUp,
    description: '面对挑战，逐步成长',
  },
  crisis: {
    label: '危机点',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: AlertTriangle,
    description: '重大考验，必须做出抉择',
  },
  climax: {
    label: '高潮',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Zap,
    description: '弧线顶点，命运转折',
  },
  resolution: {
    label: '结局',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: Sparkles,
    description: '弧线完成，新状态确立',
  },
};

// 弧线类型配置
const ARC_TYPE_CONFIG: Record<string, {
  label: string;
  gradient: string;
  description: string;
}> = {
  REDEMPTION: {
    label: '救赎弧线',
    gradient: 'from-blue-500 to-cyan-400',
    description: '从错误中学习，寻求救赎',
  },
  FALL: {
    label: '堕落弧线',
    gradient: 'from-orange-500 to-red-600',
    description: '逐步走向黑暗或毁灭',
  },
  FLAT: {
    label: '平直弧线',
    gradient: 'from-gray-500 to-slate-600',
    description: '保持不变，但可揭示深层性格',
  },
  GROWTH: {
    label: '成长弧线',
    gradient: 'from-emerald-500 to-teal-400',
    description: '积极向上，自我提升',
  },
  CHANGE: {
    label: '转变弧线',
    gradient: 'from-purple-500 to-pink-400',
    description: '重大改变，重新定义自我',
  },
};

interface CharacterArcVisualizationProps {
  character: Character;
  relationships?: Character['structuredRelations'];
  onPhaseUpdate?: (phase: ArcPhase, progress: number) => void;
  className?: string;
}

export const CharacterArcVisualization: React.FC<CharacterArcVisualizationProps> = ({
  character,
  relationships = [],
  onPhaseUpdate,
  className = '',
}) => {
  const [selectedPhase, setSelectedPhase] = useState<ArcPhase | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [conflictView, setConflictView] = useState(false);

  const arc = character.arc;
  const arcConfig = arc ? ARC_TYPE_CONFIG[arc.arcType] : null;

  // 计算内在冲突指数（desire vs fear）
  const conflictScore = useMemo(() => {
    if (!character.desire || !character.fear) return null;

    // 简化的冲突评分算法
    const desireLength = character.desire.length;
    const fearLength = character.fear.length;
    const hasContrast = character.contrast?.length > 0;
    const hasWeakness = character.weakness?.length > 0;

    let score = 50; // 基础分
    score += hasContrast ? 15 : 0;
    score += hasWeakness ? 10 : 0;
    score += desireLength > fearLength ? 10 : -5;

    return Math.min(100, Math.max(0, score));
  }, [character.desire, character.fear, character.contrast, character.weakness]);

  // 分析关键转折点（基于关系变化）
  const turningPoints = useMemo(() => {
    if (!relationships || relationships.length === 0) return [];

    // 识别关系强度突变点
    const points = relationships
      .filter(rel => rel.trajectory && rel.trajectory !== 'stable')
      .map(rel => ({
        type: rel.trajectory === 'strengthening' ? 'positive' : 'negative',
        target: rel.targetCharacterId,
        impact: Math.abs(rel.weight || 50),
        relationType: rel.type,
      }));

    return points.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }, [relationships]);

  // AI预测成长方向
  const predictedArc = useMemo(() => {
    if (!arc) return null;

    const currentPhaseIndex = Object.keys(ARC_PHASE_CONFIG).indexOf(arc.currentPhase);
    const progress = arc.phaseProgress;

    // 基于当前阶段和进度预测下一阶段
    if (progress >= 80 && currentPhaseIndex < 4) {
      const nextPhase = Object.keys(ARC_PHASE_CONFIG)[currentPhaseIndex + 1] as ArcPhase;
      return {
        phase: nextPhase,
        probability: Math.round((progress - 80) * 2.5), // 80-100% -> 0-50%
        reason: '当前阶段接近完成，准备进入下一阶段',
      };
    }

    return null;
  }, [arc]);

  if (!arc) {
    return (
      <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 p-6 text-center ${className}`}>
        <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500">暂无成长弧线数据</p>
        <p className="text-xs text-slate-600 mt-2">请在角色编辑器中设置弧线类型</p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* 头部 */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              角色成长弧线
            </h3>
            {arcConfig && (
              <p className="text-xs text-slate-500 mt-1">{arcConfig.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConflictView(!conflictView)}
              className={`p-2 rounded-lg transition-colors ${
                conflictView
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
              title="内在冲突视图"
            >
              <Swords size={16} />
            </button>
            <button
              onClick={() => setShowPrediction(!showPrediction)}
              className={`p-2 rounded-lg transition-colors ${
                showPrediction
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
              title="AI预测"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* 弧线类型标签 */}
        {arcConfig && (
          <div className={`mt-3 px-4 py-2 rounded-lg bg-gradient-to-r ${arcConfig.gradient} bg-opacity-10 border border-white/10`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{arcConfig.label}</span>
              <span className="text-xs text-white/80">阶段进度: {arc.phaseProgress}%</span>
            </div>
            {/* 进度条 */}
            <div className="mt-2 h-2 bg-black/30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${arcConfig.gradient} transition-all duration-500`}
                style={{ width: `${arc.phaseProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 时间轴视图 */}
      <div className="p-4">
        <div className="relative">
          {/* 时间轴线 */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />

          {/* 阶段时间轴 */}
          <div className="space-y-4">
            {Object.entries(ARC_PHASE_CONFIG).map(([phase, config], index) => {
              const PhaseIcon = config.icon;
              const isCurrentPhase = phase === arc.currentPhase;
              const isPastPhase = Object.keys(ARC_PHASE_CONFIG).indexOf(phase) <
                Object.keys(ARC_PHASE_CONFIG).indexOf(arc.currentPhase);
              const isFuturePhase = !isCurrentPhase && !isPastPhase;

              return (
                <div key={phase} className="relative flex items-start gap-4">
                  {/* 时间点 */}
                  <div className={`relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                    isCurrentPhase
                      ? 'bg-muse-600 border-muse-400 shadow-lg shadow-muse-500/50'
                      : isPastPhase
                      ? 'bg-emerald-900/50 border-emerald-500/50'
                      : 'bg-slate-800 border-slate-600'
                  }`}>
                    <PhaseIcon size={20} className={
                      isCurrentPhase
                        ? 'text-white'
                        : isPastPhase
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    } />
                  </div>

                  {/* 内容卡片 */}
                  <div
                    className={`flex-1 p-4 rounded-lg border transition-all ${
                      isCurrentPhase
                        ? 'bg-muse-950/30 border-muse-500/50 cursor-pointer hover:border-muse-400'
                        : isPastPhase
                        ? 'bg-emerald-950/20 border-emerald-500/20'
                        : 'bg-slate-900/30 border-slate-700/50'
                    }`}
                    onClick={() => isCurrentPhase && setSelectedPhase(isCurrentPhase ? null : phase as ArcPhase)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-sm font-bold ${
                        isCurrentPhase
                          ? 'text-muse-400'
                          : isPastPhase
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}>
                        {config.label}
                      </h4>
                      {isCurrentPhase && (
                        <span className="text-xs px-2 py-0.5 bg-muse-600 text-white rounded">
                          进行中
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${
                      isCurrentPhase || isPastPhase ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {config.description}
                    </p>

                    {/* 当前阶段的详细进度 */}
                    {isCurrentPhase && selectedPhase === phase && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">阶段进度</span>
                          <span className="text-muse-400 font-bold">{arc.phaseProgress}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={arc.phaseProgress}
                          onChange={(e) => onPhaseUpdate?.(phase as ArcPhase, parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* 连接线箭头 */}
                  {index < Object.entries(ARC_PHASE_CONFIG).length - 1 && (
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 内在冲突视图 */}
      {conflictView && (
        <div className="p-4 border-t border-slate-700/50 bg-rose-950/10">
          <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
            <Swords size={16} />
            内在冲突分析
          </h4>

          <div className="grid grid-cols-2 gap-4">
            {/* 核心欲望 */}
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">核心欲望</span>
              </div>
              <p className="text-xs text-slate-300">{character.desire || '未设置'}</p>
            </div>

            {/* 核心恐惧 */}
            <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-xs font-bold text-red-400">核心恐惧</span>
              </div>
              <p className="text-xs text-slate-300">{character.fear || '未设置'}</p>
            </div>
          </div>

          {/* 冲突指数 */}
          {conflictScore !== null && (
            <div className="mt-4 bg-slate-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">内在冲突指数</span>
                <span className={`text-sm font-bold ${
                  conflictScore > 70 ? 'text-red-400' :
                  conflictScore > 40 ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {conflictScore}/100
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    conflictScore > 70 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                    conflictScore > 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                    'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}
                  style={{ width: `${conflictScore}%` }}
                />
              </div>
              {character.contrast && (
                <p className="text-xs text-slate-500 mt-2">
                  <span className="font-bold text-slate-400">反差萌点：</span>
                  {character.contrast}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 关键转折点 */}
      {turningPoints.length > 0 && (
        <div className="p-4 border-t border-slate-700/50">
          <h4 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <GitBranch size={16} />
            关键转折点
          </h4>
          <div className="space-y-2">
            {turningPoints.map((point, index) => (
              <div key={index} className={`flex items-center gap-3 p-2 rounded-lg ${
                point.type === 'positive'
                  ? 'bg-emerald-950/20 border border-emerald-500/20'
                  : 'bg-red-950/20 border border-red-500/20'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  point.type === 'positive'
                    ? 'bg-emerald-600'
                    : 'bg-red-600'
                }`}>
                  {point.type === 'positive' ? <TrendingUp size={14} /> : <AlertTriangle size={14} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-300">
                    {point.type === 'positive' ? '正向' : '负向'}关系变化
                  </p>
                  <p className="text-xs text-slate-500">
                    影响强度: {point.impact}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI预测 */}
      {showPrediction && predictedArc && (
        <div className="p-4 border-t border-slate-700/50 bg-cyan-950/10">
          <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
            <Brain size={16} />
            AI成长预测
          </h4>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">预测下一阶段</p>
                <p className="text-sm font-bold text-white">
                  {ARC_PHASE_CONFIG[predictedArc.phase].label}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">可能性</p>
                <p className="text-lg font-bold text-cyan-400">{predictedArc.probability}%</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              💡 {predictedArc.reason}
            </p>
          </div>
        </div>
      )}

      {/* 底部信息 */}
      {arc.lastUpdated && (
        <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock size={12} />
            <span>最后更新: {new Date(arc.lastUpdated).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
