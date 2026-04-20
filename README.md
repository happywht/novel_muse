# Muse: 小说架构师 (Novel Architect)

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**Muse: 小说架构师** 是一款基于大语言模型（Google Gemini API）的 AI 辅助小说创作工作台。本项目是一个由 React 和 Vite 驱动的前端渐进式 Web 应用，专为长篇小说创作者打造。它不仅能帮助创作者记录灵感，还能动态追踪错综复杂的世界观、角色成长和情节线。

## 🌟 核心功能 (Core Features)

本项目通过多个互相联动的模块实现强大的构思和写作辅助：

- 🌍 **创世纪 (Dashboard)**: 全局项目概貌、基本设定管理与创作基调配置。
- 织 **万象织机 (World Builder)**: 细粒度构建世界观架构，包括但不限于地理风光、魔法/科技体系、社会生态与历史渊源。能够结合 AI 输出详尽或简略的世界片段。
- 👥 **灵魂熔炉 (Character Creator)**: 打造有灵魂的角色，确立主角/配角定位以及复杂的相互情感关系和原型设定。
- 🧭 **情节罗盘 (Plot Weaver)**: 提供宏观与微观兼具的情节网编织工具，系统性地规划故事情节节点。
- ✍️ **自动工坊 (Drafting Room)**: 沉浸式写作工坊。您可以在此处编写实际章节和草稿，引入 AI 进行润色、扩写或风格转换。
- 🦋 **命运回响 (Echo Chamber)**: 独特的“回响引擎”。AI 将主动预判角色的行为演变或世界观的变迁，并提出“等待审查/应用”的动态演进状态变更建议。

## 🛠️ 技术栈 (Tech Stack)

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **UI 设计**: TailwindCSS (极致暗黑科幻风格) + Lucide React (精美图标) + Recharts (数据可视化组件)
- **AI 引擎**: Google Gemini API (`@google/genai`)
- **数据存储**: HTML5 Local Storage 浏览器本地持久化

## 🚀 快速开始 (Getting Started)

### 环境要求

- 推荐使用 [Node.js](https://nodejs.org/) 20.x 或更高版本。
- 获取您的 [Google AI Studio Gemini API Key](https://aistudio.google.com/app/apikey)。

### 安装与运行

1. **进入项目目录**
   ```bash
   cd remix_-muse_-小说架构师_022302
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   在项目根目录找到或创建 `.env.local` 文件，并将其中的配置项替换为您自己的配置：

   ```env
   # API 配置
   VITE_API_BASE=http://localhost:3001/api

   # Neo4j 配置
   VITE_NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=password

   # AI 模型配置
   GEMINI_API_KEY=your-gemini-key
   GLM_API_KEY=your-glm-key

   # Base URLs
   GLM_BASE_URL=https://open.bigmodel.cn/api/anthropic

   # Model Configuration
   GLM_MODEL_NAME=glm-5
   GEMINI_FLASH_MODEL=gemini-3-flash-preview
   GEMINI_PRO_MODEL=gemini-3-pro-preview
   ```

   **环境变量说明：**
   - `VITE_API_BASE`: 后端API服务器地址
   - `VITE_NEO4J_URI`: Neo4j数据库连接地址
   - `NEO4J_USER`: Neo4j用户名
   - `NEO4J_PASSWORD`: Neo4j密码
   - `GEMINI_API_KEY`: Google Gemini API密钥
   - `GLM_API_KEY`: 智谱AI API密钥
   - `GLM_BASE_URL`: 智谱AI基础URL
   - `GLM_MODEL_NAME`: 默认使用的GLM模型名称
   - `GEMINI_FLASH_MODEL`: Gemini快速模型
   - `GEMINI_PRO_MODEL`: Gemini专业模型

   > 💡 **提示**: 您可以复制 `.env.example` 文件作为模板创建 `.env.local` 文件：
   > ```bash
   > cp .env.example .env.local
   > ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   启动后，在浏览器中访问控制台输出的本地地址（通常是 `http://localhost:5173` 或通过局域网 IP `http://127.0.0.1:5173/`）。

## 📁 核心目录结构

```text
├── components/          # React 核心功能组件 (UI 和各模块)
│   ├── Dashboard.tsx    # 创世纪
│   ├── WorldBuilder.tsx # 万象织机
│   ├── CharacterCreator.tsx # 灵魂熔炉
│   ├── PlotWeaver.tsx   # 情节罗盘
│   ├── DraftingRoom.tsx # 自动工坊
│   └── EchoChamber.tsx  # 回响引擎
├── services/            # API 请求与外部服务接入逻辑
│   └── gemini.ts        # Gemini API 接口封装示例
├── types.ts             # TypeScript 全局/业务接口与类型定义
├── App.tsx              # 主应用入口，带路由管理和顶部导航状态组件
└── vite.config.ts       # Vite 构建与插件配置
```
