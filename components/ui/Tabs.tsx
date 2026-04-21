/**
 * Tabs - 标签页组件系统
 *
 * 提供标签切换和内容展示
 * Provides tab switching and content display
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tabs变体
 */
export type TabsVariant = 'default' | 'enclosed' | 'soft' | 'underline';

/**
 * Tabs尺寸
 */
export type TabsSize = 'sm' | 'md' | 'lg';

/**
 * 标签定义
 */
export interface Tab {
  /**
   * 标签键
   */
  key: string;

  /**
   * 标签标题
   */
  title: React.ReactNode;

  /**
   * 标签图标
   */
  icon?: React.ReactNode;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 徽章数量
   */
  badge?: number;

  /**
   * 标签内容
   */
  content: React.ReactNode;
}

/**
 * Tabs组件属性
 */
export interface TabsProps {
  /**
   * 标签列表
   */
  tabs: Tab[];

  /**
   * 当前激活标签
   */
  activeKey: string;

  /**
   * 变化回调
   */
  onChange: (key: string) => void;

  /**
   * 变体
   * @default 'default'
   */
  variant?: TabsVariant;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: TabsSize;

  /**
   * 标签位置
   * @default 'top'
   */
  tabPosition?: 'top' | 'right' | 'bottom' | 'left';

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 变体样式映射
 */
const variantStyles: Record<TabsVariant, { tabs: string; active: string; content: string }> = {
  default: {
    tabs: 'bg-slate-100 dark:bg-slate-900 gap-1 p-1',
    active: 'bg-white dark:bg-slate-800 shadow-sm',
    content: 'bg-white dark:bg-slate-800',
  },
  enclosed: {
    tabs: 'bg-slate-100 dark:bg-slate-900 gap-1 p-1 rounded-lg',
    active: 'bg-white dark:bg-slate-800 shadow-md rounded-md',
    content: 'bg-white dark:bg-slate-800',
  },
  soft: {
    tabs: 'border-b border-slate-200 dark:border-slate-700',
    active: 'text-muse-600 dark:text-muse-400 border-b-2 border-muse-600',
    content: 'bg-transparent',
  },
  underline: {
    tabs: 'border-b border-slate-200 dark:border-slate-700',
    active: 'text-muse-600 dark:text-muse-400 border-b-2 border-muse-600',
    content: 'bg-transparent',
  },
};

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<TabsSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

/**
 * Tabs - 主标签页组件
 *
 * @example
 * ```tsx
 * const tabs: Tab[] = [
 *   { key: 'home', title: '首页', content: <div>首页内容</div> },
 *   { key: 'profile', title: '个人资料', content: <div>资料内容</div> },
 * ];
 *
 * <Tabs tabs={tabs} activeKey="home" onChange={(key) => setActiveKey(key)} />
 * ```
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeKey,
  onChange,
  variant = 'default',
  size = 'md',
  tabPosition = 'top',
  className,
}) => {
  const positionStyles = {
    top: 'flex-col',
    right: 'flex-row',
    bottom: 'flex-col-reverse',
    left: 'flex-row-reverse',
  };

  const activeTab = tabs.find((tab) => tab.key === activeKey);

  return (
    <div className={cn('flex', positionStyles[tabPosition], className)}>
      {/* 标签列表 */}
      <div
        className={cn(
          'flex',
          tabPosition === 'top' || tabPosition === 'bottom' ? 'flex-row' : 'flex-col',
          variantStyles[variant].tabs,
          sizeStyles[size]
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && onChange(tab.key)}
            disabled={tab.disabled}
            className={cn(
              'touch-target',
              'flex items-center gap-2',
              'px-4 py-2.5',
              'rounded-md',
              'font-medium',
              'transition-all duration-200',
              'relative',
              activeKey === tab.key
                ? [variantStyles[variant].active, 'text-slate-900 dark:text-slate-100']
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.title}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            {activeKey === tab.key && variant === 'underline' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-muse-600 dark:bg-muse-400" />
            )}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className={cn('flex-1 p-6', variantStyles[variant].content)}>
        {activeTab?.content}
      </div>
    </div>
  );
};

