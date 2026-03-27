# Muse 小说架构师 - 高级版/普通版分离架构设计

## 架构设计图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户界面层 (UI Layer)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         FeatureFlagProvider (功能开关上下文)               │  │
│  │  • 读取用户订阅等级 (FREE | PREMIUM)                       │  │
│  │  • 提供全局功能开关状态                                    │  │
│  │  • 动态渲染组件 (高级版/普通版)                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────────┐     │
│  │   普通版组件          │      │   高级版组件              │     │
│  │  • 基础编辑器         │      │  • PromptTuner           │     │
│  │  • 标准设置面板       │      │  • PromptManager         │     │
│  │  • 简单生成流程       │      │  • AICallConfirmDialog   │     │
│  └──────────────────────┘      │  • AdvancedSettings      │     │
│                                 └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      服务层 (Service Layer)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           AICallInterceptor (AI调用拦截器)                 │  │
│  │  • 拦截所有AI调用                                         │  │
│  │  • 高级版：显示确认对话框，允许编辑prompt                   │  │
│  │  • 普通版：直接调用，无拦截                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         PromptService (Prompt管理服务)                     │  │
│  │  • 普通版：使用默认prompt模板 (只读)                       │  │
│  │  • 高级版：支持自定义、保存、版本管理                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          LLMRouter (大模型路由器)                          │  │
│  │  • 普通版：使用默认路由规则                                │  │
│  │  • 高级版：支持任务级别模型覆盖                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      配置层 (Config Layer)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          TierConfig (分级配置系统)                         │  │
│  │  • tier: 'FREE' | 'PREMIUM'                               │  │
│  │  • features: FeatureFlags                                 │  │
│  │  • promptEditing: boolean                                 │  │
│  │  • callConfirmation: boolean                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      存储层 (Storage Layer)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         IndexedDB / MySQL (数据存储)                       │  │
│  │  • muse_global_config (包含tier信息)                      │  │
│  │  • muse_custom_prompts (高级版专属)                       │  │
│  │  • muse_call_history (调用确认历史)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. 代码层面分离方案

### 1.1 功能开关系统

**文件**: `config/featureFlags.ts`

```typescript
export type UserTier = 'FREE' | 'PREMIUM';

export interface FeatureFlags {
  // 高级版专属功能
  promptEditing: boolean;          // 是否允许编辑prompt
  callConfirmation: boolean;       // 是否启用AI调用确认
  customPromptLibrary: boolean;    // 是否启用自定义prompt库
  advancedModelSelection: boolean; // 是否启用高级模型选择
  callHistoryTracking: boolean;    // 是否启用调用历史追踪

  // 通用功能（两个版本都可用）
  basicGeneration: boolean;
  plotAnalysis: boolean;
  characterCreation: boolean;
}

export const TIER_FEATURES: Record<UserTier, FeatureFlags> = {
  FREE: {
    promptEditing: false,
    callConfirmation: false,
    customPromptLibrary: false,
    advancedModelSelection: false,
    callHistoryTracking: false,
    basicGeneration: true,
    plotAnalysis: true,
    characterCreation: true,
  },
  PREMIUM: {
    promptEditing: true,
    callConfirmation: true,
    customPromptLibrary: true,
    advancedModelSelection: true,
    callHistoryTracking: true,
    basicGeneration: true,
    plotAnalysis: true,
    characterCreation: true,
  },
};

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private currentTier: UserTier = 'FREE';

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  async initialize(): Promise<void> {
    const config = await getGlobalConfig();
    this.currentTier = config.tier || 'FREE';
  }

  getTier(): UserTier {
    return this.currentTier;
  }

  setTier(tier: UserTier): void {
    this.currentTier = tier;
    // 保存到全局配置
    updateGlobalConfig({ tier });
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    return TIER_FEATURES[this.currentTier][feature];
  }

  requirePremium(feature: string): void {
    if (this.currentTier === 'FREE') {
      throw new Error(`功能 "${feature}" 需要高级版订阅`);
    }
  }
}
```

### 1.2 AI调用拦截器

**文件**: `services/aiCallInterceptor.ts`

