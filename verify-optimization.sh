#!/bin/bash

echo "================================"
echo "Muse 项目优化验证脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASS=0
FAIL=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✓ 通过${NC}: $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗ 失败${NC}: $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠ 警告${NC}: $1"
}

echo "1. 检查硬编码配置"
echo "-------------------"
if grep -r "localhost:3001" services/ --include="*.ts" --include="*.tsx" > /dev/null 2>&1; then
    check_fail "发现硬编码的 localhost:3001"
    grep -rn "localhost:3001" services/ --include="*.ts" --include="*.tsx"
else
    check_pass "无硬编码的 localhost:3001"
fi
echo ""

echo "2. 检查 any 类型使用"
echo "-------------------"
ANY_COUNT=$(grep -r "Promise<any>" services/ --include="*.ts" | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -eq 0 ]; then
    check_pass "无 Promise<any> 类型"
else
    check_fail "发现 $ANY_COUNT 处 Promise<any>"
fi
echo ""

echo "3. 检查文件大小"
echo "-------------------"
API_LINES=$(wc -l < services/apiService.ts | tr -d ' ')
STORE_LINES=$(wc -l < store/useProjectStore.ts | tr -d ' ')

if [ "$API_LINES" -lt 100 ]; then
    check_pass "apiService.ts: $API_LINES 行 (< 100)"
else
    check_fail "apiService.ts: $API_LINES 行 (>= 100)"
fi

if [ "$STORE_LINES" -lt 500 ]; then
    check_pass "useProjectStore.ts: $STORE_LINES 行 (< 500)"
else
    check_warn "useProjectStore.ts: $STORE_LINES 行 (建议 < 500)"
fi
echo ""

echo "4. 检查组件目录结构"
echo "-------------------"
ROOT_COMPONENTS=$(find components -maxdepth 1 -type f | wc -l | tr -d ' ')
if [ "$ROOT_COMPONENTS" -le 5 ]; then
    check_pass "components/ 根目录文件数: $ROOT_COMPONENTS (<= 5)"
else
    check_warn "components/ 根目录文件数: $ROOT_COMPONENTS (建议 <= 5)"
fi
echo ""

echo "5. TypeScript 类型检查"
echo "-------------------"
if npm run type-check 2>&1 | grep -q "error TS"; then
    check_fail "TypeScript 编译存在错误"
    npm run type-check
else
    check_pass "TypeScript 编译通过"
fi
echo ""

echo "6. 检查 TODO 注释"
echo "-------------------"
TODO_COUNT=$(grep -r "TODO" components/ services/ --include="*.tsx" --include="*.ts" | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -eq 0 ]; then
    check_pass "无 TODO 注释"
else
    check_warn "发现 $TODO_COUNT 处 TODO 注释"
fi
echo ""

echo "7. 构建验证"
echo "-------------------"
if npm run build > /dev/null 2>&1; then
    check_pass "项目构建成功"
else
    check_fail "项目构建失败"
fi
echo ""

echo "================================"
echo "验证结果汇总"
echo "================================"
echo -e "${GREEN}通过: $PASS${NC}"
echo -e "${RED}失败: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}所有检查通过！${NC}"
    exit 0
else
    echo -e "${RED}存在 $FAIL 项失败，请修复后重试${NC}"
    exit 1
fi