/**
 * TabPane - 单个标签面板（用于声明式使用）
 */
export const TabPane: React.FC<{
  /**
   * 标签键
   */
  tabKey: string;

  /**
   * 标签标题
   */
  tab: React.ReactNode;

  /**
   * 标签图标
   */
  icon?: React.ReactNode;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 强制渲染
   */
  forceRender?: boolean;

  /**
   * 子元素
   */
  children: React.ReactNode;
}> = ({ children }) => {
  return <>{children}</>;
};

/**
 * DeclarativeTabs - 声明式标签页组件
 */
export const DeclarativeTabs: React.FC<{
  /**
   * 默认激活标签
   */
  defaultActiveKey?: string;

  /**
   * 活动标签回调
   */
  onActiveKeyChange?: (key: string) => void;

  /**
   * 变体
   */
  variant?: TabsVariant;

  /**
   * 子元素（TabPane列表）
   */
  children: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ defaultActiveKey, onActiveKeyChange, variant = 'default', children, className }) => {
  // 解析TabPane children
  const tabs = React.Children.toArray(children).filter(
    (child): child is React.ReactElement => React.isValidElement(child) && child.type === TabPane
  );

  const [activeKey, setActiveKey] = React.useState(defaultActiveKey || tabs[0]?.props?.tabKey || '');

  const handleChange = (key: string) => {
    setActiveKey(key);
    onActiveKeyChange?.(key);
  };

  const tabsData: Tab[] = tabs.map((child) => ({
    key: child.props.tabKey,
    title: child.props.tab,
    icon: child.props.icon,
    disabled: child.props.disabled,
    content: child.props.children,
  }));

  return (
    <Tabs
      tabs={tabsData}
      activeKey={activeKey}
      onChange={handleChange}
      variant={variant}
      className={className}
    />
  );
};

/**
 * VerticalTabs - 垂直标签页
 */
export const VerticalTabs: React.FC<{
  /**
   * 标签列表
   */
  tabs: Tab[];

  /**
   * 当前激活标签
   */
  activeKey: string;

  /**
   * 变化回调
   */
  onChange: (key: string) => void;

  /**
   * 标签宽度
   * @default '200px'
   */
  tabWidth?: string;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ tabs, activeKey, onChange, tabWidth = '200px', className }) => {
  return (
    <div className={cn('flex gap-6', className)}>
      {/* 左侧标签列表 */}
      <div className="flex flex-col gap-1" style={{ width: tabWidth }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && onChange(tab.key)}
            disabled={tab.disabled}
            className={cn(
              'touch-target',
              'flex items-center gap-2',
              'px-4 py-2.5',
              'rounded-md text-left',
              'font-medium',
              'transition-all duration-200',
              activeKey === tab.key
                ? 'bg-muse-100 dark:bg-muse-900 text-muse-600 dark:text-muse-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.title}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-auto flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1">
        {tabs.find((tab) => tab.key === activeKey)?.content}
      </div>
    </div>
  );
};

/**
 * TabNavigation - 标签导航（用于路由导航）
 */
export const TabNavigation: React.FC<{
  /**
   * 导航项
   */
  items: Array<{
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    path: string;
  }>;

  /**
   * 当前路径
   */
  currentPath: string;

  /**
   * 导航回调
   */
  onNavigate: (path: string) => void;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ items, currentPath, onNavigate, className }) => {
  const activeKey = items.find((item) => item.path === currentPath)?.key || items[0]?.key;

  return (
    <div className={cn('border-b border-slate-200 dark:border-slate-700', className)}>
      <nav className="flex gap-4">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.path)}
            className={cn(
              'touch-target',
              'flex items-center gap-2',
              'px-4 py-3',
              'font-medium',
              'transition-colors duration-200',
              'relative',
              activeKey === item.key
                ? 'text-muse-600 dark:text-muse-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {activeKey === item.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-muse-600 dark:bg-muse-400" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};
