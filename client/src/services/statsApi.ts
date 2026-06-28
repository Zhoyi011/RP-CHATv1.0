// client/src/services/statsApi.ts
const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

export interface UserStats {
  level: number;
  exp: number;
  totalExp: number;
  expNeeded: number;
  title: string;
  unlockedTitles: string[];
  dailyExpGained: number;
  dailyLimit: number;
  hasPersona: boolean;
  personaId?: string;
  personaName?: string;
  avatar?: string;
}

export interface LeaderboardEntry {
  rank: number;
  personaId: string;
  personaName: string;
  avatar: string;
  level: number;
  exp: number;
  totalExp: number;
  title: string;
}

export const statsApi = {
  // 获取当前角色的统计数据
  getMyStats: async (): Promise<UserStats> => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('未登录');
    
    const res = await fetch(`${API_BASE}/stats/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!res.ok) throw new Error('获取统计数据失败');
    return res.json();
  },

  // 获取指定角色的统计数据
  getPersonaStats: async (personaId: string): Promise<UserStats & { personaId: string }> => {
    const res = await fetch(`${API_BASE}/stats/persona/${personaId}`);
    if (!res.ok) throw new Error('获取统计数据失败');
    return res.json();
  },

  // 获取排行榜
  getLeaderboard: async (limit: number = 50): Promise<{ leaderboard: LeaderboardEntry[] }> => {
    const res = await fetch(`${API_BASE}/stats/leaderboard?limit=${limit}`);
    if (!res.ok) throw new Error('获取排行榜失败');
    return res.json();
  },
};