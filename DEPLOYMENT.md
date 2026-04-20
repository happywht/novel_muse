# Muse 部署文档

## 📋 目录
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [本地开发](#本地开发)
- [生产部署](#生产部署)
- [Docker部署](#docker部署)
- [故障排查](#故障排查)

---

## 🔧 环境要求

### 必需环境
- **Node.js**: >= 18.0.0 (推荐 22.x)
- **npm**: >= 9.0.0 或 **pnpm**: >= 8.0.0
- **Git**: >= 2.30.0

### 可选环境
- **MySQL**: >= 8.0 (后端数据存储)
- **Neo4j**: >= 5.0 (知识图谱)
- **Python**: >= 3.10 (AI服务)

---

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd remix_-muse_-小说架构师_022302
```

### 2. 安装依赖
```bash
npm install
# 或使用 pnpm
pnpm install
```

### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173

---

## ⚙️ 环境配置

### 环境变量说明

#### 基础配置
```bash
# API基础URL（后端服务）
VITE_API_BASE=http://localhost:3001/api

# Neo4j图数据库
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Google Gemini API
VITE_GOOGLE_GENAI_API_KEY=your-gemini-api-key

# 智谱GLM API
GLM_API_KEY=your-glm-api-key
```

#### AI模型配置
```bash
# 创作模型
VITE_CREATIVE_MODEL=gemini-2.5-flash-exp
VITE_CREATIVE_TEMPERATURE=0.8

# 分析模型
VITE_ANALYTICS_MODEL=glm-4-plus
VITE_ANALYTICS_TEMPERATURE=0.3
```

#### 后端同步配置
```bash
# 启用后端同步
VITE_BACKEND_SYNC_ENABLED=true

# 同步间隔（毫秒）
VITE_AUTO_SAVE_INTERVAL=30000
```

### .env.example 模板
项目根目录已提供 `.env.example` 文件，包含所有必需的环境变量模板。

---

## 💻 本地开发

### 开发命令
```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 运行测试
npm test

# 测试UI模式
npm run test:ui

# 测试覆盖率
npm run test:coverage
```

### 项目结构
```
remix_-muse_-小说架构师_022302/
├── components/          # React组件
│   ├── layout/         # 布局组件
│   ├── modules/        # 业务模块
│   └── ui/            # UI组件
├── services/          # 服务层
│   ├── api/           # API服务
│   ├── gemini/        # AI服务
│   └── storageService.ts
├── store/             # 状态管理
│   ├── slices/        # Zustand slices
│   └── selectors.ts
├── types/             # TypeScript类型定义
└── App.tsx            # 主应用组件
```

### 开发注意事项
1. **使用别名导入**: 使用 `@/` 代替相对路径
   ```typescript
   ✅ import { useProjectStore } from '@/store';
   ❌ import { useProjectStore } from '../../store';
   ```

2. **类型安全**: 所有API调用使用DTO类型
   ```typescript
   ✅ const data: ProjectDTO = await api.project.get(id);
   ❌ const data: any = await fetchProject(id);
   ```

3. **状态管理**: 使用selector模式优化性能
   ```typescript
   ✅ const title = useProjectStore(selectProjectTitle);
   ❌ const { project } = useProjectStore();
     const title = project.title;
   ```

---

## 🌐 生产部署

### 构建生产版本
```bash
npm run build
```

构建产物在 `dist/` 目录。

### 静态部署

#### Vercel部署 (推荐)
1. 连接GitHub仓库到Vercel
2. 配置构建命令: `npm run build`
3. 配置输出目录: `dist/`
4. 环境变量在Vercel后台配置

#### Netlify部署
1. 连接GitHub仓库到Netlify
2. 构建命令: `npm run build`
3. 发布目录: `dist/`
4. 添加 `_redirects` 文件处理SPA路由

#### Nginx部署
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/muse/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 环境变量配置

生产环境需要配置以下关键变量：
- `VITE_API_BASE`: 生产API地址
- `VITE_GOOGLE_GENAI_API_KEY`: AI服务密钥
- `NEO4J_URI`: 图数据库连接
- `VITE_BACKEND_SYNC_ENABLED`: 是否启用后端同步

---

## 🐳 Docker部署

### Dockerfile
项目根目录已包含 `Dockerfile`：

```dockerfile
FROM node:22-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 构建和运行
```bash
# 构建镜像
docker build -t muse-app .

# 运行容器
docker run -p 8080:80 muse-app
```

### Docker Compose
使用 `docker-compose.yml` 一键部署前后端：

```bash
docker-compose up -d
```

---

## 🔍 故障排查

### 常见问题

#### 1. 构建失败
**问题**: `npm run build` 报错
**解决**:
```bash
# 清理缓存
rm -rf node_modules/.vite
rm -rf dist

# 重新安装依赖
npm install

# 重新构建
npm run build
```

#### 2. API请求失败
**问题**: 无法连接后端API
**解决**:
- 检查 `.env` 中的 `VITE_API_BASE` 配置
- 确认后端服务正在运行
- 检查CORS设置

#### 3. AI服务不可用
**问题**: Gemini/GLM API调用失败
**解决**:
- 验证API密钥是否正确
- 检查API配额是否用尽
- 查看浏览器控制台错误信息

#### 4. 本地存储问题
**问题**: 项目数据丢失
**解决**:
- 检查浏览器IndexedDB是否启用
- 清除浏览器缓存重试
- 导出备份并重新导入

### 日志调试

#### 启用详细日志
```javascript
// 在浏览器控制台执行
localStorage.setItem('debug', 'true');
```

#### 查看性能日志
```javascript
// 性能监控数据自动输出
performanceMonitor.getReport();
```

---

## 📊 监控和维护

### 性能监控
- **Core Web Vitals**: 自动监控FCP、LCP、CLS
- **API性能**: 监控请求延迟和成功率
- **错误率**: 自动捕获和上报错误

### 数据备份
```bash
# 导出所有项目
1. 进入项目列表
2. 点击每个项目的"导出"按钮
3. 保存 .muse 文件到本地
```

### 健康检查
```bash
# 检查后端API
curl http://your-api.com/api/health

# 检查Neo4j
curl http://your-neo4j:7474
```

---

## 🔐 安全建议

### 生产环境检查清单
- [ ] 更改所有默认密码
- [ ] 配置HTTPS证书
- [ ] 限制CORS白名单
- [ ] 启用API速率限制
- [ ] 定期备份数据库
- [ ] 监控异常访问

### API密钥管理
- **永远不要**将API密钥提交到Git
- 使用环境变量或密钥管理服务
- 定期轮换密钥

---

## 📞 支持和反馈

### 获取帮助
- 📧 邮件: support@example.com
- 📚 文档: [项目Wiki](链接)
- 🐛 问题报告: [GitHub Issues](链接)

### 更新日志
查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新。

---

_部署成功后,您就可以开始使用Muse创作精彩的小说了!_ 🎉