```typescript
import { FeatureFlagService } from '../config/featureFlags';

export interface AICallContext {
  taskType: string;
  prompt: string;
  params: any;
  canEditPrompt: boolean;
}

export interface AICallResult {
  approved: boolean;
  modifiedPrompt?: string;
  modifiedParams?: any;
}

export class AICallInterceptor {
  private static instance: AICallInterceptor;
  private featureFlags: FeatureFlagService;
  private pendingCall: AICallContext | null = null;
  private resolveCall: ((result: AICallResult) => void) | null = null;

  private constructor() {
    this.featureFlags = FeatureFlagService.getInstance();
  }

  static getInstance(): AICallInterceptor {
    if (!AICallInterceptor.instance) {
      AICallInterceptor.instance = new AICallInterceptor();
    }
    return AICallInterceptor.instance;
  }

  /**
   * 拦截AI调用
   * 普通版：直接返回approved=true
   * 高级版：显示确认对话框，等待用户响应
   */
  async interceptCall(context: AICallContext): Promise<AICallResult> {
    // 普通版：无拦截，直接通过
    if (!this.featureFlags.isEnabled('callConfirmation')) {
      return { approved: true };
    }

    // 高级版：显示确认对话框
    return new Promise((resolve) => {
      this.pendingCall = context;
      this.resolveCall = resolve;

      // 触发事件，通知UI显示确认对话框
      window.dispatchEvent(new CustomEvent('ai-call-intercepted', {
        detail: context
      }));
    });
  }

  /**
   * 用户确认调用
   */
  approveCall(modifiedPrompt?: string, modifiedParams?: any): void {
    if (this.resolveCall) {
      this.resolveCall({
        approved: true,
        modifiedPrompt,
        modifiedParams,
      });
      this.cleanup();
    }
  }

  /**
   * 用户拒绝调用
   */
  rejectCall(): void {
    if (this.resolveCall) {
      this.resolveCall({ approved: false });
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.pendingCall = null;
    this.resolveCall = null;
  }
}
```

### 1.3 Prompt管理服务

**文件**: `services/promptService.ts`

```typescript
import { FeatureFlagService } from '../config/featureFlags';
import { storageService, STORAGE_KEYS } from './storageService';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from '../config/prompts';

export interface CustomPrompt {
  id: string;
  key: string;
  label: string;
  instruction: string;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
}

export class PromptService {
  private static instance: PromptService;
  private featureFlags: FeatureFlagService;
  private customPrompts: Map<string, CustomPrompt> = new Map();

  private constructor() {
    this.featureFlags = FeatureFlagService.getInstance();
  }

  static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  /**
   * 获取Prompt
   * 普通版：返回默认prompt
   * 高级版：优先返回自定义prompt，无则返回默认
   */
  async getPrompt(key: string, profile: 'LITERARY' | 'WEB_NOVEL' = 'WEB_NOVEL'): Promise<string> {
    // 高级版：检查自定义prompt
    if (this.featureFlags.isEnabled('promptEditing')) {
      const customPrompt = this.customPrompts.get(key);
      if (customPrompt) {
        return customPrompt.instruction;
      }
    }

    // 返回默认prompt
    const registry = profile === 'LITERARY' ? PROMPT_REGISTRY_LITERARY : PROMPT_REGISTRY_WEB_NOVEL;
    const template = registry[key];

    if (!template) {
      console.warn(`Prompt key "${key}" not found, using fallback`);
      return '你是一个专业的创意写作助手。';
    }

    return template.instruction;
  }

  /**
   * 保存自定义Prompt（仅高级版）
   */
  async saveCustomPrompt(key: string, instruction: string): Promise<void> {
    this.featureFlags.requirePremium('自定义Prompt');

    const existing = this.customPrompts.get(key);
    const prompt: CustomPrompt = {
      id: existing?.id || `prompt-${Date.now()}`,
      key,
      label: existing?.label || key,
      instruction,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      isDefault: false,
    };

    this.customPrompts.set(key, prompt);
    await this.persistCustomPrompts();
  }

  /**
   * 删除自定义Prompt（仅高级版）
   */
  async deleteCustomPrompt(key: string): Promise<void> {
    this.featureFlags.requirePremium('删除自定义Prompt');

    this.customPrompts.delete(key);
    await this.persistCustomPrompts();
  }

  /**
   * 重置为默认Prompt
   */
  async resetToDefault(key: string): Promise<void> {
    this.featureFlags.requirePremium('重置Prompt');

    this.customPrompts.delete(key);
    await this.persistCustomPrompts();
  }

  /**
   * 加载自定义Prompts
   */
  async loadCustomPrompts(): Promise<void> {
    if (!this.featureFlags.isEnabled('customPromptLibrary')) {
      return;
    }

    const saved = await storageService.getItem<CustomPrompt[]>(STORAGE_KEYS.CUSTOM_PROMPTS);
    if (saved) {
      saved.forEach(p => this.customPrompts.set(p.key, p));
    }
  }

  private async persistCustomPrompts(): Promise<void> {
    const prompts = Array.from(this.customPrompts.values());
    await storageService.setItem(STORAGE_KEYS.CUSTOM_PROMPTS, prompts);
  }
}
```

