/**
 * React组件测试辅助工具
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { ToastProvider } from '@/hooks/useToast';

/**
 * 自定义渲染函数，包含常用Providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // 创建Wrapper组件
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return <ToastProvider>{children}</ToastProvider>;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * 等待元素出现
 */
export async function waitForElement(
  callback: () => HTMLElement | null,
  options?: { timeout?: number }
): Promise<HTMLElement> {
  const { timeout = 5000 } = options || {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = callback();
    if (element) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Element not found within ${timeout}ms`);
}

/**
 * 等待文本出现
 */
export async function waitForText(
  text: string,
  options?: { timeout?: number }
): Promise<Element> {
  const { timeout = 5000 } = options || {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(`*:contains("${text}")`);
    if (element && element.textContent?.includes(text)) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Text "${text}" not found within ${timeout}ms`);
}

/**
 * 模拟用户输入
 */
export async function typeIntoElement(
  element: HTMLElement,
  text: string,
  options?: { delay?: number }
): Promise<void> {
  const { delay = 10 } = options || {};

  for (const char of text) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value += char;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * 创建模拟的Intersection Observer
 */
export function createMockIntersectionObserver(
  callback: IntersectionObserverCallback
): IntersectionObserver {
  const mockObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: () => [],
  } as unknown as IntersectionObserver;

  return mockObserver;
}

/**
 * 设置全局mock
 */
export function setupGlobalMocks() {
  // Mock Intersection Observer
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock Resize Observer
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });

  // Mock scrollTo
  global.scrollTo = vi.fn();
}

/**
 * 清理全局mock
 */
export function cleanupGlobalMocks() {
  // 只清理可以安全删除的属性
  if ((global as any).IntersectionObserver) {
    delete (global as any).IntersectionObserver;
  }
  if ((global as any).ResizeObserver) {
    delete (global as any).ResizeObserver;
  }
  if ((global as any).scrollTo) {
    delete (global as any).scrollTo;
  }
}

/**
 * 等待加载完成
 */
export async function waitForLoadingToFinish(): Promise<void> {
  // 等待所有加载指示器消失
  const loadingSelectors = [
    '[data-testid="loading"]',
    '[data-testid="spinner"]',
    '.loading',
    '.spinner',
  ];

  for (const selector of loadingSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 额外等待以确保所有异步操作完成
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * 模拟网络延迟
 */
export async function simulateNetworkDelay(ms: number = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查元素是否在视口中
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 滚动元素到视口中
 */
export function scrollElementIntoView(element: HTMLElement): void {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * 模拟拖拽
 */
export async function simulateDrag(
  source: HTMLElement,
  target: HTMLElement
): Promise<void> {
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  // Mouse down on source
  source.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: sourceRect.left + sourceRect.width / 2,
      clientY: sourceRect.top + sourceRect.height / 2,
    })
  );

  await new Promise(resolve => setTimeout(resolve, 100));

  // Mouse move to target
  source.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.top + targetRect.height / 2,
    })
  );

  await new Promise(resolve => setTimeout(resolve, 100));

  // Mouse up on target
  target.dispatchEvent(
    new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.top + targetRect.height / 2,
    })
  );
}

/**
 * 等待动画完成
 */
export async function waitForAnimations(
  element?: HTMLElement,
  options?: { timeout?: number }
): Promise<void> {
  const { timeout = 5000 } = options || {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const animatedElements = element
      ? [element]
      : Array.from(document.querySelectorAll('[class*="animate"], [class*="transition"]'));

    const hasRunningAnimations = animatedElements.some((el) => {
      const styles = window.getComputedStyle(el);
      return (
        styles.animationName !== 'none' ||
        styles.animationPlayState === 'running' ||
        styles.transitionDuration !== '0s'
      );
    });

    if (!hasRunningAnimations) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Animations did not finish within ${timeout}ms`);
}

/**
 * 获取元素的文本内容（包含隐藏元素）
 */
export function getTextContent(element: HTMLElement): string {
  return element.textContent || '';
}

/**
 * 检查元素是否可见
 */
export function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * 模拟键盘按键
 */
export function simulateKeyPress(
  key: string,
  options?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  }
): void {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: options?.ctrl || false,
    shiftKey: options?.shift || false,
    altKey: options?.alt || false,
    metaKey: options?.meta || false,
    bubbles: true,
  });

  document.dispatchEvent(event);
}

/**
 * 获取所有表单数据
 */
export function getFormData(form: HTMLFormElement): Record<string, string> {
  const formData = new FormData(form);
  const data: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value as string;
  }

  return data;
}

/**
 * 等待Promise settled
 */
export async function waitForSettled(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}
