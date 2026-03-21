import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User } from '../../services/api';

interface Props {
  children: React.ReactNode;
}

interface TabItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const MobileLayout: React.FC<Props> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [userData, setUserData] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;

  // Tab 配置
  const tabs: TabItem[] = [
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

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabChange = useCallback((tab: string, path: string) => {
    setActiveTab(tab);
    navigate(path);
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

  // 根据当前路径激活对应 tab
  useEffect(() => {
    const currentTab = tabs.find(tab => location.pathname.startsWith(tab.path));
    if (currentTab) {
      setActiveTab(currentTab.name.toLowerCase());
    }
  }, [location.pathname, tabs]);

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
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

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="relative focus:outline-none"
            >
              <img
                src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=32`}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200"
              />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full ring-1 ring-white"></div>
            </button>

            {/* 下拉菜单 */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">{userData?.username || '用户'}</p>
                  <p className="text-xs text-gray-400">{userData?.coins?.toLocaleString() || 0} 金币</p>
                </div>
                <button
                  onClick={() => { navigate('/profile'); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  个人资料
                </button>
                <button
                  onClick={() => { navigate('/changelog'); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  更新日志
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
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* 底部 Tab 栏 */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 flex justify-around py-2 safe-bottom shadow-lg">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => handleTabChange(tab.name.toLowerCase(), tab.path)}
            className={`
              flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200
              ${activeTab === tab.name.toLowerCase() 
                ? 'text-emerald-600' 
                : 'text-gray-400 hover:text-gray-600'
              }
            `}
          >
            <div className="relative">
              {tab.icon}
              {tab.name === '聊天' && unreadCount > 0 && activeTab !== 'chat' && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-xs mt-1 ${activeTab === tab.name.toLowerCase() ? 'font-medium' : ''}`}>
              {tab.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileLayout;