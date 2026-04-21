/**
 * List - 列表组件系统
 *
 * 提供有序和无序列表展示
 * Provides ordered and unordered list displays
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * List尺寸
 */
export type ListSize = 'sm' | 'md' | 'lg';

/**
 * List变体
 */
export type ListVariant = 'default' | 'bordered' | 'filled';

/**
 * 基础List组件属性
 */
export interface ListProps {
  /**
   * 列表项
   */
  children: React.ReactNode;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: ListSize;

  /**
   * 变体
   * @default 'default'
   */
  variant?: ListVariant;

  /**
   * 是否有序
   */
  ordered?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<ListSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * 变体样式映射
 */
const variantStyles: Record<ListVariant, string> = {
  default: 'bg-transparent',
  bordered: 'border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700',
  filled: 'bg-slate-50 dark:bg-slate-900 rounded-lg divide-y divide-slate-200 dark:divide-slate-700',
};

/**
 * List - 主列表组件
 *
 * @example
 * ```tsx
 * <List>
 *   <ListItem>项目1</ListItem>
 *   <ListItem>项目2</ListItem>
 *   <ListItem>项目3</ListItem>
 * </List>
 * ```
 */
export const List: React.FC<ListProps> = ({
  children,
  size = 'md',
  variant = 'default',
  ordered = false,
  className,
}) => {
  const Tag = ordered ? 'ol' : 'ul';

  return (
    <Tag
      className={cn(
        'touch-target',
        sizeStyles[size],
        variantStyles[variant],
        ordered && 'list-decimal list-inside',
        !ordered && 'list-none',
        className
      )}
    >
      {children}
    </Tag>
  );
};

/**
 * ListItem - 列表项
 */
export const ListItem: React.FC<{
  /**
   * 内容
   */
  children: React.ReactNode;

  /**
   * 图标
   */
  icon?: React.ReactNode;

  /**
   * 前缀
   */
  prefix?: React.ReactNode;

  /**
   * 后缀
   */
  suffix?: React.ReactNode;

  /**
   * 描述文本
   */
  description?: string;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 点击回调
   */
  onClick?: () => void;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ children, icon, prefix, suffix, description, disabled = false, onClick, className }) => {
  return (
    <li
      className={cn(
        'touch-target',
        'flex items-start gap-3',
        'py-3 px-4',
        'transition-colors duration-150',
        !disabled && onClick && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={!disabled ? onClick : undefined}
    >
      {icon && <div className="flex-shrink-0 mt-0.5 text-muse-600 dark:text-muse-400">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {prefix && <span className="flex-shrink-0">{prefix}</span>}
          <span className="font-medium text-slate-900 dark:text-slate-100">{children}</span>
          {suffix && <span className="flex-shrink-0">{suffix}</span>}
        </div>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
    </li>
  );
};

/**
 * ListHeader - 列表头部
 */
export const ListHeader: React.FC<{
  /**
   * 标题
   */
  title?: string;

  /**
   * 操作按钮
   */
  action?: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ title, action, className }) => {
  return (
    <div className={cn('flex items-center justify-between py-3 px-4', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      )}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

/**
 * ListFooter - 列表底部
 */
export const ListFooter: React.FC<{
  /**
   * 内容
   */
  children: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn('py-3 px-4 border-t border-slate-200 dark:border-slate-700', className)}>
      {children}
    </div>
  );
};

/**
 * ListSubheader - 分组标题
 */
export const ListSubheader: React.FC<{
  /**
   * 标题
   */
  children: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn('px-4 pt-4 pb-2', className)}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        {children}
      </span>
    </div>
  );
};

/**
 * ListDivider - 分割线
 */
export const ListDivider: React.FC<{
  /**
   * 自定义类名
   */
  className?: string;
}> = ({ className }) => {
  return <div className={cn('border-t border-slate-200 dark:border-slate-700', className)} />;
};

