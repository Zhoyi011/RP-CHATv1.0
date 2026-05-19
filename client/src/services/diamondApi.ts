const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const getToken = () => localStorage.getItem('token');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}

// 类型定义
export interface DailyInfo {
  hasClaimed: boolean;
  currentStreak: number;
  nextReward: number;
  rewards: number[];  // [5, 5, 8, 8, 10, 15, 20]
}

export interface ClaimResult {
  claimed: boolean;
  reward?: number;
  streak?: number;
  diamonds?: number;
  reason?: string;
}

export interface BalanceResult {
  diamonds: number;
  coins: number;
}

export const diamondApi = {
  // 获取余额
  getBalance: () => request<BalanceResult>('/diamond/balance'),
  
  // 领取每日钻石
  claimDaily: () => request<ClaimResult>('/diamond/daily', { method: 'POST' }),
  
  // 获取每日信息（用于显示签到面板）
  getDailyInfo: () => request<DailyInfo>('/diamond/daily-info'),
  
  // 获取每日状态（简单版）
  getDailyStatus: () => request<{ canClaim: boolean; streak: number; diamonds: number }>('/diamond/daily-status'),
};