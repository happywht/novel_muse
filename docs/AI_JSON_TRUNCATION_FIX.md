# AI JSON 截断问题修复方案

> **创建日期**: 2026-04-21
> **优先级**: P0 (阻塞问题)
> **状态**: 🚧 待实施

---

## 🐛 问题分析

### 错误详情

```
[Zod] batchGenerateCharacters: JSON.parse failed.
SyntaxError: Unterminated string in JSON at position 8301 (line 217 column 46)
```

### 根本原因

1. **AI 输出过长被截断**
   - 位置：第 8301 个字符
   - 状态：字符串未正确关闭
   - 影响：整个 JSON 无法解析

2. **缺少截断恢复机制**
   - `safeParseAiJson` 函数无法处理不完整的 JSON
   - 一旦被截断，直接返回 null

3. **角色生成请求过于复杂**
   - 要求生成 7 个完整角色
   - 每个角色包含 10+ 个字段
   - `structuredRelations` 数组增加复杂度

---

## 💡 修复方案

### 方案 1: 降低生成复杂度 ⭐⭐⭐ (推荐)

**目标**: 减少 AI 输出长度，避免截断

#### 1.1 减少角色数量

**位置**: `services/gemini/world.ts` 第 56 行

**修改前**:
```typescript
const characterCount = 7; // 生成 7 个角色
```

**修改后**:
```typescript
const characterCount = 5; // 减少到 5 个角色
```

**预期效果**: JSON 长度减少约 30%

---

#### 1.2 简化字段要求

**位置**: `services/gemini/world.ts` 第 58-86 行

**修改前**:
```typescript
const characterSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            archetype: { type: Type.STRING },
            description: { type: Type.STRING },
            alignment: { type: Type.STRING },
            desire: { type: Type.STRING },
            fear: { type: Type.STRING },
            signature: { type: Type.STRING },
            contrast: { type: Type.STRING },
            weakness: { type: Type.STRING },
            relationships: { type: Type.STRING },
            structuredRelations: {
                type: Type.ARRAY,
                items: { /* ... */ }
            }
        }
    }
};
```

**修改后** (核心字段 + 可选扩展):
```typescript
const characterSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            // 核心必填字段
            name: { type: Type.STRING },
            role: { type: Type.STRING },
            archetype: { type: Type.STRING },
            description: { type: Type.STRING },

            // 可选扩展字段
            alignment: { type: Type.STRING, optional: true },
            desire: { type: Type.STRING, optional: true },
            fear: { type: Type.STRING, optional: true },
            signature: { type: Type.STRING, optional: true },

            // 暂时移除复杂字段
            // contrast: { type: Type.STRING, optional: true },
            // weakness: { type: Type.STRING, optional: true },
            // relationships: { type: Type.STRING, optional: true },
            // structuredRelations: { type: Type.ARRAY, optional: true }
        }
    }
};
```

**预期效果**: JSON 长度减少约 50%

---

### 方案 2: 添加 JSON 修复逻辑 ⭐⭐

**目标**: 尝试自动修复截断的 JSON

#### 2.1 实现截断恢复函数

**位置**: `services/schemas.ts` (新增函数)

```typescript
/**
 * 尝试修复截断的 JSON 字符串
 *
 * @param truncatedJson - 被截断的 JSON 字符串
 * @returns 修复后的完整 JSON 字符串，或原字符串（如果无法修复）
 */
function attemptFixTruncatedJSON(truncatedJson: string): string {
    // 策略 1: 闭合未完成的字符串
    let fixed = truncatedJson;

    // 检查是否有未闭合的字符串
    const lastQuoteIndex = truncatedJson.lastIndexOf('"');
    if (lastQuoteIndex > 0) {
        const afterLastQuote = truncatedJson.substring(lastQuoteIndex + 1);

        // 如果最后一个引号后面没有逗号或括号，说明字符串未闭合
        if (!afterLastQuote.match(/^[,}\]\s]*$/)) {
            // 查找字符串开始位置
            const prevNewline = truncatedJson.lastIndexOf('\n', lastQuoteIndex);
            const prevQuote = truncatedJson.lastIndexOf('"', lastQuoteIndex - 1);

            if (prevQuote !== -1) {
                // 在最后一个引号后添加闭合引号
                fixed = truncatedJson.substring(0, lastQuoteIndex + 1) + '"' +
                        truncatedJson.substring(lastQuoteIndex + 1);
            }
        }
    }

    // 策略 2: 闭合数组/对象
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    // 添加缺失的闭合括号
    const missingCloseBraces = openBraces - closeBraces;
    const missingCloseBrackets = openBrackets - closeBrackets;

    for (let i = 0; i < missingCloseBrackets; i++) {
        fixed += ']';
    }
    for (let i = 0; i < missingCloseBraces; i++) {
        fixed += '}';
    }

    return fixed;
}
```

