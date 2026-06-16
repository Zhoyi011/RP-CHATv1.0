// client/src/App.tsx

import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AFKProvider } from './contexts/AFKContext';
import { FriendProvider } from './contexts/FriendContext';
import { AFKScreen } from './components/common/AFKScreen';
import toast, { Toaster } from 'react-hot-toast';

// ============================================================
// ✅ 公开页面（直接导入）
// ============================================================
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import InviteCode from './components/auth/InviteCode';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import MaintenancePage from './components/common/MaintenancePage';

// ============================================================
// ✅ 核心功能（直接导入）
// ============================================================
import ChatHome from './components/chat/ChatHome';
import PersonaManager from './components/persona/PersonaManager';
import PersonaDetail from './components/persona/PersonaDetail';
import PersonaCreate from './components/persona/PersonaCreate';
import Settings from './components/settings/Settings';
import SearchPage from './components/common/SearchPage';
import Changelog from './components/common/Changelog';
import MobileFeed from './components/feed/MobileFeed';
import MobileHome from './components/home/MobileHome';
import Shop from './components/shop/Shop';
import Inventory from './components/inventory/Inventory';
import Wallet from './components/wallet/Wallet';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import { EmojiManager } from './components/emoji/EmojiManager';
import GroupDetail from './components/chat/GroupDetail';
import GroupSettings from './components/chat/GroupSettings';
import RoomMembers from './components/chat/RoomMembers';
import PendingRequests from './components/chat/PendingRequests';
import { useResponsive } from './hooks/useResponsive';

// ============================================================
// ✅ 墨香阁小说（直接导入）
// ============================================================
import NovelHome from './pages/novel/NovelHome';
import NovelMobileHome from './pages/novel/NovelMobileHome';
import AuthorDashboard from './pages/novel/AuthorDashboard';
import NovelCreate from './pages/novel/NovelCreate';
import NovelEdit from './pages/novel/NovelEdit';
import ChapterManage from './pages/novel/ChapterManage';
import ChapterEdit from './pages/novel/ChapterEdit';
import MyFavorites from './pages/novel/MyFavorites';
import MyFollows from './pages/novel/MyFollows';
import UserProfile from './pages/novel/UserProfile';
import AdminApplications from './pages/admin/AdminApplications';

// ============================================================
// ✅ 天仪阁 - 懒加载（首屏不加载）
// ============================================================
const TianyiGe = lazy(() => import('./pages/tianyige/TianyiGe'));