/**
 * VirtualizedList - 虚拟滚动列表
 */
export const VirtualizedList: React.FC<{
  /**
   * 数据源
   */
  items: any[];

  /**
   * 渲染函数
   */
  renderItem: (item: any, index: number) => React.ReactNode;

  /**
   * 项目高度
   */
  itemHeight: number;

  /**
   * 可见高度
   */
  height: number;

  /**
   * overscan数量
   * @default 3
   */
  overscan?: number;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ items, renderItem, itemHeight, height, overscan = 3, className }) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const visibleCount = Math.ceil(height / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="flex items-center px-4 border-b border-slate-200 dark:border-slate-700"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * CheckList - 复选框列表
 */
export const CheckList: React.FC<{
  /**
   * 选项列表
   */
  options: Array<{
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;

  /**
   * 已选项
   */
  value: string[];

  /**
   * 变化回调
   */
  onChange: (value: string[]) => void;

  /**
   * 是否多选
   * @default true
   */
  multiple?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ options, value, onChange, multiple = true, className }) => {
  const handleToggle = (optionValue: string) => {
    if (multiple) {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    } else {
      onChange([optionValue]);
    }
  };

  return (
    <List className={className}>
      {options.map((option) => (
        <ListItem
          key={option.value}
          disabled={option.disabled}
          onClick={() => !option.disabled && handleToggle(option.value)}
          suffix={
            <div
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                value.includes(option.value)
                  ? 'bg-muse-600 border-muse-600'
                  : 'border-slate-300 dark:border-slate-600',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {value.includes(option.value) && (
                <span className="text-white text-sm">✓</span>
              )}
            </div>
          }
          description={option.description}
        >
          {option.label}
        </ListItem>
      ))}
    </List>
  );
};

/**
 * RadioList - 单选列表
 */
export const RadioList: React.FC<{
  /**
   * 选项列表
   */
  options: Array<{
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;

  /**
   * 已选项
   */
  value: string;

  /**
   * 变化回调
   */
  onChange: (value: string) => void;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ options, value, onChange, className }) => {
  return (
    <List className={className}>
      {options.map((option) => (
        <ListItem
          key={option.value}
          disabled={option.disabled}
          onClick={() => !option.disabled && onChange(option.value)}
          suffix={
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                value === option.value
                  ? 'border-muse-600'
                  : 'border-slate-300 dark:border-slate-600',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {value === option.value && (
                <div className="w-2.5 h-2.5 rounded-full bg-muse-600" />
              )}
            </div>
          }
          description={option.description}
        >
          {option.label}
        </ListItem>
      ))}
    </List>
  );
};

/**
 * ActionList - 操作列表
 */
export const ActionList: React.FC<{
  /**
   * 操作列表
   */
  actions: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    description?: string;
    onClick: () => void;
    dangerous?: boolean;
    disabled?: boolean;
  }>;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ actions, className }) => {
  return (
    <List variant="bordered" className={className}>
      {actions.map((action) => (
        <ListItem
          key={action.id}
          icon={action.icon}
          onClick={action.onClick}
          disabled={action.disabled}
          className={action.dangerous ? 'text-red-600 dark:text-red-400' : ''}
        >
          {action.label}
        </ListItem>
      ))}
    </List>
  );
};

/**
 * ListGroup - 分组列表
 */
export const ListGroup: React.FC<{
  /**
   * 分组数据
   */
  groups: Array<{
    title: string;
    items: Array<{
      id: string;
      label: string;
      description?: string;
      onClick?: () => void;
    }>;
  }>;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ groups, className }) => {
  return (
    <div className={className}>
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          <ListSubheader>{group.title}</ListSubheader>
          <List variant="bordered">
            {group.items.map((item) => (
              <ListItem key={item.id} onClick={item.onClick} description={item.description}>
                {item.label}
              </ListItem>
            ))}
          </List>
        </div>
      ))}
    </div>
  );
};
