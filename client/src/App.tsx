// client/src/App.tsx
import React, { useEffect, useState, useCallback } from 'react';
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
import GroupDetail from './components/chat/GroupDetail';
import GroupSettings from './components/chat/GroupSettings';
import RoomMembers from './components/chat/RoomMembers';
import PendingRequests from './components/chat/PendingRequests';
import MaintenancePage from './components/common/MaintenancePage';
import { auth } from './firebase/config';
import Wallet from './components/wallet/Wallet';
import OnboardingWizard from './components/onboarding/OnboardingWizard';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// 维护模式检测 Hook（带轮询）
const useMaintenanceCheck = () => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndTime, setMaintenanceEndTime] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkMaintenance = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/maintenance/status`);
      const data = await res.json();
      
      const token = localStorage.getItem('token');
      let role = null;
      if (token) {
        try {
          const userRes = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            role = userData.role;
            setUserRole(role);
          }
        } catch (e) {}
      }
      
      const isSuperAdmin = role === 'owner' || role === 'super_admin';
      
      if (data.maintenanceMode && !isSuperAdmin) {
        setIsMaintenance(true);
        setMaintenanceMessage(data.message);
        setMaintenanceEndTime(data.endTime);
      } else {
        setIsMaintenance(false);
      }
    } catch (error) {
      console.error('检查维护状态失败:', error);
      setIsMaintenance(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 10000);
    const handleMaintenanceToggle = () => checkMaintenance();
    window.addEventListener('maintenanceToggled', handleMaintenanceToggle);
    return () => {
      clearInterval(interval);
      window.removeEventListener('maintenanceToggled', handleMaintenanceToggle);
    };
  }, [checkMaintenance]);

  return { isMaintenance, maintenanceMessage, maintenanceEndTime, checking, userRole };
};

// 受保护路由组件
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

        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
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
  const { isMaintenance, maintenanceMessage, maintenanceEndTime, checking, userRole } = useMaintenanceCheck();
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return 'light';
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

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white/60 text-lg animate-pulse">加载中...</div>
      </div>
    );
  }

  if (isMaintenance) {
    return <MaintenancePage message={maintenanceMessage} endTime={maintenanceEndTime} />;
  }

  return (
    <>
      {/* ========== Toaster 全局配置（一劳永逸）========== */}
      <Toaster 
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,           // 默认 3 秒自动消失
          success: {
            duration: 2000,         // 成功提示 2 秒
            icon: '✅',
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            duration: 3000,         // 错误提示 3 秒
            icon: '❌',
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
          loading: {
            duration: Infinity,      // 加载提示不自动消失
            icon: '⏳',
          },
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
      {/* ============================================= */}
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite" element={<InviteCode />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

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

        <Route path="/wallet" element={
          <ProtectedRoute>
            <Wallet />
          </ProtectedRoute>
        } />

        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        } />

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