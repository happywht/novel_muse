# 数据迁移脚本运行指南

**脚本路径**: `server/scripts/prisma/migrateRelations_fixed.ts`
**更新日期**: 2026-03-21
**状态**: ✅ 已验证通过

---

## 📋 快速开始

### 1. 运行测试模式（推荐首先执行）

```bash
cd D:\家庭\副业探索\小说项目\小说开题\remix_-muse_-小说架构师_022302\server
npx ts-node --compiler-options '{"target":"ES2022","module":"commonjs"}' scripts/prisma/migrateRelations_fixed.ts --test
```

**预期输出**:

```
========== 测试结果 ==========
通过: 10/10
失败: 0/10
成功率: 100.0%
==============================
```

---

### 2. 执行实际迁移

```bash
cd D:\家庭\副业探索\小说项目\小说开题\remix_-muse_-小说架构师_022302\server
npx ts-node --compiler-options '{"target":"ES2022","module":"commonjs"}' scripts/prisma/migrateRelations_fixed.ts
```

---

## ✅ 运行前检查清单

### 环境检查

- [ ] Node.js 已安装 (建议 v18+)
- [ ] ts-node 已安装 (`npm list ts-node`)
- [ ] @prisma/client 已安装 (`npm list @prisma/client`)
- [ ] 数据库连接正常 (DATABASE_URL 环境变量)

### 数据库检查

- [ ] 已创建数据库备份
- [ ] Prisma Schema 已同步 (`npx prisma db pull`)
- [ ] Prisma Client 已生成 (`npx prisma generate`)

### 数据检查

- [ ] 确认 Character 表包含 `structuredRelations` 字段
- [ ] 确认 `structuredRelations` 字段类型为 String? (nullable)
- [ ] 统计需要迁移的角色数量（可选）

---

## 🔧 故障排查

### 问题 1: "Cannot find module '@prisma/client'"

**解决方案**:

```bash
cd server
npm install
npx prisma generate
```

### 问题 2: "Private identifiers are only available when targeting ECMAScript 2015"

**解决方案**: 确保使用正确的 compiler options

```bash
npx ts-node --compiler-options '{"target":"ES2022","module":"commonjs"}' scripts/prisma/migrateRelations_fixed.ts
```

### 问题 3: 数据库连接失败

**检查步骤**:

1. 确认 `.env` 文件存在且包含 `DATABASE_URL`
2. 确认数据库服务正在运行
3. 测试连接: `npx prisma db pull`

---

## 📊 迁移脚本功能说明

### 支持的关系字符串格式

| 格式                 | 示例                       | 状态 |
| -------------------- | -------------------------- | ---- |
| 英文分号分隔         | `"朋友: 张三; 敌人: 李四"` | ✅   |
| 中文冒号+逗号        | `"师父：王五，师弟：赵六"` | ✅   |
| 等号+顿号            | `"恋人=小红、仇人=小黑"`   | ✅   |
| 多空格分隔（带冒号） | `"义兄: 大毛  义妹: 二毛"` | ✅   |
| 纯空格分隔（无冒号） | `"挚友  小明  宿敌  小强"` | ✅   |
| 混合分隔符           | `"朋友:张三;敌人：李四"`   | ✅   |

### 关系类型映射

| 中文关键词                         | 映射类型 | 英文枚举   |
| ---------------------------------- | -------- | ---------- |
| 敌人、敌对、仇人                   | 敌对关系 | ENEMY_OF   |
| 盟友、同盟                         | 盟友关系 | ALLY_OF    |
| 爱、爱慕、恋人、爱人               | 恋爱关系 | LOVES      |
| 亲人、亲属、家人、父母、兄弟、姐妹 | 亲属关系 | KIN_OF     |
| 师父、徒弟、师徒、老师             | 师徒关系 | MENTORS    |
| 竞争、对手                         | 竞争关系 | RIVAL_OF   |
| 效忠、下属、部下                   | 效忠关系 | SERVES     |
| 朋友、好友、友                     | 朋友关系 | FRIEND_OF  |
| 其他                               | 一般关系 | RELATED_TO |

---

## 🔒 安全措施

### 1. 数据备份（必须）

**MySQL 备份命令**:

```bash
mysqldump -u [username] -p [database_name] > backup_$(date +%Y%m%d_%H%M%S).sql
```

**恢复命令**:

```bash
mysql -u [username] -p [database_name] < backup_20260321_120000.sql
```

### 2. 分批迁移

脚本已支持幂等操作，可以安全地多次运行：

- 已迁移的角色会自动跳过
- 失败的角色会记录日志但不会中断整个流程

### 3. 验证迁移结果

**SQL 验证查询**:

```sql
-- 检查迁移后的数据
SELECT
    id,
    name,
    relationships AS original,
    structuredRelations AS migrated
FROM Character
WHERE structuredRelations IS NOT NULL
LIMIT 10;

-- 统计迁移结果
SELECT
    COUNT(*) AS total_characters,
    SUM(CASE WHEN structuredRelations IS NOT NULL THEN 1 ELSE 0 END) AS migrated,
    SUM(CASE WHEN relationships IS NOT NULL AND structuredRelations IS NULL THEN 1 ELSE 0 END) AS pending
FROM Character;
```

---

## 📝 迁移后操作

### 1. 验证前端显示

- [ ] 检查角色详情页的关系显示
- [ ] 验证知识图谱的关系渲染
- [ ] 测试关系编辑功能

### 2. 性能测试

- [ ] 测试大量关系数据的加载速度
- [ ] 验证 JSON 解析性能
- [ ] 检查内存使用情况

### 3. 数据清理（可选）

**警告**: 只有在确认迁移成功后才执行

```sql
-- 不推荐：清除旧字段数据（保留向后兼容性）
-- UPDATE Character SET relationships = NULL WHERE structuredRelations IS NOT NULL;
```

---

## 🐛 常见问题

### Q1: 迁移后部分关系显示为 "RELATED_TO"

**原因**: 该关系类型不在映射表中
**解决**:

1. 检查原始字符串中的关系类型
2. 更新 `CHINESE_TO_TYPE_MAP` 映射表
3. 重新运行迁移

### Q2: 迁移脚本报错退出

**排查步骤**:

1. 查看错误日志
2. 检查数据库连接
3. 验证 Prisma Schema
4. 检查数据格式

### Q3: 如何回滚迁移

**步骤**:

```sql
-- 清除迁移数据
UPDATE Character
SET structuredRelations = NULL
WHERE structuredRelations IS NOT NULL;

-- 或从备份恢复
-- mysql -u [username] -p [database_name] < backup_file.sql
```

---

## 📞 支持信息

**脚本版本**: 2.0 (修复版)
**兼容性**: Node.js 18+, TypeScript 5.8+, Prisma 6.19+
**测试状态**: ✅ 10/10 测试用例通过
**成功率**: 100%

**更新历史**:

- 2026-03-21: 修复中文冒号解析问题
- 2026-03-21: 改进空格分隔符处理
- 2026-03-21: 添加模糊匹配优化
- 2026-03-21: 添加测试模式

---

## 🎯 最佳实践

1. **始终先运行测试模式** - 验证解析逻辑
2. **备份生产数据** - 迁移前必须备份
3. **小批量验证** - 先迁移少量数据验证
4. **监控日志** - 注意警告和错误信息
5. **保留原始数据** - 不要立即删除 relationships 字段
6. **验证前端** - 确保显示正确

---

**最后更新**: 2026-03-21
**维护者**: Backend Developer Agent
