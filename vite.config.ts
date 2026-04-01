import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GLM_API_KEY': JSON.stringify(env.GLM_API_KEY),

      // Models
      'process.env.GLM_MODEL_NAME': JSON.stringify(env.GLM_MODEL_NAME),
      'process.env.GEMINI_FLASH_MODEL': JSON.stringify(env.GEMINI_FLASH_MODEL),
      'process.env.GEMINI_PRO_MODEL': JSON.stringify(env.GEMINI_PRO_MODEL),

      // Base URLs
      'process.env.GLM_BASE_URL': JSON.stringify(env.GLM_BASE_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // 提高 chunk 大小警告阈值
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // 手动分割 chunks
          manualChunks: (id) => {
            // 1. React 核心 - 保持稳定，不经常变化
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')) {
              return 'react-vendor';
            }

            // 2. Lucide React 图标库 - 单独分离
            if (id.includes('node_modules/lucide-react/')) {
              return 'lucide-icons';
            }

            // 3. 本地存储 - IndexedDB 封装
            if (id.includes('node_modules/localforage/')) {
              return 'storage';
            }

            // 4. 富文本编辑器 - TipTap 全家桶
            if (id.includes('node_modules/@tiptap/') ||
                id.includes('node_modules/prosemirror') ||
                id.includes('node_modules/orderedmap')) {
              return 'tiptap-editor';
            }

            // 5. 图表可视化 - Recharts
            if (id.includes('node_modules/recharts/') ||
                id.includes('node_modules/d3-') ||
                id.includes('node_modules/victory-')) {
              return 'charts';
            }

            // 6. 虚拟列表
            if (id.includes('node_modules/react-window/')) {
              return 'virtual-list';
            }

            // 7. Google AI SDK - AI 服务核心
            if (id.includes('node_modules/@google/genai/') ||
                id.includes('node_modules/google-gax') ||
                id.includes('node_modules/google-auth-library')) {
              return 'google-ai';
            }

            // 8. 状态管理 - Zustand
            if (id.includes('node_modules/zustand/') ||
                id.includes('node_modules/use-sync-external-store')) {
              return 'state-management';
            }

            // 9. 工具库
            if (id.includes('node_modules/zod/') ||
                id.includes('node_modules/dompurify')) {
              return 'utils';
            }

            // 10. AI 服务模块 - 项目内 AI 相关代码
            if (id.includes('/services/gemini/') ||
                id.includes('/services/llmRouter.ts') ||
                id.includes('/services/promptService.ts') ||
                id.includes('/services/cacheManager.ts') ||
                id.includes('/services/apiService.ts')) {
              return 'ai-services';
            }

            // 11. 验证器模块
            if (id.includes('/services/validators/')) {
              return 'validators';
            }

            // 12. 业务模块 - WorldBuilder 相关
            if (id.includes('/components/WorldBuilder/') ||
                id.includes('/components/panels/')) {
              return 'module-world';
            }

            // 13. 业务模块 - CharacterCreator 相关
            if (id.includes('/components/CharacterCreator/')) {
              return 'module-character';
            }

            // 14. 业务模块 - PlotWeaver 相关
            if (id.includes('/components/PlotWeaver/') ||
                id.includes('/components/ConflictVisualization') ||
                id.includes('/components/ChapterBalanceAnalyzer')) {
              return 'module-plot';
            }

            // 15. 业务模块 - ChapterOutliner 相关
            if (id.includes('/components/ChapterOutliner/')) {
              return 'module-outliner';
            }

            // 16. 业务模块 - DraftingRoom 相关
            if (id.includes('/components/DraftingRoom/')) {
              return 'module-drafting';
            }

            // 17. 业务模块 - EchoChamber 相关
            if (id.includes('/components/Echo/') ||
                id.includes('/components/EchoChamber')) {
              return 'module-echo';
            }

            // 18. 设置面板
            if (id.includes('/components/SettingsPanel/')) {
              return 'settings';
            }

            // 19. Prompt 面板
            if (id.includes('/components/PromptPanel/') ||
                id.includes('/components/PromptTuner') ||
                id.includes('/components/PromptPanel')) {
              return 'prompt-panel';
            }

            // 20. 其他第三方依赖
            if (id.includes('node_modules/')) {
              return 'vendor';
            }
          },
          // 优化 chunk 文件命名
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId || '';
            // 为懒加载的业务模块使用更清晰的命名
            if (facadeModuleId.includes('/components/')) {
              const match = facadeModuleId.match(/\/components\/(.+?)\//);
              if (match) {
                return `modules/${match[1]}-[hash].js`;
              }
            }
            return 'chunks/[name]-[hash].js';
          }
        }
      },
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 压缩配置
      minify: 'esbuild',
      // 目标现代浏览器以获得更小的 bundle
      target: 'es2020',
      // 启用 source map 用于生产环境调试（可选）
      sourcemap: false,
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'zustand',
        'localforage',
        // p-retry 是 CommonJS，需要预构建以支持 ESM named exports
        'p-retry',
      ],
      // 不再排除 @google/genai，让其依赖 p-retry 被正确预构建
    }
  };
});
