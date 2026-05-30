import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type Persona } from '../../services/api';
import { roomApi } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import PersonaSwitchPanel from '../common/PersonaSwitchPanel';
import AvatarFrame from '../common/AvatarFrame';
import toast from 'react-hot-toast';
import { AFKProvider } from '../../contexts/AFKContext';
import { AFKStatus } from '../common/AFKStatus';
import { ConnectionStatus } from '../common/ConnectionStatus';

interface Props {
  children: React.ReactNode;
}

interface TabItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

// 辅助函数：从 URL 中提取头像框文件名
const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

const MobileLayout: React.FC<Props> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [userData, setUserData] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [personasList, setPersonasList] = useState<Persona[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const switchPanelRef = useRef<HTMLDivElement>(null);
  const sideMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const { isKeyboardOpen } = useKeyboardHeight();

  const tabs: TabItem[] = [
    {
      name: '聊天',
      path: '/chat',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      name: '动态',
      path: '/feed',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      name: '主页',
      path: '/home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const data = await authApi.getCurrentUser();
        setUserData(data);
      } catch (error) {
        console.error('加载用户数据失败:', error);
      }
    };
    loadUserData();
  }, [user]);

  const refreshCurrentPersona = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/active-persona', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.activePersona) {
        const personaId = data.activePersona.personaId?._id || data.activePersona._id;
        const personaRes = await fetch(`https://rp-chatv1-0.onrender.com/api/persona/${personaId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (personaRes.ok) {
          const fullPersona = await personaRes.json();
          setCurrentPersona(fullPersona);
        } else {
          setCurrentPersona(data.activePersona.personaId || data.activePersona);
        }
      }
    } catch (error) {
      console.error('刷新角色失败:', error);
    }
  }, []);

  useEffect(() => {
    refreshCurrentPersona();
    const handlePersonaChanged = () => refreshCurrentPersona();
    window.addEventListener('personaChanged', handlePersonaChanged);
    return () => window.removeEventListener('personaChanged', handlePersonaChanged);
  }, [refreshCurrentPersona]);

  useEffect(() => {
    const fetchPersonas = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/persona/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPersonasList(data.filter((p: Persona) => p.status === 'approved'));
        }
      } catch (error) {
        console.error('获取角色列表失败:', error);
      }
    };
    fetchPersonas();
  }, []);

  const handleSwitchPersona = async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      setCurrentPersona(persona);
      localStorage.setItem('lastUsedPersonaId', persona._id);
      toast.success(`已切换至 ${persona.displayName || persona.name}`);
      window.dispatchEvent(new CustomEvent('personaChanged', { detail: persona }));
      refreshCurrentPersona();
    } catch (error) {
      toast.error('切换失败');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switchPanelRef.current && !switchPanelRef.current.contains(e.target as Node)) {
        setShowSwitchPanel(false);
      }
      if (sideMenuRef.current && !sideMenuRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('.menu-trigger')) {
        setShowSideMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/unread-total', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(Number(data.total) || 0);
        }
      } catch (error) {
        console.error('获取未读消息失败:', error);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (location.pathname === '/chat' || location.pathname.startsWith('/chat?')) {
      setActiveTab('chat');
    } else if (location.pathname === '/feed') {
      setActiveTab('feed');
    } else if (location.pathname === '/home') {
      setActiveTab('home');
    }
  }, [location.pathname]);

  const handleTabChange = useCallback((tab: string, path: string) => {
    setActiveTab(tab);
    navigate(path);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('lastUsedPersonaId');
      navigate('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const frameName = getFrameNameFromUrl(currentPersona?.avatarFrame || currentPersona?.equipped?.avatarFrame);

  return (
    <AFKProvider>
      <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* AFK 状态指示器 - 右上角 */}
        <div className="fixed top-2 right-16 z-30">
          <AFKStatus size="sm" />
        </div>

        {/* 顶部导航栏 */}
        <div className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 z-20 safe-top">
          <div className="flex items-center justify-between px-4 py-2.5">
            {/* Logo 区域 */}
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Logo" className="w-7 h-7" />
              <h1 className="text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                RP Chat
              </h1>
            </div>

            {/* 右侧按钮组 */}
            <div className="flex items-center gap-1">
              {/* 连接状态指示器（在线/挂机/离线/异常）- 移动端简化显示 */}
              <ConnectionStatus showText={false} />
              
              {/* 钻石余额 */}
              <DiamondBalance size="sm" />
              
              {/* 搜索按钮 */}
              <button
                onClick={() => navigate('/search')}
                className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* 菜单按钮 */}
              <button
                onClick={() => setShowSideMenu(true)}
                className="menu-trigger p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* 角色切换按钮 */}
              <div className="relative" ref={switchPanelRef}>
                <button
                  onClick={() => setShowSwitchPanel(!showSwitchPanel)}
                  className="relative focus:outline-none active:scale-90 transition-transform"
                >
                  <AvatarFrame
                    avatarUrl={currentPersona?.avatar || ''}
                    frameName={frameName}
                    size="sm"
                    className="mobile-header"
                  />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-white dark:ring-gray-900"></div>
                </button>

                {showSwitchPanel && (
                  <PersonaSwitchPanel
                    personas={personasList}
                    currentPersona={currentPersona}
                    onSelect={handleSwitchPersona}
                    onClose={() => setShowSwitchPanel(false)}
                    position="bottom"
                    align="right"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div 
          className="absolute inset-x-0 overflow-y-auto overscroll-y-contain"
          style={{ top: '52px', bottom: '56px' }}
        >
          {children}
        </div>

        {/* 底部 Tab 栏 */}
        <div 
          className={`fixed left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-20 transition-all duration-300 safe-bottom ${
            isKeyboardOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`} 
          style={{ bottom: 0, height: '56px' }}
        >
          <div className="flex justify-around items-center h-full">
            {tabs.map((tab) => {
              const isActiveTab = activeTab === tab.name.toLowerCase();
              return (
                <button
                  key={tab.name}
                  onClick={() => handleTabChange(tab.name.toLowerCase(), tab.path)}
                  className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 relative ${
                    isActiveTab ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="relative">
                    {isActiveTab ? (tab.activeIcon || tab.icon) : tab.icon}
                    {tab.name === '聊天' && unreadCount > 0 && !isActiveTab && (
                      <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center px-1 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-0.5 ${isActiveTab ? 'font-medium' : ''}`}>
                    {tab.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 侧边菜单抽屉 */}
        <AnimatePresence>
          {showSideMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-30"
                onClick={() => setShowSideMenu(false)}
              />
              <motion.div
                ref={sideMenuRef}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl z-40 flex flex-col"
              >
                {/* 菜单头部 */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <AvatarFrame
                      avatarUrl={currentPersona?.avatar || ''}
                      frameName={frameName}
                      size="md"
                      className="sidebar"
                    />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {currentPersona?.displayName || currentPersona?.name || '未选择角色'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {userData?.username || '用户'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 菜单选项 */}
                <div className="flex-1 py-4">
                  <button
                    onClick={() => {
                      navigate('/persona');
                      setShowSideMenu(false);
                    }}
                    className="w-full px-5 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>角色管理</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/shop');
                      setShowSideMenu(false);
                    }}
                    className="w-full px-5 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    <span>商城</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/wallet');
                      setShowSideMenu(false);
                    }}
                    className="w-full px-5 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>钱包</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowSideMenu(false);
                    }}
                    className="w-full px-5 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    <span>账号设置</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/changelog');
                      setShowSideMenu(false);
                    }}
                    className="w-full px-5 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>更新日志</span>
                  </button>
                </div>

                {/* 底部 */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>退出登录</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AFKProvider>
  );
};

export default MobileLayout;