---

## 2. 配置存储方案

### 2.1 扩展全局配置

**修改文件**: `config/global.ts`

```typescript
export interface GlobalConfig {
  // ... 现有配置 ...

  // 新增：用户等级
  tier: UserTier;

  // 新增：高级版专属功能配置
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

export const DEFAULT_CONFIG: GlobalConfig = {
  // ... 现有默认值 ...

  tier: 'FREE',

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
```

### 2.2 存储键扩展

**修改文件**: `services/storageService.ts`

```typescript
export const STORAGE_KEYS = {
  // ... 现有键 ...

  // 高级版专属存储键
  CUSTOM_PROMPTS: 'muse_custom_prompts',
  CALL_HISTORY: 'muse_call_history',
  CALL_CONFIRMATION_CACHE: 'muse_call_confirmation_cache',
} as const;
```

### 2.3 数据结构定义

**新增类型**: `types.ts`

```typescript
// 调用确认历史记录
export interface CallHistoryRecord {
  id: string;
  timestamp: number;
  taskType: string;
  originalPrompt: string;
  modifiedPrompt?: string;
  approved: boolean;
  executionTime?: number;
  tokensUsed?: number;
  modelUsed?: string;
}

// Prompt版本记录
export interface PromptVersion {
  id: string;
  promptKey: string;
  instruction: string;
  version: number;
  createdAt: number;
  note?: string;
}
```

---

## 3. 功能开关设计

### 3.1 React Context集成

**新增文件**: `contexts/FeatureFlagContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { FeatureFlagService, UserTier, FeatureFlags } from '../config/featureFlags';

interface FeatureFlagContextValue {
  tier: UserTier;
  flags: FeatureFlags;
  setTier: (tier: UserTier) => void;
  isEnabled: (feature: keyof FeatureFlags) => boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTierState] = useState<UserTier>('FREE');
  const [flags, setFlags] = useState<FeatureFlags>(TIER_FEATURES.FREE);
  const service = FeatureFlagService.getInstance();

  useEffect(() => {
    service.initialize().then(() => {
      setTierState(service.getTier());
      setFlags(TIER_FEATURES[service.getTier()]);
    });
  }, []);

  const setTier = (newTier: UserTier) => {
    service.setTier(newTier);
    setTierState(newTier);
    setFlags(TIER_FEATURES[newTier]);
  };

  const isEnabled = (feature: keyof FeatureFlags): boolean => {
    return flags[feature];
  };

  return (
    <FeatureFlagContext.Provider value={{ tier, flags, setTier, isEnabled }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
};

// 高级版专用组件包装器
export const PremiumOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null
}) => {
  const { tier } = useFeatureFlags();
  return tier === 'PREMIUM' ? <>{children}</> : <>{fallback}</>;
};
```

### 3.2 组件级开关使用示例

```typescript
// 在设置面板中使用
import { PremiumOnly, useFeatureFlags } from '../contexts/FeatureFlagContext';

const SettingsPanel = () => {
  const { isEnabled } = useFeatureFlags();

  return (
    <div>
      {/* 普通版和高级版都有的基础设置 */}
      <BasicSettingsTab />

      {/* 高级版专属：Prompt编辑器 */}
      <PremiumOnly>
        <PromptEditorTab />
      </PremiumOnly>

      {/* 高级版专属：AI调用确认配置 */}
      <PremiumOnly>
        <CallConfirmationTab />
      </PremiumOnly>

      {/* 条件渲染：基于功能开关 */}
      {isEnabled('advancedModelSelection') && (
        <AdvancedModelSelectionTab />
      )}
    </div>
  );
};
```

---

## 4. 普通版保护机制

### 4.1 错误边界隔离

**新增文件**: `components/PremiumFeatureBoundary.tsx`

