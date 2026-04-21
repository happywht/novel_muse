# 主题系统使用指南

> **版本**: 1.0.0
> **更新日期**: 2026-04-20
> **状态**: ✅ 生产就绪

---

## 🎨 主题系统概述

### 支持的主题模式

1. **亮色主题（Light）** - 明亮清爽的界面
2. **深色主题（Dark）** - 护眼深色界面（默认）
3. **跟随系统（System）** - 自动切换主题

### 核心特性

- ✅ **自动保存** - 用户偏好保存在localStorage
- ✅ **系统检测** - 自动检测系统颜色偏好
- ✅ **平滑过渡** - 主题切换动画流畅
- ✅ **完整样式** - 包含颜色、字体、阴影等
- ✅ **类型安全** - 完整的TypeScript支持

---

## 🚀 快速开始

### 1. 集成ThemeProvider

在应用根组件包裹ThemeProvider：

```tsx
import { ThemeProvider } from '@/contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. 使用useTheme Hook

在任何组件中使用主题：

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, mode, resolvedMode, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>当前模式: {mode}</p>
      <p>解析模式: {resolvedMode}</p>
      <button onClick={toggleTheme}>切换主题</button>
    </div>
  );
}
```

### 3. 使用主题切换组件

#### 简单切换按钮
```tsx
import { ThemeToggle } from '@/components/ui/ThemeToggle';

<ThemeToggle />
```

#### 完整选择器
```tsx
import { ThemeSwitcher } from '@/components/ui/ThemeToggle';

<ThemeSwitcher />
```

#### 紧凑型切换
```tsx
import { ThemeToggleCompact } from '@/components/ui/ThemeToggle';

<ThemeToggleCompact />
```

---

## 🎨 主题颜色使用

### CSS变量方式

```css
.my-component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
```

### Tailwind类名方式

```tsx
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
  内容
</div>
```

### JavaScript对象方式

```tsx
const style = {
  backgroundColor: theme.colors.background.DEFAULT,
  color: theme.colors.text.PRIMARY,
  border: `1px solid ${theme.colors.border.DEFAULT}`,
};
```

---

## 🎯 主题API参考

### useTheme Hook

返回值：
```typescript
{
  theme: Theme;           // 当前主题对象
  mode: ThemeMode;       // 用户选择模式
  resolvedMode: 'light' | 'dark';  // 实际应用模式
  setTheme: (mode) => void;        // 设置主题
  toggleTheme: () => void;         // 切换主题
}
```

### Theme对象结构

```typescript
interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
}
```

---

## 💡 使用示例

### 示例1：条件渲染

```tsx
const { resolvedMode } = useTheme();

return (
  <div className={resolvedMode === 'dark' ? 'dark-component' : 'light-component'}>
    内容
  </div>
);
```

### 示例2：动态样式

```tsx
const { theme } = useTheme();

const cardStyle = {
  backgroundColor: theme.colors.background.elevated,
  color: theme.colors.text.PRIMARY,
  borderRadius: theme.borderRadius.lg,
  boxShadow: theme.shadows.md,
};
```

### 示例3：主题切换按钮组

```tsx
const { mode, setTheme } = useTheme();

return (
  <div className="flex gap-2">
    <button
      onClick={() => setTheme('light')}
      className={mode === 'light' ? 'bg-muse-600 text-white' : 'bg-slate-200'}
    >
      亮色
    </button>
    <button
      onClick={() => setTheme('dark')}
      className={mode === 'dark' ? 'bg-muse-600 text-white' : 'bg-slate-200'}
    >
      深色
    </button>
    <button
      onClick={() => setTheme('system')}
      className={mode === 'system' ? 'bg-muse-600 text-white' : 'bg-slate-200'}
    >
      跟随系统
    </button>
  </div>
);
```

### 示例4：图表主题适配

