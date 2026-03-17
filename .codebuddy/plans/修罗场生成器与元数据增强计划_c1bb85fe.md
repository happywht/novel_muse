---
name: 修罗场生成器与元数据增强计划
overview: 整合implementation_plan的P2任务与修罗场生成器，打造PlotWeaver的杀手级功能。先完成大纲节点的高阶元数据补全（relatedCharacters/relatedLocations），基于此实现智能修罗场生成器，自动分析多角色冲突潜力并生成高密度戏剧场景。
design:
  architecture:
    framework: react
  styleKeywords:
    - 暗黑科幻
    - 张力视觉化
    - 沉浸式交互
    - 动态光效
  fontSystem:
    fontFamily: Alimama ShuHeiTi
    heading:
      size: 24px
      weight: 700
    subheading:
      size: 16px
      weight: 600
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#4C1D4C"
      - "#7C2D4C"
      - "#FF3D3D"
    background:
      - "#0F0F1A"
      - "#1A1A2E"
      - "#16213E"
    text:
      - "#E0E0E0"
      - "#FFFFFF"
      - "#FF6B6B"
    functional:
      - "#00FF88"
      - "#FFCC00"
      - "#FF3D3D"
todos:
  - id: explore-plotweaver-structure
    content: 使用 [subagent:code-explorer] 深度分析 PlotWeaver 模块结构，识别所有需要修改的文件和接口
    status: completed
  - id: update-schemas
    content: 扩展 types.ts 和 schemas.ts，增加修罗场相关字段（sceneType, intensity, participatingCharacters）
    status: completed
    dependencies:
      - explore-plotweaver-structure
  - id: enhance-plot-generation
    content: 修改 services/gemini/plot.ts，增强 generatePlotFromContext，使其生成完整的 relatedCharacters/relatedLocations 元数据
    status: completed
    dependencies:
      - update-schemas
  - id: implement-shura-generator
    content: 创建 services/gemini/shuraField.ts，实现修罗场场景生成的核心逻辑
    status: completed
    dependencies:
      - enhance-plot-generation
  - id: add-shura-ui-button
    content: 在 PlotWeaver/PlotToolbar.tsx 中添加"修罗场"触发按钮和状态管理
    status: completed
    dependencies:
      - implement-shura-generator
  - id: extend-auxiliary-drawer
    content: 扩展 PlotWeaver/AuxiliaryDrawer.tsx，增加修罗场配置面板（角色选择、地点、强度滑块）
    status: completed
    dependencies:
      - add-shura-ui-button
  - id: enhance-plot-card
    content: 修改 PlotWeaver/PlotCard.tsx，为修罗场场景添加特殊视觉标记和强度指示器
    status: completed
    dependencies:
      - extend-auxiliary-drawer
  - id: integrate-end-to-end
    content: 在 PlotWeaver.tsx 中集成修罗场生成器，连接配置面板、生成服务和数据持久化
    status: completed
    dependencies:
      - enhance-plot-card
  - id: test-shura-generation
    content: 使用 [skill:code-explorer] 验证修罗场生成全流程，测试元数据完整性和UI交互
    status: completed
    dependencies:
      - integrate-end-to-end
---

## 用户要求

基于前期评估，用户希望先完成 implementation_plan 中的 P0/P1 基础任务，聚焦 PlotWeaver 模块，采用单点极致策略实现"修罗场生成器"功能。

## 产品概述

在现有小说架构师系统中，为 PlotWeaver（情节罗盘）模块增加修罗场生成器功能。该功能将自动分析多角色之间的冲突潜力，生成高密度戏剧性的多角色对抗场景大纲，解决创作者在多角色互动场景设计上的痛点。

## 核心功能

- **修罗场场景生成**：选择3-5个角色和场景地点，AI自动分析每个角色的目标、秘密、当前情绪状态
- **冲突强度调节**：提供"暗流涌动"到"全面战争"的滑块控制
- **智能上下文注入**：基于知识图谱中的角色关系、世界观设定生成符合逻辑的冲突
- **场景结构输出**：生成包含开场、对抗、高潮、收场的完整场景大纲
- **元数据自动关联**：自动将生成的场景与相关角色、地点关联，存入 plotNodes

## 技术栈

- **前端框架**：React 19 + TypeScript
- **状态管理**：Zustand (useProjectStore)
- **UI 组件**：自定义组件 + Lucide React 图标
- **AI 引擎**：Google Gemini API
- **样式方案**：Tailwind CSS
- **数据验证**：Zod schemas

## 实现策略

### 整体架构

采用"基础先行+极致体验"的双阶段策略：

1. **基础层**：完成 implementation_plan 的 P2 任务，确保 AI 生成 plotNodes 时包含完整的元数据（relatedCharacters/relatedLocations）
2. **应用层**：在 PlotWeaver 中构建修罗场生成器，利用基础层提供的元数据进行智能场景生成

### 技术决策

- **利用现有 schema**：直接使用 services/schemas.ts 中的 AiPlotNodeSchema（已支持 relatedCharacters/relatedLocations）
- **复用上下文系统**：复用 services/gemini/helpers.ts 中的 formatContext 和 filterRelevantSettings
- **集成知识图谱**：通过 services/apiService.ts 获取角色关系图谱数据
- **组件化设计**：在 PlotWeaver 中添加独立子组件，不影响现有功能

### 性能考量

- **响应式生成**：使用 Gemini Flash 模型快速生成场景大纲（<3秒）
- **增量更新**：生成的修罗场场景作为新的 plotNode 插入，不重构整个大纲
- **缓存机制**：缓存角色关系分析结果，避免重复计算

### 错误处理

