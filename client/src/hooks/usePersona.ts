// client/src/hooks/usePersona.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { roomApi, personaApi, type Persona } from '../services/api';
import { auth } from '../firebase/config';

interface UsePersonaOptions {
  enabled?: boolean;
}

export const usePersona = (options: UsePersonaOptions = {}) => {
  const { enabled = true } = options;
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [myPersonas, setMyPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const loadAttemptedRef = useRef(false);

  // 监听登录状态
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const loggedIn = !!user;
      setIsLoggedIn(loggedIn);
      // 如果登录状态变化，重新加载
      if (loggedIn && enabled) {
        loadAttemptedRef.current = false;
        loadPersona();
      }
    });
    return () => unsubscribe();
  }, [enabled]);

  // 🆕 检查是否有 token 且有效
  const hasValidToken = useCallback(() => {
    return !!localStorage.getItem('token');
  }, []);

  const loadPersona = useCallback(async () => {
    // 如果未启用，跳过
    if (!enabled) {
      setLoading(false);
      return;
    }

    // 🆕 检查 token 是否存在，如果存在但 isLoggedIn 为 false，尝试用 token 加载
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // 如果已经加载过且成功，不再重复加载（除非是 refresh）
    if (loadAttemptedRef.current && currentPersona) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 获取当前激活的角色
      const activeRes = await roomApi.getActivePersona();
      let activePersona = null;
      
      if (activeRes.activePersona?.personaId) {
        activePersona = activeRes.activePersona.personaId;
        setCurrentPersona(activePersona);
      }
      
      // 获取所有角色
      const personasRes = await personaApi.getMyPersonas();
      const approved = personasRes.filter((p: Persona) => p.status === 'approved');
      setMyPersonas(approved);
      
      // 如果没有激活的角色但有可用角色，自动激活第一个
      if (!activePersona && approved.length > 0) {
        const lastUsedId = localStorage.getItem('lastUsedPersonaId');
        let targetPersona = approved[0];
        
        if (lastUsedId) {
          const lastUsed = approved.find(p => p._id === lastUsedId);
          if (lastUsed) targetPersona = lastUsed;
        }
        
        await roomApi.setActivePersona(targetPersona._id);
        setCurrentPersona(targetPersona);
        localStorage.setItem('lastUsedPersonaId', targetPersona._id);
      }
      
      loadAttemptedRef.current = true;
      // 🆕 如果有 token 但 isLoggedIn 为 false，这里强制设为 true
      if (!isLoggedIn && token) {
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('加载角色失败:', error);
      // 如果是 401 错误，清除 token
      if (error instanceof Error && error.message?.includes('登录')) {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, isLoggedIn, currentPersona]);

  useEffect(() => {
    loadPersona();
  }, [loadPersona]);

  const refresh = useCallback(async () => {
    loadAttemptedRef.current = false;
    setLoading(true);
    await loadPersona();
  }, [loadPersona]);

  return { currentPersona, myPersonas, loading, refresh, isLoggedIn };
};