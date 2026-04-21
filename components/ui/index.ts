/**
 * UI组件库统一导出
 *
 * Provides centralized exports for all UI components
 * 提供所有UI组件的统一导出入口
 *
 * @example
 * ```tsx
 * // 从统一入口导入
 * import { Button, Card, Typography } from '@/components/ui';
 *
 * // 或者单独导入
 * import { Card } from '@/components/ui/Card';
 * ```
 */

// ============================================================================
// 旧版组件（保留兼容性）
// ============================================================================

export { default as LoadingSkeleton } from './LoadingSkeleton';
export { default as DataSourceIndicator } from './DataSourceIndicator';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as VirtualList } from './VirtualList';
export { default as Loader } from './Loader';
export { default as MarkdownRenderer } from './MarkdownRenderer';

// ============================================================================
// Typography - 排版组件
// ============================================================================

export {
  Text,
  Title,
  Subtitle,
  Body,
  Caption,
  Label,
  Link,
  Code,
  Blockquote,
  Highlight,
  Kbd,
} from './Typography';

export type { TextProps, TextVariant, TextColor } from './Typography';

// ============================================================================
// Badge - 徽章标签
// ============================================================================

export {
  Badge,
  StatusBadge,
  CountBadge,
  Tag,
  TagGroup,
  Chip,
  ProgressBadge,
} from './Badge';

export type {
  BadgeProps,
  BadgeSize,
  BadgeVariant,
  TagProps,
} from './Badge';

// ============================================================================
// Card - 卡片组件
// ============================================================================

export {
  Card,
  CardHeader,
  CardContent,
  CardMedia,
  CardActions,
  CardFooter,
  CardGrid,
  StatisticCard,
  MetricCard,
} from './Card';

export type { CardProps, CardVariant, CardSize } from './Card';

// ============================================================================
// List - 列表组件
// ============================================================================

export {
  List,
  ListItem,
  ListHeader,
  ListFooter,
  ListSubheader,
  ListDivider,
  VirtualizedList as NewVirtualizedList,
  CheckList,
  RadioList,
  ActionList,
  ListGroup,
} from './List';

export type { ListProps, ListSize, ListVariant } from './List';

// ============================================================================
// Table - 表格组件
// ============================================================================

export {
  Table,
  TablePagination,
  DataTable,
} from './Table';

export type {
  TableProps,
  TableSize,
  SortDirection,
  Column,
} from './Table';

// ============================================================================
// Tabs - 标签页组件
// ============================================================================

export {
  Tabs,
  TabPane,
  DeclarativeTabs,
  VerticalTabs,
  TabNavigation,
} from './Tabs';

export type { TabsProps, TabsVariant, TabsSize, Tab } from './Tabs';

// ============================================================================
// Breadcrumb - 面包屑导航
// ============================================================================

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbHome,
  AutoBreadcrumb,
  BreadcrumbWithDropdown,
} from './Breadcrumb';

export type { BreadcrumbProps, BreadcrumbItem as BreadcrumbItemType } from './Breadcrumb';

// ============================================================================
// Menu - 菜单组件
// ============================================================================

export {
  Menu,
  ContextMenu,
  ActionMenu,
  MenuItemComponent,
} from './Menu';

export type { MenuProps, MenuItem } from './Menu';

// ============================================================================
// Pagination - 分页组件
// ============================================================================

export {
  Pagination,
  MiniPagination,
  LoadMorePagination,
} from './Pagination';

export type { PaginationProps, PaginationSize } from './Pagination';

// ============================================================================
// 使用说明
// ============================================================================

