// services/aiCallInterceptor.ts

import { isFeatureEnabled } from '../config/featureFlags';
import { templateEngine } from './templateEngine';

// 从 config/templates/defaults.ts 导入 VariableTier 类型
export type VariableTier = 'critical' | 'important' | 'optional';

export interface AICallContext {
  taskType: string;
  systemInstruction: string;
  userPrompt: string;
  model: string;
  temperature: number;
  responseSchema?: any;
  thinkingBudget?: number;

  // 新增模板相关字段
  templateId?: string;                    // 模板ID
  templateData?: Record<string, any>;     // 结构化变量数据
  templateMeta?: {                        // 模板元信息（用于UI展示）
    label: string;
    description: string;
    variables: Array<{
      name: string;
      value: any;
      tier: VariableTier;
      tokenCount: number;
    }>;
  };
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

  // 如果提供了模板数据，使用模板引擎渲染
  if (context.templateData && context.templateId) {
    try {
      // 渲染系统指令
      if (context.systemInstruction) {
        context.systemInstruction = templateEngine.render(
          context.systemInstruction,
          context.templateData
        );
      }

      // 渲染用户提示
      if (context.userPrompt) {
        context.userPrompt = templateEngine.render(
          context.userPrompt,
          context.templateData
        );
      }
    } catch (error) {
      console.error('Template rendering error:', error);
      // 渲染失败时，继续使用原始字符串（向后兼容）
    }
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
