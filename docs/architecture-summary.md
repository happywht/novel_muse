# Muse 小说架构师 - 高级版/普通版分离架构总结

## 架构设计完成情况

### 已完成的核心文件

#### 1. 配置层
- **`config/featureFlags.ts`** ✅
  - 用户等级定义（FREE | PREMIUM）
  - 功能开关系统
  - FeatureFlagService单例服务

- **`config/global.ts`** ✅（已更新）
  - 添加tier字段
  - 添加advancedFeatures配置

#### 2. 服务层
- **`services/aiCallInterceptor.ts`** ✅
  - AI调用拦截器
  - 支持高级版调用确认功能
  - 事件驱动的UI通知机制

- **`services/promptService.ts`** ✅
  - Prompt管理服务
  - 支持自定义prompt（高级版）
  - 版本历史管理

- **`services/storageService.ts`** ✅（已更新）
  - 新增高级版存储键
  - CUSTOM_PROMPTS
  - PROMPT_VERSIONS
  - CALL_HISTORY

#### 3. React集成
- **`contexts/FeatureFlagContext.tsx`** ✅
  - FeatureFlagProvider
  - useFeatureFlags hook
  - PremiumOnly组件
  - FeatureGate组件

#### 4. UI组件
- **`components/common/PremiumFeatureBoundary.tsx`** ✅
  - 错误边界组件
  - 防止高级版bug影响普通版

- **`components/examples/PremiumFeatureExample.tsx`** ✅
  - AI调用确认对话框示例

- **`components/examples/PromptEditorExample.tsx`** ✅
  - Prompt编辑器面板示例

#### 5. 文档
- **`docs/architecture-tier-separation.md`** ✅
  - 完整架构设计文档
  - 架构图
  - 关键接口定义
  - 风险评估

- **`docs/architecture-quick-start.md`** ✅
  - 快速开始指南
  - 集成步骤
  - 测试策略

---

## 架构核心特性

### 1. 代码层面分离

#### 功能开关系统
```typescript
// 检查功能是否启用
if (featureFlags.isEnabled('promptEditing')) {
  // 执行高级版功能
}

// 要求高级版权限
featureFlags.requirePremium('自定义Prompt');
```

#### AI调用拦截器
```typescript
// 拦截AI调用（高级版显示确认对话框）
const result = await interceptor.interceptCall({
  taskType: 'generateText',
  prompt: '...',
  params: {},
  canEditPrompt: true,
});
```

#### Prompt管理服务
```typescript
// 获取prompt（自动区分版本）
const prompt = await promptService.getPrompt('scene_generation');

// 保存自定义prompt（仅高级版）
await promptService.saveCustomPrompt('scene_generation', '新的prompt...');
```

### 2. 配置存储方案

#### 全局配置扩展
```typescript
{
  tier: 'FREE' | 'PREMIUM',
  advancedFeatures: {
    promptEditor: { enabled, autoSave, showDiffOnSave },
    callConfirmation: { enabled, showCostEstimate, timeout },
    callHistory: { enabled, retentionDays, maxRecords }
  }
}
```

#### 存储键扩展
- `CUSTOM_PROMPTS`: 自定义prompt库
- `PROMPT_VERSIONS`: prompt版本历史
- `CALL_HISTORY`: AI调用确认历史

### 3. 功能开关设计

#### React Context集成
```typescript
// 包裹应用
<FeatureFlagProvider>
  <App />
</FeatureFlagProvider>

// 使用功能开关
const { tier, isEnabled, setTier } = useFeatureFlags();

// 条件渲染
<PremiumOnly>
  <PromptEditor />
</PremiumOnly>
```

#### 功能列表
**高级版专属**：
- ✅ promptEditing: Prompt编辑
- ✅ callConfirmation: AI调用确认
- ✅ customPromptLibrary: 自定义prompt库
- ✅ advancedModelSelection: 高级模型选择
- ✅ callHistoryTracking: 调用历史追踪

**通用功能**：
- ✅ basicGeneration: 基础生成
- ✅ plotAnalysis: 剧情分析
- ✅ characterCreation: 角色创建

### 4. 普通版保护机制

#### 错误边界隔离
```typescript
<PremiumFeatureBoundary>
  <PremiumFeature />
</PremiumFeatureBoundary>
```

#### 代码分割和懒加载
```typescript
const PromptEditor = lazy(() => import('./PromptEditor'));

<Suspense fallback={<div>加载中...</div>}>
  <PromptEditor />
</Suspense>
```

#### 服务降级策略
- 普通版：静默失败，使用降级策略
- 高级版：抛出详细错误

