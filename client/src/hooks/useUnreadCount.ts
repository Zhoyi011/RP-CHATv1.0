// client/src/hooks/useUnreadCount.ts
import { useState, useEffect, useCallback } from 'react';
import { roomApi } from '../services/api';

export const useUnreadCount = (roomId: string | null) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnread = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      const data = await roomApi.getUnreadCount(roomId);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('获取未读消息失败:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const markAsRead = useCallback(async () => {
    if (!roomId) return;
    try {
      await roomApi.markRead(roomId);
      setUnreadCount(0);
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }, [roomId]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  return { unreadCount, loading, markAsRead, refresh: fetchUnread };
};