/**
 * MobileNavigation - 移动端导航组件
 *
 * 为移动设备提供优化的导航体验
 * Provides optimized navigation experience for mobile devices
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import { AppSection } from '@/types';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  navigationItems: Array<{
    id: AppSection;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    color: string;
  }>;
}

/**
 * 移动端导航组件
 *
 * 功能：
 * - 滑动抽屉式导航
 * - 触摸友好的大按钮
 * - 遮罩层背景
 * - 平滑过渡动画
 *
 * @example
 * ```tsx
 * <MobileNavigation
 *   activeSection={activeSection}
 *   onSectionChange={setActiveSection}
 *   navigationItems={NAV_ITEMS}
 * />
 * ```
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeSection,
  onSectionChange,
  navigationItems,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useBreakpoint();
  const overlayRef = useRef<HTMLDivElement>(null);

  // 关闭导航（当切换到桌面端时自动关闭）
  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSectionChange = (section: AppSection) => {
    onSectionChange(section);
    setIsOpen(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setIsOpen(false);
    }
  };

  // 汉堡菜单按钮（仅移动端显示）
  const MenuButton = () => (
    <button
      onClick={() => setIsOpen(true)}
      className={cn(
        'touch-target',
        'fixed top-4 left-4 z-40',
        'p-3 rounded-lg',
        'bg-slate-800 text-slate-200',
        'hover:bg-slate-700 active:bg-slate-600',
        'transition-colors duration-200',
        'lg:hidden', // 桌面端隐藏
        'shadow-lg'
      )}
      aria-label="打开导航菜单"
    >
      <Menu size={24} />
    </button>
  );

  // 移动端导航抽屉
  const NavigationDrawer = () => (
    <>
      {/* 遮罩层 */}
      <div
        ref={overlayRef}
        className={cn(
          'fixed inset-0 bg-black/60 z-40',
          'lg:hidden', // 桌面端隐藏
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* 导航抽屉 */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50',
          'w-80 max-w-[85vw]', // 移动端最大宽度85vw
          'bg-slate-900',
          'shadow-2xl',
          'lg:hidden', // 桌面端隐藏
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">导航</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="touch-target p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:bg-slate-700 transition-colors"
            aria-label="关闭导航菜单"
          >
            <X size={24} />
          </button>
        </div>

        {/* 导航列表 */}
        <nav className="flex-1 overflow-y-auto p-4" aria-label="主导航">
          <ul className="space-y-2" role="list">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleSectionChange(item.id)}
                    className={cn(
                      'touch-target w-full',
                      'flex items-center gap-4',
                      'px-4 py-4 rounded-lg',
                      'transition-all duration-200',
                      'text-left',
                      isActive
                        ? cn(item.color, item.bgColor, 'shadow-lg')
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:bg-slate-700',
                      'font-medium'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={24} className="flex-shrink-0" />
                    <span className="text-base">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 抽屉底部 */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Muse: 小说架构师
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <MenuButton />
      <NavigationDrawer />
    </>
  );
};

/**
 * BottomNavigation - 底部导航栏（移动端）
 *
 * 替代方案：底部固定导航栏（3-5个主要入口）
 */
interface BottomNavigationProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  navigationItems: Array<{
    id: AppSection;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    color: string;
  }>;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeSection,
  onSectionChange,
  navigationItems,
}) => {
  const { isMobile } = useBreakpoint();

  // 只显示前5个最重要的导航项
  const primaryItems = navigationItems.slice(0, 5);

  if (!isMobile) return null;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-slate-900/95 backdrop-blur-sm',
        'border-t border-slate-700',
        'pb-safe', // iOS安全区域
        'lg:hidden' // 桌面端隐藏
      )}
      aria-label="底部导航"
    >
      <div className="flex items-center justify-around py-2">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'touch-target flex-1',
                'flex flex-col items-center justify-center',
                'py-2 px-1',
                'transition-all duration-200',
                isActive
                  ? cn(item.color)
                  : 'text-slate-500 hover:text-slate-400 active:text-slate-300'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-[10px] font-medium">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
