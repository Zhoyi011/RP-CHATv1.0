// client/src/contexts/AppDataContext.tsx

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { usePolling } from '../hooks/usePolling';
import { 
  authApi, 
  roomApi, 
  novelApi, 
  redeemApi,
  type Room,
  type Persona,
  type User,
  type Message
} from '../services/api';
import type { Novel, FollowAuthor, AuthorApplication } from '../types/novel';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// ========== 类型定义（从 api.ts 复用） ==========

export type { Room, Persona, User, Message };

export interface FriendRequest {
  _id: string;
  fromPersonaId?: any;
  toPersonaId?: any;
  status?: string;
  message?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface Friend {
  _id: string;
  friendPersonaId?: any;
  personaId?: any;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface Notification {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  [key: string]: any;
}

export interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  [key: string]: any;
}

// ========== AppData 接口 ==========

export interface AppData {
  userInfo: User | null;
  diamonds: number;
  paidDiamonds: number;
  freeDiamonds: number;
  userStats: any;
  personas: Persona[];
  currentPersona: Persona | null;
  activePersonaId: string | null;
  rooms: Room[];
  unreadTotal: number;
  friends: Friend[];
  friendRequests: FriendRequest[];
  friendRequestCount: number;
  novels: Novel[];
  myNovels: Novel[];
  novelCategories: string[];
  authorApplications: AuthorApplication[];
  transactions: Transaction[];
  redeemHistory: any[];
  walletStats: any;
  notifications: Notification[];
  unreadNotificationCount: number;
  isLoading: boolean;
  isInitialized: boolean;
  lastUpdated: Date;
  isOnline: boolean;
}

export interface AppDataContextType extends AppData {
  refreshAll: () => Promise<void>;
  refreshRooms: () => Promise<void>;
  refreshFriends: () => Promise<void>;
  refreshPersonas: () => Promise<void>;
  refreshNovels: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshUserInfo: () => Promise<void>;
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  setUnreadTotal: React.Dispatch<React.SetStateAction<number>>;
  setFriendRequests: React.Dispatch<React.SetStateAction<FriendRequest[]>>;
  setCurrentPersona: React.Dispatch<React.SetStateAction<Persona | null>>;
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
  setNovels: React.Dispatch<React.SetStateAction<Novel[]>>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (notification: Notification) => void;
  pausePolling: () => void;
  resumePolling: () => void;
}

// ========== Context ==========

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
};

// ========== Provider ==========

interface AppDataProviderProps {
  children: ReactNode;
}

