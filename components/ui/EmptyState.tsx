/**
 * EmptyState - 空状态组件
 *
 * 用于空数据、无结果、错误等状态的视觉反馈
 * Visual feedback for empty data, no results, errors, etc.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  FileText,
  Search,
  Inbox,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Home,
  ArrowLeft,
} from 'lucide-react';

/**
 * 空状态类型
 */
type EmptyStateType = 'empty' | 'no-results' | 'error' | 'success' | 'not-found';

/**
 * EmptyState组件属性
 */
interface EmptyStateProps {
  /**
   * 空状态类型
   * @default 'empty'
   */
  type?: EmptyStateType;

  /**
   * 图标
   */
  icon?: React.ReactNode;

  /**
   * 标题
   */
  title?: string;

  /**
   * 描述文本
   */
  description?: string;

  /**
   * 主要操作按钮
   */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };

  /**
   * 次要操作按钮
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否显示插图
   * @default true
   */
  illustration?: boolean;

  /**
   * 大小
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * 自定义插图URL
   */
  illustrationUrl?: string;
}

/**
 * 默认文本映射
 */
const defaultTexts: Record<EmptyStateType, { title: string; description: string }> = {
  empty: {
    title: '暂无内容',
    description: '还没有任何数据，开始创建吧！',
  },
  'no-results': {
    title: '未找到结果',
    description: '尝试调整搜索条件或筛选器',
  },
  error: {
    title: '出错了',
    description: '加载失败，请稍后重试',
  },
  success: {
    title: '操作成功',
    description: '所有任务已完成',
  },
  'not-found': {
    title: '页面不存在',
    description: '您访问的页面可能已被删除或移动',
  },
};

/**
 * 默认图标映射
 */
const defaultIcons: Record<EmptyStateType, React.ReactNode> = {
  empty: <Inbox size={64} className="text-slate-300 dark:text-slate-600" />,
  'no-results': <Search size={64} className="text-slate-300 dark:text-slate-600" />,
  error: <XCircle size={64} className="text-red-300 dark:text-red-600" />,
  success: <CheckCircle size={64} className="text-green-300 dark:text-green-600" />,
  'not-found': <AlertCircle size={64} className="text-amber-300 dark:text-amber-600" />,
};

/**
 * EmptyState - 主组件
 *
 * @example
 * ```tsx
 * <EmptyState />
 * <EmptyState type="no-results" />
 * <EmptyState
 *   type="empty"
 *   title="还没有角色"
 *   description="创建第一个角色开始创作"
 *   primaryAction={{ label: '创建角色', onClick: handleCreate }}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'empty',
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  illustration = true,
  size = 'md',
  illustrationUrl,
}) => {
  const defaultText = defaultTexts[type];
  const defaultIcon = icon || defaultIcons[type];

  const sizeClasses = {
    sm: {
      icon: 'w-12 h-12',
      title: 'text-lg',
      description: 'text-sm',
      spacing: 'gap-3',
    },
    md: {
      icon: 'w-16 h-16',
      title: 'text-xl',
      description: 'text-base',
      spacing: 'gap-4',
    },
    lg: {
      icon: 'w-20 h-20',
      title: 'text-2xl',
      description: 'text-lg',
      spacing: 'gap-6',
    },
  };

  const sizeClass = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'text-center',
        'p-8',
        'bg-white dark:bg-slate-800',
        'rounded-lg',
        'border border-slate-200 dark:border-slate-700',
        className
      )}
    >
      {/* 图标或插图 */}
      {illustration && (
        <div className={cn('flex items-center justify-center mb-6', sizeClass.spacing)}>
          {illustrationUrl ? (
            <img
              src={illustrationUrl}
              alt={title || defaultText.title}
              className={cn(sizeClass.icon, 'object-contain')}
            />
          ) : (
            <div className={cn(sizeClass.icon, 'flex items-center justify-center')}>
              {defaultIcon}
            </div>
          )}
        </div>
      )}

      {/* 标题 */}
      <h3 className={cn('font-semibold text-slate-900 dark:text-slate-100 mb-2', sizeClass.title)}>
        {title || defaultText.title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className={cn('text-slate-600 dark:text-slate-400 mb-6 max-w-md', sizeClass.description)}>
          {description}
        </p>
      )}

      {/* 操作按钮 */}
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-3">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={cn(
                'touch-target',
                'px-4 py-2 rounded-lg',
                'bg-slate-200 dark:bg-slate-700',
                'text-slate-700 dark:text-slate-300',
                'hover:bg-slate-300 dark:hover:bg-slate-600',
                'transition-colors duration-200',
                'flex items-center gap-2',
                'font-medium'
              )}
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </button>
          )}

          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className={cn(
                'touch-target',
                'px-4 py-2 rounded-lg',
                'bg-muse-600 dark:bg-muse-500',
                'text-white',
                'hover:bg-muse-700 dark:hover:bg-muse-400',
                'transition-colors duration-200',
                'flex items-center gap-2',
                'font-medium'
              )}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * EmptyStateWithIllustration - 带插图的空状态
 *
 * 预设的插图样式
 *
 * @example
 * ```tsx
 * <EmptyStateWithIllustration type="empty" />
 * <EmptyStateWithIllustration type="no-results" />
 * ```
 */
