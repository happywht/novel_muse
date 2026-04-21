# PlotNode名称到UUID映射功能使用指南

## 功能概述

P2增强功能实现了PlotNode中角色和地点名称到UUID的自动映射转换，解决了AI生成大纲时使用名称而数据库需要UUID引用的问题。

## 核心功能

### 1. 名称到UUID映射

**场景**: AI生成的PlotNode包含`relatedCharacterNames`和`relatedLocationNames`（字符串数组），需要转换为`relatedCharacters`和`relatedLocations`（UUID数组）。

**解决方案**:
- 后端自动构建项目角色和地点的名称→UUID映射表
- 智能转换名称为UUID引用
- 处理无法匹配的名称（记录警告）
- 保留已存在的UUID引用（向后兼容）

## API端点

### POST /api/projects/:id/plotnodes/convert-names-to-uuids

将PlotNode数组中的名称转换为UUID引用。

**请求体**:
```json
{
  "nodes": [
    {
      "title": "第一次相遇",
      "content": "张三和李四在咖啡厅相遇",
      "relatedCharacterNames": ["张三", "李四"],
      "relatedLocationNames": ["咖啡厅"],
      "beatTag": "INCITING_INCIDENT"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "nodes": [
    {
      "title": "第一次相遇",
      "content": "张三和李四在咖啡厅相遇",
      "relatedCharacterNames": ["张三", "李四"],
      "relatedLocationNames": ["咖啡厅"],
      "relatedCharacters": ["char-uuid-1", "char-uuid-2"],
      "relatedLocations": ["loc-uuid-1"],
      "beatTag": "INCITING_INCIDENT"
    }
  ],
  "stats": {
    "totalNodes": 1,
    "totalCharacterMappings": 2,
    "totalLocationMappings": 1,
    "totalCharacterWarnings": 0,
    "totalLocationWarnings": 0,
    "hasWarnings": false
  }
}
```

### GET /api/projects/:id/mappings/characters

获取项目角色的名称到UUID映射表。

**响应**:
```json
{
  "success": true,
  "projectId": "project-123",
  "mapping": {
    "张三": "char-uuid-1",
    "李四": "char-uuid-2"
  },
  "count": 2
}
```

### GET /api/projects/:id/mappings/locations

获取项目地点的名称到UUID映射表。

**响应**:
```json
{
  "success": true,
  "projectId": "project-123",
  "mapping": {
    "咖啡厅": "loc-uuid-1",
    "公园": "loc-uuid-2"
  },
  "count": 2
}
```

## 前端使用示例

### 1. AI生成PlotNode后转换UUID

```typescript
import { projectApi } from '@/services/api';

// 假设AI生成了PlotNode数组
const aiGeneratedNodes = [
  {
    title: '第一次相遇',
    content: '张三和李四在咖啡厅相遇',
    relatedCharacterNames: ['张三', '李四'],
    relatedLocationNames: ['咖啡厅'],
    beatTag: 'INCITING_INCIDENT'
  }
];

// 转换为UUID引用
const result = await projectApi.convertPlotNodeNamesToUUIDs(
  'project-123',
  aiGeneratedNodes
);

console.log('转换后的PlotNodes:', result.nodes);
console.log('映射统计:', result.stats);
console.log('警告信息:', result.warnings);
```

### 2. 在Plot Weaver集成中使用

```typescript
// hooks/usePlotWeaverAI.ts
import { projectApi } from '@/services/api';

export const usePlotWeaverAI = () => {
  const generatePlot = async (projectId: string, premise: string) => {
    // 1. 调用AI生成PlotNode
    const aiNodes = await generatePlotFromContext(premise, ...otherArgs);

    // 2. 转换名称为UUID
    const { nodes: enhancedNodes, stats, warnings } =
      await projectApi.convertPlotNodeNamesToUUIDs(projectId, aiNodes);

    // 3. 处理警告（如果有）
    if (warnings && warnings.length > 0) {
      console.warn('PlotNode映射警告:', warnings);
      // 可选：显示用户友好的提示
    }

    // 4. 返回增强后的PlotNodes
    return enhancedNodes;
  };

  return { generatePlot };
};
```

### 3. React组件中的使用

```typescript
import { projectApi } from '@/services/api';

export const PlotGenerator = () => {
  const handleGeneratePlot = async () => {
    try {
      // 生成AI大纲
      const aiResponse = await callAIService();
      const aiNodes = aiResponse.nodes;

      // 转换UUID
      const { nodes, stats, warnings } = await projectApi.convertPlotNodeNamesToUUIDs(
        currentProject.id,
        aiNodes
      );

      // 检查转换结果
      if (stats.hasWarnings) {
        setShowMappingWarnings(true);
        setMappingWarnings(warnings || []);
      }

      // 保存到状态
      setPlotNodes(nodes);

    } catch (error) {
      console.error('Plot生成失败:', error);
    }
  };

  return (
    <div>
      <button onClick={handleGeneratePlot}>生成大纲</button>

      {mappingWarnings.length > 0 && (
        <WarningBanner>
          <p>部分角色或地点无法匹配：</p>
          <ul>
            {mappingWarnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </WarningBanner>
      )}
    </div>
  );
};
```

