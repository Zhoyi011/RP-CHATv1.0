import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // 开启局域网访问
    port: 5173,        // 默认端口
    open: true         // 自动打开浏览器
  }
})