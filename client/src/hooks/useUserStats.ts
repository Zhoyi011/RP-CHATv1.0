// client/src/hooks/useUserStats.ts
import { useState, useEffect, useCallback } from 'react';
import { statsApi, type UserStats } from '../services/statsApi';
import { socketService } from '../services/socket';

export function useUserStats(personaId?: string) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await statsApi.getMyStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 监听等级升级事件
  useEffect(() => {
    const handleLevelUp = (data: any) => {
      if (data.personaId === personaId || !personaId) {
        // 刷新统计数据
        fetchStats();
        // 触发升级动画/通知
        window.dispatchEvent(new CustomEvent('personaLevelUp', { 
          detail: data 
        }));
      }
    };

    socketService.on('persona-level-up', handleLevelUp);
    return () => {
      socketService.off('persona-level-up', handleLevelUp);
    };
  }, [personaId, fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}