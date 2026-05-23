import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
}

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
  const personaMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  const navItems: NavItem[] = [
    {
      name: '聊天',
      path: '/chat',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    },
    {
      name: '主页',
      path: '/home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: '角色',
      path: '/persona',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: '搜索',
      path: '/search',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
        // 获取完整角色信息（包含头像框）
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

  // 获取当前激活的角色
  useEffect(() => {
    refreshCurrentPersona();
    
    const handlePersonaChanged = () => {
      refreshCurrentPersona();
    };
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

  // 点击外部关闭面板
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 关闭菜单的透明层 */}
      {(showPersonaMenu || showUserMenu) && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => {
            setShowPersonaMenu(false);
            setShowUserMenu(false);
          }} 
        />
      )}

      {/* 侧边栏 */}
      <aside 
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col transition-all duration-300 shadow-sm z-20 relative`}
      >
        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 z-30 hover:scale-110 active:scale-90"
        >
          <svg 
            className={`w-3 h-3 text-gray-500 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Logo 区域 */}
        <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-6'} border-b border-gray-100`}>
          {collapsed ? (
            <img src="/favicon.svg" alt="Logo" className="w-10 h-10 hover:scale-110 transition-transform duration-200 cursor-pointer" onClick={() => navigate('/chat')} />
          ) : (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/chat')}>
              <img src="/favicon.svg" alt="Logo" className="w-10 h-10 hover:scale-110 transition-transform duration-200" />
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  RP Chat
                </span>
                <p className="text-xs text-gray-400">角色扮演聊天室</p>
              </div>
            </div>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 
                hover:scale-[1.02] active:scale-[0.98]
                ${isActive(item.path) 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                }
                ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.name : ''}
            >
              <div className="relative">
                {item.icon}
                {item.name === '聊天' && unreadCount > 0 && !isActive(item.path) && (
                  <span className="absolute -top-1 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </button>
          ))}
        </nav>

        {/* 底部区域 */}
        <div className="border-t border-gray-100 p-3 space-y-2">
          {/* 更新日志 */}
          <button
            onClick={() => navigate('/changelog')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? '更新日志' : ''}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!collapsed && <span className="text-sm">更新日志</span>}
          </button>

          {/* 角色切换区域 */}
          <div className="relative" ref={personaMenuRef}>
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="relative">
                <AvatarFrame
                  avatarUrl={currentPersona?.avatar || ''}
                  frameUrl={currentPersona?.avatarFrame || currentPersona?.equipped?.avatarFrameUrl || null}
                  size="sm"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-white"></div>
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {currentPersona?.displayName || currentPersona?.name || '选择角色'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">点击切换角色</p>
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
              onClick={() => {
                console.log('🔘 用户菜单按钮被点击');
                setShowUserMenu(!showUserMenu);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {userData?.username || '用户'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">账号设置</p>
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
              <div 
                className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-[9999]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800 truncate">{userData?.username || '用户'}</p>
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
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
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
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  账号设置
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                <button
                  onClick={() => { 
                    handleLogout();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden bg-gray-50/50 flex flex-col">
        {/* 顶部栏 */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="text-sm text-gray-500">
            {location.pathname === '/chat' ? '聊天' : 
             location.pathname === '/feed' ? '动态' :
             location.pathname === '/home' ? '主页' :
             location.pathname === '/persona' ? '角色管理' : 
             location.pathname === '/search' ? '搜索' : ''}
          </div>
          
          <div className="flex items-center gap-3">
            <DiamondBalance size="sm" />
          </div>
        </div>
        
        {children}
      </main>
    </div>
  );
};

export default DesktopLayout;