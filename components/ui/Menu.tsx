/**
 * Menu - 菜单组件系统
 *
 * 提供菜单展示和交互
 * Provides menu display and interaction
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * 菜单项
 */
export interface MenuItem {
  /**
   * 菜单键
   */
  key: string;

  /**
   * 菜单标题
   */
  label: string;

  /**
   * 图标
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
   * 子菜单
   */
  children?: MenuItem[];

  /**
   * 分割线
   */
  divider?: boolean;

  /**
   * 点击回调
   */
  onClick?: () => void;
}

/**
 * Menu组件属性
 */
export interface MenuProps {
  /**
   * 菜单项列表
   */
  items: MenuItem[];

  /**
   * 当前选中
   */
  selectedKey?: string;

  /**
   * 点击回调
   */
  onSelect?: (key: string) => void;

  /**
   * 菜单模式
   * @default 'vertical'
   */
  mode?: 'vertical' | 'horizontal';

  /**
   * 是否可折叠
   * @default false
   */
  collapsible?: boolean;

  /**
   * 默认展开的菜单键
   */
  defaultOpenKeys?: string[];

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * Menu - 主菜单组件
 *
 * @example
 * ```tsx
 * const items: MenuItem[] = [
 *   { key: '1', label: '首页', icon: <Home /> },
 *   { key: '2', label: '产品', icon: <Package />, children: [
 *     { key: '2-1', label: '产品列表' },
 *     { key: '2-2', label: '产品详情' },
 *   ]},
 * ];
 *
 * <Menu items={items} onSelect={(key) => console.log(key)} />
 * ```
 */
export const Menu: React.FC<MenuProps> = ({
  items,
  selectedKey,
  onSelect,
  mode = 'vertical',
  collapsible = false,
  defaultOpenKeys = [],
  className,
}) => {
  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKeys);