```typescript
import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 高级版功能错误边界
 * 捕获高级版功能的错误，防止影响普通版使用
 */
export class PremiumFeatureBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Premium feature error caught:', error, errorInfo);
    // 可选：上报错误到监控系统
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="premium-feature-error">
          <p>高级功能暂时不可用</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 使用方式
<PremiumFeatureBoundary>
  <PromptEditor />
</PremiumFeatureBoundary>
```

### 4.2 代码分割和懒加载

```typescript
import React, { lazy, Suspense } from 'react';
import { PremiumOnly } from '../contexts/FeatureFlagContext';

// 懒加载高级版组件
const PromptEditor = lazy(() => import('./PromptEditor'));
const AICallConfirmDialog = lazy(() => import('./AICallConfirmDialog'));

const PremiumFeatures = () => {
  return (
    <PremiumOnly>
      <Suspense fallback={<div>加载高级功能...</div>}>
        <PromptEditor />
        <AICallConfirmDialog />
      </Suspense>
    </PremiumOnly>
  );
};
```

### 4.3 服务降级策略

**修改文件**: `services/gemini/core.ts`

```typescript
import { FeatureFlagService } from '../config/featureFlags';

export async function callGemini(
  taskType: LLMTaskType,
  prompt: string,
  params: any
): Promise<string> {
  const featureFlags = FeatureFlagService.getInstance();
  const interceptor = AICallInterceptor.getInstance();

  // 拦截器检查
  const result = await interceptor.interceptCall({
    taskType,
    prompt,
    params,
    canEditPrompt: featureFlags.isEnabled('promptEditing'),
  });

  if (!result.approved) {
    throw new Error('AI调用被用户取消');
  }

  // 使用可能被修改的prompt和参数
  const finalPrompt = result.modifiedPrompt || prompt;
  const finalParams = result.modifiedParams || params;

  try {
    // 执行AI调用
    const response = await executeGeminiCall(taskType, finalPrompt, finalParams);

    // 记录调用历史（仅高级版）
    if (featureFlags.isEnabled('callHistoryTracking')) {
      await recordCallHistory({
        taskType,
        originalPrompt: prompt,
        modifiedPrompt: result.modifiedPrompt,
        approved: true,
        modelUsed: 'gemini',
      });
    }

    return response;
  } catch (error) {
    // 错误处理：普通版用户不受影响
    console.error('Gemini call failed:', error);

    if (featureFlags.getTier() === 'FREE') {
      // 普通版：静默失败，使用降级策略
      return getFallbackResponse(taskType);
    } else {
      // 高级版：抛出详细错误
      throw error;
    }
  }
}
```

---

## 5. 关键接口定义

### 5.1 Prompt编辑器接口

```typescript
export interface IPromptEditor {
  // 获取Prompt
  getPrompt(key: string): Promise<string>;

  // 保存自定义Prompt（仅高级版）
  savePrompt(key: string, instruction: string): Promise<void>;

  // 删除自定义Prompt（仅高级版）
  deletePrompt(key: string): Promise<void>;

  // 重置为默认
  resetToDefault(key: string): Promise<void>;

  // 获取所有Prompts（包括默认和自定义）
  getAllPrompts(): Promise<Record<string, PromptTemplate>>;

  // 版本管理（仅高级版）
  getVersionHistory(key: string): Promise<PromptVersion[]>;
  restoreVersion(key: string, versionId: string): Promise<void>;
}
```

### 5.2 AI调用确认接口

```typescript
export interface IAICallConfirmation {
  // 显示确认对话框
  showConfirmation(context: AICallContext): Promise<AICallResult>;

  // 获取调用历史（仅高级版）
  getCallHistory(filters?: {
    taskType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<CallHistoryRecord[]>;

  // 清除调用历史（仅高级版）
  clearHistory(): Promise<void>;

  // 导出调用历史（仅高级版）
  exportHistory(): Promise<string>;
}
```

### 5.3 功能开关接口

```typescript
export interface IFeatureFlagService {
  // 获取当前用户等级
  getTier(): UserTier;

  // 设置用户等级
  setTier(tier: UserTier): void;

  // 检查功能是否启用
  isEnabled(feature: keyof FeatureFlags): boolean;

  // 要求高级版（如果不是高级版则抛出错误）
  requirePremium(feature: string): void;

  // 监听功能开关变化
  onFeatureChange(
    feature: keyof FeatureFlags,
    callback: (enabled: boolean) => void
  ): () => void;
}
```

