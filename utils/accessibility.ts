/**
 * 可访问性工具函数
 * Accessibility Utility Functions
 *
 * 提供常用的可访问性辅助函数
 * Provides common accessibility helper functions
 */

/**
 * 生成唯一的ARIA ID
 * Generate unique ARIA ID
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 为元素设置ARIA属性
 * Set ARIA attributes for an element
 */
export function setAriaAttributes(
  element: HTMLElement,
  attributes: Record<string, string | boolean | null | undefined>
): void {
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      element.removeAttribute(key);
    } else {
      element.setAttribute(key, String(value));
    }
  });
}

/**
 * 管理焦点：保存和恢复焦点
 * Manage focus: Save and restore focus
 */
export class FocusManager {
  private previousActiveElement: HTMLElement | null = null;

  /**
   * 保存当前焦点元素
   * Save current focused element
   */
  saveFocus(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
  }

  /**
   * 恢复之前保存的焦点
   * Restore previously saved focus
   */
  restoreFocus(): void {
    if (this.previousActiveElement && 'focus' in this.previousActiveElement) {
      this.previousActiveElement.focus();
    }
  }

  /**
   * 聚焦到指定元素
   * Focus to specified element
   */
  focusElement(element: HTMLElement | string, delay: number = 0): void {
    const targetElement =
      typeof element === 'string'
        ? document.querySelector(element)
        : element;

    if (targetElement && 'focus' in targetElement) {
      setTimeout(() => {
        (targetElement as HTMLElement).focus();
      }, delay);
    }
  }

  /**
   * 聚焦到容器的第一个可聚焦元素
   * Focus to first focusable element in container
   */
  focusFirstInContainer(container: HTMLElement | string): void {
    const containerElement =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerElement) return;

    const focusableElements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement && 'focus' in firstElement) {
      firstElement.focus();
    }
  }

  /**
   * 获取容器内所有可聚焦元素
   * Get all focusable elements in container
   */
  getFocusableElements(container: HTMLElement | string): HTMLElement[] {
    const containerElement =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerElement) return [];

    const elements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    return Array.from(elements).filter(
      (el) =>
        (el as HTMLElement).offsetParent !== null &&
        !(el as HTMLElement).disabled &&
        el.getAttribute('aria-hidden') !== 'true'
    ) as HTMLElement[];
  }
}

/**
 * 键盘导航处理器
 * Keyboard navigation handler
 */
export class KeyboardNavHandler {
  /**
   * 处理常见的键盘快捷键
   * Handle common keyboard shortcuts
   */
  static handleKeyboardEvent(
    event: KeyboardEvent,
    handlers: {
      onEnter?: () => void;
      onSpace?: () => void;
      onEscape?: () => void;
      onArrowUp?: () => void;
      onArrowDown?: () => void;
      onArrowLeft?: () => void;
      onArrowRight?: () => void;
      onHome?: () => void;
      onEnd?: () => void;
      onTab?: () => void;
    }
  ): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        handlers.onEnter?.();
        break;
      case ' ':
        event.preventDefault();
        handlers.onSpace?.();
        break;
      case 'Escape':
        handlers.onEscape?.();
        break;
      case 'ArrowUp':
        event.preventDefault();
        handlers.onArrowUp?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        handlers.onArrowDown?.();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        handlers.onArrowLeft?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        handlers.onArrowRight?.();
        break;
      case 'Home':
        event.preventDefault();
        handlers.onHome?.();
        break;
      case 'End':
        event.preventDefault();
        handlers.onEnd?.();
        break;
      case 'Tab':
        handlers.onTab?.();
        break;
    }
  }

  /**
   * 创建键盘导航处理器（用于列表）
   * Create keyboard navigation handler (for lists)
   */
  static createListNavigation<T>(
    items: T[],
    currentIndex: number,
    onSelect: (index: number, item: T) => void,
    options: {
      loop?: boolean;
      orientation?: 'horizontal' | 'vertical';
    } = {}
  ): (event: KeyboardEvent) => void {
    const { loop = true, orientation = 'vertical' } = options;

    return (event: KeyboardEvent) => {
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
          if (orientation === 'vertical') {
            event.preventDefault();
            newIndex = currentIndex + 1;
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical') {
            event.preventDefault();
            newIndex = currentIndex - 1;
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal') {
            event.preventDefault();
            newIndex = currentIndex + 1;
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal') {
            event.preventDefault();
            newIndex = currentIndex - 1;
          }
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelect(currentIndex, items[currentIndex]);
          return;
        default:
          return;
      }

      // 边界处理
      if (newIndex < 0) {
        newIndex = loop ? items.length - 1 : 0;
      } else if (newIndex >= items.length) {
        newIndex = loop ? 0 : items.length - 1;
      }

      onSelect(newIndex, items[newIndex]);
    };
  }
}

