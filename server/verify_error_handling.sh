#!/bin/bash

# 错误处理改进验证脚本
# 用于快速验证所有错误处理改进是否正确应用

echo "🔍 开始验证错误处理改进..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 检查函数
check_file_exists() {
    local file=$1
    local description=$2

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌${NC} $description - 文件不存在: $file"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# 检查文件内容
check_file_content() {
    local file=$1
    local pattern=$2
    local description=$3

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✅${NC} $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} $description - 未找到模式: $pattern"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

echo "📋 检查改进的模块文件..."
echo ""

# 1. 检查 projects.ts
check_file_exists "server/src/routes/projects.ts" "projects.ts 文件存在"
check_file_content "server/src/routes/projects.ts" "try {" "projects.ts 包含错误处理"
check_file_content "server/src/routes/projects.ts" "console.error('Failed to" "projects.ts 包含错误日志"

echo ""

# 2. 检查 graph.ts
check_file_exists "server/src/routes/graph.ts" "graph.ts 文件存在"
check_file_content "server/src/routes/graph.ts" "try {" "graph.ts 包含错误处理"
check_file_content "server/src/routes/graph.ts" "cacheError" "graph.ts 包含缓存错误处理"

echo ""

# 3. 检查 writing.ts
check_file_exists "server/src/routes/writing.ts" "writing.ts 文件存在"
check_file_content "server/src/routes/writing.ts" "AI服务调用失败" "writing.ts 包含AI错误处理"
check_file_content "server/src/routes/writing.ts" "if (!result || typeof result !== 'string')" "writing.ts 包含响应验证"

echo ""

# 4. 检查 templateOverrides.ts
check_file_exists "server/src/routes/templateOverrides.ts" "templateOverrides.ts 文件存在"
check_file_content "server/src/routes/templateOverrides.ts" "静默失败，返回null" "templateOverrides.ts 包含JSON解析错误处理"

echo ""

# 5. 检查 performance.ts
check_file_exists "server/src/routes/performance.ts" "performance.ts 文件存在"
check_file_content "server/src/routes/performance.ts" "try {" "performance.ts 包含错误处理"

echo ""

# 6. 检查 llm.ts
check_file_exists "server/src/services/graph/llm.ts" "llm.ts 文件存在"
check_file_content "server/src/services/graph/llm.ts" "Network error during AI extraction" "llm.ts 包含网络错误处理"
check_file_content "server/src/services/graph/llm.ts" "JSON parsing error" "llm.ts 包含解析错误处理"

echo ""

# 7. 检查新的错误处理中间件
check_file_exists "server/src/middleware/errorHandler.ts" "errorHandler.ts 中间件存在"
check_file_content "server/src/middleware/errorHandler.ts" "export class AppError" "包含 AppError 类"
check_file_content "server/src/middleware/errorHandler.ts" "export class ValidationError" "包含 ValidationError 类"
check_file_content "server/src/middleware/errorHandler.ts" "export class DatabaseError" "包含 DatabaseError 类"
check_file_content "server/src/middleware/errorHandler.ts" "export function errorHandler" "包含 errorHandler 中间件"
check_file_content "server/src/middleware/errorHandler.ts" "export const asyncHandler" "包含 asyncHandler 辅助函数"

echo ""

# 8. 检查 index.ts 是否集成了新的错误处理
check_file_content "server/src/index.ts" "errorHandler" "index.ts 导入了错误处理模块"
check_file_content "server/src/index.ts" "setupGlobalErrorHandlers" "index.ts 调用了全局错误处理器初始化"
check_file_content "server/src/index.ts" "notFoundHandler" "index.ts 使用了404处理器"
check_file_content "server/src/index.ts" "errorHandler" "index.ts 使用了错误处理中间件"

echo ""

# 9. 检查文档
check_file_exists "server/ERROR_HANDLING_IMPROVEMENTS.md" "错误处理改进文档存在"
check_file_content "server/ERROR_HANDLING_IMPROVEMENTS.md" "## 📋 改进概述" "文档包含概述部分"
check_file_content "server/ERROR_HANDLING_IMPROVEMENTS.md" "### 1. \*\*server/src/routes/projects.ts\*\*" "文档包含projects.ts改进"

echo ""

# 10. 检查测试文件
check_file_exists "server/src/test/errorHandling.test.ts" "错误处理测试文件存在"

echo ""
echo "📊 验证结果统计"
echo "===================="
echo -e "总检查项: $TOTAL_CHECKS"
echo -e "${GREEN}通过: $PASSED_CHECKS${NC}"
echo -e "${RED}失败: $FAILED_CHECKS${NC}"
echo ""

# 计算成功率
if [ $TOTAL_CHECKS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo "成功率: $SUCCESS_RATE%"

    if [ $SUCCESS_RATE -ge 90 ]; then
        echo -e "\n${GREEN}🎉 错误处理改进验证通过！${NC}"
        exit 0
    elif [ $SUCCESS_RATE -ge 70 ]; then
        echo -e "\n${YELLOW}⚠️ 错误处理改进基本通过，但有少量问题${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ 错误处理改进验证失败，请检查上述问题${NC}"
        exit 1
    fi
else
    echo -e "\n${RED}❌ 没有执行任何检查${NC}"
    exit 1
fi
