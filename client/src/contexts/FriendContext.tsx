// client/src/contexts/FriendContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { friendApi } from '../services/friendApi';
import type { Friend, FriendRequest, SearchPersonaResult } from '../services/friendApi';
import { socketService } from '../services/socket';
import { useAppData } from './AppDataContext';
import toast from 'react-hot-toast';

interface FriendContextType {
  friends: any[];  // 🔥 改为 any[] 避免类型冲突
  requests: any[]; // 🔥 改为 any[] 避免类型冲突
  unreadCount: number;
  loading: boolean;
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendRequest: (toPersonaId: string, message?: string) => Promise<boolean>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (friendPersonaId: string) => Promise<boolean>;
  searchPersonas: (q: string) => Promise<SearchPersonaResult[]>;
}

const FriendContext = createContext<FriendContextType | undefined>(undefined);

export const useFriend = () => {
  const context = useContext(FriendContext);
  if (!context) throw new Error('useFriend must be used within FriendProvider');
  return context;
};

export const FriendProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 🔥 从全局获取好友数据（自动轮询）
  const { friends, friendRequests, refreshFriends } = useAppData();
  
  const [loading, setLoading] = useState(false);

  // 🔥 直接使用全局数据
  const requests = friendRequests;
  const unreadCount = friendRequests.length;

  const fetchFriends = useCallback(async () => {
    await refreshFriends();
  }, [refreshFriends]);

  const fetchRequests = useCallback(async () => {
    await refreshFriends();
  }, [refreshFriends]);

  const sendRequest = useCallback(async (toPersonaId: string, message?: string) => {
    try {
      const res = await friendApi.sendRequest(toPersonaId, message);
      if (res.success) {
        toast.success(res.message);
        await refreshFriends();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '发送失败');
      return false;
    }
  }, [refreshFriends]);

  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      const res = await friendApi.handleRequest(requestId, 'accept');
      if (res.success) {
        toast.success(res.message);
        await refreshFriends();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '操作失败');
      return false;
    }
  }, [refreshFriends]);

  const rejectRequest = useCallback(async (requestId: string) => {
    try {
      const res = await friendApi.handleRequest(requestId, 'reject');
      if (res.success) {
        toast.success(res.message);
        await refreshFriends();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '操作失败');
      return false;
    }
  }, [refreshFriends]);

  const removeFriend = useCallback(async (friendPersonaId: string) => {
    try {
      const res = await friendApi.deleteFriend(friendPersonaId);
      if (res.success) {
        toast.success(res.message);
        await refreshFriends();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '删除失败');
      return false;
    }
  }, [refreshFriends]);

  const searchPersonas = useCallback(async (q: string) => {
    if (q.length < 2) return [];
    try {
      const res = await friendApi.searchPersonas(q);
      if (res.success) return res.data;
      return [];
    } catch (error) {
      console.error('搜索失败:', error);
      return [];
    }
  }, []);

  // Socket 监听
  useEffect(() => {
    const onRequestReceived = (data: any) => {
      console.log('📨 收到好友申请:', data);
      toast.success(`${data.fromPersona?.displayName || data.fromPersona?.name} 向你发送了好友申请`);
      refreshFriends();
    };
    
    const onRequestAccepted = (data: any) => {
      console.log('📨 申请被接受:', data);
      toast.success('好友申请已被接受');
      refreshFriends();
    };
    
    socketService.on('friend-request-received', onRequestReceived);
    socketService.on('friend-request-accepted', onRequestAccepted);
    
    return () => {
      socketService.off('friend-request-received', onRequestReceived);
      socketService.off('friend-request-accepted', onRequestAccepted);
    };
  }, [refreshFriends]);

  return (
    <FriendContext.Provider value={{
      friends,
      requests,
      unreadCount,
      loading,
      fetchFriends,
      fetchRequests,
      sendRequest,
      acceptRequest,
      rejectRequest,
      removeFriend,
      searchPersonas,
    }}>
      {children}
    </FriendContext.Provider>
  );
};