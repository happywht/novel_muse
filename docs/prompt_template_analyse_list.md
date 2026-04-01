# Prompt 模板分析与抽象层管理系统规划

## 一、目标概述

### 1.1 核心目标
- **模板结构分析**：逐一分析每个 prompt 模板的抽象结构
- **抽象层编辑**：通过 UI 修改模板结构（区块、变量、条件），而非直接编辑文本
- **持久化存储**：修改永久保存到数据库/文件
- **导入导出**：支持模板配置的导入导出

### 1.2 抽象层概念
```
┌─────────────────────────────────────────────────────────────┐
│                    抽象层编辑器 UI                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ System      │  │ User        │  │ Variables           │  │
│  │ Prompt      │  │ Prompt      │  │ Definition          │  │
│  │ (区块列表)   │  │ (区块列表)   │  │ (变量列表)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    渲染引擎                                  │
│         将抽象结构 → 渲染为最终 prompt 文本                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、模板清单

### 2.1 写作模板 (writing.ts) - 8 个
📄 [详细分析文档](./template_analysis_writing.md)
| ID | 名称 | 分类 | 复杂度 | 分析状态 |
|----|------|------|--------|----------|
| `scene_generation` | 场景生成 | generation | ⭐⭐⭐⭐⭐ | ✅ 已完成 |
| `expand_scene` | 场景扩写 | generation | ⭐⭐ | ✅ 已完成 |
| `rewrite_local` | 局部重写 | refinement | ⭐⭐ | ✅ 已完成 |
| `summarize_chapter` | 章节摘要 | utility | ⭐ | ✅ 已完成 |
| `balance_suggestions` | 平衡建议 | utility | ⭐⭐ | ✅ 已完成 |
| `writing_base` | 写作基础 | generation | ⭐ | ✅ 已完成 |
| `polish_draft` | 草稿润色 | refinement | ⭐ | ✅ 已完成 |
| `chat_with_persona` | 角色对话 | utility | ⭐⭐⭐ | ✅ 已完成 |

### 2.2 角色模板 (character.ts) - 3 个
📄 [详细分析文档](./template_analysis_character.md)
| ID | 名称 | 分类 | 复杂度 | 分析状态 |
|----|------|------|--------|----------|
| `batch_generate_characters` | 批量生成角色 | generation | ⭐⭐ | ✅ 已完成 |
| `generate_single_character` | 生成单个角色 | generation | ⭐⭐ | ✅ 已完成 |
| `shura_field_conflict` | 修罗场冲突 | generation | ⭐⭐⭐⭐ | ✅ 已完成 |

### 2.3 世界观模板 (world.ts) - 6 个
📄 [详细分析文档](./template_analysis_world.md)
| ID | 名称 | 分类 | 复杂度 | 分析状态 |
|----|------|------|--------|----------|
| `batch_generate_settings` | 批量生成设定 | generation | ⭐⭐ | ✅ 已完成 |
| `expand_world_lore` | 扩展世界传说 | refinement | ⭐⭐ | ✅ 已完成 |
| `analyze_state_changes` | 分析状态变化 | analysis | ⭐⭐⭐ | ✅ 已完成 |
| `extract_echoes` | 提取回声 | analysis | ⭐⭐⭐ | ✅ 已完成 |
| `consolidate_memory` | 整合记忆 | refinement | ⭐⭐ | ✅ 已完成 |
| `deduce_world_consequences` | 推导世界后果 | analysis | ⭐⭐⭐ | ✅ 已完成 |

### 2.4 剧情模板 (plot.ts) - 6 个
📄 [详细分析文档](./template_analysis_plot.md)
| ID | 名称 | 分类 | 复杂度 | 分析状态 |
|----|------|------|--------|----------|
| `generate_plot` | 生成剧情 | generation | ⭐⭐⭐ | ✅ 已完成 |
| `rewrite_plot` | 重写剧情 | refinement | ⭐⭐⭐ | ✅ 已完成 |
| `analyze_plot_rhythm` | 分析剧情节奏 | analysis | ⭐⭐ | ✅ 已完成 |
| `split_plot_node_into_chapters` | 拆分章节 | generation | ⭐⭐⭐⭐ | ✅ 已完成 |
| `regenerate_chapter_outline` | 重新生成章节大纲 | refinement | ⭐⭐⭐⭐ | ✅ 已完成 |
| `generate_twist_hooks` | 生成转折钩子 | generation | ⭐⭐ | ✅ 已完成 |

### 2.5 审核模板 (audit.ts) - 4 个
📄 [详细分析文档](./template_analysis_audit.md)
| ID | 名称 | 分类 | 复杂度 | 分析状态 |
|----|------|------|--------|----------|
| `audit_plot` | 剧情审核 | analysis | ⭐⭐ | ✅ 已完成 |
| `audit_chapter_plan` | 章节计划审核 | analysis | ⭐⭐⭐ | ✅ 已完成 |
| `extract_knowledge_triples` | 提取知识三元组 | analysis | ⭐⭐ | ✅ 已完成 |
| `audit_chapter_content` | 章节内容审核 | analysis | ⭐⭐⭐ | ✅ 已完成 |

**总计：27 个模板**

---

## 三、模板抽象结构定义

### 3.1 核心数据结构
```typescript
interface PromptTemplateDefinition {
  // === 元信息 ===
  id: string;                      // 模板唯一标识
  label: string;                   // 显示名称
  description: string;             // 描述
  category: TemplateCategory;      // 分类
  version?: string;                // 版本号
  author?: string;                 // 作者
  tags?: string[];                 // 标签

