// client/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ✅ 主题由 ThemeContext 管理，不再在这里做任何检测
// 确保 html 根元素没有预设的 dark 类
const html = document.documentElement;
html.classList.remove('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);