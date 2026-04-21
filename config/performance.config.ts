/**
 * Performance Configuration
 *
 * 性能监控和优化系统配置文件
 *
 * @module config/performance.config
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import { OptimizationConfig } from '@/services/performance';

/**
 * Core Web Vitals 阈值配置
 */
export const PERFORMANCE_THRESHOLDS = {
  // LCP (Largest Contentful Paint) - 最大内容绘制
  lcp: {
    excellent: 2000,  // 2秒内为优秀
    good: 2500,       // 2.5秒内为良好
    poor: 4000,       // 4秒后为较差
  },

  // FID (First Input Delay) - 首次输入延迟
  fid: {
    excellent: 50,    // 50毫秒内为优秀
    good: 100,        // 100毫秒内为良好
    poor: 300,        // 300毫秒后为较差
  },

  // CLS (Cumulative Layout Shift) - 累积布局偏移
  cls: {
    excellent: 0.05,  // 0.05以内为优秀
    good: 0.1,        // 0.1以内为良好
    poor: 0.25,       // 0.25以后为较差
  },

  // FCP (First Contentful Paint) - 首次内容绘制
  fcp: {
    excellent: 1000,  // 1秒内为优秀
    good: 1800,       // 1.8秒内为良好
    poor: 3000,       // 3秒后为较差
  },

  // TTFB (Time to First Byte) - 首字节时间
  ttfb: {
    excellent: 400,   // 400毫秒内为优秀
    good: 800,        // 800毫秒内为良好
    poor: 1800,       // 1.8秒后为较差
  },
} as const;

/**
 * 性能监控配置
 */
export const PERFORMANCE_MONITORING_CONFIG = {
  // 是否自动启动监控
  autoStart: true,

  // 更新间隔(毫秒)
  updateInterval: 5000,

  // 是否在组件卸载时停止监控
  stopOnUnmount: false,

  // 是否启用调试日志
  debug: process.env.NODE_ENV === 'development',

  // 性能数据保存配置
  storage: {
    // 是否保存历史数据
    enabled: true,

    // 最大保存条数
    maxSize: 100,

    // 存储键名
    key: 'performance-history',
  },

  // 上报配置
  reporting: {
    // 是否启用自动上报
    enabled: false,

    // 上报端点
    endpoint: '/api/performance/report',

    // 上报间隔(毫秒)
    interval: 30000, // 30秒
  },
} as const;

/**
 * 性能优化配置
 */
export const PERFORMANCE_OPTIMIZATION_CONFIG: OptimizationConfig = {
  // 代码分割策略
  codeSplitting: {
    // 启用路由分割
    routeBased: true,

    // 启用组件分割
    componentBased: true,

    // 自定义分割策略
    customStrategies: [
      {
        name: 'character-module',
        lazy: true,
        priority: 'low' as const,
        preloadWhen: () => {
          // 当导航到角色页面时预加载
          return window.location.pathname.includes('/character');
        },
      },
      {
        name: 'plot-module',
        lazy: true,
        priority: 'low' as const,
        preloadWhen: () => {
          return window.location.pathname.includes('/plot');
        },
      },
      {
        name: 'world-module',
        lazy: true,
        priority: 'low' as const,
        preloadWhen: () => {
          return window.location.pathname.includes('/world');
        },
      },
    ],
  },

  // 资源优化配置
  resources: {
    // 启用图片懒加载
    lazyImages: true,

    // 占位图片
    placeholderImage: '/images/placeholder.svg',

    // 启用响应式图片
    responsiveImages: true,

    // 图片质量 (0-100)
    imageQuality: 85,

    // 启用WebP格式
    enableWebP: true,
  },

  // 缓存策略
  caching: {
    // 启用Service Worker
    enableServiceWorker: true,

    // 缓存策略
    strategy: 'networkFirst' as const,

    // 缓存过期时间(秒)
    maxAge: 3600, // 1小时
  },

  // 预加载配置
  preloading: {
    // 预加载域名
    domains: [
      'cdn.example.com',
    ],

    // 预连接资源
    preconnectTo: [
      'https://api.example.com',
      'https://cdn.example.com',
    ],

    // 预加载资源
    prefetch: [
      '/api/config',
      '/fonts/main-font.woff2',
    ],
  },
};

/**
 * 图片优化配置
 */
export const IMAGE_OPTIMIZATION_CONFIG = {
  // 支持的图片格式
  formats: ['webp', 'jpeg', 'png', 'avif'],

  // 默认图片质量
  defaultQuality: 85,

  // 响应式图片断点
  breakpoints: [640, 768, 1024, 1280, 1536],

  // 图片尺寸配置
  sizes: {
    thumbnail: { width: 150, height: 150, quality: 70 },
    small: { width: 400, height: 300, quality: 80 },
    medium: { width: 800, height: 600, quality: 85 },
    large: { width: 1200, height: 900, quality: 90 },
    xlarge: { width: 1920, height: 1440, quality: 95 },
  },

  // 懒加载配置
  lazyLoad: {
    rootMargin: '50px',
    threshold: 0.01,
  },
} as const;

