// client/src/contexts/FriendContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { friendApi } from '../services/friendApi';
import type { Friend, FriendRequest, SearchPersonaResult } from '../services/friendApi';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

interface FriendContextType {
  friends: Friend[];
  requests: FriendRequest[];
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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await friendApi.getFriends();
      if (res.success) setFriends(res.data);
    } catch (error) {
      console.error('获取好友失败:', error);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await friendApi.getRequests();
      if (res.success) {
        setRequests(res.data);
        setUnreadCount(res.data.length);
      }
    } catch (error) {
      console.error('获取申请失败:', error);
    }
  }, []);

  const sendRequest = useCallback(async (toPersonaId: string, message?: string) => {
    try {
      const res = await friendApi.sendRequest(toPersonaId, message);
      if (res.success) {
        toast.success(res.message);
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '发送失败');
      return false;
    }
  }, []);

  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      const res = await friendApi.handleRequest(requestId, 'accept');
      if (res.success) {
        toast.success(res.message);
        await fetchFriends();
        await fetchRequests();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '操作失败');
      return false;
    }
  }, [fetchFriends, fetchRequests]);

  const rejectRequest = useCallback(async (requestId: string) => {
    try {
      const res = await friendApi.handleRequest(requestId, 'reject');
      if (res.success) {
        toast.success(res.message);
        await fetchRequests();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '操作失败');
      return false;
    }
  }, [fetchRequests]);

  const removeFriend = useCallback(async (friendPersonaId: string) => {
    try {
      const res = await friendApi.deleteFriend(friendPersonaId);
      if (res.success) {
        toast.success(res.message);
        await fetchFriends();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '删除失败');
      return false;
    }
  }, [fetchFriends]);

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
      fetchRequests();
      setUnreadCount(prev => prev + 1);
    };
    
    const onRequestAccepted = (data: any) => {
      console.log('📨 申请被接受:', data);
      toast.success('好友申请已被接受');
      fetchFriends();
    };
    
    socketService.on('friend-request-received', onRequestReceived);
    socketService.on('friend-request-accepted', onRequestAccepted);
    
    return () => {
      socketService.off('friend-request-received', onRequestReceived);
      socketService.off('friend-request-accepted', onRequestAccepted);
    };
  }, [fetchFriends, fetchRequests]);

  // 初始加载
  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

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