- **降级策略**：当 AI 生成失败时，提供基础模板让用户手动编辑
- **验证层**：使用 safeParseAiJson 确保返回数据符合 schema
- **用户确认**：生成结果需用户审核后才能插入大纲

## 架构设计

### 系统结构

```
PlotWeaver.tsx (主模块)
├── PlotToolbar.tsx (新增"修罗场"按钮)
├── AuxiliaryDrawer.tsx (扩展：修罗场配置面板)
├── PlotCard.tsx (扩展：显示场景类型标签)
└── ShuraFieldGenerator.ts (核心生成逻辑)
```

### 数据流

```
用户选择角色/地点 → ShuraFieldGenerator
    ↓ (调用)
formatContext + filterRelevantSettings → 构建上下文
    ↓ (调用)
executeModelTask (gemini-3-flash-preview) → 生成场景
    ↓ (返回)
safeParseAiJson (AiPlotNodeSchema) → 验证数据
    ↓
updateProject → 插入新的 plotNode
```

### Mermaid 架构图

```mermaid
graph TD
    A[PlotWeaver 主界面] --> B[用户点击"生成修罗场"]
    B --> C[AuxiliaryDrawer: 选择角色/地点/强度]
    C --> D[ShuraFieldGenerator]
    D --> E[formatContext: 构建上下文]
    E --> F[filterRelevantSettings: 获取世界观]
    F --> G[executeModelTask: AI生成]
    G --> H[safeParseAiJson: 验证数据]
    H --> I[updateProject: 插入plotNode]
    I --> J[PlotCard: 显示新场景]
    
    subgraph "知识图谱支持"
        K[Neo4j Graph] --> L[角色关系数据]
        L --> E
        M[WorldSettings] --> F
    end
```

## 目录结构

```
project-root/
├── components/
│   └── PlotWeaver/
│       ├── PlotWeaver.tsx              # [MODIFY] 添加修罗场按钮
│       ├── AuxiliaryDrawer.tsx         # [MODIFY] 扩展配置面板
│       ├── PlotCard.tsx                # [MODIFY] 显示场景标签
│       └── ShuraFieldGenerator.tsx     # [NEW] 核心生成逻辑
├── services/
│   ├── gemini/
│   │   └── plot.ts                     # [MODIFY] 增强generatePlotFromContext
│   └── schemas.ts                      # [MODIFY] 更新AiPlotNodeSchema
└── types.ts                            # [MODIFY] 扩展PlotNode类型
```

## 关键代码结构

### PlotNode 类型扩展

```typescript
// types.ts
export interface PlotNode {
  id: string;
  title: string;
  content: string;
  order: number;
  beatTag?: BeatTag;
  relatedCharacters?: string[];      // IDs
  relatedLocations?: string[];       // IDs
  sceneType?: 'NORMAL' | 'SHURA_FIELD';  // NEW: 标记修罗场场景
  intensity?: number;                // NEW: 冲突强度 0-100
  participatingCharacters?: string[]; // NEW: 参与角色IDs
}
```

### 修罗场生成接口

```typescript
// services/gemini/shuraField.ts
export const generateShuraFieldScene = async (
    characters: Character[],
    location: WorldSetting,
    intensity: number,
    context: ProjectState,
    settings?: CreativeSettings
): Promise<PlotNode> => {
  // 构建角色冲突分析上下文
  // 调用 Gemini 生成场景
  // 返回符合 AiPlotNodeSchema 的数据
};
```

## 设计架构

采用暗黑科幻风格（与现有系统一致），修罗场生成器作为 PlotWeaver 中的沉浸式功能模块。整体设计突出"张力"和"对抗"的视觉语言。

### 页面布局

在 PlotWeaver 界面右上角添加"⚔️ 修罗场"按钮，点击后展开右侧配置抽屉（AuxiliaryDrawer）。抽屉分为三栏：

1. **角色选择**：多选器，显示角色头像和关键信息
2. **场景设定**：地点选择器 + 冲突强度滑块
3. **生成预览**：实时显示生成的场景大纲，支持微调

### 视觉语言

- **主色调**：深紫红渐变（#4C1D4C → #7C2D4C），象征冲突与危险
- **张力可视化**：强度滑块带动态光效，数值越高光效越强烈
- **角色卡片**：选中状态有红色边框脉冲动画
- **生成过程**：骷髅图标旋转，配合"冲突推演中..."文案

### 交互流程

1. **触发**：点击"⚔️ 修罗场"按钮，按钮有红色光晕效果
2. **配置**：在抽屉中选择3-5个角色（系统自动推荐有矛盾的角色组合）
3. **生成**：点击"生成修罗场"按钮，显示加载动画（3秒左右）
4. **预览**：生成结果展示在抽屉下半部分，可编辑标题和内容
5. **插入**：确认后作为新的 plotNode 插入大纲，卡片有特殊红色标记

### 响应式处理

- **桌面端**：右侧抽屉宽度 480px，支持拖拽调整
- **数据持久化**：生成的修罗场场景自动保存为 plotNode，包含完整元数据

## 可用扩展

### Skill

- **code-explorer**
- 用途：在制定技术方案时，需要深入探索 PlotWeaver 相关组件的文件结构、数据流向和现有模式
- 预期结果：准确识别所有需要修改的文件及其依赖关系，确保方案完整性

### SubAgent

- **code-explorer**
- 用途：深入探索 PlotWeaver 模块的代码结构，分析 generatePlotFromContext 和相关组件的实现细节
- 预期结果：提供精确的文件路径、接口定义和修改建议，避免方案遗漏关键实现点

## 扩展使用策略

1. 使用 [subagent:code-explorer] 分析 PlotWeaver 组件树，定位所有相关文件
2. 使用 [skill:code-explorer] 验证技术方案中的文件路径和接口定义准确性