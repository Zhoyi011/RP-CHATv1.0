// client/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAntiDebug } from './utils/antiDebug'

// ✅ 启动反调试系统（生产环境自动启用）
initAntiDebug();

// ✅ 生产环境禁用 console 输出
if (import.meta.env.PROD) {
  const noop = () => {};
  // 检查是否有调试标志
  const hasDebugFlag = window.localStorage.getItem('debug') === 'true';
  if (!hasDebugFlag) {
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    console.warn = noop;
    // console.error 保留用于错误监控
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);