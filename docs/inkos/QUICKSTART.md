# inkos + Muse 快速开始指南

> 本指南帮助你快速上手 Muse 与 inkos 的整合工作流

## 📋 前置要求

- Node.js 18+
- npm 或 yarn
- Neo4j (可选，用于知识图谱功能)

## 🚀 1. 环境准备

### 克隆项目
```bash
git clone <repository-url>
cd remix_-muse_-小说架构师_022302
```

### 安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..
```

### 构建inkos CLI
```bash
cd inkos && npm install && npm run build && cd ..
```

## 🔧 2. 启动服务

### 启动后端服务
```bash
cd server
npm run dev
```
后端将运行在 http://localhost:3001

### 启动前端 (新终端)
```bash
npm run dev
```
前端将运行在 http://localhost:3000

## 📤 3. 导入项目到 inkos

### 通过 API
```bash
curl -X POST http://localhost:3001/api/inkos/import \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-novel-001",
    "title": "我的小说",
    "premise": "一个关于成长的故事",
    "genre": "玄幻",
    "characters": [
      {"name": "主角", "role": "PROTAGONIST"}
    ]
  }'
```

### 通过前端 Dashboard
1. 打开 http://localhost:3000
2. 在 Dashboard 找到 "inkos 自动化写作" 卡片
3. 点击 "导出到inkos" 按钮

## ✍️ 4. 触发自动写作

### 通过 API
```bash
curl -X POST http://localhost:3001/api/inkos/write \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-novel-001",
    "chapterId": "chapter-001",
    "chapterNumber": 1
  }'
```

### 通过前端
在 Dashboard 的 inkos 卡片中点击 "写下一章" 按钮

## 🔍 5. 运行审计

### 通过 API
```bash
curl "http://localhost:3001/api/inkos/audit?projectId=my-novel-001"
```

### 通过前端
在 Dashboard 的 inkos 卡片中点击 "运行审计" 按钮

## 🔄 6. 同步回 Muse

### 通过 API
```bash
curl -X POST http://localhost:3001/api/inkos/export \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-novel-001",
    "bookId": "my-novel"
  }'
```

### 通过前端
在 Dashboard 的 inkos 卡片中点击 "从inkos同步" 按钮

## 📊 监控任务进度

### 通过 API
```bash
curl "http://localhost:3001/api/inkos/status/{taskId}"
```

### 通过 SSE (实时更新)
```javascript
const eventSource = new EventSource(
  'http://localhost:3001/api/inkos/stream/{taskId}'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.percentage + '%');
  console.log('Message:', data.message);
};
```

## ⚠️ 常见问题

### 端口被占用
```bash
# 检查端口占用
netstat -ano | findstr :3001

# 终止进程
taskkill /PID <pid> /F
```

### inkos CLI 不可用
确保已构建 inkos CLI：
```bash
cd inkos && npm run build
```

### Neo4j 连接失败
检查 Neo4j 服务是否运行：
```bash
# Windows
net start neo4j

# 或使用 Docker
docker run -p 7474:7474 -p 7687:7687 neo4j
```

## 📚 相关文档

- [API 参考文档](./API_REFERENCE.md)
- [整合总体规划](../INKOS_INTEGRATION_MASTER_PLAN.md)
- [inkos CLI 文档](../../inkos/README.md)
