import { useEffect } from 'react';

/**
 * 焦点陷阱Hook - 用于模态框和对话框
 * 确保键盘焦点不会离开模态框，提升可访问性
 *
 * @param isActive - 是否激活焦点陷阱
 * @param containerRef - 模态框容器的引用
 */
export function useFocusTrap(isActive: boolean, containerRef?: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // 获取容器内的所有可聚焦元素
      const container = containerRef?.current || document.body;
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // 过滤掉不可见和禁用的元素
      const visibleElements = Array.from(focusableElements).filter(
        (el) => {
          const htmlEl = el as HTMLElement;
          return (
            htmlEl.offsetParent !== null &&
            !htmlEl.disabled &&
            htmlEl.getAttribute('aria-hidden') !== 'true'
          );
        }
      );

      if (visibleElements.length === 0) return;

      const firstElement = visibleElements[0] as HTMLElement;
      const lastElement = visibleElements[visibleElements.length - 1] as HTMLElement;

      // Shift+Tab: 焦点在第一个元素时，跳到最后一个
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      }
      // Tab: 焦点在最后一个元素时，跳到第一个
      else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // 添加事件监听器（使用捕获阶段以确保优先处理）
    document.addEventListener('keydown', handleTab, true);

    // 自动聚焦到第一个可聚焦元素
    if (containerRef?.current) {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstVisible = Array.from(focusableElements).find(
        (el) => (el as HTMLElement).offsetParent !== null
      ) as HTMLElement;
      firstVisible?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleTab, true);
    };
  }, [isActive, containerRef]);
}

/**
 * 焦点管理Hook - 用于在组件挂载/更新时管理焦点
 *
 * @param condition - 焦点条件（为true时执行焦点操作）
 * @param selector - CSS选择器或HTMLElement
 * @param delay - 延迟聚焦时间（毫秒）
 */
export function useFocusManagement(
  condition: boolean,
  selector: string | HTMLElement | null,
  delay: number = 0
) {
  useEffect(() => {
    if (!condition || !selector) return;

    const timeoutId = setTimeout(() => {
      let element: HTMLElement | null = null;

      if (typeof selector === 'string') {
        element = document.querySelector(selector);
      } else if (selector instanceof HTMLElement) {
        element = selector;
      }

      if (element) {
        element.focus();
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [condition, selector, delay]);
}
