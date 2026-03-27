// services/aiCallInterceptor.ts

import { isFeatureEnabled } from '../config/featureFlags';

export interface AICallContext {
  taskType: string;
  systemInstruction: string;
  userPrompt: string;
  model: string;
  temperature: number;
  responseSchema?: any;
  thinkingBudget?: number;
}

export interface AICallResult {
  approved: boolean;
  modifiedSystemInstruction?: string;
  modifiedUserPrompt?: string;
  modifiedTemperature?: number;
}

// 全局状态
let pendingConfirmation: {
  context: AICallContext;
  resolve: (result: AICallResult) => void;
  reject: (error: Error) => void;
} | null = null;

// 事件名称
export const AI_CONFIRMATION_EVENT = 'ai-confirmation-required';
export const AI_CONFIRMATION_RESULT = 'ai-confirmation-result';

// 拦截AI调用
export async function interceptAICall(context: AICallContext): Promise<AICallResult> {
  // 检查是否启用高级模式确认
  if (!isFeatureEnabled('promptConfirmBeforeAI')) {
    return { approved: true };
  }

  return new Promise((resolve, reject) => {
    pendingConfirmation = { context, resolve, reject };

    // 触发全局事件，通知UI显示确认对话框
    window.dispatchEvent(new CustomEvent(AI_CONFIRMATION_EVENT, {
      detail: context
    }));
  });
}

// 用户确认
export function confirmAICall(result: AICallResult): void {
  if (pendingConfirmation) {
    pendingConfirmation.resolve(result);
    pendingConfirmation = null;
  }
}

// 取消确认
export function cancelAICall(): void {
  if (pendingConfirmation) {
    pendingConfirmation.resolve({ approved: false });
    pendingConfirmation = null;
  }
}

// 获取当前待确认的上下文
export function getPendingContext(): AICallContext | null {
  return pendingConfirmation?.context || null;
}
