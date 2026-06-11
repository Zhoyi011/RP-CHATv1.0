// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://rp-chatv1-0.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // 确保 public 目录下的文件可以被正确访问
  publicDir: 'public',
});