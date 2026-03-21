import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User } from '../../services/api';

interface Props {
  children: React.ReactNode;
}

const DesktopLayout: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [userData, setUserData] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 加载用户数据
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await authApi.getCurrentUser();
        setUserData(data);
      } catch (error) {
        console.error('加载用户数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, [user]);

  // 获取未读消息总数
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/unread-total', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.total || 0);
        } else {
          console.error('获取未读消息失败:', response.status);
        }
      } catch (error) {
        console.error('获取未读消息失败:', error);
      }
    };
    
    fetchUnreadCount();
    
    // 可选：每隔30秒刷新一次未读计数
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* 左侧导航栏 */}
      <div className="w-20 bg-white shadow-lg flex flex-col items-center py-6 h-full border-r border-gray-100 flex-shrink-0">
        {/* Logo */}
        <button 
          onClick={() => navigate('/chat')}
          className="mb-8 focus:outline-none"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md hover:shadow-lg transition-shadow">
            RP
          </div>
        </button>

        {/* 导航图标 */}
        <div className="flex-1 w-full px-3 space-y-2">
          {/* 搜索 */}
          <button
            onClick={() => navigate('/search')}
            className="w-full py-3 flex flex-col items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
            title="搜索"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs mt-1">搜索</span>
          </button>

          // 群聊按钮 - 确保 onClick 正确
          <button
            onClick={() => navigate('/chat')}
            className="w-full py-3 flex flex-col items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors relative"
          >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
          <span className="text-xs mt-1">群聊</span>
        </button>

    //私聊按钮
<button
  onClick={() => navigate('/chat?tab=private')}
  className="w-full py-3 flex flex-col items-center justify-center text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
>
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            <span className="text-xs mt-1">私聊</span>
          </button>
          
          {/* 角色 */}
          <button
            onClick={() => navigate('/persona')}
            className="w-full py-3 flex flex-col items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
            title="角色"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-xs mt-1">角色</span>
          </button>

          {/* 钱包 */}
          <button
            onClick={() => navigate('/wallet')}
            className="w-full py-3 flex flex-col items-center justify-center text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-colors"
            title="钱包"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
            <span className="text-xs mt-1">钱包</span>
          </button>
        </div>

        {/* 底部 */}
        <div className="mt-auto pb-6 space-y-2">
          {/* 更新日志 */}
          <button
            onClick={() => navigate('/changelog')}
            className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
            title="更新日志"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* 个人资料 */}
          <button
            onClick={() => navigate('/profile')}
            className="w-12 h-12 rounded-xl overflow-hidden border-2 border-transparent hover:border-green-500 transition-colors"
            title="个人中心"
          >
            <img 
              src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=48`}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </button>
          
          {/* 登出 */}
          <button
            onClick={handleLogout}
            className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="登出"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 ml-20 h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default DesktopLayout;