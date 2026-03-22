# 迁移脚本快速参考卡

## 🚀 快速命令

### 测试模式（推荐先执行）
```bash
cd server
npx ts-node --compiler-options '{"target":"ES2022","module":"commonjs"}' scripts/prisma/migrateRelations_fixed.ts --test
```

### 实际迁移
```bash
cd server
npx ts-node --compiler-options '{"target":"ES2022","module":"commonjs"}' scripts/prisma/migrateRelations_fixed.ts
```

---

## ✅ 检查清单

### 运行前
- [ ] 数据库已备份
- [ ] Prisma Client 已生成 (`npx prisma generate`)
- [ ] 测试模式通过 (10/10)

### 运行后
- [ ] 检查迁移日志无错误
- [ ] 验证前端显示正常
- [ ] 测试关系编辑功能

---

## 📊 测试结果

**修复版本测试**: ✅ 10/10 通过 (100%)

| 格式 | 示例 | 状态 |
|------|------|------|
| 英文分号 | `朋友: 张三; 敌人: 李四` | ✅ |
| 中文冒号 | `师父：王五，师弟：赵六` | ✅ |
| 等号+顿号 | `恋人=小红、仇人=小黑` | ✅ |
| 空格分隔 | `义兄: 大毛  义妹: 二毛` | ✅ |
| 纯空格 | `挚友  小明  宿敌  小强` | ✅ |

---

## 🔧 故障排查

### 问题: "Cannot find module '@prisma/client'"
```bash
cd server
npm install
npx prisma generate
```

### 问题: "Private identifiers" 错误
确保使用正确的 compiler options:
```bash
--compiler-options '{"target":"ES2022","module":"commonjs"}'
```

---

## 📁 文件位置

| 文件 | 路径 |
|------|------|
| 修复版脚本 | `server/scripts/prisma/migrateRelations_fixed.ts` |
| 验证报告 | `server/docs/migration-script-validation-report.md` |
| 运行指南 | `server/docs/migration-run-guide.md` |
| 对比文档 | `server/docs/migration-script-comparison.md` |
| 快速参考 | `server/docs/migration-quick-reference.md` (本文件) |

---

## 🎯 关键改进

1. ✅ 修复中文冒号解析
2. ✅ 改进空格分隔符处理
3. ✅ 优化模糊匹配算法
4. ✅ 添加测试模式
5. ✅ 增强日志输出

---

**版本**: 2.0 (修复版)
**状态**: ✅ 已验证
**日期**: 2026-03-21