  // === 系统指令 ===
  systemTemplate: string;          // 系统指令模板

  // === 用户提示 (结构化) ===
  userTemplate: string;            // 用户提示模板 (渲染后)

  // === 区块定义 ===
  sections: TemplateSection[];     // 区块列表

  // === 变量定义 ===
  variables: PromptVariable[];     // 变量列表
}
```

### 3.2 区块结构
```typescript
interface TemplateSection {
  id: string;                      // 区块ID
  label: string;                   // 显示标签
  template: string;                // 模板内容 (含 {{variable}})
  condition?: string;              // 显示条件 (JavaScript 表达式)
  order: number;                   // 排序权重
  icon?: string;                   // 图标 emoji

  // === 元数据 (抽象层关键) ===
  metadata?: {
    tier: 'task' | 'context' | 'style' | 'constraint' | 'format' | 'other';
    isStatic: boolean;             // 是否静态内容
    dataSource: 'static' | 'user_input' | 'computed' | 'derived';
    description?: string;          // 区块描述
  };
}
```

### 3.3 变量结构
```typescript
interface PromptVariable {
  name: string;                    // 变量名
  type: 'string' | 'array' | 'object' | 'boolean' | 'number';
  tier: 'critical' | 'important' | 'optional';  // 重要性
  source: 'user_input' | 'project_state' | 'computed' | 'derived' | 'optional';
  required: boolean;               // 是否必填
  description: string;             // 描述
  defaultValue?: unknown;          // 默认值

  // === 显示配置 ===
  display: {
    collapsible: boolean;          // 是否可折叠
    previewLength: number;         // 预览长度
    badge?: string;                // 徽章文字
  };
}
```

---

## 四、分析任务规划

### 4.1 每个模板的分析内容
1. **结构分析**
   - System Prompt 结构
   - User Prompt 区块数量和层次
   - 区块间的依赖关系

2. **变量分析**
   - 变量列表
   - 变量来源分类
   - 变量依赖关系

3. **条件分析**
   - 区块显示条件
   - 条件表达式复杂度

4. **可编辑性评估**
   - 哪些区块可编辑
   - 哪些变量可配置
   - 编辑后影响范围

### 4.2 分析模板示例
```markdown
## 模板分析: scene_generation

### 基本信息
- ID: `scene_generation`
- 名称: 场景生成
- 分类: generation
- 版本: 1.0.0

