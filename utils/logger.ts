/**
 * Muse Logger - 日志工具
 * 根据全局配置的 debugMode 和 logLevel 控制日志输出
 */

import { getGlobalConfig } from '../config/global';

type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

// 日志级别优先级映射
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

// 日志级别对应的方法优先级
const LOG_METHOD_PRIORITY = {
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

// 配置缓存
interface CachedConfig {
  debugMode: boolean;
  logLevel: LogLevel;
  timestamp: number;
}

let configCache: CachedConfig | null = null;
const CACHE_TTL = 5000; // 缓存5秒，避免频繁读取配置

/**
 * 获取缓存配置或从存储中读取
 */
async function getConfig(): Promise<CachedConfig> {
  const now = Date.now();

  // 如果缓存有效，直接返回
  if (configCache && now - configCache.timestamp < CACHE_TTL) {
    return configCache;
  }

  // 从存储中读取配置
  const config = await getGlobalConfig();
  configCache = {
    debugMode: config.features.debugMode,
    logLevel: config.features.logLevel,
    timestamp: now,
  };

  return configCache;
}

/**
 * 判断是否应该输出日志
 */
function shouldLog(methodLevel: keyof typeof LOG_METHOD_PRIORITY, config: CachedConfig): boolean {
  // 如果 logLevel 是 none，不输出任何日志
  if (config.logLevel === 'none') {
    return false;
  }

  const configuredPriority = LOG_LEVEL_PRIORITY[config.logLevel];
  const methodPriority = LOG_METHOD_PRIORITY[methodLevel];

  return methodPriority <= configuredPriority;
}

/**
 * 格式化日志消息
 */
function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString();
  const prefix = configCache?.debugMode
    ? `[${timestamp}] [${level.toUpperCase()}]`
    : `[${level.toUpperCase()}]`;
  return `${prefix} ${message}`;
}

/**
 * 清除配置缓存（用于配置更新后强制刷新）
 */
export function clearLoggerCache(): void {
  configCache = null;
}

/**
 * 日志工具对象
 */
export const logger = {
  /**
   * 输出错误日志
   * 适用于：程序错误、异常情况、关键失败
   */
  async error(message: string, ...args: any[]): Promise<void> {
    try {
      const config = await getConfig();
      if (shouldLog('error', config)) {
        console.error(formatMessage('error', message), ...args);
      }
    } catch (err) {
      // 日志系统本身出错时，降级到 console
      console.error('[LOGGER ERROR]', message, ...args);
    }
  },

  /**
   * 输出警告日志
   * 适用于：潜在问题、不推荐的操作、可恢复的异常
   */
  async warn(message: string, ...args: any[]): Promise<void> {
    try {
      const config = await getConfig();
      if (shouldLog('warn', config)) {
        console.warn(formatMessage('warn', message), ...args);
      }
    } catch (err) {
      console.warn('[LOGGER WARN]', message, ...args);
    }
  },

  /**
   * 输出信息日志
   * 适用于：一般信息、操作流程、状态变更
   */
  async info(message: string, ...args: any[]): Promise<void> {
    try {
      const config = await getConfig();
      if (shouldLog('info', config)) {
        console.info(formatMessage('info', message), ...args);
      }
    } catch (err) {
      console.info('[LOGGER INFO]', message, ...args);
    }
  },

  /**
   * 输出调试日志
   * 适用于：详细调试信息、性能数据、内部状态
   */
  async debug(message: string, ...args: any[]): Promise<void> {
    try {
      const config = await getConfig();
      // debug 级别额外检查 debugMode
      if (config.debugMode && shouldLog('debug', config)) {
        console.log(formatMessage('debug', message), ...args);
      }
    } catch (err) {
      console.log('[LOGGER DEBUG]', message, ...args);
    }
  },

  /**
   * 同步版本的错误日志（用于无法使用 async 的场景）
   * 注意：同步版本使用缓存配置，可能不是最新值
   */
  errorSync(message: string, ...args: any[]): void {
    if (configCache && shouldLog('error', configCache)) {
      console.error(formatMessage('error', message), ...args);
    } else if (!configCache) {
      // 如果没有缓存，降级输出
      console.error(message, ...args);
    }
  },

  /**
   * 同步版本的警告日志
   */
  warnSync(message: string, ...args: any[]): void {
    if (configCache && shouldLog('warn', configCache)) {
      console.warn(formatMessage('warn', message), ...args);
    } else if (!configCache) {
      console.warn(message, ...args);
    }
  },

  /**
   * 同步版本的信息日志
   */
  infoSync(message: string, ...args: any[]): void {
    if (configCache && shouldLog('info', configCache)) {
      console.info(formatMessage('info', message), ...args);
    } else if (!configCache) {
      console.info(message, ...args);
    }
  },

  /**
   * 同步版本的调试日志
   */
  debugSync(message: string, ...args: any[]): void {
    if (configCache && configCache.debugMode && shouldLog('debug', configCache)) {
      console.log(formatMessage('debug', message), ...args);
    } else if (!configCache) {
      console.log(message, ...args);
    }
  },
};

/**
 * 默认导出
 */
export default logger;
