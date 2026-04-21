/**
 * FormFeedback - 表单验证反馈组件
 *
 * 提供表单验证、错误提示、成功提示等功能
 * Provides form validation, error messages, success feedback
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';

/**
 * 验证状态
 */
export type ValidationStatus = 'success' | 'error' | 'warning' | 'info' | 'none';

/**
 * 验证规则
 */
export interface ValidationRule {
  /**
   * 验证函数
   */
  validate: (value: string) => boolean;

  /**
   * 错误消息
   */
  message: string;
}

/**
 * 常用验证规则
 */
export const ValidationRules = {
  required: (message = '此字段为必填项'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  email: (message = '请输入有效的邮箱地址'): ValidationRule => ({
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => value.length >= min,
    message: message || `至少需要${min}个字符`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => value.length <= max,
    message: message || `最多${max}个字符`,
  }),

  pattern: (regex: RegExp, message = '格式不正确'): ValidationRule => ({
    validate: (value) => regex.test(value),
    message,
  }),

  phone: (message = '请输入有效的手机号'): ValidationRule => ({
    validate: (value) => {
      const phoneRegex = /^1[3-9]\d{9}$/;
      return phoneRegex.test(value);
    },
    message,
  }),

  url: (message = '请输入有效的URL'): ValidationRule => ({
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),
};

/**
 * FormField - 表单字段组件
 */
export interface FormFieldProps {
  /**
   * 字段名称
   */
  name: string;

  /**
   * 标签
   */
  label?: string;

  /**
   * 值
   */
  value: string;

  /**
   * 更新回调
   */
  onChange: (value: string) => void;

  /**
   * 验证规则
   */
  rules?: ValidationRule[];

  /**
   * 是否必填
   */
  required?: boolean;

  /**
   * 占位符
   */
  placeholder?: string;

  /**
   * 类型
   */
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 帮助文本
   */
  helpText?: string;

  /**
   * 字符计数
   */
  showCount?: boolean;

  /**
   * 最大长度
   */
  maxLength?: number;

  /**
   * 是否显示密码切换
   */
  showPasswordToggle?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  value,
  onChange,
  rules = [],
  required = false,
  placeholder,
  type = 'text',
  disabled = false,
  className,
  helpText,
  showCount = false,
  maxLength,
  showPasswordToggle = false,
}) => {
  const [touched, setTouched] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // 验证值
  const validateValue = React.useCallback(
    (val: string): { status: ValidationStatus; message?: string } => {
      if (!touched) return { status: 'none' };

      for (const rule of rules) {
        if (!rule.validate(val)) {
          return { status: 'error', message: rule.message };
        }
      }

      if (val.length > 0 && rules.length > 0) {
        return { status: 'success', message: '验证通过' };
      }

      return { status: 'none' };
    },
    [rules, touched]
  );

  const validation = validateValue(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const statusIcons: Record<ValidationStatus, React.ReactNode> = {
    success: <CheckCircle size={16} className="text-green-600 dark:text-green-400" />,
    error: <XCircle size={16} className="text-red-600 dark:text-red-400" />,
    warning: <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />,
    info: <Info size={16} className="text-muse-600 dark:text-muse-400" />,
    none: null,
  };

  const statusClasses: Record<ValidationStatus, string> = {
    success: 'border-green-500 focus:ring-green-500',
    error: 'border-red-500 focus:ring-red-500',
    warning: 'border-amber-500 focus:ring-amber-500',
    info: 'border-muse-500 focus:ring-muse-500',
    none: 'border-slate-300 dark:border-slate-600 focus:ring-muse-500',
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* 标签 */}
      {label && (
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* 输入框容器 */}
      <div className="relative">
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            'touch-target',
            'w-full px-3 py-2',
            'rounded-lg',
            'border',
            'bg-white dark:bg-slate-800',
            'text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            statusClasses[validation.status],
            type === 'password' && showPasswordToggle && 'pr-10'
          )}
        />

        {/* 状态图标 */}
        {validation.status !== 'none' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {statusIcons[validation.status]}
          </div>
        )}

        {/* 密码切换按钮 */}
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              'touch-target',
              'absolute right-3 top-1/2 -translate-y-1/2',
              'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
              'transition-colors'
            )}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {/* 错误消息 */}
      {validation.status === 'error' && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <XCircle size={12} />
          {validation.message}
        </p>
      )}

      {/* 帮助文本 */}
      {helpText && validation.status !== 'error' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helpText}</p>
      )}

      {/* 字符计数 */}
      {showCount && (
        <div className="flex justify-end">
          <span
            className={cn(
              'text-xs',
              maxLength && value.length > maxLength * 0.9
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {value.length}
            {maxLength && ` / ${maxLength}`}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * FormAlert - 表单提示组件
 */
export interface FormAlertProps {
  /**
   * 类型
   */
  type: 'success' | 'error' | 'warning' | 'info';

  /**
   * 消息
   */
  message: string;

  /**
   * 标题
   */
  title?: string;

  /**
   * 是否可关闭
   */
  closeable?: boolean;

  /**
   * 关闭回调
   */
  onClose?: () => void;

  /**
   * 自定义类名
   */
  className?: string;
}

export const FormAlert: React.FC<FormAlertProps> = ({
  type,
  message,
  title,
  closeable = false,
  onClose,
  className,
}) => {
  const typeConfig: Record<
    FormAlertProps['type'],
    { bg: string; border: string; icon: string; text: string }
  > = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-500',
      icon: 'text-green-600 dark:text-green-400',
      text: 'text-green-800 dark:text-green-200',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-500',
      icon: 'text-red-600 dark:text-red-400',
      text: 'text-red-800 dark:text-red-200',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-500',
      icon: 'text-amber-600 dark:text-amber-400',
      text: 'text-amber-800 dark:text-amber-200',
    },
    info: {
      bg: 'bg-muse-50 dark:bg-muse-900/20',
      border: 'border-muse-500',
      icon: 'text-muse-600 dark:text-muse-400',
      text: 'text-muse-800 dark:text-muse-200',
    },
  };

  const config = typeConfig[type];

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        'p-4 rounded-lg',
        'border-l-4',
        config.bg,
        config.border,
        className
      )}
      role="alert"
    >
      {/* 图标 */}
      <div className={cn('flex-shrink-0 mt-0.5', config.icon)}>
        {icons[type]}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('font-semibold mb-1', config.text)}>{title}</h4>
        )}
        <p className={cn('text-sm', config.text)}>{message}</p>
      </div>

      {/* 关闭按钮 */}
      {closeable && (
        <button
          onClick={onClose}
          className={cn(
            'touch-target',
            'flex-shrink-0 p-1',
            'rounded-md',
            'opacity-70 hover:opacity-100',
            'transition-opacity'
          )}
          aria-label="关闭"
        >
          <X size={16} className={config.text} />
        </button>
      )}
    </div>
  );
};

