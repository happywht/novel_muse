/**
 * Breadcrumb - 面包屑导航组件
 *
 * 提供导航路径展示和回溯
 * Provides navigation path display and backtracking
 */

import React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 面包屑项
 */
export interface BreadcrumbItem {
  /**
   * 标题
   */
  title: string;

  /**
   * 链接路径
   */
  href?: string;

  /**
   * 图标
   */
  icon?: React.ReactNode;

  /**
   * 点击回调
   */
  onClick?: () => void;
}

/**
 * Breadcrumb组件属性
 */
export interface BreadcrumbProps {
  /**
   * 面包屑列表
   */
  items: BreadcrumbItem[];

  /**
   * 分隔符
   * @default '/'
   */
  separator?: React.ReactNode;

  /**
   * 最大显示数量（超出显示省略）
   */
  maxItems?: number;

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * Breadcrumb - 面包屑导航组件
 *
 * @example
 * ```tsx
 * const items: BreadcrumbItem[] = [
 *   { title: '首页', href: '/' },
 *   { title: '产品', href: '/products' },
 *   { title: '详情', href: '/products/123' },
 * ];
 *
 * <Breadcrumb items={items} />
 * ```
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <ChevronRight size={16} />,
  maxItems,
  className,
}) => {
  const shouldTruncate = maxItems && items.length > maxItems;

  let displayItems = items;
  if (shouldTruncate && maxItems) {
    const keepFromStart = Math.ceil(maxItems / 2);
    const keepFromEnd = Math.floor(maxItems / 2);

    displayItems = [
      ...items.slice(0, keepFromStart),
      {
        title: '...',
        icon: <MoreHorizontal size={16} />,
      },
      ...items.slice(-keepFromEnd),
    ];
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-2', className)}>
      <ol className="flex items-center gap-2">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.title === '...';

          return (
            <li key={index} className="flex items-center gap-2">
              {/* 分隔符 */}
              {index > 0 && (
                <span className="text-slate-400 dark:text-slate-600 flex-shrink-0">
                  {separator}
                </span>
              )}

              {/* 面包屑项 */}
              {isEllipsis ? (
                <span className={cn('flex items-center gap-1', 'text-slate-600 dark:text-slate-400')}>
                  {item.icon}
                </span>
              ) : isLast ? (
                <span
                  className={cn(
                    'text-sm font-medium',
                    'text-slate-900 dark:text-slate-100',
                    'flex items-center gap-1'
                  )}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.title}</span>
                </span>
              ) : (
                <a
                  href={item.href}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      item.onClick();
                    }
                  }}
                  className={cn(
                    'touch-target',
                    'flex items-center gap-1',
                    'text-sm font-medium',
                    'text-slate-600 dark:text-slate-400',
                    'hover:text-muse-600 dark:hover:text-muse-400',
                    'transition-colors duration-150',
                    'cursor-pointer'
                  )}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.title}</span>
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/**
 * BreadcrumbItem - 单个面包屑项
 */
export const BreadcrumbItem: React.FC<{
  /**
   * 是否当前页
   */
  current?: boolean;

  /**
   * 链接
   */
  href?: string;

  /**
   * 点击回调
   */
  onClick?: () => void;

  /**
   * 子元素
   */
  children: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ current = false, href, onClick, children, className }) => {
  if (current) {
    return (
      <span
        className={cn(
          'text-sm font-medium',
          'text-slate-900 dark:text-slate-100',
          className
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'touch-target',
        'text-sm font-medium',
        'text-slate-600 dark:text-slate-400',
        'hover:text-muse-600 dark:hover:text-muse-400',
        'transition-colors duration-150',
        'cursor-pointer',
        className
      )}
    >
      {children}
    </a>
  );
};

/**
 * BreadcrumbSeparator - 分隔符
 */
export const BreadcrumbSeparator: React.FC<{
  /**
   * 自定义分隔符
   */
  children?: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ children, className }) => {
  return (
    <span className={cn('text-slate-400 dark:text-slate-600', className)}>
      {children || <ChevronRight size={16} />}
    </span>
  );
};

/**
 * BreadcrumbHome - 首页面包屑
 */
export const BreadcrumbHome: React.FC<{
  /**
   * 首页链接
   * @default '/'
   */
  href?: string;

  /**
   * 点击回调
   */
  onClick?: () => void;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ href = '/', onClick, className }) => {
  return (
    <li className="flex items-center gap-2">
      <a
        href={href}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          'touch-target',
          'flex items-center gap-1',
          'text-sm font-medium',
          'text-slate-600 dark:text-slate-400',
          'hover:text-muse-600 dark:hover:text-muse-400',
          'transition-colors duration-150',
          'cursor-pointer',
          className
        )}
      >
        <span>首页</span>
      </a>
    </li>
  );
};

/**
 * AutoBreadcrumb - 自动路由面包屑
 */
export const AutoBreadcrumb: React.FC<{
  /**
   * 当前路径
   */
  currentPath: string;

  /**
   * 路径映射（可选，用于自定义名称）
   */
  pathMap?: Record<string, string>;

  /**
   * 点击回调
   */
  onNavigate?: (path: string) => void;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ currentPath, pathMap = {}, onNavigate, className }) => {
  // 解析路径
  const pathSegments = currentPath.split('/').filter(Boolean);

  // 构建面包屑项
  const items: BreadcrumbItem[] = [
    { title: '首页', href: '/' },
    ...pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      const title = pathMap[href] || segment;

      return {
        title,
        href,
      };
    }),
  ];

  return (
    <Breadcrumb
      items={items}
      onNavigate={onNavigate}
      className={className}
    />
  );
};

/**
 * BreadcrumbWithDropdown - 带下拉的面包屑（用于隐藏过多层级）
 */
export const BreadcrumbWithDropdown: React.FC<{
  /**
   * 面包屑列表
   */
  items: BreadcrumbItem[];

  /**
   * 显示数量
   * @default 3
   */
  visibleCount?: number;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ items, visibleCount = 3, className }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (items.length <= visibleCount) {
    return <Breadcrumb items={items} className={className} />;
  }

  const visibleItems = items.slice(-visibleCount);
  const hiddenItems = items.slice(0, -visibleCount);

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-2', className)}>
      <ol className="flex items-center gap-2">
        {/* 首页始终显示 */}
        <li className="flex items-center gap-2">
          <BreadcrumbItem href={items[0].href} onClick={items[0].onClick}>
            {items[0].title}
          </BreadcrumbItem>
        </li>

        {/* 省略号下拉 */}
        {hiddenItems.length > 0 && (
          <li className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'touch-target',
                'flex items-center gap-1',
                'px-2 py-1',
                'text-sm text-slate-600 dark:text-slate-400',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'rounded-md',
                'transition-colors duration-150'
              )}
            >
              <MoreHorizontal size={16} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                {hiddenItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    onClick={(e) => {
                      setIsOpen(false);
                      if (item.onClick) {
                        e.preventDefault();
                        item.onClick();
                      }
                    }}
                    className={cn(
                      'block px-4 py-2 text-sm text-slate-700 dark:text-slate-300',
                      'hover:bg-slate-100 dark:hover:bg-slate-700',
                      'transition-colors duration-150'
                    )}
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            )}
          </li>
        )}

        {/* 可见的面包屑 */}
        {visibleItems.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbSeparator />
            <li className="flex items-center gap-2">
              {index === visibleItems.length - 1 ? (
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.title}
                </span>
              ) : (
                <BreadcrumbItem href={item.href} onClick={item.onClick}>
                  {item.title}
                </BreadcrumbItem>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};