/**
 * 屏幕阅读器通知
 * Screen reader announcement
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // 移除现有的 announcer（如果存在）
  const existingAnnouncer = document.getElementById('sr-announcer');
  if (existingAnnouncer) {
    existingAnnouncer.remove();
  }

  // 创建新的 announcer
  const announcer = document.createElement('div');
  announcer.id = 'sr-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';

  document.body.appendChild(announcer);

  // 添加消息
  announcer.textContent = message;

  // 清理（可选）
  setTimeout(() => {
    announcer.remove();
  }, 1000);
}

/**
 * 检查元素是否可见
 * Check if element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  return (
    element.offsetParent !== null &&
    getComputedStyle(element).visibility !== 'hidden' &&
    getComputedStyle(element).display !== 'none'
  );
}

/**
 * 为所有交互元素添加键盘支持
 * Add keyboard support to all interactive elements
 */
export function enhanceKeyboardSupport(container: HTMLElement): void {
  const interactiveElements = container.querySelectorAll(
    '[role="button"]:not([tabindex]), [role="menuitem"]:not([tabindex])'
  );

  interactiveElements.forEach((element) => {
    if (element instanceof HTMLElement) {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }

      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          element.click();
        }
      });
    }
  });
}

/**
 * 创建ARIA属性生成器
 * Create ARIA attributes generator
 */
export function createAriaProps(props: {
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  current?: string;
  expanded?: boolean;
  pressed?: boolean;
  selected?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  live?: 'polite' | 'assertive' | 'off';
  modal?: boolean;
}): Record<string, string | boolean | undefined> {
  const ariaProps: Record<string, string | boolean | undefined> = {};

  if (props.label) ariaProps['aria-label'] = props.label;
  if (props.labelledBy) ariaProps['aria-labelledby'] = props.labelledBy;
  if (props.describedBy) ariaProps['aria-describedby'] = props.describedBy;
  if (props.current) ariaProps['aria-current'] = props.current;
  if (props.expanded !== undefined) ariaProps['aria-expanded'] = props.expanded;
  if (props.pressed !== undefined) ariaProps['aria-pressed'] = props.pressed;
  if (props.selected !== undefined) ariaProps['aria-selected'] = props.selected;
  if (props.disabled !== undefined) ariaProps['aria-disabled'] = props.disabled;
  if (props.hidden !== undefined) ariaProps['aria-hidden'] = props.hidden;
  if (props.live) ariaProps['aria-live'] = props.live;
  if (props.modal !== undefined) ariaProps['aria-modal'] = props.modal;

  return ariaProps;
}

/**
 * 键盘焦点陷阱实现
 * Keyboard focus trap implementation
 */
export function trapFocus(
  container: HTMLElement,
  event: KeyboardEvent
): void {
  if (event.key !== 'Tab') return;

  const focusableElements = new FocusManager().getFocusableElements(container);

  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) {
    // Shift+Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * 导出所有工具
 */
export const accessibilityUtils = {
  generateAriaId,
  setAriaAttributes,
  FocusManager,
  KeyboardNavHandler,
  announceToScreenReader,
  isElementVisible,
  enhanceKeyboardSupport,
  createAriaProps,
  trapFocus,
};

export default accessibilityUtils;
