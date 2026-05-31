// client/src/contexts/FriendContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { friendApi } from '../services/friendApi';
import type { Friend, FriendRequest, SearchUserResult } from '../services/friendApi';
import { socketService } from '../services/socket';
import toast from 'react-hot-toast';

interface FriendContextType {
  friends: Friend[];
  friendRequests: FriendRequest[];
  unreadRequestCount: number;
  loading: boolean;
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendRequest: (toUserId: string, message?: string) => Promise<boolean>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  updateFriend: (friendId: string, data: { nickname?: string; group?: string; isStarred?: boolean }) => Promise<boolean>;
  searchUsers: (q: string) => Promise<SearchUserResult[]>;
}

const FriendContext = createContext<FriendContextType | undefined>(undefined);

export const useFriend = () => {
  const context = useContext(FriendContext);
  if (!context) {
    throw new Error('useFriend must be used within FriendProvider');
  }
  return context;
};

interface FriendProviderProps {
  children: ReactNode;
}

export const FriendProvider: React.FC<FriendProviderProps> = ({ children }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [unreadRequestCount, setUnreadRequestCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await friendApi.getFriends();
      if (res.success) {
        setFriends(res.data);
      }
    } catch (error) {
      console.error('获取好友列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await friendApi.getRequests();
      if (res.success) {
        setFriendRequests(res.data.received);
        setUnreadRequestCount(res.data.received.length);
      }
    } catch (error) {
      console.error('获取好友申请失败:', error);
    }
  }, []);

  const sendRequest = useCallback(async (toUserId: string, message?: string) => {
    try {
      const res = await friendApi.sendRequest(toUserId, message);
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

  const removeFriend = useCallback(async (friendId: string) => {
    try {
      const res = await friendApi.deleteFriend(friendId);
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

  const updateFriend = useCallback(async (friendId: string, data: { nickname?: string; group?: string; isStarred?: boolean }) => {
    try {
      const res = await friendApi.updateFriend(friendId, data);
      if (res.success) {
        toast.success('更新成功');
        await fetchFriends();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || '更新失败');
      return false;
    }
  }, [fetchFriends]);

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) return [];
    try {
      const res = await friendApi.searchUsers(q);
      if (res.success) {
        return res.data;
      }
      return [];
    } catch (error) {
      console.error('搜索用户失败:', error);
      return [];
    }
  }, []);

  // Socket 事件监听
  useEffect(() => {
    const handleRequestReceived = (data: any) => {
      console.log('收到好友申请:', data);
      // 修复：使用 toast.success 而不是 toast.info
      toast.success(`${data.fromUser?.username || '用户'} 向你发送了好友申请`);
      fetchRequests();
      setUnreadRequestCount(prev => prev + 1);
    };
    
    const handleRequestAccepted = (data: any) => {
      console.log('好友申请被接受:', data);
      toast.success(`${data.username} 接受了你的好友申请`);
      fetchFriends();
    };
    
    const handleFriendRemoved = (data: any) => {
      console.log('好友被删除:', data);
      toast.success('对方删除了好友关系');
      fetchFriends();
    };
    
    // 使用 socketService 注册事件
    socketService.onFriendRequestReceived(handleRequestReceived);
    socketService.onFriendRequestAccepted(handleRequestAccepted);
    socketService.onFriendRemoved(handleFriendRemoved);
    
    return () => {
      socketService.offFriendRequestReceived(handleRequestReceived);
      socketService.offFriendRequestAccepted(handleRequestAccepted);
      socketService.offFriendRemoved(handleFriendRemoved);
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
        unreadRequestCount,
        loading,
        fetchFriends,
        fetchRequests,
        sendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
        updateFriend,
        searchUsers,
      }}
    >
      {children}
    </FriendContext.Provider>
  );
};