---

## 关键接口定义

### 1. Prompt编辑器接口
```typescript
interface IPromptEditor {
  getPrompt(key: string): Promise<string>;
  savePrompt(key: string, instruction: string): Promise<void>;
  deletePrompt(key: string): Promise<void>;
  resetToDefault(key: string): Promise<void>;
  getAllPrompts(): Promise<Record<string, PromptTemplate>>;
  getVersionHistory(key: string): Promise<PromptVersion[]>;
  restoreVersion(key: string, versionId: string): Promise<void>;
}
```

### 2. AI调用确认接口
```typescript
interface IAICallConfirmation {
  showConfirmation(context: AICallContext): Promise<AICallResult>;
  getCallHistory(filters?: {...}): Promise<CallHistoryRecord[]>;
  clearHistory(): Promise<void>;
  exportHistory(): Promise<string>;
}
```

### 3. 功能开关接口
```typescript
interface IFeatureFlagService {
  getTier(): UserTier;
  setTier(tier: UserTier): void;
  isEnabled(feature: keyof FeatureFlags): boolean;
  requirePremium(feature: string): void;
  onFeatureChange(feature, callback): () => void;
}
```

---

## 风险评估与缓解

### 高优先级风险（已实施）

#### 1. 高级版bug影响普通版
- **缓解措施**：✅ 错误边界隔离
- **状态**：PremiumFeatureBoundary组件已实现

#### 2. 权限绕过
- **缓解措施**：⚠️ 前后端双重验证
- **状态**：前端已实施，后端待集成

#### 3. 配置冲突
- **缓解措施**：✅ 配置验证机制
- **状态**：validateConfig函数已实现

### 中优先级风险（建议实施）

#### 1. 使用量监控
- **状态**：待实施
- **建议**：集成到监控服务

#### 2. 平滑升级路径
- **状态**：待实施
- **建议**：添加升级引导UI

#### 3. 数据迁移工具
- **状态**：待实施
- **建议**：创建迁移脚本

---

## 实施建议

### 第一阶段（1-2周）✅ 已完成
- ✅ 功能开关系统
- ✅ 全局配置扩展
- ✅ React Context集成
- ✅ 错误边界组件

### 第二阶段（2-3周）⏳ 进行中
- ✅ AI调用拦截器
- ✅ Prompt管理服务
- ✅ 示例UI组件
- ⏳ 集成到现有服务

### 第三阶段（1-2周）📋 待开始
- 📋 全面测试
- 📋 后端集成
- 📋 监控集成
- 📋 性能优化

---

## 下一步行动

### 立即行动
1. **集成到geminiService**：在AI调用前添加拦截器
2. **创建完整UI**：实现生产级PromptEditor和ConfirmDialog
3. **后端验证**：在API层添加tier验证

### 短期目标（1个月内）
1. **全面测试**：单元测试、集成测试、E2E测试
2. **性能优化**：懒加载、代码分割、缓存优化
3. **文档完善**：用户文档、API文档、运维文档

### 长期目标（3个月内）
1. **监控集成**：错误监控、使用分析、性能监控
2. **A/B测试**：功能开关优化、转化率提升
3. **持续迭代**：根据用户反馈优化功能

---

## 文件清单

### 配置文件
- `config/featureFlags.ts` - 功能开关系统
- `config/global.ts` - 全局配置（已更新）

### 服务文件
- `services/aiCallInterceptor.ts` - AI调用拦截器
- `services/promptService.ts` - Prompt管理服务
- `services/storageService.ts` - 存储服务（已更新）

### React相关
- `contexts/FeatureFlagContext.tsx` - 功能开关Context

### UI组件
- `components/common/PremiumFeatureBoundary.tsx` - 错误边界
- `components/examples/PremiumFeatureExample.tsx` - 确认对话框示例
- `components/examples/PromptEditorExample.tsx` - Prompt编辑器示例

### 文档文件
- `docs/architecture-tier-separation.md` - 完整架构设计
- `docs/architecture-quick-start.md` - 快速开始指南

---

## 总结

本架构设计通过**功能开关系统**实现了高级版和普通版的完全分离，具备以下特点：

✅ **代码层面清晰分离**：通过FeatureFlagService集中管理
✅ **配置独立存储**：tier和advancedFeatures分离存储
✅ **功能开关灵活**：支持运行时切换和持久化
✅ **普通版完全隔离**：错误边界、代码分割、降级策略
✅ **易于集成**：React Context、示例组件、详细文档
✅ **可扩展性强**：支持未来添加更多高级功能

架构已准备就绪，可以开始集成到现有代码中！
