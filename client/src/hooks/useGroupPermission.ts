// client/src/hooks/useGroupPermission.ts
import { useState, useEffect, useCallback } from 'react';

export interface GroupMember {
  _id: string;
  personaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
    sameNameNumber?: number;
    globalNumber?: number;
  } | null;
  role: 'owner' | 'admin' | 'member';
  title: string;
  joinedAt: string;
}

export interface GroupPermission {
  isLoading: boolean;
  userRole: 'owner' | 'admin' | 'member' | null;
  isOwner: boolean;
  isAdmin: boolean;
  creatorName: string;
  members: GroupMember[];
  ownerInfo: GroupMember | null;
  currentPersonaId: string | null;
  refresh: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

export function useGroupPermission(roomId: string | undefined): GroupPermission {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentPersonaId, setCurrentPersonaId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!roomId) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ 未找到 token');
        return;
      }
      
      // 1. 获取当前激活的角色
      const activeRes = await fetch(`${API_BASE}/room/active-persona`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const activeData = await activeRes.json();
      const currentId = activeData.activePersona?.personaId?._id || activeData.activePersona?._id;
      setCurrentPersonaId(currentId);
      console.log(`✅ 当前角色ID: ${currentId}`);
      
      // 2. 获取成员列表（唯一数据源）
      const membersRes = await fetch(`${API_BASE}/room/${roomId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!membersRes.ok) {
        throw new Error(`HTTP ${membersRes.status}`);
      }
      
      const membersData = await membersRes.json();
      const membersList = Array.isArray(membersData) ? membersData : [];
      setMembers(membersList);
      
      // 3. 从成员列表中查找当前用户的角色
      const currentMember = membersList.find((m: GroupMember) => m.personaId?._id === currentId);
      const role = currentMember?.role || 'member';
      setUserRole(role);
      
      console.log(`✅ 房间 ${roomId} - 当前角色: ${role}`);
      
    } catch (error) {
      console.error('加载群组权限失败:', error);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const ownerInfo = members.find(m => m.role === 'owner') || null;
  const creatorName = ownerInfo?.personaId?.displayName || ownerInfo?.personaId?.name || '?';
  
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);
  
  return {
    isLoading,
    userRole,
    isOwner: userRole === 'owner',
    isAdmin: userRole === 'owner' || userRole === 'admin',
    creatorName,
    members,
    ownerInfo,
    currentPersonaId,
    refresh
  };
}