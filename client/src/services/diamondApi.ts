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

export interface DailyInfo {
  hasClaimed: boolean;
  currentStreak: number;
  nextReward: number;
  rewards: number[];
}

export interface ClaimResult {
  claimed: boolean;
  reward?: number;
  streak?: number;
  diamonds?: number;
  reason?: string;
}

export const diamondApi = {
  getBalance: () => request<{ diamonds: number }>('/diamond/balance'),
  claimDaily: () => request<ClaimResult>('/diamond/daily'),
  getDailyInfo: () => request<DailyInfo>('/diamond/daily-info'),
};