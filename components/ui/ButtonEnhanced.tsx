/**
 * ButtonEnhanced - 增强按钮组件
 *
 * 提供加载状态、禁用状态、图标等完整功能
 * Provides complete button features with loading, disabled, icon states
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * 按钮变体
 */
export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'destructive'
  | 'success';

/**
 * 按钮尺寸
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 按钮属性
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 变体
   * @default 'default'
   */
  variant?: ButtonVariant;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * 是否加载中
   * @default false
   */
  loading?: boolean;

  /**
   * 加载文本
   */
  loadingText?: string;

  /**
   * 图标（左侧）
   */
  icon?: React.ReactNode;

  /**
   * 图标（右侧）
   */
  iconRight?: React.ReactNode;

  /**
   * 是否全宽
   * @default false
   */
  fullWidth?: boolean;

  /**
   * 子元素
   */
  children?: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 变体样式映射
 */
const variantStyles: Record<ButtonVariant, string> = {
  default: cn(
    'bg-slate-200 dark:bg-slate-700',
    'text-slate-900 dark:text-slate-100',
    'hover:bg-slate-300 dark:hover:bg-slate-600',
    'focus:ring-slate-500'
  ),
  primary: cn(
    'bg-muse-600 dark:bg-muse-500',
    'text-white',
    'hover:bg-muse-700 dark:hover:bg-muse-400',
    'focus:ring-muse-500',
    'shadow-md hover:shadow-lg'
  ),
  secondary: cn(
    'bg-slate-600 dark:bg-slate-500',
    'text-white',
    'hover:bg-slate-700 dark:hover:bg-slate-400',
    'focus:ring-slate-500'
  ),
  ghost: cn(
    'bg-transparent',
    'text-slate-700 dark:text-slate-300',
    'hover:bg-slate-100 dark:hover:bg-slate-800',
    'focus:ring-slate-500'
  ),
  outline: cn(
    'bg-transparent',
    'border border-slate-300 dark:border-slate-600',
    'text-slate-700 dark:text-slate-300',
    'hover:bg-slate-50 dark:hover:bg-slate-800',
    'focus:ring-slate-500'
  ),
  destructive: cn(
    'bg-red-600 dark:bg-red-500',
    'text-white',
    'hover:bg-red-700 dark:hover:bg-red-400',
    'focus:ring-red-500',
    'shadow-md hover:shadow-lg'
  ),
  success: cn(
    'bg-green-600 dark:bg-green-500',
    'text-white',
    'hover:bg-green-700 dark:hover:bg-green-400',
    'focus:ring-green-500',
    'shadow-md hover:shadow-lg'
  ),
};

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<ButtonSize, { padding: string; text: string; icon: string }> = {
  xs: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    icon: 'w-3 h-3',
  },
  sm: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  md: {
    padding: 'px-4 py-2',
    text: 'text-base',
    icon: 'w-5 h-5',
  },
  lg: {
    padding: 'px-6 py-3',
    text: 'text-lg',
    icon: 'w-5 h-5',
  },
  xl: {
    padding: 'px-8 py-4',
    text: 'text-xl',
    icon: 'w-6 h-6',
  },
};

/**
 * ButtonEnhanced - 主组件
 *
 * @example
 * ```tsx
 * <Button>默认按钮</Button>
 * <Button variant="primary" size="lg">主要按钮</Button>
 * <Button loading>加载中...</Button>
 * <Button icon={<Plus />}>添加</Button>
 * <Button loading loadingText="处理中...">提交</Button>
 * ```
 */
export const ButtonEnhanced: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const variantClass = variantStyles[variant];
  const sizeClass = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        'touch-target',
        'inline-flex items-center justify-center gap-2',
        'font-medium',
        'rounded-lg',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-95',
        variantClass,
        sizeClass.padding,
        sizeClass.text,
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {/* 左侧图标 */}
      {loading ? (
        <Loader2 className={cn(sizeClass.icon, 'animate-spin')} />
      ) : (
        icon && <span className={cn('flex-shrink-0', sizeClass.icon)}>{icon}</span>
      )}

      {/* 文本内容 */}
      {loading && loadingText ? loadingText : children}

      {/* 右侧图标 */}
      {!loading && iconRight && (
        <span className={cn('flex-shrink-0', sizeClass.icon)}>{iconRight}</span>
      )}
    </button>
  );
};

