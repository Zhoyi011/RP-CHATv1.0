import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';

interface Props {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface CurrentPersona {
  _id: string;
  name: string;
  displayName?: string;
  avatar?: string;
}

const TabletLayout: React.FC<Props> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<CurrentPersona | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;

  const navItems: NavItem[] = [
    {
      name: '聊天',
      path: '/chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

  // 获取当前激活的角色
  useEffect(() => {
    const fetchCurrentPersona = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/active-persona', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.activePersona) {
          setCurrentPersona(data.activePersona);
        }
      } catch (error) {
        console.error('获取当前角色失败:', error);
      }
    };
    fetchCurrentPersona();
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
          setUnreadCount(data.total || 0);
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
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setSidebarOpen(false);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('token');
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
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-110 active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            RP Chat
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <DiamondBalance size="sm" />
          
          <button
            onClick={() => navigate('/search')}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-all duration-200 hover:scale-110 active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="transition-all duration-200 hover:scale-110 active:scale-90"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {currentPersona?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 遮罩层 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 transition-opacity animate-in fade-in duration-200" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 侧边栏抽屉 */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-30 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 侧边栏头部 */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Logo" className="w-12 h-12" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">RP Chat</h2>
                <p className="text-xs text-gray-400">角色扮演聊天室</p>
              </div>
            </div>
          </div>

          {/* 当前角色信息 */}
          <div className="p-4 mx-4 my-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {currentPersona?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {currentPersona?.displayName || currentPersona?.name || '未选择角色'}
                </p>
                <p className="text-xs text-gray-500">当前使用的角色</p>
              </div>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
                {item.name === '聊天' && unreadCount > 0 && !isActive(item.path) && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* 底部区域 */}
          <div className="p-4 border-t border-gray-100 space-y-2">
            <button
              onClick={() => handleNavigate('/profile')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🎭</span>
              <span>角色主页</span>
            </button>

            <button
              onClick={() => handleNavigate('/persona')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🔄</span>
              <span>切换角色</span>
            </button>

            <button
              onClick={() => handleNavigate('/settings')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>⚙️</span>
              <span>账号设置</span>
            </button>

            <button
              onClick={() => handleNavigate('/changelog')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>📋</span>
              <span>更新日志</span>
            </button>

            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default TabletLayout;