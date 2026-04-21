/**
 * Pagination - 分页组件
 *
 * 提供分页导航功能
 * Provides pagination navigation
 */

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 分页尺寸
 */
export type PaginationSize = 'sm' | 'md' | 'lg';

/**
 * Pagination组件属性
 */
export interface PaginationProps {
  /**
   * 当前页
   */
  current: number;

  /**
   * 总数
   */
  total: number;

  /**
   * 每页数量
   */
  pageSize: number;

  /**
   * 变化回调
   */
  onChange: (page: number, pageSize: number) => void;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: PaginationSize;

  /**
   * 显示总数
   * @default true
   */
  showTotal?: boolean;

  /**
   * 显示快速跳转
   * @default false
   */
  showQuickJumper?: boolean;

  /**
   * 显示页码选择器
   * @default true
   */
  showSizeChanger?: boolean;

  /**
   * 每页数量选项
   */
  pageSizeOptions?: number[];

  /**
   * 页码按钮数量
   * @default 7
   */
  pagerCount?: number;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<
  PaginationSize,
  { button: string; input: string; text: string }
> = {
  sm: {
    button: 'px-2 py-1 text-xs',
    input: 'w-12 px-2 py-1 text-xs',
    text: 'text-xs',
  },
  md: {
    button: 'px-3 py-1.5 text-sm',
    input: 'w-16 px-2 py-1.5 text-sm',
    text: 'text-sm',
  },
  lg: {
    button: 'px-4 py-2 text-base',
    input: 'w-20 px-3 py-2 text-base',
    text: 'text-base',
  },
};

/**
 * Pagination - 分页组件
 *
 * @example
 * ```tsx
 * <Pagination
 *   current={currentPage}
 *   total={100}
 *   pageSize={10}
 *   onChange={(page, pageSize) => {
 *     setCurrentPage(page);
 *   }}
 * />
 * ```
 */
export const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize,
  onChange,
  size = 'md',
  showTotal = true,
  showQuickJumper = false,
  showSizeChanger = true,
  pageSizeOptions = [10, 20, 50, 100],
  pagerCount = 7,
  disabled = false,
  className,
}) => {
  const totalPages = Math.ceil(total / pageSize);

  // 首页
  const handleFirst = () => {
    if (!disabled && current > 1) {
      onChange(1, pageSize);
    }
  };

  // 上一页
  const handlePrev = () => {
    if (!disabled && current > 1) {
      onChange(current - 1, pageSize);
    }
  };

  // 下一页
  const handleNext = () => {
    if (!disabled && current < totalPages) {
      onChange(current + 1, pageSize);
    }
  };

  // 末页
  const handleLast = () => {
    if (!disabled && current < totalPages) {
      onChange(totalPages, pageSize);
    }
  };

  // 页码点击
  const handlePageClick = (page: number) => {
    if (!disabled && page >= 1 && page <= totalPages && page !== current) {
      onChange(page, pageSize);
    }
  };

  // 每页数量变化
  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!disabled) {
      const newPageSize = Number(e.target.value);
      onChange(1, newPageSize);
    }
  };

  // 快速跳转
  const handleQuickJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = Number((e.target as HTMLInputElement).value);
      if (!disabled && page >= 1 && page <= totalPages) {
        onChange(page, pageSize);
      }
    }
  };

  // 生成页码数组
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= pagerCount) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const halfPagerCount = Math.floor(pagerCount / 2);

    // 总是显示第一页
    pages.push(1);

    if (current <= halfPagerCount) {
      // 当前页在前面
      for (let i = 2; i <= pagerCount - 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    } else if (current >= totalPages - halfPagerCount) {
      // 当前页在后面
      pages.push('...');
      for (let i = totalPages - pagerCount + 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 当前页在中间
      pages.push('...');
      for (let i = current - halfPagerCount + 1; i <= current + halfPagerCount - 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* 左侧：总数和每页数量选择 */}
      <div className="flex items-center gap-4">
        {showTotal && (
          <div className={cn('text-slate-600 dark:text-slate-400', sizeStyles[size].text)}>
            共 {total} 条
          </div>
        )}

        {showSizeChanger && (
          <div className="flex items-center gap-2">
            <span className={cn('text-slate-600 dark:text-slate-400', sizeStyles[size].text)}>
              每页
            </span>
            <select
              value={pageSize}
              onChange={handleSizeChange}
              disabled={disabled}
              className={cn(
                'border border-slate-300 dark:border-slate-600 rounded-lg',
                'bg-white dark:bg-slate-800',
                'text-slate-900 dark:text-slate-100',
                'focus:outline-none focus:ring-2 focus:ring-muse-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                sizeStyles[size].input
              )}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className={cn('text-slate-600 dark:text-slate-400', sizeStyles[size].text)}>
              条
            </span>
          </div>
        )}
      </div>

      {/* 右侧：分页按钮 */}
      <div className="flex items-center gap-2">
        {/* 首页按钮 */}
        <button
          onClick={handleFirst}
          disabled={disabled || current === 1}
          className={cn(
            'touch-target',
            'flex items-center justify-center',
            'border border-slate-300 dark:border-slate-600 rounded-lg',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            'hover:bg-slate-100 dark:hover:bg-slate-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            sizeStyles[size].button
          )}
          aria-label="首页"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* 上一页按钮 */}
        <button
          onClick={handlePrev}
          disabled={disabled || current === 1}
          className={cn(
            'touch-target',
            'flex items-center justify-center',
            'border border-slate-300 dark:border-slate-600 rounded-lg',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            'hover:bg-slate-100 dark:hover:bg-slate-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            sizeStyles[size].button
          )}
          aria-label="上一页"
        >
          <ChevronLeft size={16} />
        </button>

        {/* 页码按钮 */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className={cn('px-2', 'text-slate-400', sizeStyles[size].text)}>
                  ...
                </span>
              ) : (
                <button
                  onClick={() => handlePageClick(page as number)}
                  disabled={disabled}
                  className={cn(
                    'touch-target',
                    'flex items-center justify-center',
                    'border rounded-lg',
                    'transition-colors duration-150',
                    current === page
                      ? 'bg-muse-600 border-muse-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    sizeStyles[size].button
                  )}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 移动端显示当前页/总页数 */}
        <div className="sm:hidden">
          <span className={cn('text-slate-600 dark:text-slate-400', sizeStyles[size].text)}>
            {current} / {totalPages}
          </span>
        </div>

        {/* 下一页按钮 */}
        <button
          onClick={handleNext}
          disabled={disabled || current === totalPages}
          className={cn(
            'touch-target',
            'flex items-center justify-center',
            'border border-slate-300 dark:border-slate-600 rounded-lg',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            'hover:bg-slate-100 dark:hover:bg-slate-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            sizeStyles[size].button
          )}
          aria-label="下一页"
        >
          <ChevronRight size={16} />
        </button>

        {/* 末页按钮 */}
        <button
          onClick={handleLast}
          disabled={disabled || current === totalPages}
          className={cn(
            'touch-target',
            'flex items-center justify-center',
            'border border-slate-300 dark:border-slate-600 rounded-lg',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            'hover:bg-slate-100 dark:hover:bg-slate-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            sizeStyles[size].button
          )}
          aria-label="末页"
        >
          <ChevronsRight size={16} />
        </button>
      </div>

      {/* 快速跳转 */}
      {showQuickJumper && (
        <div className="flex items-center gap-2">
          <span className={cn('text-slate-600 dark:text-slate-400', sizeStyles[size].text)}>
            跳至
          </span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={current}
            disabled={disabled}
            onKeyDown={handleQuickJump}
            className={cn(
              'border border-slate-300 dark:border-slate-600 rounded-lg',
              'bg-white dark:bg-slate-800',
              'text-slate-900 dark:text-slate-100 text-center',
              'focus:outline-none focus:ring-2 focus:ring-muse-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              sizeStyles[size].input
            )}
          />
          <span className={cn('text-slate-600 dark:text-slate-400', sizeStyles[size].text)}>
            页
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * MiniPagination - 迷你分页（只显示上一页/下一页）
 */
export const MiniPagination: React.FC<{
  /**
   * 当前页
   */
  current: number;

  /**
   * 总页数
   */
  total: number;

  /**
   * 变化回调
   */
  onChange: (page: number) => void;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ current, total, onChange, disabled = false, className }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={() => onChange(current - 1)}
        disabled={disabled || current === 1}
        className={cn(
          'touch-target',
          'flex items-center justify-center',
          'px-3 py-1.5 text-sm',
          'border border-slate-300 dark:border-slate-600 rounded-lg',
          'bg-white dark:bg-slate-800',
          'text-slate-900 dark:text-slate-100',
          'hover:bg-slate-100 dark:hover:bg-slate-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150'
        )}
        aria-label="上一页"
      >
        <ChevronLeft size={16} />
      </button>

      <span className="text-sm text-slate-600 dark:text-slate-400 px-2">
        {current} / {total}
      </span>

      <button
        onClick={() => onChange(current + 1)}
        disabled={disabled || current === total}
        className={cn(
          'touch-target',
          'flex items-center justify-center',
          'px-3 py-1.5 text-sm',
          'border border-slate-300 dark:border-slate-600 rounded-lg',
          'bg-white dark:bg-slate-800',
          'text-slate-900 dark:text-slate-100',
          'hover:bg-slate-100 dark:hover:bg-slate-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150'
        )}
        aria-label="下一页"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

/**
 * LoadMorePagination - 加载更多分页
 */
export const LoadMorePagination: React.FC<{
  /**
   * 当前数量
   */
  current: number;

  /**
   * 总数
   */
  total: number;

  /**
   * 每次加载数量
   */
  pageSize: number;

  /**
   * 加载回调
   */
  onLoadMore: () => void;

  /**
   * 是否加载中
   */
  loading?: boolean;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({
  current,
  total,
  pageSize,
  onLoadMore,
  loading = false,
  disabled = false,
  className,
}) => {
  const hasMore = current < total;

  return (
    <div className={cn('flex flex-col items-center gap-4 py-6', className)}>
      <div className="text-sm text-slate-600 dark:text-slate-400">
        已加载 {current} / {total} 条
      </div>

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={disabled || loading}
          className={cn(
            'touch-target',
            'px-6 py-2.5',
            'bg-muse-600 hover:bg-muse-700',
            'text-white font-medium',
            'rounded-lg',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150'
          )}
        >
          {loading ? '加载中...' : '加载更多'}
        </button>
      )}

      {!hasMore && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          没有更多了
        </div>
      )}
    </div>
  );
};
