# 导入导出功能增强 (Phase 4)

## 概述

本文档描述了模板覆盖系统的导入导出功能增强，包括版本迁移、增强验证和改进的错误反馈。

## 新增功能

### 1. 版本兼容性和迁移

#### 支持的版本
- `1.0` - 初始版本
- `1.0.0` - 当前版本（与 1.0 完全兼容）

#### 版本迁移机制

系统现在支持自动版本迁移，可以将旧版本的配置迁移到当前版本：

```typescript
// 导入旧版本配置（v1.0）
const importData = {
  version: '1.0',
  templates: [...]
};

// 系统会自动迁移到 v1.0.0
const response = await fetch('/api/projects/:id/templates/import', {
  method: 'POST',
  body: JSON.stringify(importData)
});

// 响应包含迁移信息
{
  "success": true,
  "migratedFromVersion": "1.0",
  "warnings": ["配置已从版本 1.0 迁移到 1.0.0"]
}
```

#### 未来版本扩展

系统预留了版本迁移扩展点，未来可以通过添加迁移函数来支持新版本：

```typescript
// 在 templateOverrides.ts 中添加新的迁移器
const VERSION_MIGRATORS: Record<string, VersionMigrator> = {
  '1.1': (config) => {
    // 从 1.1 迁移到 1.0.0 的逻辑
    return {
      ...config,
      version: '1.0.0',
      // 其他迁移逻辑
    };
  },
};
```

### 2. 增强的数据格式验证

#### 多层验证

系统现在执行多层验证：

1. **基础格式验证**
   - 检查必需字段（version, templates）
   - 验证字段类型
   - 检查版本兼容性

2. **模板ID验证**
   - 检查 templateId 是否存在
   - 验证 templateId 是否在可用模板列表中

3. **深度验证**
   - 验证系统指令格式和长度
   - 验证区块覆盖配置
   - 验证变量默认值类型

#### 验证示例

```typescript
// 有效配置
const validImport = {
  version: '1.0',
  templates: [
    {
      templateId: 'scene_generation',
      systemInstruction: 'Custom instruction',
      blocks: {
        'genre_info': {
          template: 'Custom template'
        }
      },
      variableDefaults: {
        targetWordCount: 5000
      }
    }
  ]
};

// 无效配置示例
const invalidImport = {
  version: '1.0',
  templates: [
    {
      templateId: 'invalid_id',  // 错误：模板不存在
      systemInstruction: 123,     // 错误：应该是字符串
    }
  ]
};
```

### 3. 改进的错误反馈

#### 详细的导入统计

导入响应现在包含详细的统计信息：

```typescript
interface ImportStats {
  total: number;      // 总模板数
  imported: number;   // 成功导入数
  skipped: number;    // 跳过数
  errors: number;     // 错误数
  warnings: number;   // 警告数
}
```

#### 详细的结果详情

每个模板的验证结果都被记录：

```typescript
interface ImportDetail {
  templateId: string;
  valid: boolean;
  error?: string;
  warning?: string;
  skipped?: boolean;
  skipReason?: string;
}
```

#### 完整的响应示例

**成功导入：**

```json
{
  "success": true,
  "message": "成功导入 2/3 个模板覆盖配置",
  "mode": "merge",
  "stats": {
    "total": 3,
    "imported": 2,
    "skipped": 1,
    "errors": 1,
    "warnings": 0
  },
  "details": [
    {
      "templateId": "scene_generation",
      "valid": true
    },
    {
      "templateId": "invalid_template",
      "valid": false,
      "error": "模板 invalid_template 不存在",
      "skipped": true,
      "skipReason": "模板 invalid_template 不存在"
    },
    {
      "templateId": "chapter_outline",
      "valid": true,
      "warning": "Variable 'unknownVar' type mismatch"
    }
  ],
  "warnings": [],
  "migratedFromVersion": "1.0"
}
```

**完全失败：**

```json
{
  "error": "No valid templates",
  "message": "导入文件中没有有效的模板覆盖配置",
  "stats": {
    "total": 2,
    "imported": 0,
    "skipped": 2,
    "errors": 2,
    "warnings": 0
  },
  "details": [
    {
      "templateId": "unknown",
      "valid": false,
      "error": "缺少 templateId 字段",
      "skipped": true
    },
    {
      "templateId": "invalid_template",
      "valid": false,
      "error": "模板 invalid_template 不存在",
      "skipped": true
    }
  ],
  "warnings": []
}
```

## API 使用

### 导入配置

```typescript
POST /api/projects/:id/templates/import?mode=merge|overwrite

// 请求体
{
  "version": "1.0",
  "exportedAt": "2026-03-31T10:00:00Z",
  "templates": [
    {
      "templateId": "scene_generation",
      "systemInstruction": "Custom instruction",
      "blocks": { ... },
      "variableDefaults": { ... }
    }
  ],
  "metadata": {
    "projectId": "source-project-id",
    "projectName": "Source Project"
  }
}
```

#### 导入模式

- **merge** (默认): 将导入的配置与现有配置合并
- **overwrite**: 完全覆盖现有配置

### 导出配置

```typescript
GET /api/projects/:id/templates/export

// 响应
{
  "version": "1.0",
  "exportedAt": "2026-03-31T10:00:00Z",
  "templates": [ ... ],
  "metadata": {
    "projectId": "project-id",
    "projectName": "Project Name"
  }
}
```

## 错误处理

### 常见错误

1. **版本不兼容**
   ```json
   {
     "error": "Invalid format",
     "message": "不支持的版本号: 2.0，当前支持的版本: 1.0, 1.0.0"
   }
   ```

2. **格式错误**
   ```json
   {
     "error": "Invalid format",
     "message": "templates 字段必须为数组"
   }
   ```

3. **无效模板ID**
   ```json
   {
     "error": "No valid templates",
     "message": "导入文件中没有有效的模板覆盖配置",
     "details": [
       {
         "templateId": "invalid_id",
         "valid": false,
         "error": "模板 invalid_id 不存在"
       }
     ]
   }
   ```

4. **验证失败**
   ```json
   {
     "error": "No valid templates",
     "details": [
       {
         "templateId": "scene_generation",
         "valid": false,
         "error": "System instruction cannot be empty"
       }
     ]
   }
   ```

## 测试

测试文件位于 `server/src/__tests__/api/importEnhancements.test.ts`，包含以下测试场景：

- 版本迁移（v1.0 → v1.0.0）
- 版本兼容性检查
- 数据格式验证
- 模板ID验证
- 导入统计
- 错误反馈
- 合并模式 vs 覆盖模式

运行测试：

```bash
cd server
npm test -- importEnhancements.test.ts
```

## 向后兼容性

所有更改都保持向后兼容：

1. 现有的 v1.0 配置可以无缝导入
2. 导入响应包含所有原有字段
3. 新增字段都是可选的
4. 验证逻辑更加宽松，不会破坏现有功能

## 未来改进

1. **批量导入优化**: 支持大量模板的高效导入
2. **导入预览**: 在实际导入前预览变更
3. **回滚支持**: 导入失败时自动回滚
4. **差异报告**: 显示导入配置与现有配置的差异
5. **导入历史**: 记录导入操作历史

## 相关文件

- `server/src/routes/templateOverrides.ts` - 主要实现
- `types/templateOverride.ts` - 类型定义
- `services/templateMerge.ts` - 模板合并逻辑
- `config/templates/defaults.ts` - 默认模板定义
- `docs/template_schema_design.md` - Schema 设计文档
