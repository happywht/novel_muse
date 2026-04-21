/**
 * Typography - 排版组件
 *
 * 提供统一的文本样式和层级
 * Provides consistent text styling and hierarchy
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 文本变体
 */
type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'overline'
  | 'button';

/**
 * 文本颜色
 */
type TextColor =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'error'
  | 'warning'
  | 'success'
  | 'info';

/**
 * Typography组件属性
 */
export interface TextProps {
  /**
   * 变体
   */
  variant?: TextVariant;

  /**
   * 颜色
   */
  color?: TextColor;

  /**
   * 是否加粗
   */
  bold?: boolean;

  /**
   * 对齐方式
   */
  align?: 'left' | 'center' | 'right' | 'justify';

  /**
   * 是否截断
   */
  truncate?: boolean;

  /**
   * 截断行数
   */
  lines?: number;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 子元素
   */
  children: React.ReactNode;
}

/**
 * 变体样式映射
 */
const variantStyles: Record<TextVariant, string> = {
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-bold tracking-tight',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold tracking-tight',
  h5: 'text-lg font-semibold tracking-tight',
  h6: 'text-base font-semibold tracking-tight',
  subtitle1: 'text-lg font-medium',
  subtitle2: 'text-base font-medium',
  body1: 'text-base font-normal',
  body2: 'text-sm font-normal',
  caption: 'text-xs font-normal',
  overline: 'text-xs font-normal uppercase tracking-wider',
  button: 'text-base font-medium',
};

/**
 * 颜色样式映射
 */
const colorStyles: Record<TextColor, string> = {
  primary: 'text-slate-900 dark:text-slate-100',
  secondary: 'text-slate-600 dark:text-slate-400',
  disabled: 'text-slate-400 dark:text-slate-600',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  success: 'text-green-600 dark:text-green-400',
  info: 'text-muse-600 dark:text-muse-400',
};

/**
 * 对齐样式映射
 */
const alignStyles: Record<TextProps['align'], string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

/**
 * Text - 文本组件
 *
 * @example
 * ```tsx
 * <Text variant="h1">标题1</Text>
 * <Text variant="body2" color="secondary">副标题</Text>
 * <Text variant="caption" truncate>截断文本</Text>
 * ```
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body1',
  color = 'primary',
  bold = false,
  align,
  truncate = false,
  lines,
  className,
  children,
}) => {
  return (
    <p
      className={cn(
        variantStyles[variant],
        colorStyles[color],
        align && alignStyles[align],
        bold && 'font-bold',
        truncate && 'truncate',
        lines && `line-clamp-${lines}`,
        className
      )}
    >
      {children}
    </p>
  );
};

/**
 * Title - 标题快捷组件
 */
export const Title: React.FC<Omit<TextProps, 'variant'> & {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}> = ({ level = 1, ...props }) => {
  const variant = `h${level}` as TextVariant;
  return <Text variant={variant} {...props} />;
};

/**
 * Subtitle - 副标题快捷组件
 */
export const Subtitle: React.FC<
  Omit<TextProps, 'variant'> & {
    level?: 1 | 2;
  }
> = ({ level = 1, ...props }) => {
  const variant = `subtitle${level}` as TextVariant;
  return <Text variant={variant} {...props} />;
};

/**
 * Body - 正文快捷组件
 */
export const Body: React.FC<
  Omit<TextProps, 'variant'> & {
    size?: 1 | 2;
  }
> = ({ size = 1, ...props }) => {
  const variant = `body${size}` as TextVariant;
  return <Text variant={variant} {...props} />;
};

/**
 * Caption - 说明文本快捷组件
 */
export const Caption: React.FC<TextProps> = (props) => {
  return <Text variant="caption" {...props} />;
};

/**
 * Label - 标签文本快捷组件
 */
export const Label: React.FC<{
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}> = ({ children, required = false, className }) => {
  return (
    <label className={cn('text-sm font-medium text-slate-900 dark:text-slate-100', className)}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

/**
 * Link - 链接组件
 */
export const Link: React.FC<{
  href?: string;
  children: React.ReactNode;
  external?: boolean;
  underline?: 'none' | 'hover' | 'always';
  className?: string;
}> = ({ href, children, external = false, underline = 'hover', className }) => {
  return (
    <a
      href={href}
      className={cn(
        'text-muse-600 dark:text-muse-400',
        'transition-colors duration-200',
        underline === 'hover' && 'hover:underline',
        underline === 'always' && 'underline',
        underline === 'none' && 'no-underline',
        className
      )}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      {children}
      {external && <span className="ml-1">↗</span>}
    </a>
  );
};

/**
 * Code - 代码文本组件
 */
export const Code: React.FC<{
  children: React.ReactNode;
  inline?: boolean;
  className?: string;
}> = ({ children, inline = false, className }) => {
  return (
    <code
      className={cn(
        'font-mono text-sm',
        'bg-slate-100 dark:bg-slate-800',
        'text-muse-600 dark:text-muse-400',
        'px-1.5 py-0.5 rounded',
        inline ? 'rounded' : 'block',
        !inline && 'block my-2 p-3 overflow-x-auto',
        className
      }>
      {children}
    </code>
  );
};

/**
 * Blockquote - 引用块组件
 */
export const Blockquote: React.FC<{
  children: React.ReactNode;
  author?: string;
  className?: string;
}> = ({ children, author, className }) => {
  return (
    <blockquote
      className={cn(
        'border-l-4 border-muse-500',
        'pl-4 py-2 my-4',
        'text-slate-700 dark:text-slate-300',
        'italic',
        className
      )}
    >
      {children}
      {author && (
        <cite className="not-italic text-sm text-slate-500 dark:text-slate-400 block mt-2">
          — {author}
        </cite>
      )}
    </blockquote>
  );
};

/**
 * Highlight - 高亮文本组件
 */
export const Highlight: React.FC<{
  children: React.ReactNode;
  color?: 'yellow' | 'green' | 'blue' | 'pink';
  className?: string;
}> = ({ children, color = 'yellow', className }) => {
  const colorStyles = {
    yellow: 'bg-yellow-200 dark:bg-yellow-900/30',
    green: 'bg-green-200 dark:bg-green-900/30',
    blue: 'bg-blue-200 dark:bg-blue-900/30',
    pink: 'bg-pink-200 dark:bg-pink-900/30',
  };

  return (
    <mark
      className={cn(
        'px-1.5 py-0.5 rounded',
        colorStyles[color],
        'text-slate-900 dark:text-slate-100',
        className
      )}
    >
      {children}
    </mark>
  );
};

/**
 * Kbd - 键盘按键组件
 */
export const Kbd: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <kbd
      className={cn(
        'px-2 py-1',
        'bg-slate-100 dark:bg-slate-800',
        'border border-slate-300 dark:border-slate-600',
        'border-b-2',
        'rounded',
        'text-xs font-mono',
        'text-slate-900 dark:text-slate-100',
        'shadow-sm',
        className
      )}
    >
      {children}
    </kbd>
  );
};
