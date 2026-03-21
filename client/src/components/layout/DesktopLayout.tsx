import React, { useState, useEffect } from 'react';
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
  activeIcon?: React.ReactNode;
}

const DesktopLayout: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const user = auth.currentUser;

  // 导航菜单配置
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
    {
      name: '钱包',
      path: '/wallet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 侧边栏 */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col transition-all duration-300 shadow-sm z-20`}>
        {/* Logo */}
        <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-6'} border-b border-gray-100`}>
          {collapsed ? (
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">RP</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">RP</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                RP Chat
              </span>
            </div>
          )}
        </div>

        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all z-30"
        >
          <svg className={`w-3 h-3 text-gray-500 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 导航菜单 */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                ${isActive(item.path) 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-emerald-600'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.name : ''}
            >
              <div className="relative">
                {item.icon}
                {item.name === '聊天' && unreadCount > 0 && !isActive(item.path) && (
                  <span className="absolute -top-1 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-md">
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
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition-all ${collapsed ? 'justify-center' : ''}`}
            title="更新日志"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!collapsed && <span className="text-sm">更新日志</span>}
          </button>

          {/* 用户菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="relative">
                <img
                  src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=40`}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-white"></div>
              </div>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {userData?.username || user?.email?.split('@')[0] || '用户'}
                  </p>
                  <p className="text-xs text-gray-400">{userData?.coins?.toLocaleString() || 0} 金币</p>
                </div>
              )}
            </button>

            {/* 用户下拉菜单 */}
            {showUserMenu && !collapsed && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-30">
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  个人资料
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </button>
              </div>
            )}
          </div>

          {/* 折叠状态下的用户头像点击菜单 */}
          {collapsed && showUserMenu && (
            <div className="absolute bottom-20 left-20 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-30">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium">{userData?.username || '用户'}</p>
                <p className="text-xs text-gray-400">{userData?.coins?.toLocaleString() || 0} 金币</p>
              </div>
              <button
                onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                个人资料
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden bg-gray-50/50">
        {children}
      </main>
    </div>
  );
};

export default DesktopLayout;