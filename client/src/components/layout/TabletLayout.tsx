import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User } from '../../services/api';

interface Props {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const TabletLayout: React.FC<Props> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;

  // 导航菜单
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
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

  // 获取未读消息
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/unread-total', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        setUnreadCount(data.total || 0);
      } catch (error) {
        console.error('获取未读消息失败:', error);
      }
    };
    fetchUnreadCount();
  }, [user]);

  // 点击外部关闭侧边栏
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
            className="p-2 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">RP</span>
          </div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            RP Chat
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/search')}
            className="p-2 text-gray-500 hover:text-emerald-600 rounded-full hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <div className="relative">
            <img
              src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=36`}
              alt="avatar"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200"
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-md">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 侧边栏抽屉 */}
      <>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 transition-opacity" onClick={() => setSidebarOpen(false)} />
        )}
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
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">RP</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">RP Chat</h2>
                  <p className="text-xs text-gray-400">角色扮演聊天室</p>
                </div>
              </div>
            </div>

            {/* 用户信息 */}
            <div className="p-4 mx-4 my-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
              <div className="flex items-center gap-3">
                <img
                  src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=48`}
                  alt="avatar"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-300"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{userData?.username || '用户'}</p>
                  <p className="text-sm text-emerald-600">{userData?.coins?.toLocaleString() || 0} 金币</p>
                </div>
              </div>
            </div>

            {/* 导航菜单 */}
            <nav className="flex-1 px-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive(item.path)
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-emerald-600'
                    }
                  `}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                  {item.name === '聊天' && unreadCount > 0 && !isActive(item.path) && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* 底部区域 */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              <button
                onClick={() => handleNavigate('/changelog')}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>更新日志</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default TabletLayout;