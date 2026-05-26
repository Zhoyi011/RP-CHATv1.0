import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type Persona } from '../../services/api';
import { roomApi } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';
import PersonaSwitchPanel from '../common/PersonaSwitchPanel';
import AvatarFrame from '../common/AvatarFrame';
import toast from 'react-hot-toast';

interface Props {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

// 辅助函数：从 URL 中提取头像框文件名
const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

const DesktopLayout: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [personasList, setPersonasList] = useState<Persona[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const personaMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  // 页面标题映射
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/chat' || path.startsWith('/chat?')) return '聊天室';
    if (path === '/feed') return '📰 动态广场';
    if (path === '/home') return '🏠 个人主页';
    if (path === '/persona') return '🎭 角色管理';
    if (path === '/shop') return '🛒 奇妙商城';
    if (path === '/inventory') return '🎒 我的背包';
    if (path === '/search') return '🔍 全局搜索';
    if (path === '/settings') return '⚙️ 账号设置';
    if (path === '/changelog') return '📋 更新日志';
    if (path === '/wallet') return '💎 我的钱包';
    return 'RP Chat';
  };

  // 页面图标映射
  const getPageIcon = () => {
    const path = location.pathname;
    if (path === '/chat' || path.startsWith('/chat?')) return '💬';
    if (path === '/feed') return '📰';
    if (path === '/home') return '🏠';
    if (path === '/persona') return '🎭';
    if (path === '/shop') return '🛒';
    if (path === '/inventory') return '🎒';
    if (path === '/search') return '🔍';
    if (path === '/settings') return '⚙️';
    if (path === '/changelog') return '📋';
    if (path === '/wallet') return '💎';
    return '✨';
  };

  const navItems: NavItem[] = [
    {
      name: '聊天',
      path: '/chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      badge: unreadCount,
    },
    {
      name: '动态',
      path: '/feed',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      name: '主页',
      path: '/home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: '角色',
      path: '/persona',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: '商城',
      path: '/shop',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      ),
    },
    {
      name: '搜索',
      path: '/search',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      name: '钱包',
      path: '/wallet',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // 加载用户数据
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

  // 刷新当前角色
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

  // 获取角色列表
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

  // 切换角色
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
      if (personaMenuRef.current && !personaMenuRef.current.contains(e.target as Node)) {
        setShowPersonaMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取未读消息数
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

  const isActive = (path: string) => {
    if (path === '/chat') return location.pathname === '/chat' || location.pathname.startsWith('/chat?');
    return location.pathname === path;
  };

  const frameName = getFrameNameFromUrl(currentPersona?.avatarFrame || currentPersona?.equipped?.avatarFrame);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 侧边栏 */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        className={`relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transition-all duration-300 z-20`}
      >
        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 z-30 hover:scale-110 active:scale-90 group"
        >
          <svg 
            className={`w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform duration-300 group-hover:text-blue-500 ${collapsed ? 'rotate-180' : ''}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Logo 区域 */}
        <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-5'} border-b border-gray-100 dark:border-gray-800`}>
          {collapsed ? (
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8 hover:scale-110 transition-transform duration-200 cursor-pointer" onClick={() => navigate('/chat')} />
          ) : (
            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/chat')}>
              <img src="/favicon.svg" alt="Logo" className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>
                  RP Chat
                </span>
                <p className="text-[10px] text-gray-400 dark:text-gray-500" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>角色扮演聊天室</p>
              </div>
            </div>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden group
                ${isActive(item.path) 
                  ? 'text-white' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {isActive(item.path) && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl"
                  transition={{ type: 'spring', duration: 0.5 }}
                />
              )}
              
              <div className="relative z-10 flex items-center gap-3 w-full">
                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && !isActive(item.path) && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1 shadow-md animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="text-sm font-medium" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>{item.name}</span>
                )}
              </div>
              
              {collapsed && hoveredItem === item.name && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>
                  {item.name}
                </div>
              )}
            </motion.button>
          ))}
        </nav>

        {/* 底部区域 */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-2">
          <button
            onClick={() => navigate('/changelog')}
            onMouseEnter={() => setHoveredItem('changelog')}
            onMouseLeave={() => setHoveredItem(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!collapsed && <span className="text-sm" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>更新日志</span>}
            {collapsed && hoveredItem === 'changelog' && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">更新日志</div>
            )}
          </button>

          {/* 角色切换区域 */}
          <div className="relative" ref={personaMenuRef}>
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              onMouseEnter={() => setHoveredItem('persona')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="relative">
                <AvatarFrame
                  avatarUrl={currentPersona?.avatar || ''}
                  frameName={frameName}
                  size="sm"
                  className="sidebar"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-900"></div>
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>
                    {currentPersona?.displayName || currentPersona?.name || '选择角色'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>点击切换角色</p>
                </div>
              )}
              {!collapsed && (
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showPersonaMenu ? 'rotate-180' : ''}`} 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {showPersonaMenu && !collapsed && (
              <PersonaSwitchPanel
                personas={personasList}
                currentPersona={currentPersona}
                onSelect={handleSwitchPersona}
                onClose={() => setShowPersonaMenu(false)}
                position="top"
                align="left"
              />
            )}
          </div>

          {/* 用户菜单区域 */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              onMouseEnter={() => setHoveredItem('user')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>
                    {userData?.username || '用户'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>账号设置</p>
                </div>
              )}
              {!collapsed && (
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {showUserMenu && !collapsed && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-[9999]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>{userData?.username || '用户'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <DiamondBalance size="sm" />
                  </div>
                </div>

                {currentPersona && (
                  <button
                    onClick={() => { 
                      navigate(`/persona/${currentPersona._id}`);
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition"
                    style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    皮主页
                  </button>
                )}

                <button
                  onClick={() => { 
                    navigate('/settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition"
                  style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  账号设置
                </button>

                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-3 transition"
                  style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* 顶部栏 - 美化版 */}
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* 页面图标 */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center text-lg">
              {getPageIcon()}
            </div>
            {/* 页面标题 */}
            <div>
              <h1 
                className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent"
                style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}
              >
                {getPageTitle()}
              </h1>
              <p 
                className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5"
                style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}
              >
                {location.pathname === '/chat' ? '与你的角色们畅聊' : 
                 location.pathname === '/feed' ? '看看大家都在聊什么' :
                 location.pathname === '/home' ? '欢迎回来' :
                 location.pathname === '/persona' ? '管理你的所有角色' : 
                 location.pathname === '/shop' ? '装扮你的角色' : 
                 location.pathname === '/search' ? '搜索角色、群聊或用户' : 
                 location.pathname === '/wallet' ? '充值钻石，查看记录' :
                 '✨ 享受角色扮演的乐趣'}
              </p>
            </div>
          </div>
          
          {/* 右侧状态 */}
          <div className="flex items-center gap-4">
            {/* 在线状态指示器 */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 dark:text-green-400" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>在线</span>
            </div>
            
            {/* 钻石余额 */}
            <DiamondBalance size="sm" />
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DesktopLayout;