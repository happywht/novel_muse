import { useState, useEffect } from 'react';

/**
 * useMediaQuery Hook
 *
 * 响应式媒体查询Hook，用于检测屏幕尺寸
 * Responsive media query hook for detecting screen sizes
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 现代浏览器使用addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // 旧浏览器兼容
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

/**
 * useBreakpoint Hook
 *
 * 返回当前断点信息
 * Returns current breakpoint information
 *
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint();
 * console.log(breakpoint); // { isMobile, isTablet, isDesktop, current }
 * ```
 */
export interface BreakpointResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  current: 'mobile' | 'tablet' | 'desktop' | 'wide';
}

export function useBreakpoint(): BreakpointResult {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px) and (max-width: 1279px)');
  const isWide = useMediaQuery('(min-width: 1280px)');

  const current: BreakpointResult['current'] = isMobile
    ? 'mobile'
    : isTablet
    ? 'tablet'
    : isDesktop
    ? 'desktop'
    : 'wide';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    current,
  };
}

/**
 * useOrientation Hook
 *
 * 检测设备方向
 * Detect device orientation
 *
 * @example
 * ```tsx
 * const orientation = useOrientation();
 * console.log(orientation); // { isPortrait, isLandscape }
 * ```
 */
export interface OrientationResult {
  isPortrait: boolean;
  isLandscape: boolean;
}

export function useOrientation(): OrientationResult {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');

  return {
    isPortrait,
    isLandscape,
  };
}

/**
 * usePrefersReducedMotion Hook
 *
 * 检测用户是否偏好减少动画
 * Detect if user prefers reduced motion
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 * <div className={prefersReducedMotion ? '' : 'animate-fade-in'}>
 * ```
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * usePrefersColorScheme Hook
 *
 * 检测用户颜色偏好（亮色/深色）
 * Detect user color scheme preference (light/dark)
 *
 * @example
 * ```tsx
 * const colorScheme = usePrefersColorScheme();
 * console.log(colorScheme); // 'light' | 'dark' | 'no-preference'
 * ```
 */
export type ColorScheme = 'light' | 'dark' | 'no-preference';

export function usePrefersColorScheme(): ColorScheme {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)');

  if (prefersDark) return 'dark';
  if (prefersLight) return 'light';
  return 'no-preference';
}

/**
 * useIsTouchDevice Hook
 *
 * 检测是否为触摸设备
 * Detect if device supports touch
 *
 * @example
 * ```tsx
 * const isTouch = useIsTouchDevice();
 * ```
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}

/**
 * useViewportSize Hook
 *
 * 获取视口尺寸
 * Get viewport size
 *
 * @example
 * ```tsx
 * const { width, height } = useViewportSize();
 * ```
 */
export interface ViewportSize {
  width: number;
  height: number;
}

export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
