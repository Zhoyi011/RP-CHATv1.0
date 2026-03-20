import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi } from '../../services/api';

// 模拟用户数据（后续从后端获取）
const mockCoins = 1280;
const mockEquippedItems = {
  avatarFrame: 'gold',
  ring: 'diamond',
  relationshipCard: 'soulmate'
};

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [coins, setCoins] = useState(mockCoins);
  const [equippedItems, setEquippedItems] = useState(mockEquippedItems);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    setUser(currentUser);
  }, []);

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
    switch (equippedItems.avatarFrame) {
      case 'gold':
        return 'ring-4 ring-yellow-400 ring-offset-2';
      case 'silver':
        return 'ring-4 ring-gray-300 ring-offset-2';
      case 'rainbow':
        return 'ring-4 ring-purple-400 ring-pink-400 ring-offset-2 animate-pulse';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate('/chat')}
            className="mr-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">个人中心</h1>
        </div>

        {/* 用户信息卡片 */}
        <div className="mx-4 mb-6 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-4">
            {/* 头像 */}
            <div className="relative">
              <div className={`w-20 h-20 rounded-full overflow-hidden ${getAvatarFrameClass()}`}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${user?.email?.charAt(0) || 'U'}&background=10b981&color=fff&size=80`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* 戒指图标（如果有） */}
              {equippedItems.ring && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                  💍
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold">{user?.email?.split('@')[0] || '用户'}</h2>
              <p className="text-sm opacity-90">{user?.email}</p>
              <p className="text-xs opacity-75 mt-1">UID: {user?.uid?.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="flex px-4 pb-4 gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'profile' 
                ? 'bg-white text-green-600' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            我的资料
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'inventory' 
                ? 'bg-white text-green-600' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            我的背包
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'achievements' 
                ? 'bg-white text-green-600' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            成就
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 我的资料 */}
        {activeTab === 'profile' && (
          <>
            {/* 钱包卡片 */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">我的钱包</p>
                  <p className="text-2xl font-bold text-yellow-600">{coins.toLocaleString()} 金币</p>
                </div>
                <button
                  onClick={() => navigate('/wallet')}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 transition flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  查看详情
                </button>
              </div>
              <div className="flex gap-2 text-xs text-gray-400">
                <span>今日可领取</span>
                <span className="text-green-600">50金币</span>
              </div>
            </div>

            {/* 当前装备 */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="font-medium mb-3">当前装备</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-purple-100 rounded-lg flex items-center justify-center mb-1">
                    {equippedItems.avatarFrame ? (
                      <span className="text-2xl">🖼️</span>
                    ) : (
                      <span className="text-2xl opacity-30">🖼️</span>
                    )}
                  </div>
                  <p className="text-xs">头像框</p>
                  {equippedItems.avatarFrame && (
                    <p className="text-xs text-green-600">已装备</p>
                  )}
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-pink-100 rounded-lg flex items-center justify-center mb-1">
                    {equippedItems.ring ? (
                      <span className="text-2xl">💍</span>
                    ) : (
                      <span className="text-2xl opacity-30">💍</span>
                    )}
                  </div>
                  <p className="text-xs">戒指</p>
                  {equippedItems.ring && (
                    <p className="text-xs text-green-600">已佩戴</p>
                  )}
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                    {equippedItems.relationshipCard ? (
                      <span className="text-2xl">💌</span>
                    ) : (
                      <span className="text-2xl opacity-30">💌</span>
                    )}
                  </div>
                  <p className="text-xs">关系卡</p>
                  {equippedItems.relationshipCard && (
                    <p className="text-xs text-green-600">已使用</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/shop')}
                className="w-full mt-3 bg-green-500 text-white py-2 rounded-lg text-sm hover:bg-green-600 transition"
              >
                前往商城
              </button>
            </div>

            {/* ✅ 更新日志入口 */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <button
                onClick={() => navigate('/changelog')}
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

            {/* 统计数据 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-3">统计</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">加入天数</span>
                  <span className="font-medium">15天</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">发言总数</span>
                  <span className="font-medium">234条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">拥有角色</span>
                  <span className="font-medium">3个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">连续登录</span>
                  <span className="font-medium text-yellow-600">3天</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 我的背包 */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium mb-3">我的背包</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm text-gray-500 mb-2">头像框</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-gray-50 rounded-lg text-center">
                    <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-lg flex items-center justify-center mb-1">
                      🥇
                    </div>
                    <p className="text-xs">金色边框</p>
                    <p className="text-xs text-green-600">已装备</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg text-center opacity-50">
                    <div className="w-12 h-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-1">
                      🥈
                    </div>
                    <p className="text-xs">银色边框</p>
                    <p className="text-xs text-gray-400">×2</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-500 mb-2">戒指</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-gray-50 rounded-lg text-center">
                    <div className="w-12 h-12 mx-auto bg-pink-100 rounded-lg flex items-center justify-center mb-1">
                      💎
                    </div>
                    <p className="text-xs">钻石戒指</p>
                    <p className="text-xs text-green-600">已佩戴</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-500 mb-2">关系卡</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-gray-50 rounded-lg text-center">
                    <div className="w-12 h-12 mx-auto bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                      💘
                    </div>
                    <p className="text-xs">灵魂伴侣</p>
                    <p className="text-xs text-green-600">已使用</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 成就 */}
        {activeTab === 'achievements' && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-medium mb-3">成就</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  🗣️
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">聊天达人</p>
                  <p className="text-xs text-gray-400">累计发言100条</p>
                </div>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">已完成</span>
              </div>

              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  🎭
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">角色收藏家</p>
                  <p className="text-xs text-gray-400">拥有2个角色</p>
                </div>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">已完成</span>
              </div>

              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  🔥
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">连续登录</p>
                  <p className="text-xs text-gray-400">连续登录7天</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">3/7</span>
              </div>

              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg opacity-50">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  💰
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">富甲一方</p>
                  <p className="text-xs text-gray-400">累计获得10000金币</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">未完成</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full py-3 text-red-600 bg-white rounded-lg shadow hover:bg-red-50 transition border border-red-100"
        >
          退出登录
        </button>
      </div>
    </div>
  );
};

export default Profile;