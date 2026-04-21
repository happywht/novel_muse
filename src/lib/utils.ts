/**
 * Utility Functions
 * 工具函数
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn - Class Name Merger
 *
 * 智能合并Tailwind CSS类名
 * Intelligently merge Tailwind CSS class names
 *
 * @example
 * ```tsx
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 * cn('text-red-500', someCondition && 'text-blue-500') // => 条件合并
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * formatNumber - 格式化数字
 *
 * @example
 * ```tsx
 * formatNumber(1234) // => '1,234'
 * formatNumber(1234567, { decimals: 2 }) // => '1,234,567.00'
 * ```
 */
export function formatNumber(
  num: number,
  options: { decimals?: number; locale?: string } = {}
): string {
  const { decimals = 0, locale = 'zh-CN' } = options;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * formatDate - 格式化日期
 *
 * @example
 * ```tsx
 * formatDate(new Date()) // => '2026年4月20日'
 * formatDate(new Date(), { format: 'short' }) // => '2026/4/20'
 * ```
 */
export function formatDate(
  date: Date,
  options: { format?: 'full' | 'long' | 'medium' | 'short'; locale?: string } = {}
): string {
  const { format = 'long', locale = 'zh-CN' } = options;

  const formats = {
    full: Intl.DateTimeFormat.FULL,
    long: 'long' as const,
    medium: 'medium' as const,
    short: 'short' as const,
  };

  return new Intl.DateTimeFormat(locale, {
    dateStyle: formats[format],
  }).format(date);
}

/**
 * debounce - 防抖函数
 *
 * @example
 * ```tsx
 * const debouncedSearch = debounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * throttle - 节流函数
 *
 * @example
 * ```tsx
 * const throttledScroll = throttle(() => {
 *   handleScroll();
 * }, 100);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * clamp - 数值限制
 *
 * @example
 * ```tsx
 * clamp(5, 0, 10) // => 5
 * clamp(-5, 0, 10) // => 0
 * clamp(15, 0, 10) // => 10
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * randomId - 生成随机ID
 *
 * @example
 * ```tsx
 * randomId() // => 'a1b2c3d4'
 * randomId(8) // => 'e5f6g7h8'
 * ```
 */
export function randomId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * getInitials - 获取名称首字母
 *
 * @example
 * ```tsx
 * getInitials('John Doe') // => 'JD'
 * getInitials('张三') // => '张'
 * ```
 */
export function getInitials(name: string, maxLength: number = 2): string {
  const words = name.trim().split(/\s+/);
  const initials = words.map(word => word.charAt(0).toUpperCase());
  return initials.slice(0, maxLength).join('');
}

/**
 * truncate - 截断文本
 *
 * @example
 * ```tsx
 * truncate('Long text', 5) // => 'Long ...'
 * truncate('Short', 10) // => 'Short'
 * ```
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * sleep - 异步等待
 *
 * @example
 * ```tsx
 * await sleep(1000); // 等待1秒
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * copyToClipboard - 复制到剪贴板
 *
 * @example
 * ```tsx
 * await copyToClipboard('Text to copy');
 * ```
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * downloadFile - 下载文件
 *
 * @example
 * ```tsx
 * downloadFile('content', 'filename.txt', 'text/plain');
 * ```
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * formatDateRelative - 相对日期格式化
 *
 * @example
 * ```tsx
 * formatDateRelative(new Date(Date.now() - 3600000)) // => '1小时前'
 * ```
 */
export function formatDateRelative(date: Date, locale: string = 'zh-CN'): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return rtf.format(-minutes, 'minute');
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return rtf.format(-hours, 'hour');
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return rtf.format(-days, 'day');
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return rtf.format(-months, 'month');
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return rtf.format(-years, 'year');
  }
}

/**
 * isEmail - 验证邮箱格式
 */
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * isUrl - 验证URL格式
 */
export function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * hexToRgb - 十六进制转RGB
 *
 * @example
 * ```tsx
 * hexToRgb('#8b5cf6') // => { r: 139, g: 92, b: 246 }
 * ```
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * rgbToHex - RGB转十六进制
 *
 * @example
 * ```tsx
 * rgbToHex(139, 92, 246) // => '#8b5cf6'
 * ```
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * getContrastColor - 获取对比色（黑/白）
 *
 * @example
 * ```tsx
 * getContrastColor('#ffffff') // => 'black'
 * getContrastColor('#000000') // => 'white'
 * ```
 */
export function getContrastColor(hexColor: string): 'black' | 'white' {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 'black';

  // 计算亮度
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? 'black' : 'white';
}
