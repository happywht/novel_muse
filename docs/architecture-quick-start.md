# 高级版/普通版分离架构 - 快速开始指南

## 架构概述

本架构通过**功能开关系统**实现高级版和普通版的分离，确保：
- 普通版功能稳定运行，不受高级版bug影响
- 高级版功能通过拦截器、错误边界等机制完全隔离
- 配置清晰分离，易于管理和维护

## 核心组件

### 1. 功能开关系统 (`config/featureFlags.ts`)

**作用**：集中管理所有功能权限

```typescript
import { FeatureFlagService } from './config/featureFlags';

const service = FeatureFlagService.getInstance();

// 检查功能是否启用
if (service.isEnabled('promptEditing')) {
  // 执行高级版功能
}

// 要求高级版权限
service.requirePremium('自定义Prompt'); // 普通版会抛出错误
```

### 2. AI调用拦截器 (`services/aiCallInterceptor.ts`)

**作用**：在AI调用前显示确认对话框（高级版专属）

```typescript
import { AICallInterceptor } from './services/aiCallInterceptor';

const interceptor = AICallInterceptor.getInstance();

// 在AI调用前拦截
const result = await interceptor.interceptCall({
  taskType: 'generateText',
  prompt: '...',
  params: {},
  canEditPrompt: true,
});

if (!result.approved) {
  throw new Error('AI调用被用户取消');
}

// 使用可能被修改的prompt
const finalPrompt = result.modifiedPrompt || originalPrompt;
```

### 3. Prompt管理服务 (`services/promptService.ts`)

**作用**：管理自定义prompt（高级版专属）

```typescript
import { PromptService } from './services/promptService';

const promptService = PromptService.getInstance();

// 获取prompt（自动区分普通版/高级版）
const prompt = await promptService.getPrompt('scene_generation');

// 保存自定义prompt（仅高级版）
await promptService.saveCustomPrompt('scene_generation', '新的prompt...');

// 重置为默认
await promptService.resetToDefault('scene_generation');
```

## React集成

### 1. 包裹应用根组件

```typescript
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';

function App() {
  return (
    <FeatureFlagProvider>
      <YourApp />
    </FeatureFlagProvider>
  );
}
```

### 2. 使用功能开关

```typescript
import { useFeatureFlags, PremiumOnly, FeatureGate } from './contexts/FeatureFlagContext';

function MyComponent() {
  const { tier, isEnabled, setTier } = useFeatureFlags();

  return (
    <div>
      {/* 方式1：条件渲染 */}
      {isEnabled('promptEditing') && <PromptEditor />}

      {/* 方式2：PremiumOnly组件 */}
      <PremiumOnly>
        <PromptEditor />
      </PremiumOnly>

      {/* 方式3：FeatureGate组件 */}
      <FeatureGate feature="callConfirmation">
        <AICallConfirmDialog />
      </FeatureGate>
    </div>
  );
}
```

### 3. 错误边界隔离

```typescript
import { PremiumFeatureBoundary } from './components/common/PremiumFeatureBoundary';

function MyComponent() {
  return (
    <PremiumFeatureBoundary>
      <PremiumFeature />
    </PremiumFeatureBoundary>
  );
}
```

## 集成到现有代码

### 1. 修改AI调用服务

在 `services/gemini/core.ts` 中添加拦截器：

```typescript
import { AICallInterceptor } from '../aiCallInterceptor';

export async function callGemini(taskType, prompt, params) {
  const interceptor = AICallInterceptor.getInstance();

  // 拦截调用
  const result = await interceptor.interceptCall({
    taskType,
    prompt,
    params,
    canEditPrompt: true,
  });

  if (!result.approved) {
    throw new Error('AI调用被用户取消');
  }

  // 使用修改后的prompt
  const finalPrompt = result.modifiedPrompt || prompt;
  const finalParams = result.modifiedParams || params;

  // 执行调用
  return executeCall(taskType, finalPrompt, finalParams);
}
```

### 2. 修改Prompt获取逻辑

在现有服务中使用PromptService：

```typescript
import { PromptService } from '../promptService';

const promptService = PromptService.getInstance();

// 替换硬编码的prompt
const prompt = await promptService.getPrompt('scene_generation');
```

### 3. 添加设置面板

在设置面板中添加用户等级切换（用于测试）：

```typescript
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

function SettingsPanel() {
  const { tier, setTier } = useFeatureFlags();

  return (
    <div>
      <h3>用户等级</h3>
      <select value={tier} onChange={(e) => setTier(e.target.value as any)}>
        <option value="FREE">普通版</option>
        <option value="PREMIUM">高级版</option>
      </select>
    </div>
  );
}
```

## 测试策略

### 1. 普通版测试
- 确保所有基础功能正常工作
- 验证高级版功能完全不显示
- 测试错误边界不触发

### 2. 高级版测试
- 测试所有高级功能
- 验证调用确认对话框
- 测试Prompt编辑和保存

### 3. 切换测试
- 测试等级切换后的功能变化
- 验证配置持久化

## 配置管理

### 1. 全局配置 (`config/global.ts`)

用户等级存储在全局配置中：

```typescript
{
  tier: 'FREE', // 或 'PREMIUM'
  advancedFeatures: {
    promptEditor: { enabled: false, ... },
    callConfirmation: { enabled: false, ... },
    callHistory: { enabled: false, ... },
  }
}
```

### 2. 存储键 (`services/storageService.ts`)

新增存储键：
- `CUSTOM_PROMPTS`: 自定义prompt库
- `PROMPT_VERSIONS`: prompt版本历史
- `CALL_HISTORY`: AI调用确认历史

## 风险缓解

### 1. 错误隔离
- 所有高级版组件使用 `PremiumFeatureBoundary` 包裹
- 错误不会传播到普通版组件

### 2. 性能优化
- 高级版组件使用懒加载
- 条件渲染减少不必要的组件挂载

### 3. 安全性
- 前后端双重验证（后端也需验证tier）
- 功能开关在后端API中也需检查

## 下一步

1. **集成到现有服务**：修改geminiService、plotService等
2. **创建UI组件**：实现PromptEditor、AICallConfirmDialog等
3. **后端集成**：添加后端tier验证
4. **测试覆盖**：编写单元测试和集成测试
5. **监控集成**：添加错误监控和使用分析

## 参考文档

- 完整架构设计：`docs/architecture-tier-separation.md`
- 示例组件：`components/examples/PremiumFeatureExample.tsx`
- 配置文档：`config/global.ts`