---

## 6. 风险评估

### 6.1 技术风险

| 风险项 | 严重程度 | 概率 | 缓解措施 |
|--------|----------|------|----------|
| **高级版bug影响普通版** | 高 | 中 | 1. 错误边界隔离<br>2. 代码分割懒加载<br>3. 独立的错误处理逻辑 |
| **配置冲突** | 中 | 中 | 1. 严格的配置验证<br>2. 配置合并时优先级明确<br>3. 向后兼容性测试 |
| **性能影响** | 中 | 低 | 1. 懒加载高级版组件<br>2. 条件渲染减少不必要的组件挂载<br>3. 独立的状态管理 |
| **数据迁移问题** | 低 | 低 | 1. 平滑迁移策略<br>2. 数据版本控制<br>3. 回滚机制 |

### 6.2 业务风险

| 风险项 | 严重程度 | 概率 | 缓解措施 |
|--------|----------|------|----------|
| **用户体验割裂** | 中 | 中 | 1. 清晰的功能分级说明<br>2. 平滑的升级引导<br>3. 保留核心功能在普通版 |
| **付费转化率低** | 中 | 中 | 1. 高级版功能价值明确<br>2. 提供试用机制<br>3. 收集用户反馈迭代 |
| **滥用高级功能** | 低 | 低 | 1. 使用量限制<br>2. 异常检测<br>3. API调用频率限制 |

### 6.3 安全风险

| 风险项 | 严重程度 | 概率 | 缓解措施 |
|--------|----------|------|----------|
| **权限绕过** | 高 | 低 | 1. 前后端双重验证<br>2. 功能开关在后端也需验证<br>3. 定期安全审计 |
| **数据泄露** | 中 | 低 | 1. 敏感数据加密<br>2. 访问日志记录<br>3. 权限最小化原则 |
| **Prompt注入** | 中 | 中 | 1. Prompt内容验证<br>2. 输入清理<br>3. 沙箱隔离 |

### 6.4 风险缓解优先级

#### 高优先级（必须实施）
1. **错误边界隔离**：确保高级版bug不影响普通版
2. **前后端双重验证**：防止权限绕过
3. **配置验证机制**：避免配置冲突

#### 中优先级（建议实施）
1. **使用量监控**：防止滥用
2. **平滑升级路径**：改善用户体验
3. **数据迁移工具**：降低升级成本

#### 低优先级（可选实施）
1. **A/B测试框架**：优化功能开关策略
2. **高级版试用机制**：提升付费转化
3. **详细的使用分析**：指导产品迭代

---

## 7. 实施建议

### 7.1 分阶段实施

**第一阶段（1-2周）**：
- 实现基础功能开关系统
- 扩展全局配置
- 集成FeatureFlagProvider

**第二阶段（2-3周）**：
- 实现AI调用拦截器
- 开发Prompt编辑器
- 添加调用确认对话框

**第三阶段（1-2周）**：
- 错误边界和降级策略
- 代码分割和懒加载
- 全面测试和bug修复

### 7.2 测试策略

1. **单元测试**：
   - FeatureFlagService逻辑测试
   - AICallInterceptor拦截逻辑测试
   - PromptService功能测试

2. **集成测试**：
   - 普通版完整流程测试
   - 高级版完整流程测试
   - 版本切换测试

3. **回归测试**：
   - 确保普通版功能不受影响
   - 性能基准测试

### 7.3 监控和告警

1. **功能开关监控**：
   - 用户等级分布
   - 功能使用率
   - 付费转化漏斗

2. **错误监控**：
   - 高级版错误率
   - 普通版错误率（应保持低水平）
   - 降级策略触发频率

3. **性能监控**：
   - 组件加载时间
   - AI调用延迟
   - 内存使用情况

---

## 8. 总结

本架构设计通过以下核心机制确保高级版和普通版的有效分离：

1. **功能开关系统**：集中管理所有功能权限
2. **拦截器模式**：在不修改原有代码的情况下增强功能
3. **错误边界隔离**：防止高级版bug影响普通版
4. **配置分离**：独立的配置存储和管理
5. **代码分割**：按需加载高级版组件，减少性能影响

这套架构既能满足当前需求，又具备良好的扩展性，可以随着业务发展逐步添加更多高级功能。
