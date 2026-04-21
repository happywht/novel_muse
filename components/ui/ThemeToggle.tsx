/**
 * ThemeToggle - 主题切换器组件
 *
 * 提供用户友好的主题切换界面
 * Provides user-friendly theme switching interface
 */

import React, { useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * ThemeToggle - 主题切换按钮
 *
 * 简单版本：点击切换light/dark
 *
 * @example
 * ```tsx
 * <ThemeToggle />
 * ```
 */
export const ThemeToggle: React.FC = () => {
  const { theme, resolvedMode, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'touch-target',
        'relative p-2 rounded-lg',
        'transition-all duration-300',
        'hover:bg-slate-200 dark:hover:bg-slate-700',
        'active:scale-95',
        isAnimating && 'animate-pulse-soft',
        'group'
      )}
      aria-label={`切换到${resolvedMode === 'dark' ? '亮色' : '深色'}主题`}
      title={`当前：${resolvedMode === 'dark' ? '深色' : '亮色'}主题（点击切换）`}
    >
      {resolvedMode === 'dark' ? (
        <Moon
          size={20}
          className="text-slate-700 dark:text-slate-300 transition-transform duration-300 group-hover:scale-110"
        />
      ) : (
        <Sun
          size={20}
          className="text-amber-500 transition-transform duration-300 group-hover:scale-110"
        />
      )}
    </button>
  );
};

/**
 * ThemeSwitcher - 主题选择器
 *
 * 完整版本：可选择light/dark/system
 *
 * @example
 * ```tsx
 * <ThemeSwitcher />
 * ```
 */
export const ThemeSwitcher: React.FC = () => {
  const { mode, resolvedMode, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    {
      value: 'light' as const,
      label: '亮色',
      icon: Sun,
      description: '明亮清爽的界面',
      color: 'text-amber-500',
    },
    {
      value: 'dark' as const,
      label: '深色',
      icon: Moon,
      description: '护眼深色界面',
      color: 'text-slate-300',
    },
    {
      value: 'system' as const,
      label: '跟随系统',
      icon: Monitor,
      description: '自动切换主题',
      color: 'text-slate-500',
    },
  ];

  const handleSelect = (value: typeof mode) => {
    setTheme(value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'touch-target',
          'flex items-center gap-2',
          'px-3 py-2 rounded-lg',
          'bg-slate-200 dark:bg-slate-700',
          'hover:bg-slate-300 dark:hover:bg-slate-600',
          'transition-colors duration-200',
          'text-sm font-medium'
        )}
        aria-label="选择主题"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {mode === 'system' ? (
          <Monitor size={18} className={options[2].color} />
        ) : mode === 'light' ? (
          <Sun size={18} className={options[0].color} />
        ) : (
          <Moon size={18} className={options[1].color} />
        )}
        <span className="hidden sm:inline">
          {options.find(o => o.value === mode)?.label}
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* 菜单 */}
          <div
            className={cn(
              'absolute right-0 top-full mt-2 z-20',
              'min-w-[200px]',
              'bg-white dark:bg-slate-800',
              'rounded-lg shadow-xl',
              'border border-slate-200 dark:border-slate-700',
              'overflow-hidden',
              'animate-scale-in'
            )}
            role="listbox"
            aria-label="主题选项"
          >
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = mode === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'touch-target w-full',
                    'flex items-center gap-3',
                    'px-4 py-3',
                    'text-left',
                    'transition-colors duration-150',
                    'hover:bg-slate-100 dark:hover:bg-slate-700',
                    isSelected && 'bg-slate-100 dark:bg-slate-700',
                    'first:rounded-t-lg',
                    'last:rounded-b-lg'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <Icon size={20} className={option.color} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check size={16} className="text-muse-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* 当前实际主题提示 */}
            {mode === 'system' && (
              <div
                className={cn(
                  'px-4 py-2',
                  'border-t border-slate-200 dark:border-slate-700',
                  'text-xs text-slate-500 dark:text-slate-400',
                  'text-center'
                )}
              >
                当前：{resolvedMode === 'dark' ? '深色' : '亮色'}主题（系统偏好）
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * ThemeToggleCompact - 紧凑型主题切换
 *
 * 适用于工具栏或小空间
 *
 * @example
 * ```tsx
 * <ThemeToggleCompact />
 * ```
 */
export const ThemeToggleCompact: React.FC = () => {
  const { resolvedMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'touch-target',
        'p-2 rounded-full',
        'transition-all duration-300',
        'bg-slate-200 dark:bg-slate-700',
        'hover:scale-110 active:scale-95',
        'shadow-md hover:shadow-lg'
      )}
      aria-label={`切换到${resolvedMode === 'dark' ? '亮色' : '深色'}主题`}
    >
      <div className="relative w-5 h-5">
        {resolvedMode === 'dark' ? (
          <Moon
            size={20}
            className="absolute inset-0 text-slate-700 dark:text-slate-300 transition-opacity duration-300"
          />
        ) : (
          <Sun
            size={20}
            className="absolute inset-0 text-amber-500 transition-opacity duration-300"
          />
        )}
      </div>
    </button>
  );
};
