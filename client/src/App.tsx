import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import InviteCode from './components/auth/InviteCode';
import ChatHome from './components/chat/ChatHome';
import PersonaManager from './components/persona/PersonaManager';
import PersonaDetail from './components/persona/PersonaDetail';
import PersonaCreate from './components/persona/PersonaCreate';
import Settings from './components/settings/Settings';
import SearchPage from './components/common/SearchPage';
import Changelog from './components/common/Changelog';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import MobileFeed from './components/feed/MobileFeed';
import MobileHome from './components/home/MobileHome';
import SwipeBack from './components/common/SwipeBack';

console.log('🚀 [App] 启动应用，包裹 ThemeProvider');

// 需要滑动返回的页面包装组件
const withSwipeBack = (Component: React.ComponentType<any>, onSwipeBack?: () => void) => {
  return (props: any) => (
    <SwipeBack onSwipeBack={onSwipeBack}>
      <Component {...props} />
    </SwipeBack>
  );
};

function AppContent() {
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  console.log(`🎨 [AppContent] 当前主题: ${theme}`);

  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/invite" element={<InviteCode />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* 需要登录的路由 - 带滑动返回 */}
      <Route path="/chat" element={
        <SwipeBack>
          <ChatHome />
        </SwipeBack>
      } />
      
      <Route path="/persona" element={
        <SwipeBack>
          <PersonaManager />
        </SwipeBack>
      } />
      
      <Route path="/persona/create" element={
        <SwipeBack>
          <PersonaCreate />
        </SwipeBack>
      } />
      
      <Route path="/persona/:personaId" element={
        <SwipeBack onSwipeBack={() => window.history.back()}>
          <PersonaDetail />
        </SwipeBack>
      } />
      
      <Route path="/settings" element={
        <SwipeBack>
          <Settings />
        </SwipeBack>
      } />
      
      <Route path="/search" element={
        <SwipeBack>
          <SearchPage />
        </SwipeBack>
      } />
      
      <Route path="/changelog" element={
        <SwipeBack>
          <Changelog />
        </SwipeBack>
      } />
      
      {/* 手机端专用页面 */}
      <Route path="/feed" element={
        <SwipeBack>
          <MobileFeed />
        </SwipeBack>
      } />
      
      <Route path="/home" element={
        <SwipeBack>
          <MobileHome />
        </SwipeBack>
      } />

      {/* 404 重定向 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;