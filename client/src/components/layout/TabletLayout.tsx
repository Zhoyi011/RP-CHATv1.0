import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User } from '../../services/api';

interface Props {
  children: React.ReactNode;
}

const TabletLayout: React.FC<Props> = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const user = auth.currentUser;

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

  // 获取未读消息总数
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/unread-total', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setUnreadCount(data.total || 0);
      } catch (error) {
        console.error('获取未读消息失败:', error);
      }
    };
    fetchUnreadCount();
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

  return (
    <div className="h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="flex items-center gap-2">
          {/* 搜索按钮 */}
          <button
            onClick={() => navigate('/search')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <h1 className="text-xl font-bold text-gray-800">RP Chat</h1>
        </div>
        
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500">
            <img 
              src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=40`} 
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* 侧边栏抽屉 */}
      {showSidebar && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30 p-4 shadow-xl overflow-y-auto">
            {/* Logo */}
            <div className="mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                RP
              </div>
            </div>
            
            {/* 用户信息 */}
            <div className="mb-6 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img 
                    src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=40`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-sm">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500">{userData?.coins?.toLocaleString() || 0} 金币</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              {/* 搜索 */}
              <button 
                onClick={() => { navigate('/search'); setShowSidebar(false); }}
                className="w-full px-4 py-3 text-left text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                搜索
              </button>
              
              {/* 首页/群聊 */}
              <button 
                onClick={() => { navigate('/chat'); setShowSidebar(false); }}
                className="w-full px-4 py-3 text-left text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg flex items-center gap-3 relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                首页
              </button>
              
              {/* 消息 */}
              <button 
                onClick={() => { navigate('/chat'); setShowSidebar(false); }}
                className="w-full px-4 py-3 text-left bg-green-50 text-green-600 rounded-lg flex items-center gap-3 relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                消息
                {unreadCount > 0 && (
                  <span className="absolute right-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* 角色 */}
              <button 
                onClick={() => { navigate('/persona'); setShowSidebar(false); }}
                className="w-full px-4 py-3 text-left text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                角色
              </button>

              {/* 钱包 */}
              <button 
                onClick={() => { navigate('/wallet'); setShowSidebar(false); }}
                className="w-full px-4 py-3 text-left text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
                钱包
              </button>

              {/* 更新日志 */}
              <button 
                onClick={() => { navigate('/changelog'); setShowSidebar(false); }}
                className="w-full px-4 py-3 text-left text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                更新日志
              </button>

              {/* 个人中心 */}
              <button 
                onClick={() => { navigate('/profile'); setShowSidebar(false); }}
                className="w-full px-4 py-3 text-left text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                个人中心
              </button>

              {/* 退出登录 */}
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 mt-4 border-t pt-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出登录
              </button>
            </div>
          </div>
        </>
      )}

      {/* 主要内容区 */}
      <div className="h-[calc(100vh-57px)] overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default TabletLayout;