## 后端直接使用

### 在服务中导入并使用

```typescript
import {
  getCharacterNameToIdMap,
  getLocationNameToIdMap,
  convertPlotNodeNamesToUuids
} from '../services/graph/mappers';

// 在自定义服务中使用
export async function customPlotGeneration(projectId: string) {
  // 1. AI生成PlotNode
  const aiNodes = await generateAIPlotNodes();

  // 2. 转换名称为UUID
  const enhancedNodes = await convertPlotNodeNamesToUuids(aiNodes, projectId);

  // 3. 处理映射信息
  enhancedNodes.forEach(node => {
    if (node._mappingInfo) {
      const { characters, locations } = node._mappingInfo;
      console.log(`节点 "${node.title}":`, {
        charactersMapped: characters.mapped,
        locationsMapped: locations.mapped,
        warnings: [...characters.warnings, ...locations.warnings]
      });
    }
  });

  // 4. 返回清理后的节点（移除_mappingInfo）
  return enhancedNodes.map(({ _mappingInfo, ...node }) => node);
}
```

## 错误处理

### 名称无法匹配的警告

当AI生成的名称在项目中找不到对应实体时，会生成警告：

```
[Mapper] Character "赵六" not found in project (Node "神秘访客" #3)
[Mapper] Location "图书馆" not found in project (Node "学习场景" #5)
```

**处理建议**:
1. **前端显示警告**: 让用户知道某些名称未能匹配
2. **用户手动关联**: 提供界面让用户创建缺失的角色/地点
3. **AI重新生成**: 使用修正后的实体列表重新生成

### 完全失败的错误处理

```typescript
try {
  const result = await projectApi.convertPlotNodeNamesToUUIDs(projectId, nodes);
} catch (error) {
  if (error.response?.status === 404) {
    console.error('项目不存在');
  } else if (error.response?.status === 500) {
    console.error('服务器内部错误:', error.response.data.details);
  }
}
```

## 性能优化

### 缓存映射表

映射表会被缓存以提高性能：

```typescript
// 首次调用会查询数据库
const result1 = await convertPlotNodeNamesToUuids(nodes1, projectId);

// 后续调用会使用缓存的映射表
const result2 = await convertPlotNodeNamesToUuids(nodes2, projectId);
```

### 批量处理

一次性处理多个PlotNode比逐个处理更高效：

```typescript
// ✅ 推荐：批量处理
const allNodes = [...nodes1, ...nodes2, ...nodes3];
const result = await convertPlotNodeNamesToUuids(allNodes, projectId);

// ❌ 不推荐：逐个处理
for (const node of allNodes) {
  const result = await convertPlotNodeNamesToUuids([node], projectId);
}
```

## 测试

运行测试套件：

```bash
npm test -- mappers.test.ts
```

测试覆盖率：
- ✅ 名称到UUID映射生成
- ✅ 角色名称转换
- ✅ 地点名称转换
- ✅ 批量PlotNode转换
- ✅ 错误处理和警告生成
- ✅ 向后兼容性

## 最佳实践

1. **AI生成时使用名称**: 让AI使用名称（`relatedCharacterNames`）而非UUID，更易于理解和调试
2. **后端转换UUID**: 在保存到数据库前转换为UUID引用
3. **前端显示名称**: 前端界面显示角色/地点名称，而非UUID
4. **处理警告**: 始终检查转换警告并适当处理
5. **向后兼容**: 保留`relatedCharacters`字段以支持旧数据

## 故障排查

### 常见问题

**Q: 为什么某些名称无法匹配？**
A: 可能原因：
- 角色或地点在项目中不存在
- 名称格式不匹配（如空格、标点符号）
- 大小写不匹配（目前区分大小写）

**Q: 如何调试映射失败？**
A: 检查响应中的`warnings`字段，查看具体哪些名称无法匹配，然后：
1. 确认项目中是否存在对应的角色/地点
2. 检查名称拼写是否一致
3. 查看控制台日志获取详细警告信息

**Q: 映射表多久更新一次？**
A: 映射表在每次调用时实时构建，确保数据最新。如需缓存，可考虑在前端或服务层实现。

## 更新日志

### v1.0.0 (2025-01-XX)
- ✅ 实现基础名称到UUID映射功能
- ✅ 添加API端点用于PlotNode转换
- ✅ 支持角色和地点映射
- ✅ 添加错误处理和警告系统
- ✅ 编写完整的测试套件
