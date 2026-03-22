#!/bin/bash

# P1 Echo和Outliner API端点测试脚本
# 使用方法: ./test-p1-api-endpoints.sh <base-url> <project-id>

BASE_URL="${1:-http://localhost:3001}"
PROJECT_ID="${2:-test-project-123}"

echo "==================================="
echo "P1 API端点测试"
echo "基础URL: $BASE_URL"
echo "项目ID: $PROJECT_ID"
echo "==================================="
echo ""

# 1. 测试关系演变时间线
echo "1. 测试关系演变时间线..."
curl -s "$BASE_URL/api/graph/$PROJECT_ID/relationships/timeline?character1Id=char-1&character2Id=char-2" | jq '.' || echo "请求失败"
echo ""

# 2. 测试未回收伏笔列表
echo "2. 测试未回收伏笔列表..."
curl -s "$BASE_URL/api/graph/$PROJECT_ID/echoes/foreshadowing" | jq '.' || echo "请求失败"
echo ""

# 3. 测试矛盾检测
echo "3. 测试矛盾检测..."
curl -s "$BASE_URL/api/graph/$PROJECT_ID/echoes/contradictions" | jq '.' || echo "请求失败"
echo ""

# 4. 测试实体Echo历史
echo "4. 测试实体Echo历史..."
curl -s "$BASE_URL/api/graph/$PROJECT_ID/echoes/target-123/history" | jq '.' || echo "请求失败"
echo ""

# 5. 测试章节依赖关系
echo "5. 测试章节依赖关系..."
curl -s "$BASE_URL/api/graph/$PROJECT_ID/chapters/chapter-1/dependencies" | jq '.' || echo "请求失败"
echo ""

# 6. 测试章节角色网络
echo "6. 测试章节角色网络..."
curl -s "$BASE_URL/api/graph/$PROJECT_ID/chapters/chapter-1/character-network" | jq '.' || echo "请求失败"
echo ""

# 7. 测试伏笔链追踪
echo "7. 测试伏笔链追踪..."
curl -s "$BASE_URL/api/graph/$PROJECT_ID/chapters/chapter-1/foreshadowing-chain?foreshadowingId=fg-1" | jq '.' || echo "请求失败"
echo ""

# 8. 测试冲突热力图
echo "8. 测试冲突热力图..."
curl -s "$BASE_URL/api/graph/$PROJECT_ID/conflicts/heatmap" | jq '.' || echo "请求失败"
echo ""

echo "==================================="
echo "测试完成!"
echo "==================================="
