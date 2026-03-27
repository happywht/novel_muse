import localforage from 'localforage';

// Initialize localforage
localforage.config({
    name: 'novel_muse_store',
    storeName: 'app_state',
    description: 'Persistent storage for user novel projects and settings'
});

export const STORAGE_KEYS = {
    PROJECTS: 'muse_projects',
    GEMINI_API_KEY: 'muse_gemini_api_key',
    GLM_API_KEY: 'muse_glm_api_key', // Future proofing
    MODEL_OVERRIDE: 'muse_model_override',
    SETTINGS: 'muse_settings',
    GLOBAL_CONFIG: 'muse_global_config', // 全局配置

    // 高级版专属存储键
    CUSTOM_PROMPTS: 'muse_custom_prompts',           // 自定义prompt库
    PROMPT_VERSIONS: 'muse_prompt_versions',         // prompt版本历史
    CALL_HISTORY: 'muse_call_history',               // AI调用确认历史
    CALL_CONFIRMATION_CACHE: 'muse_call_confirmation_cache', // 调用确认缓存
};

/**
 * Enhanced Storage Service using IndexedDB (via localforage)
 * Resolves the 5MB limit of LocalStorage.
 */
export const storageService = {
    /**
     * Get item from storage
     */
    async getItem<T>(key: string): Promise<T | null> {
        return await localforage.getItem<T>(key);
    },

    /**
     * Set item in storage
     */
    async setItem<T>(key: string, value: T): Promise<T> {
        return await localforage.setItem(key, value);
    },

    /**
     * Remove item from storage
     */
    async removeItem(key: string): Promise<void> {
        return await localforage.removeItem(key);
    },

    /**
     * Clear all storage (Use with caution)
     */
    async clear(): Promise<void> {
        return await localforage.clear();
    },

    /**
     * Key migration helper: Checks if data exists in localStorage and moves it to IndexedDB
     */
    async migrateFromLocalStorage(key: string): Promise<boolean> {
        const legacyData = localStorage.getItem(key);
        if (legacyData) {
            try {
                const parsed = JSON.parse(legacyData);
                await this.setItem(key, parsed);
                console.log(`📦 Successfully migrated ${key} from LocalStorage to IndexedDB.`);
                // Note: We don't remove immediately here for safety; cleanup happens after app confirms load
                return true;
            } catch (e) {
                console.error(`❌ Failed to migrate ${key} during parsing:`, e);
            }
        }
        return false;
    },

    /**
     * Cleanup legacy localStorage data
     */
    removeLegacyItem(key: string): void {
        localStorage.removeItem(key);
        console.log(`🧹 Cleaned up legacy LocalStorage key: ${key}`);
    }
};