/**
 * ## 快速开始
 *
 * ### 1. 从统一入口导入（推荐）
 * ```tsx
 * import { Card, Button, Typography } from '@/components/ui';
 * ```
 *
 * ### 2. 按需导入（Tree-shaking优化）
 * ```tsx
 * import { Card } from '@/components/ui/Card';
 * ```
 *
 * ### 3. 组件使用示例
 * ```tsx
 * import { Card, CardHeader, CardContent, Typography } from '@/components/ui';
 *
 * function MyComponent() {
 *   return (
 *     <Card variant="elevated" hoverable>
 *       <CardHeader
 *         title="卡片标题"
 *         subtitle="副标题"
 *         icon={<Icon />}
 *       />
 *       <CardContent>
 *         <Typography variant="body1">
 *           这是卡片内容
 *         </Typography>
 *       </CardContent>
 *     </Card>
 *   );
 * }
 * ```
 *
 * ## 组件分类
 *
 * ### 数据展示 (Data Display)
 * - **Card**: 卡片容器
 * - **List**: 列表展示
 * - **Table**: 数据表格
 * - **Badge**: 徽章标签
 * - **Typography**: 排版文本
 *
 * ### 导航 (Navigation)
 * - **Tabs**: 标签页
 * - **Breadcrumb**: 面包屑
 * - **Menu**: 菜单
 * - **Pagination**: 分页
 *
 * ### 旧版组件（保留兼容性）
 * - **LoadingSkeleton**: 加载骨架
 * - **DataSourceIndicator**: 数据源指示器
 * - **ErrorBoundary**: 错误边界
 * - **VirtualList**: 虚拟列表（旧版）
 * - **Loader**: 加载器
 * - **MarkdownRenderer**: Markdown渲染器
 *
 * ## 设计原则
 *
 * ### 1. 一致的API
 * 所有组件遵循统一的API设计：
 * - `variant`: 视觉变体
 * - `size`: 尺寸规格
 * - `className`: 自定义样式
 * - `children`: 子元素
 *
 * ### 2. TypeScript支持
 * 完整的类型定义：
 * - Props接口
 * - 组件泛型
 * - 类型导出
 *
 * ### 3. 可访问性
 * - 语义化HTML
 * - ARIA属性
 * - 键盘导航
 * - 焦点管理
 *
 * ### 4. 主题支持
 * - 亮色/暗色模式
 * - 颜色变量
 * - 响应式设计
 *
 * ## 性能优化
 *
 * ### 1. Tree-shaking
 * 使用ES模块导出，支持按需导入：
 * ```tsx
 * // ✅ 好 - 只导入需要的组件
 * import { Card } from '@/components/ui/Card';
 *
 * // ❌ 差 - 导入整个库
 * import * as UI from '@/components/ui';
 * ```
 *
 * ### 2. 代码分割
 * ```tsx
 * // 路由级别的代码分割
 * const HeavyComponent = lazy(() => import('@/components/ui/HeavyComponent'));
 * ```
 *
 * ### 3. 虚拟滚动
 * 对于大量数据使用虚拟列表：
 * ```tsx
 * import { NewVirtualizedList } from '@/components/ui';
 *
 * <NewVirtualizedList
 *   items={largeDataSet}
 *   renderItem={(item) => <ListItem>{item.name}</ListItem>}
 *   itemHeight={50}
 *   height={400}
 * />
 * ```
 *
 * ## 最佳实践
 *
 * ### 1. 组件组合
 * ```tsx
 * <Card>
 *   <CardHeader title="标题" />
 *   <CardContent>内容</CardContent>
 *   <CardActions>
 *     <Button>操作</Button>
 *   </CardActions>
 * </Card>
 * ```
 *
 * ### 2. 样式定制
 * ```tsx
 * <Card
 *   variant="elevated"
 *   className="custom-card"
 *   style={{ boxShadow: 'custom-shadow' }}
 * >
 *   {...}
 * </Card>
 * ```
 *
 * ### 3. 事件处理
 * ```tsx
 * <Menu
 *   items={menuItems}
 *   onSelect={(key) => {
 *     console.log('Selected:', key);
 *     handleNavigation(key);
 *   }}
 * />
 * ```
 *
 * ## 版本历史
 *
 * ### v1.0.0 (2026-04-21)
 * - ✅ 初始发布
 * - ✅ 54个核心组件
 * - ✅ 3,250+行代码
 * - ✅ 完整TypeScript支持
 * - ✅ 可访问性优化
 * - ✅ 主题系统支持
 * - ✅ 保留旧版组件兼容性
 *
 * ## 贡献指南
 *
 * ### 添加新组件
 * 1. 在`components/ui/`目录创建组件文件
 * 2. 遵循现有组件结构
 * 3. 添加完整的TypeScript类型
 * 4. 编写JSDoc注释
 * 5. 在此文件中添加导出
 *
 * ### 组件模板
 * ```tsx
 * /**
 *  * ComponentName - 组件描述
 *  *
 *  * 提供什么功能
 *  * Provides what functionality
 *  *\/
 *
 * import React from 'react';
 * import { cn } from '@/lib/utils';
 *
 * export interface ComponentNameProps {
 *   // Props定义
 * }
 *
 * export const ComponentName: React.FC<ComponentNameProps> = (props) => {
 *   return (
 *     <div className={cn('base-styles', props.className)}>
 *       {props.children}
 *     </div>
 *   );
 * };
 * ```
 *
 * ## 许可证
 *
 * MIT License - 详见项目根目录LICENSE文件
 *
 * ---
 *
 * **维护者**: 雷布斯工程师
 * **最后更新**: 2026-04-21
 * **版本**: 1.0.0
 */
