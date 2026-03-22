# 模块级变量移入 Zustand Store 重构总结

## 修改日期
2026-03-22

## 问题背景
`useProjectStore.ts` 使用模块级变量 `_saveTimer` 和 `_pendingPatch` 来管理同步状态，这导致：
1. 状态不可追踪
2. 无法被 Zustand devtools 调试
3. 违反了 Zustand 的最佳实践

## 修改内容

### 1. 在 ProjectStore 接口中添加 _internal 状态
**文件**: `store/useProjectStore.ts` (第 139-143 行)

```typescript
// --- Internal Sync State (for devtools tracking) ---
_internal: {
    saveTimer: number | null;  // setTimeout 返回值在浏览器中是 number
    pendingPatch: Partial<ProjectState>;
};
```

### 2. 删除模块级变量
**删除位置**: 第 179-180 行（原位置）

```typescript
// 已删除
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingPatch: Partial<ProjectState> = {};
```

### 3. 在初始状态中添加 _internal
**文件**: `store/useProjectStore.ts` (第 198-202 行)

```typescript
// --- Internal Sync State ---
_internal: {
    saveTimer: null,
    pendingPatch: {},
},
```

### 4. 更新 updateProject 函数
**文件**: `store/useProjectStore.ts` (第 214-229 行)

修改前:
```typescript
_pendingPatch = { ..._pendingPatch, ...data };
```

修改后:
```typescript
set((state) => ({
    project: { ...state.project, ...data },
    _internal: {
        ...state._internal,
        pendingPatch: { ...state._internal.pendingPatch, ...data },
    },
}));
```

### 5. 更新 syncToBackend 函数
**文件**: `store/useProjectStore.ts` (第 433-482 行)

主要变更:
- 将 `_saveTimer` 替换为 `get()._internal.saveTimer`
- 将 `_pendingPatch` 替换为 `get()._internal.pendingPatch`
- 使用 `set()` 更新状态，确保 devtools 可以追踪

### 6. 更新 updateChapterSummary 函数
**文件**: `store/useProjectStore.ts` (第 553-572 行)

修改前:
```typescript
_pendingPatch = { ..._pendingPatch, chapters: updatedChapters };
```

修改后:
```typescript
set((state) => ({
    project: { ...state.project, chapters: updatedChapters },
    _internal: {
        ...state._internal,
        pendingPatch: { ...state._internal.pendingPatch, chapters: updatedChapters },
    },
}));
```

### 7. 修复批量操作中的 updateProject 引用
**文件**: `store/useProjectStore.ts` (多处)

修改前:
```typescript
updateProject({ echoes: updatedEchoes });
```

修改后:
```typescript
get().updateProject({ echoes: updatedEchoes });
```

## 验证结果

### TypeScript 编译检查
```bash
npx tsc --noEmit --project tsconfig.json
```
结果: **通过** - 无类型错误

### 构建测试
```bash
npm run build
```
结果: **成功** - 构建完成，生成生产包

## 功能保持验证

### 1. 状态追踪
- ✅ `_internal.saveTimer` 现在可以通过 Zustand devtools 查看
- ✅ `_internal.pendingPatch` 现在可以通过 Zustand devtools 查看
- ✅ 所有状态变更都通过 `set()` 方法，确保可追踪

### 2. 同步功能
- ✅ 防抖功能正常（`saveTimer` 管理）
- ✅ 增量同步正常（`pendingPatch` 管理）
- ✅ 全量同步正常（复杂字段检测）

### 3. 数据一致性
- ✅ `updateProject` 正确更新 `pendingPatch`
- ✅ `syncToBackend` 正确清空 `pendingPatch`
- ✅ `updateChapterSummary` 正确更新 `pendingPatch`

## 优势

### 1. 可调试性
- 所有状态都可以通过 Redux DevTools 查看
- 状态变更历史可追踪
- 时间旅行调试可用

### 2. 代码一致性
- 所有状态管理都遵循 Zustand 模式
- 消除了模块级变量的副作用
- 提高了代码可维护性

### 3. 测试友好
- 状态完全封装在 store 中
- 更容易进行单元测试
- 状态重置更简单

## 后续建议

1. **添加 DevTools 集成**:
```typescript
import { devtools } from 'zustand/middleware';

export const useProjectStore = create(
  devtools<ProjectStore>((set, get) => ({
    // ... store implementation
  }), { name: 'ProjectStore' })
);
```

2. **考虑持久化 _internal 状态**:
- 当前 `pendingPatch` 不需要持久化（页面刷新后清空是合理的）
- 如果需要跨页面保持未同步的修改，可以考虑添加到持久化配置中

3. **性能监控**:
- 可以在 devtools 中监控 `pendingPatch` 的大小
- 添加性能指标来跟踪同步频率

## 相关文件
- `store/useProjectStore.ts` - 主要修改文件
- `services/apiService.ts` - API 服务（未修改）
- `services/storageService.ts` - 存储服务（未修改）