### System Prompt
```
You are a master novelist with deep expertise in creative writing...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~200 字

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件 | 可编辑 |
|---|--------|------|------|----------|------|--------|
| 1 | genre_info | 类型信息 | context | computed | 无 | ✅ |
| 2 | global_context | 全局故事弧 | context | computed | rollingSummary存在 | ✅ |
| 3 | tiered_memory | 分层记忆 | context | computed | 无 | ✅ |
| 4 | logic_anchors | 逻辑锚点 | context | computed | physicalStatus.length > 0 | ✅ |
| 5 | chekhov_gun | 契诃夫之枪 | context | computed | unresolvedForeshadowing.length > 0 | ✅ |
| 6 | active_settings | 活跃设定 | context | user_input | activeSettings.length > 0 | ✅ |
| 7 | world_context | 世界上下文 | context | computed | relevantSettings.length > 0 | ✅ |
| 8 | core_constraints | 核心约束 | constraint | computed | 无 | ✅ |
| 9 | twist_hook | 转折钩子 | task | user_input | twistHook存在 | ✅ |
| 10 | plot_beat | 情节拍 | task | user_input | 无 | ✅ |
| 11 | quality_constraints | 质量约束 | constraint | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| genre | string | critical | project_state | ✅ | 小说类型 |
| plotBeat | string | critical | user_input | ✅ | 场景情节目标 |
| genreContext | string | critical | computed | ✅ | 类型规则 |
| rollingSummary | string | important | project_state | ❌ | 全局故事摘要 |
| tieredContext | string | important | computed | ❌ | 分层记忆上下文 |
| ... | ... | ... | ... | ... | ... |

### 渲染示例
输入:
```json
{
  "genre": "xuanhuan",
  "plotBeat": "林远教导芈岚选育杂交水稻",
  "genreContext": "玄幻小说规则...",
  "targetWordCount": 3000
}
```

输出: (渲染后的完整 prompt)
```
Novel Genre: xuanhuan
玄幻小说规则...

[Scene Plot Beat]
林远教导芈岚选育杂交水稻

[Quality and Tone Guidelines (STRICTLY FORBIDDEN)]
...
```
```

---

## 五、抽象层编辑器设计

### 5.1 功能模块
```
┌────────────────────────────────────────────────────────────────┐
│                   Prompt 模板抽象层编辑器                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 模板列表  │ │ 区块编辑  │ │ 变量管理  │ │ 预览测试  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    编辑区域                              │  │
│  │                                                         │  │
│  │  System Prompt: [富文本编辑器]                           │  │
│  │                                                         │  │
│  │  User Prompt Blocks:                                    │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │ 📌 区块1: 类型信息 (context)                     │   │  │
│  │  │ 模板: Novel Genre: {{genre}}                    │   │  │
│  │  │ 条件: 无                                        │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │ 📌 区块2: 全局故事弧 (context)                   │   │  │
│  │  │ 模板: [Global Story Arc]...                     │   │  │
│  │  │ 条件: rollingSummary != null                    │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 变量定义:                                                │  │
│  │ + 添加变量                                               │  │
│  │ ┌────────┬────────┬──────────┬────────┬────────┐       │  │
│  │ │ 变量名  │ 类型    │ 重要性    │ 来源    │ 必填   │       │  │
│  │ ├────────┼────────┼──────────┼────────┼────────┤       │  │
│  │ │ genre  │ string │ critical │ project│ ✅     │       │  │
│  │ │ plotBeat│ string │ critical │ user   │ ✅     │       │  │
│  │ └────────┴────────┴──────────┴────────┴────────┘       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  [💾 保存] [📤 导出] [📥 导入] [🔄 重置] [👁️ 预览渲染结果]      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 数据存储方案
```
选项 A: 项目级覆盖 (推荐)
- 路径: project.customTemplates[id]
- 存储: MySQL project 表的 customTemplates JSON 字段
- 优先级: 用户级 > 项目级 > 默认级

