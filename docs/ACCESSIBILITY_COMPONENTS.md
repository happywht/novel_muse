# 可访问性组件实现示例

本文档提供了常见的可访问组件实现示例，供开发时参考。

## 目录

1. [可访问按钮](#可访问按钮)
2. [可访问链接](#可访问链接)
3. [可访问表单](#可访问表单)
4. [可访问模态框](#可访问模态框)
5. [可访问下拉菜单](#可访问下拉菜单)
6. [可访问列表/网格](#可访问列表网格)
7. [可访问标签页](#可访问标签页)
8. [可访问对话框/确认框](#可访问对话框确认框)
9. [可访问工具提示](#可访问工具提示)
10. [可访问加载状态](#可访问加载状态)

---

## 可访问按钮

### 基础按钮

```tsx
import React, { KeyboardEvent } from 'react';

interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  pressed?: boolean;
  expanded?: boolean;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  label,
  disabled = false,
  pressed,
  expanded,
}) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onClick();
      }
    }
  };

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={label}
      aria-disabled={disabled || undefined}
      aria-pressed={pressed}
      aria-expanded={expanded}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
};
```

### 图标按钮

```tsx
import React from 'react';
import { IconType } from 'react-icons';

interface IconButtonProps {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
};
```

---

## 可访问链接

### 外部链接

```tsx
import React from 'react';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
}

export const ExternalLink: React.FC<ExternalLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${children} (在新窗口打开)`}
    >
      {children}
      <span className="sr-only">(在新窗口打开)</span>
    </a>
  );
};
```

---

## 可访问表单

### 带标签的输入框

```tsx
import React, { useState } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  error,
  helperText,
}) => {
  const [value, setValue] = useState('');

  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="必填">
            *
          </span>
        )}
      </label>

      <input
        type="text"
        id={id}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={
          error ? errorId : helperText ? helperId : undefined
        }
        className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white"
      />

      {error && (
        <span id={errorId} className="text-sm text-red-400" role="alert">
          {error}
        </span>
      )}

      {helperText && !error && (
        <span id={helperId} className="text-sm text-slate-400">
          {helperText}
        </span>
      )}
    </div>
  );
};
```

---

## 可访问模态框

### 基础模态框

```tsx
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 使用焦点陷阱
  useFocusTrap(isOpen, modalRef);

  useEffect(() => {
    if (isOpen) {
      // 保存当前焦点
      previousActiveElement.current = document.activeElement as HTMLElement;

      // 禁用背景滚动
      document.body.style.overflow = 'hidden';

      // 聚焦关闭按钮
      setTimeout(() => {
        const closeButton = modalRef.current?.querySelector(
          'button[aria-label="关闭"]'
        ) as HTMLElement;
        closeButton?.focus();
      }, 100);
    } else {
      // 恢复焦点
      previousActiveElement.current?.focus();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 id="modal-title" className="text-xl font-bold text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
```

---

## 可访问下拉菜单

### 键盘友好的下拉菜单

```tsx
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          buttonRef.current?.focus();
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        className="flex items-center justify-between w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg"
      >
        <span>{selectedOption?.label || '请选择...'}</span>
        <ChevronDown size={20} aria-hidden="true" />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-activedescendant={focusedIndex >= 0 ? `option-${focusedIndex}` : undefined}
          className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`option-${index}`}
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                buttonRef.current?.focus();
              }}
              className={`px-4 py-2 cursor-pointer ${
                value === option.value
                  ? 'bg-muse-600 text-white'
                  : 'hover:bg-slate-800'
              } ${focusedIndex === index ? 'bg-slate-800' : ''}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## 可访问列表/网格

### 键盘可导航的列表

```tsx
import React, { useState } from 'react';
import { KeyboardNavHandler } from '../utils/accessibility';

interface ListItem {
  id: string;
  label: string;
}

interface AccessibleListProps {
  items: ListItem[];
  onSelect: (item: ListItem) => void;
  label: string;
}

export const AccessibleList: React.FC<AccessibleListProps> = ({
  items,
  onSelect,
  label,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = KeyboardNavHandler.createListNavigation(
    items,
    selectedIndex,
    (index, item) => {
      setSelectedIndex(index);
      onSelect(item);
    },
    { loop: true, orientation: 'vertical' }
  );

  return (
    <div
      role="listbox"
      aria-label={label}
      aria-activedescendant={selectedIndex >= 0 ? `item-${selectedIndex}` : undefined}
      className="border border-slate-700 rounded-lg overflow-hidden"
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          id={`item-${index}`}
          role="option"
          aria-selected={selectedIndex === index}
          onClick={() => {
            setSelectedIndex(index);
            onSelect(item);
          }}
          onKeyDown={handleKeyDown}
          tabIndex={selectedIndex === index ? 0 : -1}
          className={`px-4 py-3 cursor-pointer ${
            selectedIndex === index
              ? 'bg-muse-600 text-white'
              : 'hover:bg-slate-800'
          }`}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
};
```

---

## 可访问标签页

### 键盘可导航的标签页

```tsx
import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface AccessibleTabsProps {
  tabs: Tab[];
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      {/* Tab List */}
      <div
        role="tablist"
        aria-label="选项卡"
        className="flex border-b border-slate-700"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === index}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                setActiveTab((prev) =>
                  prev < tabs.length - 1 ? prev + 1 : 0
                );
              } else if (e.key === 'ArrowLeft') {
                setActiveTab((prev) =>
                  prev > 0 ? prev - 1 : tabs.length - 1
                );
              } else if (e.key === 'Home') {
                e.preventDefault();
                setActiveTab(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                setActiveTab(tabs.length - 1);
              }
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === index
                ? 'text-muse-400 border-b-2 border-muse-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          tabIndex={0}
          hidden={activeTab !== index}
          className="p-6"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};
```

---

## 可访问对话框/确认框

### 带焦点陷阱的确认框

```tsx
import React, { useEffect, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = '确认',
  cancelLabel = '取消',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
    >
      <div
        ref={dialogRef}
        className="bg-slate-900 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6"
      >
        <h2 id="dialog-title" className="text-xl font-bold text-white mb-4">
          {title}
        </h2>
        <p id="dialog-message" className="text-slate-300 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className="px-4 py-2 bg-muse-600 text-white rounded-lg hover:bg-muse-700"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 可访问工具提示

### 键盘可访问的工具提示

```tsx
import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // 调整位置避免溢出
      if (triggerRect.top < tooltipRect.height + 8) {
        // 如果上方空间不足，显示在下方
        tooltipRef.current.style.top = `${triggerRect.bottom + 8}px`;
      }
    }
  }, [isVisible]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsVisible(!isVisible);
    } else if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  const clonedChild = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: () => setIsVisible(true),
    onMouseLeave: () => setIsVisible(false),
    onFocus: () => setIsVisible(true),
    onBlur: () => setIsVisible(false),
    onKeyDown: handleKeyDown,
    'aria-describedby': isVisible ? 'tooltip-content' : undefined,
  });

  return (
    <>
      {clonedChild}
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip-content"
          role="tooltip"
          className="absolute z-50 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-lg text-sm text-slate-200 max-w-xs"
        >
          {content}
        </div>
      )}
    </>
  );
};
```

---

## 可访问加载状态

### 屏幕阅读器友好的加载指示器

```tsx
import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = '加载中...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizeClasses[size]} border-2 border-muse-600 border-t-transparent rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="sr-only" role="status" aria-live="polite">
        {text}
      </span>
      {text && (
        <span className="text-sm text-slate-400">{text}</span>
      )}
    </div>
  );
};
```

---

## 最佳实践总结

### 1. 键盘导航
- 所有交互元素必须可通过键盘访问
- 提供清晰的焦点指示器
- 保持逻辑的 Tab 顺序
- 支持 Enter/Space 激活

### 2. ARIA 属性
- 使用语义化 HTML
- 仅在必要时使用 ARIA
- 提供有意义的标签
- 正确管理状态

### 3. 焦点管理
- 模态框使用焦点陷阱
- 打开/关闭时保存/恢复焦点
- 避免焦点丢失
- 提供清晰的焦点路径

### 4. 屏幕阅读器支持
- 为动态内容使用 `aria-live`
- 为复杂组件提供角色
- 关联标签和输入
- 提供上下文信息

### 5. 测试
- 使用键盘测试所有功能
- 使用屏幕阅读器测试
- 运行 Lighthouse 审计
- 进行真实用户测试

---

**最后更新**: 2026-04-18
**维护者**: Frontend Team
