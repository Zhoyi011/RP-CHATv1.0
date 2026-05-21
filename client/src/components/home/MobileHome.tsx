import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User, type Persona } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';
import DailyDiamond from '../diamond/DailyDiamond';

const MobileHome: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [userData, personaRes] = await Promise.all([
        authApi.getCurrentUser(),
        fetch('https://rp-chatv1-0.onrender.com/api/room/active-persona', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);
      setUser(userData);
      if (personaRes.activePersona) {
        setCurrentPersona(personaRes.activePersona.personaId || personaRes.activePersona);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const menuItems = [
    { name: '角色管理', icon: '🎭', path: '/persona', color: 'from-purple-500 to-pink-500', desc: '管理你的角色' },
    { name: '商城', icon: '🛒', path: '/shop', color: 'from-orange-500 to-red-500', desc: '购买精美道具' },
    { name: '背包', icon: '🎒', path: '/inventory', color: 'from-emerald-500 to-teal-500', desc: '查看你的物品' },
    { name: '账号设置', icon: '⚙️', path: '/settings', color: 'from-gray-500 to-gray-600', desc: '个人资料设置' },
  ];

  return (
    <div className="pb-4">
      {/* 当前角色卡片 */}
      <div className="mx-4 mt-4">
        <div 
          className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate(`/persona/${currentPersona?._id}`)}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shadow-inner">
              {currentPersona?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <p className="text-sm opacity-80">当前角色</p>
              <p className="text-lg font-bold">{currentPersona?.displayName || currentPersona?.name || '未选择'}</p>
              <p className="text-xs opacity-70 mt-1">点击查看主页 →</p>
            </div>
          </div>
        </div>
      </div>

      {/* 资产卡片 */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>💰</span> 我的资产
          </h2>
          <div className="flex gap-4">
            <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{user?.diamonds || 0}</p>
              <p className="text-xs text-gray-500">💎 钻石</p>
            </div>
            <div className="flex-1 bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{user?.coins || 0}</p>
              <p className="text-xs text-gray-500">🪙 金币（已绝版）</p>
            </div>
          </div>
        </div>
      </div>

      {/* 每日签到 */}
      <div className="mx-4 mt-4">
        <DailyDiamond onClaimSuccess={loadData} />
      </div>

      {/* 功能入口网格 */}
      <div className="mx-4 mt-4">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>🚀</span> 快捷入口
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`bg-gradient-to-r ${item.color} text-white p-4 rounded-2xl text-left shadow-md active:scale-[0.98] transition-transform`}
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-[10px] opacity-80 mt-0.5">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 关于 */}
      <div className="text-center py-6">
        <p className="text-xs text-gray-400">RP Chat - 角色扮演聊天室</p>
        <p className="text-xs text-gray-400 mt-1">版本 1.0.0</p>
      </div>
    </div>
  );
};

export default MobileHome;