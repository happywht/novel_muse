import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CreativeSettings } from "../../types";
import { buildPromptContent } from "../../config/prompts";
import { useProjectStore } from "../../store/useProjectStore";
import { fetchOpenAICompatible } from "../openAiAdapter";
import { getProviderForTask, LLMTaskType, Provider } from "../llmRouter";
import { storageService, STORAGE_KEYS } from "../storageService";
import { DEFAULT_CONFIG } from "../../config/global";

const STORAGE_KEY_GLOBAL_CONFIG = STORAGE_KEYS.GLOBAL_CONFIG;

// 获取全局配置（带缓存）
let cachedConfig: typeof DEFAULT_CONFIG | null = null;
let configLoadPromise: Promise<typeof DEFAULT_CONFIG> | null = null;

export const getGlobalConfig = async (): Promise<typeof DEFAULT_CONFIG> => {
    // 如果已经有缓存，直接返回
    if (cachedConfig) {
        return cachedConfig;
    }
    
    // 如果正在加载，返回同一个promise
    if (configLoadPromise) {
        return configLoadPromise;
    }
    
    // 开始加载配置
    configLoadPromise = (async () => {
        try {
            const savedConfig = await storageService.getItem<typeof DEFAULT_CONFIG>(STORAGE_KEY_GLOBAL_CONFIG);
            if (savedConfig) {
                // 合并保存的配置和默认配置
                cachedConfig = { ...DEFAULT_CONFIG, ...savedConfig };
            } else {
                cachedConfig = DEFAULT_CONFIG;
            }
        } catch (error) {
            console.error('加载全局配置失败:', error);
            cachedConfig = DEFAULT_CONFIG;
        }
        configLoadPromise = null;
        return cachedConfig!;
    })();
    
    return configLoadPromise;
};

// 清除配置缓存（在配置更新后调用）
export const clearConfigCache = (): void => {
    cachedConfig = null;
};

export const getAIClient = async () => {
    const config = await getGlobalConfig();
    const apiKey = config.ai.providers.gemini.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new Error("请先在全局设置面板中配置您的 Gemini API Key。");
    }
    return new GoogleGenAI({ apiKey });
};

export const getModelName = async (tier: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const config = await getGlobalConfig();
    
    // 使用配置中的模型名称
    if (tier === 'pro') {
        return config.ai.providers.gemini.proModel || process.env.GEMINI_PRO_MODEL || 'gemini-3-pro-preview';
    } else {
        return config.ai.providers.gemini.flashModel || process.env.GEMINI_FLASH_MODEL || 'gemini-3-flash-preview';
    }
};

// 根据任务类型获取模型名称（支持任务级别覆盖）
export const getModelNameForTask = async (task: LLMTaskType): Promise<string> => {
    const config = await getGlobalConfig();
    
    // 检查是否有任务级别的模型覆盖
    const taskOverride = config.ai.taskModelOverrides[task];
    if (taskOverride) {
        return taskOverride;
    }
    
    // 回退到默认逻辑
    return getModelName('flash');
};

/**
 * Helper for retry logic
 */
export async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
        return await operation();
    } catch (error: unknown) {
        const errorCode = (error as any)?.status || (error as any)?.code || (error as any)?.response?.status;
        const errorMessage = (error as any)?.message || '';
        const isRetryable =
            errorCode === 503 ||
            errorCode === 429 ||
            errorCode === 500 ||
            errorMessage.includes('503') ||
            errorMessage.includes('overloaded') ||
            errorMessage.includes('temporarily unavailable');

        if (retries > 0 && isRetryable) {
            console.warn(`API call failed with code ${errorCode}. Retrying in ${delay}ms... (Retries left: ${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        throw error;
    }
}

/**
 * Helper to inject creative settings into instructions
 */
export const getInstructionWithSettings = (promptKey: string, settings?: CreativeSettings) => {
    const { project } = useProjectStore.getState();
    return buildPromptContent(promptKey, project.customPrompts, settings);
};

/**
 * Unified execution wrapper for Multi-Agent routing
 */
export const executeModelTask = async (
    task: LLMTaskType,
    systemInstruction: string,
    prompt: string,
    geminiModel: string,
    temperature: number,
    responseSchema?: any,
    thinkingBudget?: number
): Promise<string> => {
    const provider = getProviderForTask(task);

    if (provider === Provider.GLM) {
        const modelName = process.env.GLM_MODEL_NAME || 'glm-4-plus';
        const endpoint = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/anthropic';

        const isJson = !!responseSchema;
        let finalPrompt = prompt;
        if (isJson && !finalPrompt.toLowerCase().includes('json')) {
            finalPrompt += '\n\n请严格按要求输出 JSON 格式。';
        }

        const responseText = await fetchOpenAICompatible(
            provider,
            endpoint,
            modelName,
            [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: finalPrompt }
            ],
            temperature,
            isJson ? 'json_object' : undefined
        );
        return responseText;
    }

    // Default Gemini Execution
    const ai = await getAIClient();
    const config: any = {
        systemInstruction,
        temperature,
    };

    if (responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = responseSchema;
    }
    if (thinkingBudget) {
        config.thinkingConfig = { thinkingBudget };
    }

    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: geminiModel,
        contents: prompt,
        config
    }));
    return (response as any).text || ""; // Type casting for response
};
