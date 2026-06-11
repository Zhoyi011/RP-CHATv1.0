// client/src/hooks/usePersona.ts
import { useState, useEffect, useCallback } from 'react';
import { roomApi, personaApi, type Persona } from '../services/api';

export const usePersona = () => {
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [myPersonas, setMyPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPersona = useCallback(async () => {
    try {
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
    } catch (error) {
      console.error('加载角色失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPersona();
  }, [loadPersona]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadPersona();
  }, [loadPersona]);

  return { currentPersona, myPersonas, loading, refresh };
};