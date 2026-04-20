import React from 'react';
import { Circle } from 'lucide-react';

/**
 * Prompt 生效层级
 * - DEFAULT: 使用系统预设
 * - PROJECT: 项目级覆盖
 * - MODULE: 当前模块特化
 */
export type EffectLevel = 'DEFAULT' | 'PROJECT' | 'MODULE';

interface EffectBadgeProps {
  level: EffectLevel;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const LEVEL_CONFIG: Record<EffectLevel, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  dotColor: string;
}> = {
  DEFAULT: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: '默认',
    dotColor: 'fill-emerald-400',
  },
  PROJECT: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: '项目自定义',
    dotColor: 'fill-amber-400',
  },
  MODULE: {
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    label: '模块专属',
    dotColor: 'fill-rose-400',
  },
};

export const EffectBadge: React.FC<EffectBadgeProps> = ({
  level,
  size = 'sm',
  showLabel = true,
}) => {
  const config = LEVEL_CONFIG[level];
  const isSmall = size === 'sm';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${config.bgColor} ${config.borderColor} ${config.color}
        ${isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
        transition-all duration-200
      `}
    >
      <Circle
        size={isSmall ? 6 : 8}
        className={config.dotColor}
      />
      {showLabel && config.label}
    </span>
  );
};

/**
 * 判断 prompt 的生效层级
 */
export const getEffectLevel = (
  hasModuleOverride: boolean,
  hasProjectOverride: boolean
): EffectLevel => {
  if (hasModuleOverride) return 'MODULE';
  if (hasProjectOverride) return 'PROJECT';
  return 'DEFAULT';
};

export default EffectBadge;
