// config/featureFlags.ts

export type UserTier = 'FREE' | 'PREMIUM';

export interface FeatureFlags {
  // 高级功能开关
  promptConfirmBeforeAI: boolean;  // AI调用前确认
  promptEditor: boolean;            // Prompt编辑器
  callHistory: boolean;             // 调用历史
}

// 默认配置
export const DEFAULT_FEATURE_FLAGS: Record<UserTier, FeatureFlags> = {
  FREE: {
    promptConfirmBeforeAI: false,
    promptEditor: false,
    callHistory: false,
  },
  PREMIUM: {
    promptConfirmBeforeAI: true,
    promptEditor: true,
    callHistory: true,
  },
};

// 获取当前用户等级
export function getUserTier(): UserTier {
  if (typeof window === 'undefined') {
    return 'FREE';
  }
  const stored = localStorage.getItem('muse_user_tier');
  return (stored as UserTier) || 'FREE';
}

// 设置用户等级
export function setUserTier(tier: UserTier): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('muse_user_tier', tier);
}

// 检查功能是否启用
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const tier = getUserTier();
  return DEFAULT_FEATURE_FLAGS[tier][feature];
}

// 获取当前功能配置
export function getCurrentFeatureFlags(): FeatureFlags {
  const tier = getUserTier();
  return DEFAULT_FEATURE_FLAGS[tier];
}
