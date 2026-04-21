/**
 * 主题配置
 * Theme Configuration
 *
 * 完整的亮色/深色主题配置
 * Complete Light/Dark theme configuration
 */

import { Theme } from '@/types/theme';

/**
 * Muse品牌色（紫色系列）
 */
const museColors = {
  50: '#f4f6ff',
  100: '#eef1ff',
  200: '#e0e7ff',
  300: '#c7d2fe',
  400: '#a5b4fc',
  500: '#818cf8',
  600: '#6366f1',
  700: '#4f46e5',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
};

/**
 * 亮色主题
 */
export const lightTheme: Theme = {
  id: 'light',
  name: '亮色主题',
  mode: 'light',
  colors: {
    primary: museColors,
    background: {
      DEFAULT: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      elevated: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    text: {
      PRIMARY: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      disabled: '#cbd5e1',
      inverse: '#ffffff',
    },
    border: {
      DEFAULT: '#e2e8f0',
      light: '#f1f5f9',
      dark: '#cbd5e1',
    },
    semantic: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    status: {
      online: '#22c55e',
      offline: '#94a3b8',
      busy: '#ef4444',
      away: '#f59e0b',
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
      mono: ['"Fira Code"', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },
  borderRadius: {
    sm: '0.25rem',  // 4px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
};

/**
 * 深色主题（当前默认，优化版）
 */
export const darkTheme: Theme = {
  id: 'dark',
  name: '深色主题',
  mode: 'dark',
  colors: {
    primary: museColors,
    background: {
      DEFAULT: '#0f172a',    // slate-900
      secondary: '#1e293b',  // slate-800
      tertiary: '#334155',   // slate-700
      elevated: '#1e293b',   // 卡片背景
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    text: {
      PRIMARY: '#f1f5f9',    // slate-100
      secondary: '#cbd5e1',  // slate-300
      tertiary: '#94a3b8',   // slate-400
      disabled: '#64748b',   // slate-500
      inverse: '#0f172a',    // slate-900
    },
    border: {
      DEFAULT: '#334155',    // slate-700
      light: '#475569',      // slate-600
      dark: '#1e293b',       // slate-800
    },
    semantic: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    status: {
      online: '#22c55e',
      offline: '#64748b',
      busy: '#ef4444',
      away: '#f59e0b',
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
      mono: ['"Fira Code"', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
};

/**
 * 主题映射
 */
export const themes: Record<'light' | 'dark', Theme> = {
  light: lightTheme,
  dark: darkTheme,
};

/**
 * 默认主题（深色）
 */
export const defaultTheme = darkTheme;

/**
 * localStorage键名
 */
export const THEME_STORAGE_KEY = 'muse-theme-preference';
