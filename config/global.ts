/**
 * Muse Global Configuration
 * Centralized configuration for all AI models, storage, performance, and features
 */

import { STORAGE_KEYS } from '../services/storageService';
import { UserTier } from './featureFlags';

// LLM任务类型枚举 - 用于任务模型覆盖配置
export type LLMTaskType =
    | 'analyzePlot'
    | 'batchGenerateSettings'
    | 'analyzeStateChanges'
    | 'deduceWorldConsequences'
    | 'auditChapterPlan'
    | 'extractEchoes'
    | 'batchGenerateCharacters'
    | 'generatePlot'
    | 'rewritePlot'
    | 'splitPlotNodeIntoChapters'
    | 'regenerateChapterOutline'
    | 'expandScene'
    | 'expandWorldLore'
    | 'polishDraft'
    | 'generateText'
    | 'scene_generation'  // NEW: Template-based scene generation
    | 'rewriteLocalText'
    | 'analyzePlotRhythm'
    | 'summarizeChapter'
    | 'extractKnowledgeTriples'
    | 'inspectLogicConflicts'
    | 'generateTwistHooks'
    | 'generateConflictScenario'
    | 'generateAIBalanceSuggestions';

export enum Provider {
    GLM = 'GLM',
    GEMINI = 'GEMINI',
}

export interface GlobalConfig {
    // 0. 用户等级（新增）
    tier: UserTier;

    // 1. AI模型配置
    ai: {
        providers: {
            gemini: {
                apiKey: string;
                flashModel: string;
                proModel: string;
                imageModel: string;
            };
            glm: {
                apiKey: string;
                model: string;
                baseUrl: string;
            };
        };
        taskModelOverrides: Partial<Record<LLMTaskType, string>>;
        defaultParams: {
            temperature: number;
            maxTokens: number;
            topP: number;
            topK: number;
        };
    };

    // 2. 存储配置
    storage: {
        backend: 'indexeddb' | 'mysql';
        autoSaveInterval: number;
        backendSync: {
            enabled: boolean;
            interval: number;
        };
    };

    // 4. 知识图谱配置
    graph: {
        neo4j: {
            uri: string;
            user: string;
            password: string;
        };
        autoSync: boolean;
        syncDebounce: number;
        echo: {
            autoApplyThreshold: number;
            retentionDays: number;
        };
    };

    // 5. 性能配置
    performance: {
        virtualScrollThreshold: number;
        debounce: {
            input: number;
            search: number;
            sync: number;
        };
        cache: {
            enabled: boolean;
            ttl: number;
        };
    };

    // 6. 功能开关
    features: {
        enableEchoSystem: boolean;
        enableKnowledgeGraph: boolean;
        enableChapterBalance: boolean;
        enableConflictVisualization: boolean;
        enableVirtualScrolling: boolean;
        debugMode: boolean;
        logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
    };

    // 7. 外观配置
    appearance: {
        theme: 'dark' | 'light' | 'auto';
        primaryColor: string;
        fontSize: 'small' | 'medium' | 'large';
        editorFont: string;
        sidebarWidth: number;
    };

    // 8. 快捷键配置
    shortcuts: {
        save: string;
        generate: string;
        sync: string;
        refreshGraph: string;
    };

    // 9. 高级版专属功能配置（新增）
    advancedFeatures: {
        promptEditor: {
            enabled: boolean;
            autoSave: boolean;
            showDiffOnSave: boolean;
        };
        callConfirmation: {
            enabled: boolean;
            showCostEstimate: boolean;
            allowEditBeforeCall: boolean;
            timeout: number; // 确认超时时间（毫秒）
        };
        callHistory: {
            enabled: boolean;
            retentionDays: number;
            maxRecords: number;
        };
    };
}