#### 2.2 集成到 `safeParseAiJson`

**位置**: `services/schemas.ts` 第 44-52 行

**修改前**:
```typescript
try {
    rawObj = JSON.parse(cleanedText);
} catch (jsonError) {
    console.error(`[Zod] ${label}: JSON.parse failed. Raw text (first 500 chars):`, cleanedText.substring(0, 500));
    console.error(`[Zod] ${label}: JSON.parse error details:`, jsonError);
    return null;
}
```

**修改后**:
```typescript
try {
    rawObj = JSON.parse(cleanedText);
} catch (jsonError) {
    console.error(`[Zod] ${label}: JSON.parse failed. Raw text (first 500 chars):`, cleanedText.substring(0, 500));
    console.error(`[Zod] ${label}: JSON.parse error details:`, jsonError);

    // 尝试修复截断的 JSON
    console.log(`[Zod] ${label}: Attempting to fix truncated JSON...`);
    const fixedText = attemptFixTruncatedJSON(cleanedText);

    try {
        rawObj = JSON.parse(fixedText);
        console.log(`[Zod] ${label}: Successfully fixed and parsed JSON!`);
    } catch (fixError) {
        console.error(`[Zod] ${label}: Fix attempt failed.`, fixError);
        return null;
    }
}
```

---

### 方案 3: 分批生成 + 合并 ⭐

**目标**: 避免单次请求过长

#### 实施步骤

1. **将角色生成拆分为多批**
   - 第1批：主角 + 反派 + 导师（3个）
   - 第2批：伙伴 + 守护者（2个）
   - 第3批：变形者 + 捣蛋鬼（2个）

2. **并发请求，然后合并结果**

```typescript
export const batchGenerateCharacters = async (
    premise: string,
    genre: string,
    settings?: CreativeSettings
): Promise<Omit<Character, 'id'>[]> => {
    // 分批配置
    const batches = [
        { roles: ['主角', '反派', '导师'], count: 3 },
        { roles: ['伙伴', '守护者'], count: 2 },
        { roles: ['变形者', '捣蛋鬼'], count: 2 }
    ];

    // 并发生成
    const results = await Promise.all(
        batches.map(batch =>
            generateCharacterBatch(premise, genre, settings, batch.roles, batch.count)
        )
    );

    // 合并结果
    return results.flat();
};
```

---

## 📋 实施计划

### Phase 1: 快速修复 (30分钟)

- [ ] 减少角色数量：7 → 5
- [ ] 暂时移除可选字段（contrast, weakness, relationships）
- [ ] 测试验证

**预期效果**: JSON 长度减少 40-50%，基本解决截断问题

---

### Phase 2: 增强容错 (1小时)

- [ ] 实现 `attemptFixTruncatedJSON` 函数
- [ ] 集成到 `safeParseAiJson`
- [ ] 添加修复日志
- [ ] 测试验证

**预期效果**: 即使截断也能尝试修复，提高成功率

---

### Phase 3: 架构优化 (2小时)

- [ ] 实现分批生成方案
- [ ] 添加进度反馈
- [ ] 优化用户体验
- [ ] 测试验证

**预期效果**: 彻底解决长度限制，支持更多角色

---

## 🎯 推荐方案

**立即执行**: Phase 1 (快速修复)
- 风险低
- 实施快
- 效果明显

**后续优化**: Phase 2 (增强容错)
- 提高鲁棒性
- 处理边界情况
- 作为安全网

**长期规划**: Phase 3 (架构优化)
- 完全解决限制
- 支持扩展场景
- 最佳用户体验

---

## ✅ 验收标准

- [ ] "一键创世纪"功能成功率 > 95%
- [ ] JSON 解析失败率 < 5%
- [ ] 角色数据完整性检查通过
- [ ] 用户无感知修复过程

---

**预计总时间**: 3.5小时（分3个阶段）
**优先级**: P0 (阻塞功能)
**状态**: 🚧 待审核
