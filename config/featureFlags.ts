// config/featureFlags.ts

export type UserTier = 'FREE' | 'PREMIUM';

export interface FeatureFlags {
  // 高级功能开关
  promptConfirmBeforeAI: boolean; // AI调用前确认
  promptEditor: boolean; // Prompt编辑器
  callHistory: boolean; // 调用历史
  promptEditing: boolean; // Prompt编辑功能
  customPromptLibrary: boolean; // 自定义Prompt库
}

// 默认配置
export const DEFAULT_FEATURE_FLAGS: Record<UserTier, FeatureFlags> = {
  FREE: {
    promptConfirmBeforeAI: false,
    promptEditor: false,
    callHistory: false,
    promptEditing: false,
    customPromptLibrary: false,
  },
  PREMIUM: {
    promptConfirmBeforeAI: true,
    promptEditor: true,
    callHistory: true,
    promptEditing: true,
    customPromptLibrary: true,
  },
};

// Alias for compatibility
export const TIER_FEATURES = DEFAULT_FEATURE_FLAGS;

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

/**
 * FeatureFlagService - Singleton service for feature flag management
 */
export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private userTier: UserTier = 'FREE';
  private initialized: boolean = false;

  private constructor() {
    this.userTier = getUserTier();
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    // 可以在这里添加从远程加载配置的逻辑
    this.userTier = getUserTier();
    this.initialized = true;
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    return DEFAULT_FEATURE_FLAGS[this.userTier][feature];
  }

  getTier(): UserTier {
    return this.userTier;
  }

  setTier(tier: UserTier): void {
    this.userTier = tier;
    setUserTier(tier);
  }

  getAllFlags(): FeatureFlags {
    return DEFAULT_FEATURE_FLAGS[this.userTier];
  }

  /**
   * 检查是否为高级用户，如果不是则抛出错误
   * @param featureName 功能名称，用于错误提示
   */
  requirePremium(featureName: string): void {
    if (this.userTier !== 'PREMIUM') {
      throw new Error(`"${featureName}" 功能仅限高级版用户使用`);
    }
  }
}