/**
 * ButtonGroup - 按钮组
 *
 * @example
 * ```tsx
 * <ButtonGroup>
 *   <Button>取消</Button>
 *   <Button variant="primary">确认</Button>
 * </ButtonGroup>
 * ```
 */
export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
}> = ({ children, className, vertical = false }) => {
  return (
    <div
      className={cn(
        'flex',
        vertical ? 'flex-col gap-2' : 'items-center gap-2',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * IconButton - 图标按钮
 *
 * @example
 * ```tsx
 * <IconButton icon={<Edit />} onClick={handleEdit} />
 * <IconButton icon={<Trash />} variant="destructive" />
 * ```
 */
export const IconButton: React.FC<{
  icon: React.ReactNode;
  tooltip?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & Omit<ButtonProps, 'children' | 'icon'> > = ({
  icon,
  tooltip,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}) => {
  const sizeClass = sizeStyles[size];

  return (
    <button
      className={cn(
        'touch-target',
        'inline-flex items-center justify-center',
        'rounded-lg',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'active:scale-95',
        variantStyles[variant],
        sizeClass.padding,
        'relative',
        className
      )}
      title={tooltip}
      {...props}
    >
      <span className={cn(sizeClass.icon)}>{icon}</span>
    </button>
  );
};

/**
 * LoadingButton - 加载按钮快捷组件
 *
 * @example
 * ```tsx
 * <LoadingButton loading={isLoading} onClick={handleSubmit}>
 *   提交
 * </LoadingButton>
 * ```
 */
export const LoadingButton: React.FC<
  ButtonProps & {
    loading?: boolean;
  }
> = ({ loading = false, loadingText, children, ...props }) => {
  return (
    <ButtonEnhanced
      loading={loading}
      loadingText={loadingText || '加载中...'}
      {...props}
    >
      {children}
    </ButtonEnhanced>
  );
};

/**
 * ToggleButton - 切换按钮
 *
 * @example
 * ```tsx
 * const [active, setActive] = useState(false);
 * <ToggleButton active={active} onClick={() => setActive(!active)}>
 *   切换
 * </ToggleButton>
 * ```
 */
export const ToggleButton: React.FC<{
  active?: boolean;
  onActive?: React.ReactNode;
  onInactive?: React.ReactNode;
  children?: React.ReactNode;
} & Omit<ButtonProps, 'variant'>> = ({
  active = false,
  onActive,
  onInactive,
  children,
  ...props
}) => {
  return (
    <ButtonEnhanced
      variant={active ? 'primary' : 'outline'}
      {...props}
    >
      {active ? onActive || onInactive || children : onInactive || children}
    </ButtonEnhanced>
  );
};

/**
 * SplitButton - 分割按钮
 *
 * @example
 * ```tsx
 * <SplitButton
 *   mainAction={{ label: '保存', onClick: handleSave }}
 *   extraActions={[
 *     { label: '保存并关闭', onClick: handleClose },
 *     { label: '保存为草稿', onClick: handleDraft },
 *   ]}
 * />
 * ```
 */
export const SplitButton: React.FC<{
  mainAction: {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
  };
  extraActions: Array<{
    label: string;
    onClick: () => void;
  }>;
  size?: ButtonSize;
  className?: string;
}> = ({ mainAction, extraActions, size = 'md', className }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={buttonRef} className={cn('inline-flex', className)}>
      {/* 主按钮 */}
      <ButtonEnhanced
        variant={mainAction.variant || 'primary'}
        size={size}
        onClick={mainAction.onClick}
        className="rounded-r-none"
      >
        {mainAction.label}
      </ButtonEnhanced>

      {/* 下拉按钮 */}
      <div className="relative">
        <ButtonEnhanced
          variant={mainAction.variant || 'primary'}
          size={size}
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-l-none px-2 border-l border-white/20"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            ▼
          </span>
        </ButtonEnhanced>

        {/* 下拉菜单 */}
        {isOpen && (
          <div className="absolute right-0 mt-2 z-10 min-w-[200px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {extraActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 按钮导出
 */
export default ButtonEnhanced;
export { ButtonEnhanced as Button };
