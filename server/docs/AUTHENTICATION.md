# API 认证配置说明

## 概述

本系统使用 API Key 认证机制保护后端 API 端点。

## 认证方式

### 请求头认证
在所有需要认证的 API 请求中，必须包含 `x-api-key` 请求头：

```http
GET /api/projects HTTP/1.1
Host: localhost:3001
x-api-key: your-api-key-here
```

### 公开路由
以下路由不需要认证：
- `GET /api/health` - 健康检查端点

## 环境变量配置

在 `.env` 文件中配置以下变量：

```bash
# 环境模式
NODE_ENV=development  # 或 production

# 跳过认证（仅限开发环境）
SKIP_AUTH=false  # 设置为 true 可在开发环境跳过认证

# API Keys（逗号分隔的多个密钥）
API_KEYS=key1,key2,key3
```

## 开发环境配置

### 方式 1：跳过认证（仅限开发）
```bash
NODE_ENV=development
SKIP_AUTH=true
```

### 方式 2：配置开发用 API Key
```bash
NODE_ENV=development
SKIP_AUTH=false
API_KEYS=dev-key-12345
```

## 生产环境配置

**重要：生产环境必须配置 API Keys！**

```bash
NODE_ENV=production
API_KEYS=your-secure-production-key-1,your-secure-production-key-2
```

### 生成安全的 API Key

使用以下命令生成安全的 API Key：

```bash
# 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 使用 OpenSSL
openssl rand -hex 32
```

## 客户端使用示例

### JavaScript/TypeScript
```typescript
const API_BASE = 'http://localhost:3001/api';
const API_KEY = 'your-api-key';

const response = await fetch(`${API_BASE}/projects`, {
  headers: {
    'x-api-key': API_KEY,
  },
});
```

### Axios
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'x-api-key': 'your-api-key',
  },
});

// 使用
const projects = await api.get('/projects');
```

### cURL
```bash
curl -H "x-api-key: your-api-key" http://localhost:3001/api/projects
```

## 错误响应

### 401 Unauthorized - 缺少 API Key
```json
{
  "error": "Unauthorized: Missing API key",
  "code": "MISSING_API_KEY"
}
```

### 401 Unauthorized - 无效的 API Key
```json
{
  "error": "Unauthorized: Invalid API key",
  "code": "INVALID_API_KEY"
}
```

### 429 Too Many Requests - 速率限制
```json
{
  "error": "Too many authentication attempts. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 600
}
```

## 安全建议

1. **不要提交 .env 文件到版本控制**（已在 .gitignore 中配置）
2. **定期轮换 API Keys**
3. **为不同的客户端/环境使用不同的 API Keys**
4. **在生产环境使用强随机密钥**（至少 32 字节）
5. **使用 HTTPS 保护传输中的 API Keys**
6. **监控失败的认证尝试日志**

## 安全审计日志

系统会自动记录以下安全事件：
- 失败的认证尝试（包含 IP 地址和请求路径）
- 生产环境未配置 API Keys 的警告
- 开发环境未配置 API Keys 的警告

## 故障排查

### 问题：所有请求返回 401
- 检查 `x-api-key` 请求头是否正确设置
- 确认 `.env` 文件中的 `API_KEYS` 包含你使用的密钥
- 重启服务器以加载新的环境变量

### 问题：开发环境也需要认证
- 设置 `SKIP_AUTH=true` 或配置 `API_KEYS`
- 确保 `NODE_ENV=development`

### 问题：生产环境无法启动
- 确保配置了 `API_KEYS` 环境变量
- 检查日志中的 "SECURITY WARNING" 消息

## 扩展功能

### 基于角色的访问控制（可选）

```typescript
import { requireRole } from './middleware/auth';

// 在路由中使用
app.delete('/api/projects/:id', requireRole(['admin']), deleteProject);
```

### 速率限制（可选）

```typescript
import { authRateLimit } from './middleware/auth';

// 在认证中间件之前应用
app.use('/api', authRateLimit());
app.use('/api', apiKeyAuth);
```