// ============================================================
// ✅ 懒加载加载中占位组件
// ============================================================
const LazyLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white/60 text-lg animate-pulse">宇宙加载中...</p>
    </div>
  </div>
);

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// ============================================================
// ✅ 维护模式检测 Hook（天仪阁跳过）
// ============================================================
const useMaintenanceCheck = () => {
  const location = useLocation();
  const isTianyiGe = location.pathname === '/tianyige';
  
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndTime, setMaintenanceEndTime] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkMaintenance = useCallback(async () => {
    // ✅ 天仪阁跳过维护检查
    if (isTianyiGe) {
      setChecking(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/maintenance/status`);
      const data = await res.json();
      
      const token = localStorage.getItem('token');
      let role = null;
      if (token && !isTianyiGe) {
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
  }, [isTianyiGe]);

  useEffect(() => {
    checkMaintenance();
    if (isTianyiGe) return; // ✅ 天仪阁不轮询
    
    const interval = setInterval(checkMaintenance, 30000); // ✅ 从 10s 改为 30s
    const handleMaintenanceToggle = () => checkMaintenance();
    window.addEventListener('maintenanceToggled', handleMaintenanceToggle);
    return () => {
      clearInterval(interval);
      window.removeEventListener('maintenanceToggled', handleMaintenanceToggle);
    };
  }, [checkMaintenance, isTianyiGe]);

  return { isMaintenance, maintenanceMessage, maintenanceEndTime, checking, userRole };
};

// ============================================================
// ✅ 受保护路由组件（天仪阁跳过额外请求）
// ============================================================
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  skipExtra?: boolean;  // ✅ 新增：跳过额外请求
}> = ({ children, skipExtra = false }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          if (isMounted) {
            setIsAuthenticated(false);
            setHasAccess(false);
            setLoading(false);
          }
          return;
        }

        // ✅ 最少认证请求（不加载额外数据）
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          console.log('🔄 Token 无效，尝试刷新...');
          try {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem('token', refreshData.token);
              console.log('✅ Token 刷新成功');
              
              const retryRes = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${refreshData.token}` }
              });
              
              if (retryRes.ok) {
                const userData = await retryRes.json();
                if (userData.hasAccess && isMounted) {
                  setIsAuthenticated(true);
                  setHasAccess(true);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (refreshError) {
            console.error('Token 刷新失败:', refreshError);
          }
          
          localStorage.removeItem('token');
          localStorage.removeItem('lastUsedPersonaId');
          if (isMounted) {
            setIsAuthenticated(false);
            setHasAccess(false);
            setLoading(false);
          }
          return;
        }

        const userData = await response.json();
        
        if (!userData.hasAccess) {
          console.warn('⚠️ 用户没有访问权限');
          localStorage.removeItem('token');
          localStorage.removeItem('lastUsedPersonaId');
          if (isMounted) {
            setIsAuthenticated(false);
            setHasAccess(false);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
          setHasAccess(true);
        }
      } catch (error) {
        console.error('认证检查失败:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setHasAccess(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

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

// ============================================================
// AppContent
// ============================================================
function AppContent() {
  const location = useLocation();
  const isTianyiGe = location.pathname === '/tianyige';
  
  const { isMaintenance, maintenanceMessage, maintenanceEndTime, checking } = useMaintenanceCheck();
  const { isMobile } = useResponsive();
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

  // ✅ 天仪阁跳过维护检查等待
  if (!isTianyiGe && checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white/60 text-lg animate-pulse">加载中...</div>
      </div>
    );
  }

  // ✅ 天仪阁跳过维护模式
  if (!isTianyiGe && isMaintenance) {
    return <MaintenancePage message={maintenanceMessage} endTime={maintenanceEndTime} />;
  }

  return (
    <AFKScreen>
      <Toaster 
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
          success: {
            duration: 2000,
            icon: '✅',
            style: { background: '#10b981', color: '#fff' },
          },
          error: {
            duration: 3000,
            icon: '❌',
            style: { background: '#ef4444', color: '#fff' },
          },
          loading: { duration: Infinity, icon: '⏳' },
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
      
      <Routes>
        {/* ==========================================================
        公开页面
        ========================================================== */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite" element={<InviteCode />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        
        {/* ==========================================================
        墨香阁小说 - 公开首页
        ========================================================== */}
        <Route path="/novel" element={isMobile ? <NovelMobileHome /> : <NovelHome />} />
        
        {/* ==========================================================
        墨香阁 - 需要登录的页面
        ========================================================== */}
        <Route path="/author/dashboard" element={
          <ProtectedRoute>
            <AuthorDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/novel/create" element={
          <ProtectedRoute>
            <NovelCreate />
          </ProtectedRoute>
        } />
        
        <Route path="/novel/edit/:novelId" element={
          <ProtectedRoute>
            <NovelEdit />
          </ProtectedRoute>
        } />
        
        <Route path="/novel/:novelId/chapters" element={
          <ProtectedRoute>
            <ChapterManage />
          </ProtectedRoute>
        } />
        
        <Route path="/novel/chapter/create/:novelId" element={
          <ProtectedRoute>
            <ChapterEdit />
          </ProtectedRoute>
        } />
        
        <Route path="/novel/chapter/edit/:chapterId" element={
          <ProtectedRoute>
            <ChapterEdit />
          </ProtectedRoute>
        } />
        
        <Route path="/novel/favorites" element={
          <ProtectedRoute>
            <MyFavorites />
          </ProtectedRoute>
        } />
        
        <Route path="/novel/follows" element={
          <ProtectedRoute>
            <MyFollows />
          </ProtectedRoute>
        } />
        
        <Route path="/persona/:personaId" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        
        <Route path="/admin/applications" element={
          <ProtectedRoute>
            <AdminApplications />
          </ProtectedRoute>
        } />

        {/* ==========================================================
        万物阁核心功能 - 需要登录
        ========================================================== */}
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

        <Route path="/emojis" element={
          <ProtectedRoute>
            <EmojiManager />
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

        {/* ==========================================================
        ✅ 天仪阁 - 懒加载 + 跳过额外请求
        ========================================================== */}
        <Route path="/tianyige" element={
          <ProtectedRoute skipExtra={true}>
            <Suspense fallback={<LazyLoadingFallback />}>
              <TianyiGe />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AFKScreen>
  );
}

// ============================================================
// App
// ============================================================
function App() {
  return (
    <ThemeProvider>
      <AFKProvider>
        <FriendProvider>
          <Router>
            <AppContent />
          </Router>
        </FriendProvider>
      </AFKProvider>
    </ThemeProvider>
  );
}

export default App;