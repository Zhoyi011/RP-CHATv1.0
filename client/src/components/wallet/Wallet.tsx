import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import DailyLogin from './DailyLogin';
import TransactionHistory from './TransactionHistory';

// 模拟金币数据（后续从后端获取）
const mockCoins = 1280;

const Wallet = () => {
  const [coins, setCoins] = useState(mockCoins);
  const [activeTab, setActiveTab] = useState('wallet');
  const navigate = useNavigate();
  const user = auth.currentUser;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate('/profile')}
            className="mr-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">我的钱包</h1>
        </div>

        {/* 金币卡片 */}
        <div className="mx-4 mb-6 p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
          <p className="text-sm opacity-90 mb-2">当前金币</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-yellow-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
              <span className="text-3xl font-bold">{coins.toLocaleString()}</span>
            </div>
            <button className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg font-medium text-sm hover:bg-yellow-300 transition">
              充值
            </button>
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="flex px-4 pb-4 gap-4">
          <button
            onClick={() => setActiveTab('daily')}
            className="flex-1 bg-white/10 py-3 rounded-xl text-center hover:bg-white/20 transition"
          >
            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">每日领取</span>
          </button>
          <button
            onClick={() => navigate('/shop')}
            className="flex-1 bg-white/10 py-3 rounded-xl text-center hover:bg-white/20 transition"
          >
            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs">前往商城</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className="flex-1 bg-white/10 py-3 rounded-xl text-center hover:bg-white/20 transition"
          >
            <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">交易记录</span>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'daily' && <DailyLogin />}
        {activeTab === 'history' && <TransactionHistory />}
        {activeTab === 'wallet' && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-medium mb-3">获取金币</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">每日登录</p>
                    <p className="text-xs text-gray-400">每天首次登录领取</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('daily')}
                  className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-600"
                >
                  领取
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">聊天发言</p>
                    <p className="text-xs text-gray-400">每10条消息获得金币</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">进行中</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">邀请好友</p>
                    <p className="text-xs text-gray-400">邀请新用户获得奖励</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">未开始</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
