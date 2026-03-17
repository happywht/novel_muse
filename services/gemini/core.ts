import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { CreativeSettings } from "../../types";
import { buildPromptContent } from "../../config/prompts";
import { useProjectStore } from "../../store/useProjectStore";
import { fetchOpenAICompatible } from "../openAiAdapter";
import { getProviderForTask, LLMTaskType, Provider } from "../llmRouter";
import { storageService, STORAGE_KEYS } from "../storageService";

const STORAGE_KEY_API = STORAGE_KEYS.GEMINI_API_KEY;
const STORAGE_KEY_MODEL = STORAGE_KEYS.MODEL_OVERRIDE;

export const getAIClient = async () => {
    const savedKey = await storageService.getItem<string>(STORAGE_KEY_API);
    const apiKey = savedKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("请先在全局设置面板中配置您的 Gemini API Key。");
    }
    return new GoogleGenAI({ apiKey });
};

export const getModelName = async (tier: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const customModel = await storageService.getItem<string>(STORAGE_KEY_MODEL);
    if (customModel) return customModel;
    return tier === 'pro'
        ? (process.env.GEMINI_PRO_MODEL || 'gemini-3-pro-preview')
        : (process.env.GEMINI_FLASH_MODEL || 'gemini-3-flash-preview');
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
