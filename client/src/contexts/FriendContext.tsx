// client/src/contexts/FriendContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { friendApi } from '../services/friendApi';
import type { Friend, FriendRequest, SearchPersonaResult } from '../services/friendApi';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

interface FriendContextType {
  friends: Friend[];
  friendRequests: FriendRequest[];
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

interface FriendProviderProps {
  children: ReactNode;
}

export const FriendProvider: React.FC<FriendProviderProps> = ({ children }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 获取好友列表
  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await friendApi.getFriends();
      if (res.success) setFriends(res.data);
    } catch (error) {
      console.error('获取好友列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取好友申请
  const fetchRequests = useCallback(async () => {
    try {
      const res = await friendApi.getRequests();
      if (res.success) {
        setFriendRequests(res.data.received);
        setUnreadCount(res.data.received.length);
      }
    } catch (error) {
      console.error('获取好友申请失败:', error);
    }
  }, []);

  // 发送好友申请
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

  // 同意申请
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

  // 拒绝申请
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

  // 删除好友
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

  // 搜索角色
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

  // Socket 事件
  useEffect(() => {
    const onRequestReceived = () => {
      toast.success('收到新的好友申请');
      fetchRequests();
      setUnreadCount(prev => prev + 1);
    };
    const onRequestAccepted = () => {
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
  }, [fetchFriends, fetchRequests]);

  return (
    <FriendContext.Provider
      value={{
        friends,
        friendRequests,
        unreadCount,
        loading,
        fetchFriends,
        fetchRequests,
        sendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
        searchPersonas,
      }}
    >
      {children}
    </FriendContext.Provider>
  );
};