/**
 * 懒加载配置
 */
export const LAZY_LOAD_CONFIG = {
  // 默认根边距
  defaultRootMargin: '50px',

  // 默认阈值
  defaultThreshold: 0.1,

  // 是否仅触发一次
  triggerOnce: true,

  // 不同组件的特定配置
  components: {
    'chart': {
      rootMargin: '100px',
      threshold: 0.05,
    },
    'image': {
      rootMargin: '50px',
      threshold: 0.01,
    },
    'data-table': {
      rootMargin: '200px',
      threshold: 0.1,
    },
  },
} as const;

/**
 * 防抖和节流配置
 */
export const THROTTLE_CONFIG = {
  // 搜索输入防抖延迟
  searchDebounce: 300,

  // 滚动事件节流延迟
  scrollThrottle: 100,

  // 窗口大小调整防抖延迟
  resizeDebounce: 200,

  // 鼠标移动节流延迟
  mouseMoveThrottle: 50,

  // API调用防抖延迟
  apiDebounce: 500,
} as const;

/**
 * 性能预算配置
 */
export const PERFORMANCE_BUDGET = {
  // JavaScript bundle大小限制
  javascript: {
    // 初始bundle
    initial: 200 * 1024, // 200KB

    // 单个chunk
    chunk: 50 * 1024, // 50KB

    // 总大小
    total: 500 * 1024, // 500KB
  },

  // CSS bundle大小限制
  css: {
    initial: 30 * 1024, // 30KB
    total: 100 * 1024,  // 100KB
  },

  // 图片大小限制
  images: {
    single: 200 * 1024, // 200KB
    total: 1000 * 1024, // 1MB
  },

  // 字体大小限制
  fonts: {
    single: 50 * 1024, // 50KB
    total: 200 * 1024, // 200KB
  },

  // 资源数量限制
  resources: {
    scripts: 10,
    stylesheets: 5,
    fonts: 3,
    images: 20,
  },
} as const;

/**
 * 性能评分权重配置
 */
export const PERFORMANCE_SCORE_WEIGHTS = {
  // 各指标在总评分中的权重
  lcp: 0.3,    // LCP占30%
  fid: 0.25,   // FID占25%
  cls: 0.25,   // CLS占25%
  fcp: 0.15,   // FCP占15%
  ttfb: 0.05,  // TTFB占5%
} as const;

/**
 * 性能优化建议配置
 */
export const PERFORMANCE_RECOMMENDATIONS = {
  // 是否启用自动建议
  enabled: true,

  // 建议最小阈值（低于此值才显示建议）
  minScore: 70,

  // 建议类型
  types: {
    // 图片优化建议
    images: {
      enabled: true,
      slowThreshold: 1000, // 超过1秒显示建议
    },

    // JavaScript优化建议
    javascript: {
      enabled: true,
      longTaskThreshold: 50, // 超过50ms显示建议
    },

    // 网络优化建议
    network: {
      enabled: true,
      slowResourceThreshold: 1000, // 超过1秒显示建议
    },

    // 缓存优化建议
    caching: {
      enabled: true,
      cacheMissThreshold: 5, // 超过5个资源未缓存显示建议
    },
  },
} as const;

/**
 * 导出所有配置
 */
export const PERFORMANCE_CONFIG = {
  thresholds: PERFORMANCE_THRESHOLDS,
  monitoring: PERFORMANCE_MONITORING_CONFIG,
  optimization: PERFORMANCE_OPTIMIZATION_CONFIG,
  image: IMAGE_OPTIMIZATION_CONFIG,
  lazyLoad: LAZY_LOAD_CONFIG,
  throttle: THROTTLE_CONFIG,
  budget: PERFORMANCE_BUDGET,
  weights: PERFORMANCE_SCORE_WEIGHTS,
  recommendations: PERFORMANCE_RECOMMENDATIONS,
} as const;

/**
 * 配置类型导出
 */
export type PerformanceThresholdsType = typeof PERFORMANCE_THRESHOLDS;
export type MonitoringConfigType = typeof PERFORMANCE_MONITORING_CONFIG;
export type OptimizationConfigType = typeof PERFORMANCE_OPTIMIZATION_CONFIG;
export type ImageOptimizationConfigType = typeof IMAGE_OPTIMIZATION_CONFIG;
export type LazyLoadConfigType = typeof LAZY_LOAD_CONFIG;
export type ThrottleConfigType = typeof THROTTLE_CONFIG;
export type PerformanceBudgetType = typeof PERFORMANCE_BUDGET;
export type ScoreWeightsType = typeof PERFORMANCE_SCORE_WEIGHTS;
export type RecommendationsConfigType = typeof PERFORMANCE_RECOMMENDATIONS;