export const AppDataProvider: React.FC<AppDataProviderProps> = ({ children }) => {
  // ============================================================
  // 1. 所有状态
  // ============================================================

  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [diamonds, setDiamonds] = useState(0);
  const [paidDiamonds, setPaidDiamonds] = useState(0);
  const [freeDiamonds, setFreeDiamonds] = useState(0);
  const [userStats, setUserStats] = useState<any>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [myNovels, setMyNovels] = useState<Novel[]>([]);
  const [novelCategories] = useState<string[]>(['全部', '武侠', '玄幻', '言情', '历史', '悬疑', '科幻', '文学', '其他']);
  const [authorApplications, setAuthorApplications] = useState<AuthorApplication[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [redeemHistory, setRedeemHistory] = useState<any[]>([]);
  const [walletStats, setWalletStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPollingPaused, setIsPollingPaused] = useState(true); // 🔥 默认暂停轮询

  // ============================================================
  // 2. 工具函数
  // ============================================================

  const getToken = useCallback(() => localStorage.getItem('token'), []);

  // 检测页面是否可见
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ============================================================
  // 3. 数据加载函数（未登录时直接返回空数据）
  // ============================================================

  // ----- 3.1 用户信息 -----
  const loadUserInfo = useCallback(async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const data = await authApi.getCurrentUser();
      if (data) {
        setUserInfo(data);
        setDiamonds(data.diamonds || data.coins || 0);
        setPaidDiamonds(data.paidDiamonds || 0);
        setFreeDiamonds(data.freeDiamonds || 0);
      }
      return data;
    } catch (error) {
      return null;
    }
  }, [getToken]);

  // ----- 3.2 用户统计 -----
  const loadUserStats = useCallback(async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/stats/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
        return data;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, [getToken]);

  // ----- 3.3 角色列表 -----
  const loadPersonas = useCallback(async () => {
    const token = getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE}/persona/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const approved = data.filter((p: Persona) => p.status === 'approved');
        setPersonas(approved);

        const activeRes = await fetch(`${API_BASE}/room/active-persona`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          if (activeData.activePersona) {
            const id = activeData.activePersona.personaId?._id || activeData.activePersona._id;
            setActivePersonaId(id);
            const current = approved.find((p: Persona) => p._id === id);
            if (current) setCurrentPersona(current);
          } else if (approved.length > 0) {
            setCurrentPersona(approved[0]);
            setActivePersonaId(approved[0]._id);
          }
        }
        return approved;
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [getToken]);

  // ----- 3.4 房间列表 -----
  const loadRooms = useCallback(async () => {
    const token = getToken();
    if (!token) return { rooms: [] };

    try {
      const res = await fetch(`${API_BASE}/room/my-rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rooms) {
          setRooms(data.rooms);
        }
        return data;
      }
      return { rooms: [] };
    } catch (error) {
      return { rooms: [] };
    }
  }, [getToken]);

  // ----- 3.5 未读总数 -----
  const loadUnreadTotal = useCallback(async () => {
    const token = getToken();
    if (!token) return { total: 0 };

    try {
      const res = await fetch(`${API_BASE}/room/unread-total`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadTotal(data.total || 0);
        return data;
      }
      return { total: 0 };
    } catch (error) {
      return { total: 0 };
    }
  }, [getToken]);

  // ----- 3.6 好友列表 -----
  const loadFriends = useCallback(async () => {
    const token = getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE}/friend/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        return data.friends || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [getToken]);

  // ----- 3.7 好友申请 -----
  const loadFriendRequests = useCallback(async () => {
    const token = getToken();
    if (!token) return { requests: [] };

    try {
      const res = await fetch(`${API_BASE}/friend/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriendRequests(data.requests || []);
        return data;
      }
      return { requests: [] };
    } catch (error) {
      return { requests: [] };
    }
  }, [getToken]);

  // ----- 3.8 小说列表（公开，不需要登录） -----
  const loadNovels = useCallback(async () => {
    try {
      const data = await novelApi.getNovels({ page: 1, limit: 30 });
      if (data.novels) {
        setNovels(data.novels);
      }
      return data;
    } catch (error) {
      return { novels: [] };
    }
  }, []);

  // ----- 3.9 我的小说（需要登录） -----
  const loadMyNovels = useCallback(async () => {
    const token = getToken();
    if (!token) return [];

    try {
      const activeRes = await fetch(`${API_BASE}/room/active-persona`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        const personaId = activeData.activePersona?.personaId?._id || activeData.activePersona?._id;
        if (personaId) {
          const data = await novelApi.getMyNovels(personaId);
          setMyNovels(data.novels || []);
          return data.novels || [];
        }
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [getToken]);

  // ----- 3.10 作者申请（需要登录） -----
  const loadAuthorApplications = useCallback(async () => {
    const token = getToken();
    if (!token) return [];

    try {
      const data = await novelApi.getPendingApplications();
      setAuthorApplications(data.applications || []);
      return data.applications || [];
    } catch (error) {
      return [];
    }
  }, []);

  // ----- 3.11 交易记录（需要登录） -----
  const loadTransactions = useCallback(async () => {
    const token = getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE}/diamond/transactions?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        return data.transactions || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [getToken]);

  // ----- 3.12 充值历史（需要登录） -----
  const loadRedeemHistory = useCallback(async () => {
    const token = getToken();
    if (!token) return [];

    try {
      const data = await redeemApi.getHistory();
      setRedeemHistory(data.data?.records || []);
      return data.data?.records || [];
    } catch (error) {
      return [];
    }
  }, []);

  // ----- 3.13 钱包统计（需要登录） -----
  const loadWalletStats = useCallback(async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/redeem/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWalletStats(data.data);
        return data.data;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, [getToken]);

  // ----- 3.14 通知（需要登录） -----
  const loadNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadNotificationCount(data.unreadCount || 0);
        return data.notifications || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [getToken]);

  // ----- 3.15 在线状态 -----
  const checkOnlineStatus = useCallback(async () => {
    const online = navigator.onLine;
    setIsOnline(online);
    return { online };
  }, []);

  // ============================================================
  // 4. 加载所有数据（未登录时只加载公开数据）
  // ============================================================

  const loadAllData = useCallback(async () => {
    const token = getToken();
    
    // 无论是否登录，都加载公开的小说列表
    const publicTasks = [loadNovels()];
    
    if (token) {
      await Promise.all([
        ...publicTasks,
        loadUserInfo(),
        loadUserStats(),
        loadPersonas(),
        loadRooms(),
        loadUnreadTotal(),
        loadFriends(),
        loadFriendRequests(),
        loadMyNovels(),
        loadTransactions(),
        loadRedeemHistory(),
        loadNotifications(),
        loadAuthorApplications(),
        loadWalletStats(),
      ]);
    } else {
      await Promise.all(publicTasks);
      setUserInfo(null);
      setPersonas([]);
      setCurrentPersona(null);
      setRooms([]);
      setUnreadTotal(0);
      setFriends([]);
      setFriendRequests([]);
      setMyNovels([]);
      setTransactions([]);
      setRedeemHistory([]);
      setNotifications([]);
      setAuthorApplications([]);
      setDiamonds(0);
      setPaidDiamonds(0);
      setFreeDiamonds(0);
    }
    
    setLastUpdated(new Date());
    setIsInitialized(true);
    setIsLoading(false);
  }, [
    getToken,
    loadUserInfo,
    loadUserStats,
    loadPersonas,
    loadRooms,
    loadUnreadTotal,
    loadFriends,
    loadFriendRequests,
    loadNovels,
    loadMyNovels,
    loadTransactions,
    loadRedeemHistory,
    loadNotifications,
    loadAuthorApplications,
    loadWalletStats,
  ]);

  // ============================================================
  // 5. 注册全局轮询 - 🔥🔥🔥 全部禁用，防止资源耗尽 🔥🔥🔥
  // ============================================================

  // 🔥 所有轮询全部禁用，等系统稳定后再逐步恢复
  // 轮询导致 ERR_INSUFFICIENT_RESOURCES 错误，浏览器连接池被占满

  usePolling(loadNovels, () => {}, { 
    id: 'global_novels', 
    interval: 15000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadUnreadTotal, () => {}, { 
    id: 'global_unread', 
    interval: 5000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadUserInfo, () => {}, { 
    id: 'global_user_info', 
    interval: 30000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadRooms, () => {}, { 
    id: 'global_rooms', 
    interval: 60000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadFriends, () => {}, { 
    id: 'global_friends', 
    interval: 120000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadFriendRequests, () => {}, { 
    id: 'global_friend_requests', 
    interval: 120000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadPersonas, () => {}, { 
    id: 'global_personas', 
    interval: 120000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadTransactions, () => {}, { 
    id: 'global_transactions', 
    interval: 120000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadMyNovels, () => {}, { 
    id: 'global_my_novels', 
    interval: 120000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadNotifications, () => {}, { 
    id: 'global_notifications', 
    interval: 120000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadUserStats, () => {}, { 
    id: 'global_user_stats', 
    interval: 300000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadRedeemHistory, () => {}, { 
    id: 'global_redeem_history', 
    interval: 300000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadWalletStats, () => {}, { 
    id: 'global_wallet_stats', 
    interval: 300000,
    enabled: false  // 🔥 禁用
  });

  usePolling(loadAuthorApplications, () => {}, { 
    id: 'global_author_applications', 
    interval: 300000,
    enabled: false  // 🔥 禁用
  });

  usePolling(checkOnlineStatus, () => {}, { 
    id: 'global_online_status', 
    interval: 60000,
    enabled: false  // 🔥 禁用
  });

  // ============================================================
  // 6. 暂停/恢复轮询
  // ============================================================

  const pausePolling = useCallback(() => {
    setIsPollingPaused(true);
  }, []);

  const resumePolling = useCallback(() => {
    setIsPollingPaused(false);
  }, []);

  // ============================================================
  // 7. 手动刷新方法
  // ============================================================

  const refreshAll = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  const refreshRooms = useCallback(async () => {
    await loadRooms();
    await loadUnreadTotal();
  }, [loadRooms, loadUnreadTotal]);

  const refreshFriends = useCallback(async () => {
    await loadFriends();
    await loadFriendRequests();
  }, [loadFriends, loadFriendRequests]);

  const refreshPersonas = useCallback(async () => {
    await loadPersonas();
  }, [loadPersonas]);

  const refreshNovels = useCallback(async () => {
    await loadNovels();
    await loadMyNovels();
  }, [loadNovels, loadMyNovels]);

  const refreshWallet = useCallback(async () => {
    await loadUserInfo();
    await loadTransactions();
    await loadRedeemHistory();
    await loadWalletStats();
  }, [loadUserInfo, loadTransactions, loadRedeemHistory, loadWalletStats]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const refreshUserInfo = useCallback(async () => {
    await loadUserInfo();
    await loadUserStats();
  }, [loadUserInfo, loadUserStats]);

  // ============================================================
  // 8. 通知操作方法
  // ============================================================

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
    setUnreadNotificationCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadNotificationCount(0);
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadNotificationCount(prev => prev + 1);
    }
  }, []);

  // ============================================================
  // 9. 初始化和网络监听
  // ============================================================

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      loadAllData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadAllData]);

  // ============================================================
  // 10. 监听自定义刷新事件
  // ============================================================

  useEffect(() => {
    const handleRefresh = (e: CustomEvent) => {
      const { type } = e.detail || {};
      switch (type) {
        case 'rooms': refreshRooms(); break;
        case 'friends': refreshFriends(); break;
        case 'personas': refreshPersonas(); break;
        case 'novels': refreshNovels(); break;
        case 'wallet': refreshWallet(); break;
        case 'notifications': refreshNotifications(); break;
        case 'user': refreshUserInfo(); break;
        case 'all':
        default: refreshAll(); break;
      }
    };

    window.addEventListener('refreshData', handleRefresh as EventListener);
    return () => {
      window.removeEventListener('refreshData', handleRefresh as EventListener);
    };
  }, [refreshAll, refreshRooms, refreshFriends, refreshPersonas, refreshNovels, refreshWallet, refreshNotifications, refreshUserInfo]);

  // ============================================================
  // 11. 暴露 Context
  // ============================================================

  const value: AppDataContextType = {
    userInfo,
    diamonds,
    paidDiamonds,
    freeDiamonds,
    userStats,
    personas,
    currentPersona,
    activePersonaId,
    rooms,
    unreadTotal,
    friends,
    friendRequests,
    friendRequestCount: friendRequests.length,
    novels,
    myNovels,
    novelCategories,
    authorApplications,
    transactions,
    redeemHistory,
    walletStats,
    notifications,
    unreadNotificationCount,
    isLoading,
    isInitialized,
    lastUpdated,
    isOnline,

    refreshAll,
    refreshRooms,
    refreshFriends,
    refreshPersonas,
    refreshNovels,
    refreshWallet,
    refreshNotifications,
    refreshUserInfo,

    setRooms,
    setUnreadTotal,
    setFriendRequests,
    setCurrentPersona,
    setPersonas,
    setNovels,

    markNotificationRead,
    markAllNotificationsRead,
    addNotification,

    pausePolling,
    resumePolling,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};