```tsx
import { useTheme } from '@/contexts/ThemeContext';
import { BarChart } from '@/components/charts';

function ThemedChart() {
  const { theme, resolvedMode } = useTheme();

  const chartColors = {
    text: theme.colors.text.PRIMARY,
    grid: theme.colors.border.DEFAULT,
    background: theme.colors.background.DEFAULT,
  };

  return (
    <BarChart
      theme={resolvedMode}
      colors={chartColors}
    />
  );
}
```

---

## 🎭 高级用法

### 1. 自定义主题颜色

扩展主题颜色：

```tsx
const { theme } = useTheme();

const customColors = {
  ...theme.colors,
  custom: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
  }
};
```

### 2. 主题切换动画

自定义切换动画：

```css
@keyframes theme-fade {
  from { opacity: 1; }
  to { opacity: 0.95; }
}

.theme-switching {
  animation: theme-fade 0.3s ease;
}
```

### 3. 组件级主题覆盖

为特定组件强制使用主题：

```tsx
function ForceLightTheme({ children }) {
  return (
    <div className="light-theme-only">
      {children}
    </div>
  );
}

/* CSS */
.light-theme-only {
  background-color: #ffffff !important;
  color: #0f172a !important;
}
```

### 4. 主题监听

监听主题变化：

```tsx
import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

function ThemeListener() {
  const { resolvedMode } = useTheme();

  useEffect(() => {
    console.log('主题已切换到:', resolvedMode);
    // 执行主题变化时的操作
  }, [resolvedMode]);

  return null;
}
```

---

## 📊 主题对比

| 特性 | 亮色主题 | 深色主题 |
|------|----------|----------|
| 背景色 | #ffffff (纯白) | #0f172a (深蓝灰) |
| 文字色 | #0f172a (深色) | #f1f5f9 (浅色) |
| 适用场景 | 白天使用 | 夜间使用 |
| 眼睛舒适度 | 一般 | 优秀 |
| 电量消耗 | 较高 | 较低（OLED） |
| 对比度 | 高 | 高 |

---

## 🔧 配置选项

### ThemeProvider Props

```typescript
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';  // 默认: 'system'
}
```

### localStorage键

```typescript
const THEME_STORAGE_KEY = 'muse-theme-preference';
```

---

## 🐛 常见问题

### Q1: 主题切换后样式没有生效？

**A**: 确保使用了Tailwind的`dark:`前缀：

```tsx
// ✅ 正确
<div className="bg-white dark:bg-slate-900">

// ❌ 错误
<div className="bg-white">
```

### Q2: 如何禁用主题切换动画？

**A**: 添加`no-transition`类：

```tsx
<div className="no-transition">
  内容
</div>
```

### Q3: 组件内部如何获取主题？

**A**: 使用`useTheme` Hook：

```tsx
const { theme, resolvedMode } = useTheme();
```

### Q4: 如何重置主题偏好？

**A**: 清除localStorage：

```typescript
localStorage.removeItem('muse-theme-preference');
```

---

## 📚 相关资源

### 文件位置
- 类型定义: `src/types/theme.ts`
- 主题配置: `src/styles/themes.ts`
- Context: `src/contexts/ThemeContext.tsx`
- 切换组件: `components/ui/ThemeToggle.tsx`
- CSS样式: `src/styles/theme.css`

### 依赖项
- React Context API
- localStorage
- Window.matchMedia API

---

## ✅ 最佳实践

### 1. 主题切换按钮位置

放在易于访问的位置：
- 顶部导航栏
- 设置面板
- 用户菜单

### 2. 主题切换时机

- 避免在表单填写过程中切换
- 提供明确的切换反馈
- 保存当前状态后再切换

### 3. 性能优化

- 使用CSS变量减少重渲染
- 避免频繁的主题切换
- 使用`useMemo`缓存计算值

### 4. 可访问性

- 提供键盘导航支持
- 添加ARIA标签
- 支持`prefers-color-scheme`

---

**朋友们，这就是完整的主题系统！现在开始使用吧！** 🌓✨

---

**最后更新**: 2026-04-20
**维护者**: 雷布斯工程师
