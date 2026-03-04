import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
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
    }
  };
});