/**
 * FormSuccess - 成功提示快捷组件
 */
export const FormSuccess: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
}) => {
  return <FormAlert type="success" message={message} className={className} />;
};

/**
 * FormError - 错误提示快捷组件
 */
export const FormError: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
}) => {
  return <FormAlert type="error" message={message} className={className} />;
};

/**
 * FormWarning - 警告提示快捷组件
 */
export const FormWarning: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
}) => {
  return <FormAlert type="warning" message={message} className={className} />;
};

/**
 * FormInfo - 信息提示快捷组件
 */
export const FormInfo: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
}) => {
  return <FormAlert type="info" message={message} className={className} />;
};

/**
 * useFieldValidation Hook
 *
 * @example
 * ```tsx
 * const nameField = useFieldValidation('', [ValidationRules.required()]);
 * ```
 */
export const useFieldValidation = (
  initialValue: string,
  rules: ValidationRule[] = []
) => {
  const [value, setValue] = React.useState(initialValue);
  const [touched, setTouched] = React.useState(false);

  const validate = React.useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    for (const rule of rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [value, rules]);

  const validation = validate();

  return {
    value,
    setValue,
    touched,
    setTouched,
    valid: validation.valid,
    errors: validation.errors,
  };
};

/**
 * useFormValidation Hook
 *
 * @example
 * ```tsx
 * const form = useFormValidation({
 *   name: { value: '', rules: [ValidationRules.required()] },
 *   email: { value: '', rules: [ValidationRules.required(), ValidationRules.email()] },
 * });
 * ```
 */
export const useFormValidation = <T extends Record<string, {
  value: string;
  rules?: ValidationRule[];
}>>(
  fields: T
) => {
  const [formData, setFormData] = React.useState(
    Object.entries(fields).reduce((acc, [key, field]) => {
      return {
        ...acc,
        [key]: field.value,
      };
    }, {} as Record<keyof T, string>)
  );

  const [touched, setTouched] = React.useState<Record<keyof T, boolean>>(
    Object.keys(fields).reduce((acc, key) => ({ ...acc, [key]: false }), {} as any)
  );

  const validateField = (name: keyof T): { valid: boolean; errors: string[] } => {
    const field = fields[name];
    const value = formData[name];
    const rules = field.rules || [];

    const errors: string[] = [];

    for (const rule of rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const validateAll = (): { valid: boolean; errors: Record<keyof T, string[]> } => {
    const allErrors: Record<keyof T, string[]> = {} as any;

    for (const key of Object.keys(fields)) {
      const validation = validateField(key as keyof T);
      allErrors[key as keyof T] = validation.errors;
    }

    const valid = Object.values(allErrors).every((errors) => errors.length === 0);

    return {
      valid,
      errors: allErrors,
    };
  };

  const updateField = (name: keyof T, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const touchField = (name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const getFieldErrors = (name: keyof T): string[] => {
    if (!touched[name]) return [];
    return validateField(name).errors;
  };

  return {
    formData,
    updateField,
    touchField,
    getFieldErrors,
    validateAll,
    touched,
  };
};
