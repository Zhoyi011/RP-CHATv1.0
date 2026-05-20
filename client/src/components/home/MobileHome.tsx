import React from 'react';
import { useNavigate } from 'react-router-dom';
import DiamondBalance from '../diamond/DiamondBalance';

const MobileHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-4">
      {/* 资产卡片 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">我的资产</h2>
          <DiamondBalance size="md" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">0</p>
            <p className="text-xs text-gray-500">金币</p>
          </div>
          <div className="flex-1 bg-yellow-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">0</p>
            <p className="text-xs text-gray-500">钻石</p>
          </div>
        </div>
      </div>

      {/* 功能入口 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/daily')}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-2xl text-center shadow-md"
        >
          <div className="text-2xl mb-1">🎁</div>
          <p className="text-sm font-medium">每日签到</p>
        </button>
        <button
          onClick={() => navigate('/shop')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-2xl text-center shadow-md"
        >
          <div className="text-2xl mb-1">🛒</div>
          <p className="text-sm font-medium">商城</p>
        </button>
        <button
          onClick={() => navigate('/persona')}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-2xl text-center shadow-md"
        >
          <div className="text-2xl mb-1">🎭</div>
          <p className="text-sm font-medium">角色管理</p>
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-4 rounded-2xl text-center shadow-md"
        >
          <div className="text-2xl mb-1">⚙️</div>
          <p className="text-sm font-medium">账号设置</p>
        </button>
      </div>

      {/* 角色信息 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3">当前角色</h2>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
            {localStorage.getItem('currentPersonaName')?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-800">{localStorage.getItem('currentPersonaName') || '未选择角色'}</p>
            <button 
              onClick={() => navigate('/persona')}
              className="text-xs text-blue-500 mt-1"
            >
              切换角色 →
            </button>
          </div>
        </div>
      </div>

      {/* 动态预告 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3">好友动态</h2>
        <p className="text-sm text-gray-400 text-center py-4">
          📭 暂无新动态
        </p>
      </div>
    </div>
  );
};

export default MobileHome;