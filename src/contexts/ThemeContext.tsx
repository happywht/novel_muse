/**
 * ThemeContext - 主题上下文
 *
 * 提供主题切换和管理的全局状态
 * Provides global state for theme switching and management
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeContextValue, ThemeMode, SystemPreferences } from '@/types/theme';
import { themes, THEME_STORAGE_KEY } from '@/styles/themes';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * useTheme Hook
 *
 * 获取主题上下文
 *
 * @example
 * ```tsx
 * const { theme, mode, resolvedMode, setTheme, toggleTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

/**
 * 检测系统颜色偏好
 */
function detectSystemColorScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark'; // 默认深色
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return mediaQuery.matches ? 'dark' : 'light';
}

/**
 * 从localStorage读取保存的主题偏好
 */
function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
      return saved as ThemeMode;
    }
  } catch (error) {
    console.warn('Failed to read theme preference from localStorage:', error);
  }

  return 'system';
}

/**
 * 保存主题偏好到localStorage
 */
function saveThemePreference(mode: ThemeMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save theme preference to localStorage:', error);
  }
}

/**
 * ThemeProvider - 主题提供者
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="system">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    // 优先使用保存的偏好，否则使用默认值
    return getSavedTheme() || defaultTheme;
  });

  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() => {
    const saved = getSavedTheme() || defaultTheme;
    if (saved === 'system') {
      return detectSystemColorScheme();
    }
    return saved === 'system' ? 'dark' : saved;
  });

  // 监听系统主题变化
  useEffect(() => {
    if (mode !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedMode(e.matches ? 'dark' : 'light');
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
  }, [mode]);

  // 应用主题到DOM
  useEffect(() => {
    const root = document.documentElement;

    // 移除旧的主题类
    root.classList.remove('light', 'dark');

    // 添加新的主题类
    root.classList.add(resolvedMode);

    // 更新data-theme属性（用于CSS选择器）
    root.setAttribute('data-theme', resolvedMode);

    // 更新meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedMode === 'dark' ? '#0f172a' : '#ffffff'
      );
    }
  }, [resolvedMode]);

  // 设置主题模式
  const setTheme = (newMode: ThemeMode) => {
    setModeState(newMode);
    saveThemePreference(newMode);

    // 立即更新resolvedMode（除非是system模式）
    if (newMode === 'system') {
      setResolvedMode(detectSystemColorScheme());
    } else {
      setResolvedMode(newMode);
    }
  };

  // 切换主题（light ↔ dark）
  const toggleTheme = () => {
    if (mode === 'system') {
      // 如果当前是system，切换到相反的明确主题
      const newMode: ThemeMode = resolvedMode === 'dark' ? 'light' : 'dark';
      setTheme(newMode);
    } else {
      // 在light和dark之间切换
      const newMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
      setTheme(newMode);
    }
  };

  const theme = themes[resolvedMode];

  const value: ThemeContextValue = {
    theme,
    mode,
    resolvedMode,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * withTheme HOC
 *
 * 高阶组件方式使用主题
 *
 * @example
 * ```tsx
 * const MyComponent = withTheme(({ theme, mode }) => {
 *   return <div style={{ color: theme.colors.text.PRIMARY }}>Hello</div>;
 * });
 * ```
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P & { theme: ThemeContextValue }>
) {
  return function WithThemeComponent(props: P) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
}
