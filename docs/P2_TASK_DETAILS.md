# P2优先级任务详解

> **任务名称**: 补全大纲节点的高阶元数据 (Plot Node Metadata)
> **优先级**: P2
> **状态**: 待实施
> **预计工期**: 2-3天

---

## 📊 任务背景

当前AI生成小说大纲时，只输出纯文本内容，缺乏结构化的元数据，导致：
- ❌ 无法提前规划章节涉及的人物和地点
- ❌ 缺少情节节点的类型标签（如"激励事件"、"高潮"等）
- ❌ 前端无法进行高级筛选和可视化
- ❌ 后续章节生成时缺少上下文关联

## 🎯 任务目标

让AI在生成小说大纲时，**同步规划出每个节点的结构化元数据**：
- ✅ 关联的人物列表
- ✅ 关联的地点列表
- ✅ 情节类型标签（Beat Tag）

---

## 🔧 技术实施方案

### 1️⃣ 修改Schema定义

**文件**: `services/schemas.ts`

**当前实现**:
```typescript
// 当前只有纯文本内容
const AiPlotNodeSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    content: { type: "string" },
    beats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string" }
        }
      }
    }
  }
}
```

**P2升级方案**:
```typescript
// 新增结构化元数据字段
const AiPlotNodeSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    content: { type: "string" },

    // 🆕 关联的人物名称列表
    relatedCharacterNames: {
      type: "array",
      items: { type: "string" },
      description: "本节点涉及的人物名称列表"
    },

    // 🆕 关联的地点名称列表
    relatedLocationNames: {
      type: "array",
      items: { type: "string" },
      description: "本节点涉及的地点名称列表"
    },

    // 🆕 情节类型标签
    beatTag: {
      type: "string",
      enum: [
        "INCITING_INCIDENT",    // 激励事件
        "PLOT_POINT_1",         // 第一个情节转折点
        "MIDPOINT",             // 中点
        "PLOT_POINT_2",         // 第二个情节转折点
        "CLIMAX",               // 高潮
        "RESOLUTION",           // 结局
        "EXPOSITION",           // 说明
        "RISING_ACTION",        // 上升动作
        "FALLING_ACTION",       // 下降动作
        "DENOUEMENT"            // 尾声
      ],
      description: "情节节点的类型标签"
    },

    beats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string" }
          // beats也可以有类似的元数据（可选）
        }
      }
    }
  }
}
```

---

### 2️⃣ 升级Plot生成服务

**文件**: `services/gemini/plot.ts`

**修改函数**: `generatePlotFromContext()`

**当前Prompt片段**:
```typescript
const prompt = `
请根据以下上下文生成小说大纲...

输出格式：
{
  "title": "章节标题",
  "content": "章节摘要",
  "beats": [
    { "content": "节拍内容" }
  ]
}
`;
```

**P2升级后的Prompt**:
```typescript
const prompt = `
请根据以下上下文生成小说大纲，并标注每个节点涉及的人物、地点和情节类型。

人物列表（供参考）：
${characterList.map(c => `- ${c.name}`).join('\n')}

地点列表（供参考）：
${locationList.map(l => `- ${l.name}`).join('\n')}

输出格式要求：
{
  "title": "章节标题",
  "content": "章节摘要",

  // 必填：本节点涉及的人物名称（从上方列表中选择）
  "relatedCharacterNames": ["张三", "李四"],

  // 必填：本节点涉及的地点名称（从上方列表中选择）
  "relatedLocationNames": ["咖啡厅", "公园"],

  // 必填：情节类型标签
  "beatTag": "INCITING_INCIDENT",

  "beats": [
    { "content": "节拍内容" }
  ]
}

情节类型说明：
- INCITING_INCIDENT: 激励事件，打破平衡
- PLOT_POINT_1: 第一个转折点（25%处）
- MIDPOINT: 中点（50%处），方向改变
- PLOT_POINT_2: 第二个转折点（75%处）
- CLIMAX: 高潮，最终对决
- RESOLUTION: 结局，新平衡
- EXPOSITION: 说明，背景介绍
- RISING_ACTION: 上升动作，冲突加剧
- FALLING_ACTION: 下降动作，余波
- DENOUEMENT: 尾声，解释说明
`;
```

---

### 3️⃣ 后端数据组装

**文件**: `server/src/routes/plot.ts` 或对应的服务

**新增逻辑**:
```typescript
async function generatePlot(req, res) {
  // 1. 调用AI生成大纲
  const aiResult = await geminiGeneratePlot(context);

  // 2. 🆕 名称转UUID映射
  const characterMap = await getCharacterNameToIdMap(req.params.projectId);
  const locationMap = await getLocationNameToIdMap(req.params.projectId);

  // 3. 🆕 转换名称为UUID引用
  const enrichedResult = {
    ...aiResult,
    nodes: aiResult.nodes.map(node => ({
      ...node,
      // 将人物名称转换为UUID数组
      relatedCharacters: node.relatedCharacterNames?.map(name =>
        characterMap[name] // 找不到则为undefined
      ).filter(Boolean),

      // 将地点名称转换为UUID数组
      relatedLocations: node.relatedLocationNames?.map(name =>
        locationMap[name]
      ).filter(Boolean)
    }))
  };

  // 4. 返回增强后的数据
  res.json(enrichedResult);
}
```

---

## 📈 预期收益

### 用户体验提升
- ✅ 大纲生成时可预览人物和地点关联
- ✅ 前端可实现"按人物筛选章节"功能
- ✅ 可视化情节结构（显示beatTag）