  const handleSubMenuClick = (key: string) => {
    if (!collapsible) return;

    setOpenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const renderMenuItem = (item: MenuItem, level: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openKeys.includes(item.key);
    const isSelected = selectedKey === item.key;

    const itemClass = cn(
      'touch-target',
      'flex items-center gap-3',
      'px-4 py-2.5',
      'rounded-md',
      'font-medium',
      'transition-all duration-150',
      'cursor-pointer',
      isSelected
        ? 'bg-muse-100 dark:bg-muse-900 text-muse-600 dark:text-muse-400'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
      item.disabled && 'opacity-50 cursor-not-allowed'
    );

    const content = (
      <>
        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
        {hasChildren && (
          <span className="flex-shrink-0">
            {isOpen ? '↓' : '→'}
          </span>
        )}
      </>
    );

    return (
      <div key={item.key} style={{ marginLeft: mode === 'vertical' ? level * 16 : 0 }}>
        {/* 分割线 */}
        {item.divider && <div className="my-2 border-t border-slate-200 dark:border-slate-700" />}

        {/* 菜单项 */}
        {!hasChildren ? (
          <div
            className={itemClass}
            onClick={() => {
              if (!item.disabled) {
                item.onClick?.();
                onSelect?.(item.key);
              }
            }}
          >
            {content}
          </div>
        ) : (
          <SubMenu
            item={item}
            isOpen={isOpen}
            level={level}
            onToggle={() => handleSubMenuClick(item.key)}
            onSelect={onSelect}
            selectedKey={selectedKey}
            mode={mode}
            collapsible={collapsible}
          >
            {content}
          </SubMenu>
        )}
      </div>
    );
  };

  return (
    <nav
      className={cn(
        mode === 'vertical' ? 'flex flex-col gap-1' : 'flex items-center gap-1',
        className
      )}
    >
      {items.map((item) => renderMenuItem(item))}
    </nav>
  );
};

/**
 * SubMenu - 子菜单组件
 */
const SubMenu: React.FC<{
  item: MenuItem;
  isOpen: boolean;
  level: number;
  onToggle: () => void;
  onSelect?: (key: string) => void;
  selectedKey?: string;
  mode: 'vertical' | 'horizontal';
  collapsible: boolean;
  children: React.ReactNode;
}> = ({ item, isOpen, level, onToggle, onSelect, selectedKey, mode, collapsible, children }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 水平菜单使用下拉框
  if (mode === 'horizontal') {
    return (
      <div
        className="relative"
        onMouseEnter={() => setIsDropdownOpen(true)}
        onMouseLeave={() => setIsDropdownOpen(false)}
      >
        <div
          className={cn(
            'touch-target',
            'flex items-center gap-2',
            'px-4 py-2.5',
            'rounded-md',
            'font-medium',
            'cursor-pointer',
            'transition-colors duration-150',
            'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          {children}
        </div>

        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
          >
            {item.children?.map((child) => (
              <div
                key={child.key}
                className={cn(
                  'touch-target',
                  'flex items-center gap-3',
                  'px-4 py-2.5',
                  'font-medium',
                  'cursor-pointer',
                  'transition-colors duration-150',
                  selectedKey === child.key
                    ? 'bg-muse-100 dark:bg-muse-900 text-muse-600 dark:text-muse-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  child.disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => {
                  if (!child.disabled) {
                    child.onClick?.();
                    onSelect?.(child.key);
                  }
                }}
              >
                {child.icon && <span className="flex-shrink-0">{child.icon}</span>}
                <span>{child.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 垂直菜单使用可折叠面板
  return (
    <div>
      <div
        className={cn(
          'touch-target',
          'flex items-center gap-3',
          'px-4 py-2.5',
          'rounded-md',
          'font-medium',
          'transition-all duration-150',
          'cursor-pointer',
          'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        )}
        onClick={onToggle}
      >
        {children}
      </div>

      {collapsible ? (
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="py-1">
            {item.children?.map((child) => (
              <div
                key={child.key}
                className={cn(
                  'touch-target',
                  'flex items-center gap-3',
                  'px-4 py-2.5',
                  'rounded-md',
                  'font-medium',
                  'cursor-pointer',
                  'transition-colors duration-150',
                  selectedKey === child.key
                    ? 'bg-muse-100 dark:bg-muse-900 text-muse-600 dark:text-muse-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  child.disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{ marginLeft: 16 }}
                onClick={() => {
                  if (!child.disabled) {
                    child.onClick?.();
                    onSelect?.(child.key);
                  }
                }}
              >
                {child.icon && <span className="flex-shrink-0">{child.icon}</span>}
                <span>{child.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        isOpen && (
          <div className="py-1">
            {item.children?.map((child) => (
              <div
                key={child.key}
                className={cn(
                  'touch-target',
                  'flex items-center gap-3',
                  'px-4 py-2.5',
                  'rounded-md',
                  'font-medium',
                  'cursor-pointer',
                  'transition-colors duration-150',
                  selectedKey === child.key
                    ? 'bg-muse-100 dark:bg-muse-900 text-muse-600 dark:text-muse-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  child.disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{ marginLeft: 16 }}
                onClick={() => {
                  if (!child.disabled) {
                    child.onClick?.();
                    onSelect?.(child.key);
                  }
                }}
              >
                {child.icon && <span className="flex-shrink-0">{child.icon}</span>}
                <span>{child.label}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

/**
 * ContextMenu - 右键菜单
 */
export const ContextMenu: React.FC<{
  /**
   * 菜单项
   */
  items: MenuItem[];

  /**
   * 触发元素
   */
  children: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ items, children, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsVisible(true);
    setPosition({ x: e.clientX, y: e.clientY });
  };

  const handleClickOutside = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isVisible]);

  return (
    <div onContextMenu={handleContextMenu}>
      {children}

      {isVisible && (
        <div
          ref={menuRef}
          className={cn(
            'fixed',
            'bg-white dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700',
            'rounded-lg shadow-lg',
            'py-1 z-50 min-w-[200px]',
            className
          )}
          style={{ left: position.x, top: position.y }}
        >
          {items.map((item) => (
            <div
              key={item.key}
              className={cn(
                'touch-target',
                'flex items-center gap-3',
                'px-4 py-2.5',
                'font-medium',
                'cursor-pointer',
                'transition-colors duration-150',
                'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick?.();
                  setIsVisible(false);
                }
              }}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * ActionMenu - 操作菜单（三点菜单）
 */
export const ActionMenu: React.FC<{
  /**
   * 菜单项
   */
  items: MenuItem[];

  /**
   * 触发按钮图标
   */
  icon?: React.ReactNode;

  /**
   * 菜单位置
   * @default 'bottom-right'
   */
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ items, icon, placement = 'bottom-right', className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const placementStyles = {
    'bottom-left': 'top-full left-0 mt-1',
    'bottom-right': 'top-full right-0 mt-1',
    'top-left': 'bottom-full left-0 mb-1',
    'top-right': 'bottom-full right-0 mb-1',
  };

  const handleClickOutside = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'touch-target',
          'p-2 rounded-md',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'transition-colors duration-150'
        )}
      >
        {icon || <span>⋯</span>}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute',
            'bg-white dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700',
            'rounded-lg shadow-lg',
            'py-1 z-50 min-w-[200px]',
            placementStyles[placement],
            className
          )}
        >
          {items.map((item) => (
            <div
              key={item.key}
              className={cn(
                'touch-target',
                'flex items-center gap-3',
                'px-4 py-2.5',
                'font-medium',
                'cursor-pointer',
                'transition-colors duration-150',
                'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick?.();
                  setIsOpen(false);
                }
              }}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * MenuItem - 单独的菜单项
 */
export const MenuItemComponent: React.FC<{
  /**
   * 菜单项
   */
  item: MenuItem;

  /**
   * 是否选中
   */
  selected?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ item, selected = false, className }) => {
  return (
    <div
      className={cn(
        'touch-target',
        'flex items-center gap-3',
        'px-4 py-2.5',
        'rounded-md',
        'font-medium',
        'transition-all duration-150',
        'cursor-pointer',
        selected
          ? 'bg-muse-100 dark:bg-muse-900 text-muse-600 dark:text-muse-400'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        item.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </div>
  );
};
