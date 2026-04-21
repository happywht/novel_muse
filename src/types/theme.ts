/**
 * 主题类型定义
 * Theme Type Definitions
 */

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  // 主色调
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };

  // 背景色
  background: {
    DEFAULT: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    overlay: string;
  };

  // 文字色
  text: {
    PRIMARY: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
  };

  // 边框色
  border: {
    DEFAULT: string;
    light: string;
    dark: string;
  };

  // 语义色
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  // 状态色
  status: {
    online: string;
    offline: string;
    busy: string;
    away: string;
  };
}

/**
 * 主题配置
 */
export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: {
    fontFamily: {
      sans: string[];
      serif: string[];
      mono: string[];
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

/**
 * 主题上下文值
 */
export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

/**
 * 系统偏好检测
 */
export interface SystemPreferences {
  colorScheme: 'light' | 'dark' | 'no-preference';
  reducedMotion: boolean;
  highContrast: boolean;
}
