/**
 * 全局配置 Slice
 *
 * 管理应用全局配置，包括AI服务配置、性能配置等
 * 支持配置的动态更新和缓存管理
 */

import { StateCreator } from 'zustand';
import { DeepPartial } from '../../types';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { DEFAULT_CONFIG } from '../../config/global';
import { deepMerge } from '../utils/deepMerge';

export interface ConfigSlice {
  // 状态
  globalConfig: typeof DEFAULT_CONFIG;

  // 操作
  loadGlobalConfig: () => Promise<void>;
  updateGlobalConfig: (updates: DeepPartial<typeof DEFAULT_CONFIG>) => Promise<void>;
}

export const createConfigSlice: StateCreator<
  ConfigSlice,
  [],
  [],
  ConfigSlice
> = (set, get) => ({
  // 初始状态
  globalConfig: DEFAULT_CONFIG,

  // 加载全局配置
  loadGlobalConfig: async () => {
    try {
      const savedConfig = await storageService.getItem<typeof DEFAULT_CONFIG>(STORAGE_KEYS.GLOBAL_CONFIG);
      if (savedConfig) {
        set({ globalConfig: deepMerge(DEFAULT_CONFIG, savedConfig) });
      }
    } catch (err) {
      console.error('Failed to load global config:', err);
    }
  },

  // 更新全局配置
  updateGlobalConfig: async (updates: DeepPartial<typeof DEFAULT_CONFIG>) => {
    const currentConfig = get().globalConfig;
    const newConfig = deepMerge(currentConfig, updates);

    // 更新store状态
    set({ globalConfig: newConfig });

    // 清除core.ts中的配置缓存
    try {
      const { clearConfigCache } = await import('../../services/gemini/core');
      clearConfigCache();
    } catch (err) {
      console.warn('Failed to clear config cache:', err);
    }

    // 如果缓存配置改变，清除缓存管理器中的缓存
    if (updates.performance?.cache?.enabled === false ||
        (updates.performance?.cache?.ttl && updates.performance.cache.ttl !== currentConfig.performance.cache.ttl)) {
      try {
        const { cacheManager } = await import('../../services/cacheManager');
        cacheManager.clear();
      } catch (err) {
        console.warn('Failed to clear cache manager:', err);
      }
    }

    // 保存到storage
    await storageService.setItem(STORAGE_KEYS.GLOBAL_CONFIG, newConfig);
  },
});
