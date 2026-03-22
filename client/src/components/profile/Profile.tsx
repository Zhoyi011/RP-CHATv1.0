import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  useEffect(() => {
    const currentUser = auth.currentUser;
    setUser(currentUser);
    loadUserData();
  }, []);

  // 加载用户数据
  const loadUserData = async () => {
    try {
      setLoading(true);
      const data = await authApi.getCurrentUser();
      setUserData(data);
      console.log('📊 用户数据加载成功:', {
        username: data.username,
        coins: data.coins,
        streak: data.loginStreak
      });
    } catch (error) {
      console.error('加载用户数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新用户数据
  const refreshUserData = async () => {
    try {
      setRefreshing(true);
      const data = await authApi.getCurrentUser();
      setUserData(data);
      console.log('🔄 用户数据刷新成功，当前金币:', data.coins);
    } catch (error) {
      console.error('刷新用户数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('token');
      navigate('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const getAvatarFrameClass = () => {
    switch (userData?.equippedItems?.avatarFrame) {
      case 'gold':
        return 'ring-4 ring-amber-400 ring-offset-2';
      case 'silver':
        return 'ring-4 ring-gray-300 ring-offset-2';
      case 'rainbow':
        return 'ring-4 ring-purple-400 ring-pink-400 ring-offset-2 animate-pulse';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate('/chat')}
            className="mr-3 p-1 hover:bg-white/20 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">个人中心</h1>
          <button
            onClick={refreshUserData}
            disabled={refreshing}
            className="p-1 hover:bg-white/20 rounded-full transition"
            title="刷新"
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* 用户信息卡片 */}
        <div className="mx-4 mb-6 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full overflow-hidden ${getAvatarFrameClass()}`}>
                <img 
                  src={userData?.avatar || `https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=80`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              {userData?.equippedItems?.ring && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  💍
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold">{userData?.username || user?.email?.split('@')[0] || '用户'}</h2>
              <p className="text-sm opacity-90">{user?.email}</p>
              <p className="text-xs opacity-75 mt-1">UID: {user?.uid?.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="flex px-4 pb-4 gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'profile' 
                ? 'bg-white text-emerald-600 shadow-md' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            我的资料
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'inventory' 
                ? 'bg-white text-emerald-600 shadow-md' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            我的背包
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'achievements' 
                ? 'bg-white text-emerald-600 shadow-md' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            成就
          </button>
          <button
            onClick={() => navigate('/voice')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition bg-white/10 text-white hover:bg-white/20`}
          >
            🎙️ 语音房
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
        {/* 我的资料 */}
        {activeTab === 'profile' && (
          <>
            {/* 钱包卡片 - 显示真实金币数据 */}
            <div className="bg-white rounded-2xl shadow p-5 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">我的钱包</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
                      {userData?.coins?.toLocaleString() || 0}
                    </p>
                    <span className="text-sm text-gray-400">金币</span>
                    {refreshing && (
                      <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/wallet')}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-amber-600 hover:to-yellow-600 transition shadow-md flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    查看详情
                  </button>
                  <button
                    onClick={() => navigate('/voice')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition shadow-md flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    语音房
                  </button>
                </div>
              </div>
              <div className="flex gap-2 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                <span>今日可领取</span>
                <span className="text-emerald-600 font-medium">50-200 金币</span>
                <button
                  onClick={() => navigate('/wallet?tab=daily')}
                  className="ml-auto text-emerald-500 hover:text-emerald-600"
                >
                  立即领取 →
                </button>
              </div>
            </div>

            {/* 当前装备 */}
            <div className="bg-white rounded-2xl shadow p-5 mb-4">
              <h3 className="font-medium text-gray-800 mb-3">当前装备</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-1 ${
                    userData?.equippedItems?.avatarFrame ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">🖼️</span>
                  </div>
                  <p className="text-xs text-gray-600">头像框</p>
                  {userData?.equippedItems?.avatarFrame && (
                    <p className="text-xs text-emerald-500 font-medium">已装备</p>
                  )}
                </div>
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-1 ${
                    userData?.equippedItems?.ring ? 'bg-pink-100' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">💍</span>
                  </div>
                  <p className="text-xs text-gray-600">戒指</p>
                  {userData?.equippedItems?.ring && (
                    <p className="text-xs text-emerald-500 font-medium">已佩戴</p>
                  )}
                </div>
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-1 ${
                    userData?.equippedItems?.relationshipCard ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">💌</span>
                  </div>
                  <p className="text-xs text-gray-600">关系卡</p>
                  {userData?.equippedItems?.relationshipCard && (
                    <p className="text-xs text-emerald-500 font-medium">已使用</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/shop')}
                className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transition shadow-md"
              >
                前往商城
              </button>
            </div>

            {/* 更新日志入口 */}
            <div className="bg-white rounded-2xl shadow p-5 mb-4">
              <button
                onClick={() => navigate('/changelog')}
                className="w-full flex items-center justify-between py-2 text-gray-600 hover:text-emerald-600 transition"
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

            {/* 统计数据 */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-medium text-gray-800 mb-3">统计</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">加入天数</span>
                  <span className="font-medium text-gray-700">
                    {Math.floor((Date.now() - new Date(userData?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))}天
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">连续登录</span>
                  <span className="font-medium text-emerald-600">{userData?.loginStreak || 0}天</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">累计获得金币</span>
                  <span className="font-medium text-amber-600">{userData?.coins?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 我的背包 */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-medium text-gray-800 mb-4">我的背包</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm text-gray-500 mb-2">头像框</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-gray-50 rounded-xl text-center">
                    <div className="w-12 h-12 mx-auto bg-amber-100 rounded-lg flex items-center justify-center mb-1">
                      🥇
                    </div>
                    <p className="text-xs text-gray-600">金色边框</p>
                    {userData?.equippedItems?.avatarFrame === 'gold' && (
                      <p className="text-xs text-emerald-500">已装备</p>
                    )}
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl text-center opacity-50">
                    <div className="w-12 h-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-1">
                      🥈
                    </div>
                    <p className="text-xs text-gray-600">银色边框</p>
                    <p className="text-xs text-gray-400">未获得</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-500 mb-2">戒指</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-gray-50 rounded-xl text-center">
                    <div className="w-12 h-12 mx-auto bg-pink-100 rounded-lg flex items-center justify-center mb-1">
                      💎
                    </div>
                    <p className="text-xs text-gray-600">钻石戒指</p>
                    {userData?.equippedItems?.ring && (
                      <p className="text-xs text-emerald-500">已佩戴</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-500 mb-2">关系卡</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-gray-50 rounded-xl text-center">
                    <div className="w-12 h-12 mx-auto bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                      💘
                    </div>
                    <p className="text-xs text-gray-600">灵魂伴侣</p>
                    {userData?.equippedItems?.relationshipCard && (
                      <p className="text-xs text-emerald-500">已使用</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 成就 */}
        {activeTab === 'achievements' && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-medium text-gray-800 mb-4">成就</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  🗣️
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">聊天达人</p>
                  <p className="text-xs text-gray-400">累计发言100条</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">已完成</span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  🎭
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">角色收藏家</p>
                  <p className="text-xs text-gray-400">拥有2个角色</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">已完成</span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  🔥
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">连续登录</p>
                  <p className="text-xs text-gray-400">连续登录7天</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{userData?.loginStreak || 0}/7</span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl opacity-50">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  💰
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">富甲一方</p>
                  <p className="text-xs text-gray-400">累计获得10000金币</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                  {Math.min(100, Math.floor(((userData?.coins || 0) / 10000) * 100))}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className={`${isMobile ? 'p-3' : 'p-4'} pb-8`}>
        <button
          onClick={handleLogout}
          className="w-full py-3 text-red-600 bg-white rounded-xl shadow hover:bg-red-50 transition border border-red-100 font-medium"
        >
          退出登录
        </button>
      </div>
    </div>
  );
};

export default Profile;