### 技术债务减少
- ✅ 避免后续手动关联人物和地点
- ✅ 减少前端的字符串匹配逻辑
- ✅ 数据库关系更清晰（通过UUID）

### AI智能升级
- ✅ AI理解故事结构（beatTag）
- ✅ 生成章节时能参考上下文关联
- ✅ 减少"忘记某人"的情况

---

## 🎨 前端UI建议（可选）

### 1. 节点卡片增强显示
```tsx
<PlotNodeCard>
  <h3>{node.title}</h3>
  <p>{node.content}</p>

  {/* 🆕 人物徽章 */}
  <div className="flex gap-2">
    {node.relatedCharacters.map(char => (
      <CharacterBadge key={char.id} character={char} />
    ))}
  </div>

  {/* 🆕 地点标签 */}
  <div className="flex gap-2">
    {node.relatedLocations.map(loc => (
      <LocationTag key={loc.id} location={loc} />
    ))}
  </div>

  {/* 🆕 情节类型 */}
  <BeatTag type={node.beatTag}>
    {formatBeatTag(node.beatTag)}
  </BeatTag>
</PlotNodeCard>
```

### 2. 按人物筛选章节
```tsx
<ChapterFilter>
  <CharacterSelector
    onChange={(chars) =>
      setFilteredNodes(
        nodes.filter(node =>
          node.relatedCharacters.some(c =>
            chars.includes(c.id)
          )
        )
      )
    }
  />
</ChapterFilter>
```

### 3. 情节结构可视化
```tsx
<PlotStructureTimeline>
  {nodes.map(node => (
    <TimelineNode
      key={node.id}
      beatTag={node.beatTag}
      position={getBeatPosition(node.beatTag)}
    >
      {node.title}
    </TimelineNode>
  ))}
</PlotStructureTimeline>
```

---

## ✅ 验收标准

### 功能完整性
- [ ] AI生成的大纲包含`relatedCharacterNames`字段
- [ ] AI生成的大纲包含`relatedLocationNames`字段
- [ ] AI生成的大纲包含`beatTag`字段
- [ ] 后端正确将名称转换为UUID引用

### 数据准确性
- [ ] 关联的人物/地点在项目中实际存在
- [ ] UUID引用无错误
- [ ] beatTag值在预定义枚举范围内

### AI智能度
- [ ] AI能根据上下文合理选择关联人物
- [ ] AI能正确识别情节类型标签
- [ ] 生成的元数据与内容一致

---

## 📋 实施检查清单

### Phase 1: Schema升级
- [ ] 修改`services/schemas.ts`中的`AiPlotNodeSchema`
- [ ] 添加`relatedCharacterNames`字段定义
- [ ] 添加`relatedLocationNames`字段定义
- [ ] 添加`beatTag`字段定义及枚举值
- [ ] 更新Schema文档注释

### Phase 2: Prompt工程
- [ ] 修改`services/gemini/plot.ts`的`generatePlotFromContext()`
- [ ] 在Prompt中添加人物和地点列表
- [ ] 明确说明元数据字段的格式要求
- [ ] 提供beatTag的详细说明和示例
- [ ] 测试Prompt效果并调优

### Phase 3: 后端集成
- [ ] 实现`getCharacterNameToIdMap()`辅助函数
- [ ] 实现`getLocationNameToIdMap()`辅助函数
- [ ] 在plot生成路由中集成名称转换逻辑
- [ ] 添加错误处理（名称找不到的情况）
- [ ] 编写单元测试

### Phase 4: 前端集成（可选）
- [ ] 更新PlotNode组件显示关联信息
- [ ] 添加人物/地点徽章组件
- [ ] 实现按人物筛选功能
- [ ] 添加情节结构可视化
- [ ] 更新UI文档

---

## 🚀 快速开始

### 开发步骤

**Step 1**: Schema修改（30分钟）
```bash
# 编辑文件
code services/schemas.ts

# 添加新字段定义
# 参考"技术实施方案 > 1️⃣ 修改Schema定义"
```

**Step 2**: Prompt优化（1小时）
```bash
# 编辑文件
code services/gemini/plot.ts

# 修改generatePlotFromContext的Prompt
# 参考"技术实施方案 > 2️⃣ 升级Plot生成服务"
```

**Step 3**: 后端集成（1.5小时）
```bash
# 创建辅助函数
# 实现名称到UUID的映射和转换
# 参考"技术实施方案 > 3️⃣ 后端数据组装"
```

**Step 4**: 测试验证（1小时）
```bash
# 手动测试
npm run dev
# 创建测试项目，生成大纲，验证元数据
```

**总预计时间**: 4小时（不含可选的前端UI工作）

---

## 🎓 学习资源

### 相关概念
- **Beat Sheet**: 故事节拍表（Blake Snyder）
- **Story Structure**: 三幕式结构、英雄之旅
- **Plot Points**: 情节转折点理论

### 参考文档
- [AI Schema设计指南](./template_schema_design.md)
- [Prompt工程最佳实践](../README_PROMPT_ENGINEERING.md)
- [数据库UUID引用规范](../docs/database-id-conventions.md)

---

## 🤝 团队协作

**建议分工**:
- **AI工程师**: 负责Prompt优化和Schema设计
- **后端工程师**: 负责UUID映射和路由集成
- **前端工程师**: 负责UI增强显示（可选）
- **测试工程师**: 编写测试用例和验证

---

**创建日期**: 2026-04-21
**负责人**: 待分配
**优先级**: P2（高优先级）
**预计完成**: TBD

---

**朋友们，P2任务的核心是让AI更智能！不仅是生成文本，更要理解故事结构！**
