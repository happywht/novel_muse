/**
 * Table - 表格组件系统
 *
 * 提供数据表格展示和交互
 * Provides data table display and interaction
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Table尺寸
 */
export type TableSize = 'sm' | 'md' | 'lg';

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * 列定义
 */
export interface Column<T = any> {
  /**
   * 列键
   */
  key: string;

  /**
   * 列标题
   */
  title: string;

  /**
   * 列宽度
   */
  width?: string | number;

  /**
   * 是否可排序
   */
  sortable?: boolean;

  /**
   * 对齐方式
   */
  align?: 'left' | 'center' | 'right';

  /**
   * 渲染函数
   */
  render?: (value: any, record: T, index: number) => React.ReactNode;

  /**
   * 过滤器
   */
  filter?: (value: any, record: T) => boolean;
}

/**
 * 表格组件属性
 */
export interface TableProps<T = any> {
  /**
   * 列定义
   */
  columns: Column<T>[];

  /**
   * 数据源
   */
  dataSource: T[];

  /**
   * 行键
   */
  rowKey?: string | ((record: T) => string);

  /**
   * 尺寸
   * @default 'md'
   */
  size?: TableSize;

  /**
   * 是否斑马纹
   */
  striped?: boolean;

  /**
   * 是否悬停高亮
   */
  hoverable?: boolean;

  /**
   * 是否显示边框
   */
  bordered?: boolean;

  /**
   * 加载状态
   */
  loading?: boolean;

  /**
   * 空状态提示
   */
  emptyText?: React.ReactNode;

  /**
   * 行点击回调
   */
  onRowClick?: (record: T, index: number) => void;

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<TableSize, { th: string; td: string }> = {
  sm: { th: 'px-3 py-2 text-xs', td: 'px-3 py-2 text-xs' },
  md: { th: 'px-4 py-3 text-sm', td: 'px-4 py-3 text-sm' },
  lg: { th: 'px-6 py-4 text-base', td: 'px-6 py-4 text-base' },
};

/**
 * Table - 主表格组件
 *
 * @example
 * ```tsx
 * const columns: Column<User>[] = [
 *   { key: 'name', title: '姓名', sortable: true },
 *   { key: 'age', title: '年龄', align: 'center' },
 *   { key: 'email', title: '邮箱' },
 * ];
 *
 * <Table columns={columns} dataSource={users} rowKey="id" />
 * ```
 */
export const Table = <T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey = 'id',
  size = 'md',
  striped = false,
  hoverable = false,
  bordered = false,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  className,
}: TableProps<T>) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  // 获取行键
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  // 排序处理
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const newDirection: SortDirection =
      sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';

    setSortColumn(column.key);
    setSortDirection(newDirection);
  };

  // 排序数据
  const getSortedData = () => {
    if (!sortColumn || !sortDirection) return dataSource;

    return [...dataSource].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const sortedData = getSortedData();

  // 对齐样式
  const getAlignClass = (align?: string) => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table
        className={cn(
          'w-full border-collapse',
          'bg-white dark:bg-slate-800',
          bordered && 'border border-slate-200 dark:border-slate-700'
        )}
      >
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  sizeStyles[size].th,
                  'font-semibold text-slate-900 dark:text-slate-100',
                  'transition-colors duration-150',
                  getAlignClass(column.align),
                  column.sortable && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.title}</span>
                  {column.sortable && (
                    <span className="text-slate-400">
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? (
                          '↑'
                        ) : (
                          '↓'
                        )
                      ) : (
                        '↕'
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muse-600" />
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-400">{emptyText}</p>
              </td>
            </tr>
          ) : (
            sortedData.map((record, rowIndex) => {
              const key = getRowKey(record, rowIndex);
              const isSelected = selectedRow === key;

              return (
                <tr
                  key={key}
                  className={cn(
                    'border-b border-slate-200 dark:border-slate-700',
                    'transition-colors duration-150',
                    striped && rowIndex % 2 === 0 && 'bg-slate-50 dark:bg-slate-900/50',
                    hoverable && 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    isSelected && 'bg-muse-50 dark:bg-muse-900/20',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => {
                    setSelectedRow(key);
                    onRowClick?.(record, rowIndex);
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        sizeStyles[size].td,
                        'text-slate-700 dark:text-slate-300',
                        getAlignClass(column.align)
                      )}
                    >
                      {column.render
                        ? column.render(record[column.key], record, rowIndex)
                        : record[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * TablePagination - 表格分页
 */
export const TablePagination: React.FC<{
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
   * 每页数量选项
   */
  pageSizeOptions?: number[];

  /**
   * 自定义类名
   */
  className?: string;
}> = ({
  current,
  total,
  pageSize,
  onChange,
  showTotal = true,
  showQuickJumper = false,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}) => {
  const totalPages = Math.ceil(total / pageSize);

  const handlePrev = () => {
    if (current > 1) {
      onChange(current - 1, pageSize);
    }
  };

  const handleNext = () => {
    if (current < totalPages) {
      onChange(current + 1, pageSize);
    }
  };

  const handlePageClick = (page: number) => {
    onChange(page, pageSize);
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = Number(e.target.value);
    onChange(1, newPageSize);
  };

  // 生成页码
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={cn('flex items-center justify-between gap-4 mt-4', className)}>
      {showTotal && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          共 {total} 条，第 {current}/{totalPages} 页
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* 每页数量选择 */}
        {pageSizeOptions.length > 0 && (
          <select
            value={pageSize}
            onChange={handleSizeChange}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} 条/页
              </option>
            ))}
          </select>
        )}

        {/* 上一页 */}
        <button
          onClick={handlePrev}
          disabled={current === 1}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            'border border-slate-300 dark:border-slate-600',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            current === 1 && 'opacity-50 cursor-not-allowed',
            current !== 1 && 'hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          上一页
        </button>

        {/* 页码 */}
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-2 text-slate-400">...</span>
            ) : (
              <button
                onClick={() => handlePageClick(page as number)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  'border border-slate-300 dark:border-slate-600',
                  current === page
                    ? 'bg-muse-600 text-white border-muse-600'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        {/* 下一页 */}
        <button
          onClick={handleNext}
          disabled={current === totalPages}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            'border border-slate-300 dark:border-slate-600',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            current === totalPages && 'opacity-50 cursor-not-allowed',
            current !== totalPages && 'hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          下一页
        </button>
      </div>

      {/* 快速跳转 */}
      {showQuickJumper && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">跳至</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={current}
            className="w-16 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const page = Number((e.target as HTMLInputElement).value);
                if (page >= 1 && page <= totalPages) {
                  onChange(page, pageSize);
                }
              }
            }}
          />
          <span className="text-slate-600 dark:text-slate-400">页</span>
        </div>
      )}
    </div>
  );
};

/**
 * DataTable - 带完整功能的数据表格
 */
export const DataTable = <T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey = 'id',
  size = 'md',
  striped = true,
  hoverable = true,
  bordered = true,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  pagination,
  className,
}: TableProps<T> & {
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}) => {
  return (
    <div className={className}>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        size={size}
        striped={striped}
        hoverable={hoverable}
        bordered={bordered}
        loading={loading}
        emptyText={emptyText}
        onRowClick={onRowClick}
      />
      {pagination && (
        <TablePagination
          current={pagination.current}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onChange={pagination.onChange}
        />
      )}
    </div>
  );
};
