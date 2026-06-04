// client/src/components/wallet/Wallet.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { redeemApi, type RedemptionRecord } from '../../services/api';
import RedeemModal from './RedeemModal';
import RedemptionHistory from './RedemptionHistory';
import { useTheme } from '../../contexts/ThemeContext';

interface UserInfo {
  _id: string;
  username: string;
  diamonds: number;
  paidDiamonds: number;    // 🔥 新增：充值钻石
  freeDiamonds: number;    // 🔥 新增：免费钻石
  email: string;
}

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<RedemptionRecord[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 获取充值历史
  const fetchHistory = async () => {
    try {
      const res = await redeemApi.getHistory(50);
      if (res.success) {
        setHistoryRecords(res.data.records);
        setTotalReceived(res.data.totalDiamondsReceived);
      }
    } catch (error) {
      console.error('获取充值记录失败:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUserInfo(), fetchHistory()]);
      setLoading(false);
    };
    loadData();
  }, [refreshTrigger]);

  const handleRedeemSuccess = () => {
    setShowRedeemModal(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'} animate-pulse`}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* 顶部栏 */}
      <div className={`sticky top-0 z-10 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            我的钱包
          </h1>
          <div className="w-10" />
        </div>
      </div>

      {/* 主要内容 */}
      <div className="p-4 space-y-4">
        {/* 钻石余额卡片 - 改为显示区分 */}
        <div className={`rounded-2xl p-5 ${isDark ? 'bg-gradient-to-r from-purple-900/50 to-pink-900/50' : 'bg-gradient-to-r from-purple-100 to-pink-100'}`}>
          <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-600'} mb-2`}>
            钻石余额
          </p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {(user?.diamonds || 0).toLocaleString()}
            </span>
            <span className={`text-xl ${isDark ? 'text-purple-300' : 'text-purple-500'}`}>💎</span>
          </div>
          
          {/* 🔥 钻石分类 */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className={`rounded-xl p-2 text-center ${isDark ? 'bg-white/10' : 'bg-white/60'}`}>
              <p className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>充值钻石</p>
              <p className={`text-lg font-semibold flex items-center justify-center gap-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {(user?.paidDiamonds || 0).toLocaleString()}
                <span className="text-sm text-yellow-500">💎</span>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">可用于发红包</p>
            </div>
            <div className={`rounded-xl p-2 text-center ${isDark ? 'bg-white/10' : 'bg-white/60'}`}>
              <p className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>免费钻石</p>
              <p className={`text-lg font-semibold flex items-center justify-center gap-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {(user?.freeDiamonds || 0).toLocaleString()}
                <span className="text-sm text-green-500">💎</span>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">签到/红包获得，仅可购物</p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                累计充值获得
              </p>
              <p className={`text-2xl font-semibold flex items-center gap-1 mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {totalReceived.toLocaleString()}
                <span className="text-lg text-yellow-500">💎</span>
              </p>
            </div>
            <button
              onClick={() => setShowRedeemModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
            >
              充值
            </button>
          </div>
        </div>

        {/* 钻石说明 */}
        <div className={`rounded-xl p-3 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
            💡 钻石说明：<br/>
            • <span className="text-yellow-500">充值钻石</span>：通过充值获得，可用于发红包和购买商品<br/>
            • <span className="text-green-500">免费钻石</span>：每日签到、抢红包获得，仅可用于购买商品<br/>
            • 购买商品时优先扣除免费钻石
          </p>
        </div>

        {/* 使用记录 */}
        <RedemptionHistory records={historyRecords} totalReceived={totalReceived} />
      </div>

      {/* 充值弹窗 */}
      <RedeemModal
        isOpen={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
        onSuccess={handleRedeemSuccess}
      />
    </div>
  );
};

export default Wallet;