// 默认值
export const DEFAULT_CONFIG: GlobalConfig = {
    tier: 'FREE',

    ai: {
        providers: {
            gemini: {
                apiKey: '',
                flashModel: 'gemini-3-flash-preview',
                proModel: 'gemini-3-pro-preview',
                imageModel: 'gemini-2.5-flash-image',
            },
            glm: {
                apiKey: '',
                model: 'glm-4-plus',
                baseUrl: 'https://open.bigmodel.cn/api/anthropic',
            },
        },
        taskModelOverrides: {
            // 默认与llmRouter.ts保持一致
            analyzePlot: 'gemini-pro',
            batchGenerateSettings: 'gemini-pro',
            analyzeStateChanges: 'gemini-pro',
            deduceWorldConsequences: 'gemini-pro',
            auditChapterPlan: 'gemini-pro',
            extractEchoes: 'gemini-pro',
            batchGenerateCharacters: 'glm',
            generatePlot: 'glm',
            rewritePlot: 'glm',
            splitPlotNodeIntoChapters: 'glm',
            regenerateChapterOutline: 'glm',
            expandScene: 'gemini-flash',
            expandWorldLore: 'gemini-flash',
            polishDraft: 'gemini-flash',
            generateText: 'gemini-flash',
            rewriteLocalText: 'gemini-flash',
            analyzePlotRhythm: 'gemini-flash',
            summarizeChapter: 'gemini-flash',
            extractKnowledgeTriples: 'gemini-flash',
            inspectLogicConflicts: 'gemini-flash',
            generateTwistHooks: 'gemini-flash',
            generateConflictScenario: 'gemini-flash',
            generateAIBalanceSuggestions: 'gemini-pro',
        },
        defaultParams: {
            temperature: 0.8,
            maxTokens: 4000,
            topP: 0.95,
            topK: 40,
        },
    },
    storage: {
        backend: 'indexeddb',
        autoSaveInterval: 2000,
        backendSync: {
            enabled: true,
            interval: 30000,
        },
    },
    graph: {
        neo4j: {
            uri: import.meta.env.VITE_NEO4J_URI || 'bolt://localhost:7687',
            user: import.meta.env.NEO4J_USER || 'neo4j',
            password: import.meta.env.NEO4J_PASSWORD || 'password',
        },
        autoSync: true,
        syncDebounce: 2000,
        echo: {
            autoApplyThreshold: 0.8,
            retentionDays: 30,
        },
    },
    performance: {
        virtualScrollThreshold: 50,
        debounce: {
            input: 300,
            search: 500,
            sync: 2000,
        },
        cache: {
            enabled: true,
            ttl: 3600000, // 1小时
        },
    },
    features: {
        enableEchoSystem: true,
        enableKnowledgeGraph: true,
        enableChapterBalance: true,
        enableConflictVisualization: true,
        enableVirtualScrolling: true,
        debugMode: false,
        logLevel: 'warn',
    },
    appearance: {
        theme: 'dark',
        primaryColor: '#8b5cf6',
        fontSize: 'medium',
        editorFont: 'system-ui',
        sidebarWidth: 280,
    },
    shortcuts: {
        save: 'Ctrl+S',
        generate: 'Ctrl+G',
        sync: 'Ctrl+Shift+S',
        refreshGraph: 'Ctrl+R',
    },

    advancedFeatures: {
        promptEditor: {
            enabled: false,
            autoSave: true,
            showDiffOnSave: true,
        },
        callConfirmation: {
            enabled: false,
            showCostEstimate: true,
            allowEditBeforeCall: true,
            timeout: 60000,
        },
        callHistory: {
            enabled: false,
            retentionDays: 30,
            maxRecords: 1000,
        },
    },
};

// 配置验证
export const validateConfig = (config: Partial<GlobalConfig>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (config.ai?.defaultParams?.temperature !== undefined) {
        if (config.ai.defaultParams.temperature < 0 || config.ai.defaultParams.temperature > 2) {
            errors.push('温度必须在0-2之间');
        }
    }
    
    if (config.ai?.defaultParams?.maxTokens !== undefined) {
        if (config.ai.defaultParams.maxTokens < 1 || config.ai.defaultParams.maxTokens > 100000) {
            errors.push('maxTokens必须在1-100000之间');
        }
    }
    
    return { valid: errors.length === 0, errors };
};

// 配置合并
export const mergeConfig = (base: GlobalConfig, override: Partial<GlobalConfig>): GlobalConfig => {
    return {
        ...base,
        ...override,
        ai: {
            ...base.ai,
            ...override.ai,
            providers: {
                ...base.ai.providers,
                ...override.ai?.providers,
                gemini: {
                    ...base.ai.providers.gemini,
                    ...override.ai?.providers?.gemini,
                },
                glm: {
                    ...base.ai.providers.glm,
                    ...override.ai?.providers?.glm,
                },
            },
            defaultParams: {
                ...base.ai.defaultParams,
                ...override.ai?.defaultParams,
            },
        },
        storage: {
            ...base.storage,
            ...override.storage,
            backendSync: {
                ...base.storage.backendSync,
                ...override.storage?.backendSync,
            },
        },
        graph: {
            ...base.graph,
            ...override.graph,
            neo4j: {
                ...base.graph.neo4j,
                ...override.graph?.neo4j,
            },
            echo: {
                ...base.graph.echo,
                ...override.graph?.echo,
            },
        },
        performance: {
            ...base.performance,
            ...override.performance,
            debounce: {
                ...base.performance.debounce,
                ...override.performance?.debounce,
            },
            cache: {
                ...base.performance.cache,
                ...override.performance?.cache,
            },
        },
        features: {
            ...base.features,
            ...override.features,
        },
        appearance: {
            ...base.appearance,
            ...override.appearance,
        },
        shortcuts: {
            ...base.shortcuts,
            ...override.shortcuts,
        },
    };
};

// 获取全局配置（从存储中读取）
export const getGlobalConfig = async (): Promise<GlobalConfig> => {
    const tryGetConfig = async (): Promise<Partial<GlobalConfig> | null> => {
        try {
            const localforage = await import('localforage');
            return await localforage.getItem<Partial<GlobalConfig>>(STORAGE_KEYS.GLOBAL_CONFIG);
        } catch {
            return null;
        }
    };

    try {
        // 首次尝试
        let savedConfig = await tryGetConfig();

        // 如果失败，等待一小段时间后重试（IndexedDB 可能还在初始化）
        if (savedConfig === null) {
            await new Promise(resolve => setTimeout(resolve, 100));
            savedConfig = await tryGetConfig();
        }

        if (savedConfig) {
            return mergeConfig(DEFAULT_CONFIG, savedConfig);
        }

        return DEFAULT_CONFIG;
    } catch (error) {
        // 静默失败，返回默认配置
        return DEFAULT_CONFIG;
    }
};

// 更新全局配置（保存到存储）
export const updateGlobalConfig = async (updates: Partial<GlobalConfig>): Promise<void> => {
    try {
        const localforage = await import('localforage');
        const currentConfig = await getGlobalConfig();
        const newConfig = mergeConfig(currentConfig, updates);
        
        await localforage.setItem(STORAGE_KEYS.GLOBAL_CONFIG, newConfig);
    } catch (error) {
        console.error('Failed to save global config:', error);
        throw error;
    }
};