export const EmptyStateWithIllustration: React.FC<
  Omit<EmptyStateProps, 'illustration' | 'icon'>
> = (props) => {
  return <EmptyState {...props} illustration={true} />;
};

/**
 * EmptyStateCompact - 紧凑型空状态
 *
 * 适用于小空间或卡片内
 *
 * @example
 * ```tsx
 * <EmptyStateCompact type="empty" title="暂无数据" />
 * ```
 */
export const EmptyStateCompact: React.FC<
  Omit<EmptyStateProps, 'size' | 'illustration'>
> = ({ type = 'empty', title, description, className, ...props }) => {
  const defaultText = defaultTexts[type];
  const defaultIcon = defaultIcons[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'text-center',
        'p-4',
        className
      )}
    >
      <div className="w-12 h-12 flex items-center justify-center mb-3">
        {defaultIcon}
      </div>
      <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-1">
        {title || defaultText.title}
      </h4>
      {description && (
        <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
      )}
    </div>
  );
};

/**
 * EmptyStateInline - 内联空状态
 *
 * 适用于列表项、表格行等
 *
 * @example
 * ```tsx
 * <EmptyStateInline type="empty" message="列表为空" />
 * ```
 */
export const EmptyStateInline: React.FC<{
  /**
   * 类型
   * @default 'empty'
   */
  type?: EmptyStateType;

  /**
   * 消息文本
   */
  message?: string;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否全宽
   * @default false
   */
  fullWidth?: boolean;
}> = ({ type = 'empty', message, className, fullWidth = false }) => {
  const defaultText = defaultTexts[type];

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'gap-2',
        'py-4 px-6',
        'text-slate-500 dark:text-slate-400',
        'text-sm',
        fullWidth && 'w-full',
        className
      )}
    >
      {type === 'empty' && <Inbox size={16} />}
      {type === 'no-results' && <Search size={16} />}
      {type === 'error' && <XCircle size={16} />}
      {type === 'success' && <CheckCircle size={16} />}
      {type === 'not-found' && <AlertCircle size={16} />}
      <span>{message || defaultText.description}</span>
    </div>
  );
};

/**
 * EmptyStatePage - 页面级空状态
 *
 * 适用于整个页面为空的情况
 *
 * @example
 * ```tsx
 * <EmptyStatePage
 *   type="not-found"
 *   title="404"
 *   description="页面未找到"
 *   primaryAction={{ label: '返回首页', onClick: goHome }}
 * />
 * ```
 */
export const EmptyStatePage: React.FC<EmptyStateProps> = (props) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <EmptyState {...props} size="lg" illustration={true} />
    </div>
  );
};

/**
 * 预设的空状态快捷组件
 */

/**
 * 无数据空状态
 */
export const NoData: React.FC<Omit<EmptyStateProps, 'type' | 'icon'>> = (props) => (
  <EmptyState
    type="empty"
    icon={<Inbox size={64} className="text-slate-300 dark:text-slate-600" />}
    {...props}
  />
);

/**
 * 无搜索结果空状态
 */
export const NoResults: React.FC<Omit<EmptyStateProps, 'type' | 'icon'>> = (props) => (
  <EmptyState
    type="no-results"
    icon={<Search size={64} className="text-slate-300 dark:text-slate-600" />}
    {...props}
  />
);

/**
 * 错误空状态
 */
export const ErrorState: React.FC<{
  /**
   * 错误消息
   */
  message?: string;

  /**
   * 重试回调
   */
  onRetry?: () => void;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ message, onRetry, className }) => (
  <EmptyState
    type="error"
    icon={<XCircle size={64} className="text-red-300 dark:text-red-600" />}
    title="出错了"
    description={message || '加载失败，请稍后重试'}
    primaryAction={
      onRetry
        ? {
            label: '重试',
            onClick: onRetry,
            icon: <RefreshCw size={16} />,
          }
        : undefined
    }
    className={className}
  />
);

/**
 * 成功空状态
 */
export const SuccessState: React.FC<{
  /**
   * 成功消息
   */
  message?: string;

  /**
   * 继续回调
   */
  onContinue?: () => void;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ message, onContinue, className }) => (
  <EmptyState
    type="success"
    icon={<CheckCircle size={64} className="text-green-300 dark:text-green-600" />}
    title="操作成功"
    description={message || '所有任务已完成'}
    primaryAction={
      onContinue
        ? {
            label: '继续',
            onClick: onContinue,
          }
        : undefined
    }
    className={className}
  />
);

/**
 * 404空状态
 */
export const NotFound: React.FC<{
  /**
   * 返回回调
   */
  onGoBack?: () => void;

  /**
   * 回到首页回调
   */
  onGoHome?: () => void;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ onGoBack, onGoHome, className }) => (
  <EmptyStatePage
    type="not-found"
    icon={<AlertCircle size={64} className="text-amber-300 dark:text-amber-600" />}
    title="404"
    description="您访问的页面可能已被删除或移动"
    secondaryAction={
      onGoBack
        ? {
            label: '返回',
            onClick: onGoBack,
            icon: <ArrowLeft size={16} />,
          }
        : undefined
    }
    primaryAction={
      onGoHome
        ? {
            label: '回到首页',
            onClick: onGoHome,
            icon: <Home size={16} />,
          }
        : undefined
    }
    className={className}
  />
);
