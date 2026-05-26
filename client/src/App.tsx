// App.tsx - 完整修复版

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';
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
import Shop from './components/shop/Shop';
import Inventory from './components/inventory/Inventory';
// ✅ 导入群组相关组件
import GroupDetail from './components/chat/GroupDetail';
import GroupSettings from './components/chat/GroupSettings';
import RoomMembers from './components/chat/RoomMembers';
import PendingRequests from './components/chat/PendingRequests';
import { auth } from './firebase/config';
import LoginNew from './components/auth/LoginNew';

console.log('🚀 [App] 启动应用，包裹 ThemeProvider');

// ✅ 增强版受保护路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsAuthenticated(false);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          localStorage.removeItem('token');
          localStorage.removeItem('lastUsedPersonaId');
          setIsAuthenticated(false);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const userData = await response.json();
        
        if (!userData.hasAccess) {
          console.warn('⚠️ 用户没有访问权限（无邀请码）:', userData.username);
          localStorage.removeItem('token');
          localStorage.removeItem('lastUsedPersonaId');
          setIsAuthenticated(false);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setHasAccess(true);
      } catch (error) {
        console.error('认证检查失败:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white/60 text-lg animate-pulse">验证中...</div>
      </div>
    );
  }

  if (!isAuthenticated || !hasAccess) {
    localStorage.removeItem('token');
    localStorage.removeItem('lastUsedPersonaId');
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleShowToast = (e: CustomEvent) => {
      toast.error(e.detail.message);
    };
    window.addEventListener('showToast', handleShowToast as EventListener);
    return () => window.removeEventListener('showToast', handleShowToast as EventListener);
  }, []);

  console.log(`🎨 [AppContent] 当前主题: ${theme}`);

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* 公开路由 */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite" element={<InviteCode />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/" element={<LoginNew />} />
        <Route path="/login" element={<LoginNew />} />

        {/* 需要登录的路由 */}
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatHome />
          </ProtectedRoute>
        } />
        
        <Route path="/persona" element={
          <ProtectedRoute>
            <PersonaManager />
          </ProtectedRoute>
        } />
        
        <Route path="/persona/create" element={
          <ProtectedRoute>
            <PersonaCreate />
          </ProtectedRoute>
        } />
        
        <Route path="/persona/:personaId" element={
          <ProtectedRoute>
            <PersonaDetail />
          </ProtectedRoute>
        } />
              
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        
        <Route path="/search" element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        } />
        
        <Route path="/changelog" element={
          <ProtectedRoute>
            <Changelog />
          </ProtectedRoute>
        } />
        
        {/* 手机端专用页面 */}
        <Route path="/feed" element={
          <ProtectedRoute>
            <MobileFeed />
          </ProtectedRoute>
        } />
        
        <Route path="/home" element={
          <ProtectedRoute>
            <MobileHome />
          </ProtectedRoute>
        } />

        <Route path="/shop" element={
          <ProtectedRoute>
            <Shop />
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        } />

        {/* ✅ 群组相关路由（新增） */}
        <Route path="/group/:roomId" element={
          <ProtectedRoute>
            <GroupDetail />
          </ProtectedRoute>
        } />

        <Route path="/group/:roomId/settings" element={
          <ProtectedRoute>
            <GroupSettings />
          </ProtectedRoute>
        } />

        <Route path="/room/:roomId/members" element={
          <ProtectedRoute>
            <RoomMembers />
          </ProtectedRoute>
        } />

        <Route path="/room/:roomId/pending" element={
          <ProtectedRoute>
            <PendingRequests />
          </ProtectedRoute>
        } />

        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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