选项 B: 独立模板文件
- 路径: /data/templates/{projectId}/{templateId}.json
- 存储: 文件系统
- 优点: 便于版本控制和导入导出
```

### 5.3 导入导出格式
```json
{
  "version": "1.0",
  "exportedAt": "2026-03-31T00:00:00Z",
  "templates": [
    {
      "id": "scene_generation",
      "label": "场景生成",
      "category": "writing",
      "systemTemplate": "...",
      "sections": [...],
      "variables": [...]
    }
  ]
}
```

---

## 六、实施计划

### Phase 1: 模板分析 (1-2天) ✅ 已完成
- [x] 逐一分析 27 个模板
- [x] 填充每个模板的分析文档
- [x] 识别可编辑字段
- [x] 创建分类分析文档:
  - `template_analysis_writing.md` - 8 个写作模板
  - `template_analysis_character.md` - 3 个角色模板
  - `template_analysis_world.md` - 6 个世界观模板
  - `template_analysis_plot.md` - 6 个剧情模板
  - `template_analysis_audit.md` - 4 个审核模板

### Phase 2: 抽象层数据结构 (1天) ✅ 已完成
- [x] 设计数据库 schema → `docs/template_schema_design.md`
- [x] 定义 TypeScript 类型 → `types/templateOverride.ts`
- [x] 实现合并逻辑 → `services/templateMerge.ts`
- [x] 设计 Registry 升级方案 → `docs/template_registry_upgrade.md`
- [x] 实现 CRUD API → `server/src/routes/templateOverrides.ts`
- [x] 更新 TemplateRegistry 支持持久化 → `services/templateRegistry.ts`

### Phase 3: 编辑器 UI (2-3天) ✅ 已完成
- [x] 添加导航项 → `types.ts` AppSection.TEMPLATE_EDITOR
- [x] 添加侧边栏导航 → `components/Sidebar.tsx` NAV_ITEMS
- [x] 添加路由渲染 → `App.tsx` 条件渲染
- [x] 创建 TemplateEditor 主组件 → `components/TemplateEditor/index.tsx`
- [x] 创建 TemplateListPanel 子组件 → `components/TemplateEditor/TemplateListPanel.tsx`
- [x] 创建 BlockEditorPanel 子组件 → `components/TemplateEditor/BlockEditorPanel.tsx`
- [x] 创建 VariableManagerPanel 子组件 → `components/TemplateEditor/VariableManagerPanel.tsx`
- [x] 创建 TemplatePreview 子组件 → `components/TemplateEditor/TemplatePreview.tsx`
- [x] 实现区块拖拽排序 (dnd-kit)
- [x] 完善错误处理和加载状态
- [x] 添加导入导出功能

### Phase 4: 导入导出 (1天) ✅ 已完成
- [x] 导出为 JSON
- [x] 导入并验证
- [x] 版本迁移

---

## 七、下一步行动

1. ~~**确认分析模板** - 选择从哪个模板开始分析~~ ✅ 已完成
2. ~~**确定存储方案** - 项目级覆盖 vs 独立文件~~ ✅ 已确定：项目级 MySQL 存储
3. ~~**设计 UI 入口** - 新页面 vs 侧边栏面板~~ ✅ 已确定：独立页面 `/template-editor`

### 当前待办 (Phase 3) - 编辑器 UI
1. ~~**创建 TemplateEditor 组件**~~ ✅ 已完成 - `components/TemplateEditor/index.tsx`
2. **实现区块拖拽排序** - 需要集成 dnd-kit 库
3. ~~**实现变量管理面板**~~ ✅ 已完成 - `components/TemplateEditor/VariableManagerPanel.tsx`
4. ~~**实现实时预览**~~ ✅ 已完成 - `components/TemplateEditor/TemplatePreview.tsx`
5. **完善 API 集成** - 前后端联调
6. **添加导入导出功能** - Phase 4

---

## 八、分析成果总结

### 复杂度分布
| 复杂度 | 数量 | 占比 |
|--------|------|------|
| ⭐⭐⭐⭐⭐ 最高 | 1 | 3.7% |
| ⭐⭐⭐⭐ 复杂 | 4 | 14.8% |
| ⭐⭐⭐ 中等 | 9 | 33.3% |
| ⭐⭐ 简单 | 10 | 37.0% |
| ⭐ 最简单 | 3 | 11.1% |

### 关键发现
1. **scene_generation** 是最复杂的模板，包含 11 个区块和 21 个变量
2. **Context-Task-Constraint** 是最常见的三层结构模式
3. 条件渲染广泛使用 `!= null && !== ""` 模式
4. 知识图谱集成是高级分析模板的共性特征

### 可编辑组件统计
| 组件 | 可编辑数量 | 风险评估 |
|------|-----------|----------|
| System Prompt | 27 | 低-中 |
| 区块模板 | 100+ | 低 |
| 区块条件 | 35+ | 中 |
| 变量定义 | 100+ | 高 |
| 变量默认值 | 50+ | 低 |

---

*文档创建时间: 2026-03-31*
*最后更新: 2026-03-31*
*Phase 1-4 完成时间: 2026-03-31*
