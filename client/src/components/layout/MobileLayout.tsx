import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { personaApi, authApi, type Persona, type User } from '../../services/api';

interface Props {
  children: React.ReactNode;
}

const MobileLayout: React.FC<Props> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
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
        // 从后端获取所有房间的未读消息总数
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

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    auth.signOut();
    localStorage.removeItem('token');
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'persona') {
      loadPersonas();
    }
  }, [activeTab]);

  const loadPersonas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await personaApi.getMyPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('加载角色失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const PersonaList = useMemo(() => {
    if (loading) {
      return <div className="text-center py-8 text-gray-400">加载中...</div>;
    }

    if (personas.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">暂无角色</p>
          <button
            onClick={() => handleNavigate('/persona/create')}
            className="bg-green-500 text-white px-4 py-2 rounded-lg"
          >
            申请第一个角色
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {personas.map((persona) => (
          <div key={persona._id} className="bg-white p-4 rounded-lg shadow flex items-center gap-3">
            <div 
              onClick={() => handleNavigate(`/persona/${persona._id}`)}
              className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition"
            >
              {persona.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="font-medium">{persona.displayName || persona.name}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  persona.status === 'approved' ? 'bg-green-100 text-green-600' :
                  persona.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {persona.status === 'approved' ? '已审核' :
                   persona.status === 'pending' ? '审核中' : '已拒绝'}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{persona.description}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }, [personas, loading, handleNavigate]);

  const ProfileContent = useMemo(() => (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow p-6 text-center mb-4">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-3 border-green-500">
          <img 
            src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=80`} 
            alt="avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="font-medium text-lg">{user?.email}</h3>
        <p className="text-sm text-gray-500 mt-1">UID: {user?.uid?.slice(0, 8)}</p>
      </div>

      {/* 钱包卡片 - 使用真实金币数据 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">我的钱包</p>
            <p className="text-xl font-bold text-yellow-600">{userData?.coins?.toLocaleString() || 0} 金币</p>
          </div>
          <button
            onClick={() => handleNavigate('/wallet')}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 transition"
          >
            查看详情
          </button>
        </div>
      </div>

      {/* 当前装备 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="font-medium mb-3">当前装备</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-purple-100 rounded-lg flex items-center justify-center mb-1">
              <span className="text-2xl">🖼️</span>
            </div>
            <p className="text-xs">头像框</p>
            {userData?.equippedItems?.avatarFrame && (
              <p className="text-xs text-green-500">已装备</p>
            )}
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-pink-100 rounded-lg flex items-center justify-center mb-1">
              <span className="text-2xl">💍</span>
            </div>
            <p className="text-xs">戒指</p>
            {userData?.equippedItems?.ring && (
              <p className="text-xs text-green-500">已佩戴</p>
            )}
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-blue-100 rounded-lg flex items-center justify-center mb-1">
              <span className="text-2xl">💌</span>
            </div>
            <p className="text-xs">关系卡</p>
            {userData?.equippedItems?.relationshipCard && (
              <p className="text-xs text-green-500">已使用</p>
            )}
          </div>
        </div>
        <button
          onClick={() => handleNavigate('/shop')}
          className="w-full mt-3 bg-green-500 text-white py-2 rounded-lg text-sm hover:bg-green-600 transition"
        >
          前往商城
        </button>
      </div>

      {/* 更新日志入口 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <button
          onClick={() => handleNavigate('/changelog')}
          className="w-full flex items-center justify-between py-2 text-gray-600 hover:text-green-600 transition"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>更新日志</span>
          </div>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="w-full py-3 text-red-600 bg-white rounded-lg shadow hover:bg-red-50 transition border border-red-100"
      >
        退出登录
      </button>
    </div>
  ), [user, userData, handleNavigate, handleLogout]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/search')}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            {activeTab === 'chat' && '聊天室'}
            {activeTab === 'persona' && '我的角色'}
            {activeTab === 'profile' && '个人中心'}
          </h1>
        </div>
        
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-green-500">
          <img 
            src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=32`} 
            alt="avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'chat' && children}
        
        {activeTab === 'persona' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">我的角色</h2>
              <button
                onClick={() => handleNavigate('/persona/create')}
                className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
              >
                + 申请新角色
              </button>
            </div>
            {PersonaList}
          </div>
        )}
        
        {activeTab === 'profile' && ProfileContent}
      </div>

      {/* 底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 shadow-lg z-20">
        <button
          onClick={() => handleTabChange('chat')}
          className={`flex-1 flex flex-col items-center py-1 relative ${
            activeTab === 'chat' ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs mt-1">聊天</span>
          {unreadCount > 0 && activeTab === 'chat' && (
            <span className="absolute -top-1 right-1/4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        
        <button
          onClick={() => handleTabChange('persona')}
          className={`flex-1 flex flex-col items-center py-1 ${
            activeTab === 'persona' ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-xs mt-1">角色</span>
        </button>
        
        <button
          onClick={() => handleTabChange('profile')}
          className={`flex-1 flex flex-col items-center py-1 ${
            activeTab === 'profile' ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs mt-1">我的</span>
        </button>
      </div>
    </div>
  );
};

export default MobileLayout;