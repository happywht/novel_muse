# 图谱API单元测试文档

> 本文档说明了如何运行和编写图谱API的单元测试。

## 运行测试

### 巻加测试脚本

测试脚本已添加到 `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 运行所有测试

```bash
cd server
npm test
```

### 运行特定测试文件

```bash
cd server
npm test -- sync.test.ts
npm test -- queries.test.ts
```

### 运行测试并生成覆盖率报告

```bash
cd server
npm run test:coverage
```

### 监视模式运行测试

```bash
cd server
npm run test:watch
```

## 测试覆盖范围

### sync.ts 测试

- `syncEchoToGraph()` - Echo同步到图谱
  - 基本同步功能
  - 空triples处理
  - WORLD类型处理
  - 伏笔标记处理

  - 错误处理

- `syncChapterToGraph()` - Chapter同步到图谱
  - 基本同步功能
  - 无plotNodeId处理
  - 无expectedPOV处理
  - 空beats处理
  - 错误处理

- `syncChaptersToGraph()` - 批量章节同步
  - 批量同步
  - 空数组处理
  - null/undefined处理

- `syncForgeResult()` - Forge结果同步
  - Echo同步
  - 角色状态更新
  - 错误收集
  - 统计信息返回

### queries.ts 测试

- `getCharacterTraits()` - 角色特质查询
  - 成功查询
  - 角色不存在情况
  - 部分特征为null
  - 数据库错误处理

- `getRelationshipTimeline()` - 关系时间线
  - 成功查询
  - 角色不存在情况
  - 无关系记录情况
  - 数据库错误处理

- `getEchoForeshadowing()` - 未回收伏笔
  - 成功查询
  - 无伏笔情况
  - 无关联章节情况
  - 数据库错误处理

- `detectContradictions()` - 矛盾检测
  - 关系矛盾检测
  - 状态不匹配检测
  - 无矛盾情况
  - 严重程度设置
  - 数据库错误处理

- `getChapterDependencies()` - 章节依赖关系
  - 成功查询
  - 章节不存在情况
  - beats JSON解析
  - 无效beats处理
  - 数据库错误处理

- `getConflictHeatmapData()` - 冲突热力图数据
  - 成功查询
  - 空章节情况
  - 冲突强度推断
  - 无效JSON处理
  - 数据库错误处理

- `getForgeContext()` - Forge上下文
  - 成功查询
  - characterIds过滤
  - 空地点上下文
  - 空情节上下文
  - 数据库错误处理

- `getWorldSettingHierarchy()` - 世界设定层级树
  - 成功查询(指定rootId)
  - 完整森林查询
  - 空世界设定情况
  - 嵌套层级处理
  - 数据库错误处理

## 测试文件结构

```
server/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts           # 测试设置文件
│   │   └── graph/
│   │       ├── __mocks__/
│   │       │   ├── client.ts   # Neo4j driver mock
│   │       │   └── llm.ts       # LLM service mock
│   │       ├── sync.test.ts     # sync.ts 测试
│   │       └── queries.test.ts  # queries.ts 测试
│   └── services/
│       └── graph/
│           ├── client.ts         # Neo4j 客户端
│           ├── sync.ts           # 同步服务
│           └── queries.ts        # 查询服务
└── jest.config.js              # Jest 配置
```

## Mock 说明

### Neo4j Driver Mock

`__mocks__/client.ts` 提供了完整的 Neo4j driver 模拟:

```typescript
// 设置模拟返回结果
mockSession.setMockResult('MATCH (c:Character', [records]);

// 设置模拟失败
mockSession.setFailure(true, new Error('Database error'));

// 重置所有模拟
mockSession.reset();
```

### LLM Mock

`__mocks__/llm.ts` 提供了 LLM 服务模拟:

```typescript
// 设置模拟响应
setMockLLMResponse({ content: '...', triples: [...] });

// 设置模拟失败
setMockLLMFailure(new Error('LLM error'));

// 重置模拟
resetMockLLM();
```

## 编写新测试

### 测试模板

```typescript
describe('My Test Suite', () => {
  let mockSession: ReturnType<ReturnType<typeof getMockDriver>['getMockSession']>;

  beforeEach(() => {
    const mockDriver = getMockDriver();
    mockSession = mockDriver.getMockSession();
    mockSession.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockSession.reset();
  });

  describe('My Function', () => {
    it('应该成功...', async () => {
      // 设置mock
      mockSession.setMockResult('MATCH ...', [createMockRecord({ ... })]);

      // 调用函数
      const result = await myFunction();

      // 断言
      expect(result).toBeDefined();
    });

    it('应该处理错误', async () => {
      mockSession.setFailure(true, new Error('Test error'));

      await expect(myFunction()).rejects.toThrow();
    });
  });
});
```
