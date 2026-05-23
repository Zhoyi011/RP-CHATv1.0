import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import AvatarFrame from '../common/AvatarFrame';

console.log('🔧 [RoomMembers] 组件加载');

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface Member {
  _id: string;
  personaId?: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
    sameNameNumber?: number;
    globalNumber?: number;
    avatarFrame?: string | null;
    equipped?: {
      avatarFrame?: string | null;
    };
  };
  role: 'owner' | 'admin' | 'member';
  title?: string;
  joinedAt: string;
}

interface Persona {
  _id: string;
  name: string;
  displayName: string;
}

// 辅助函数：从 URL 中提取头像框文件名
const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

const RoomMembers = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [showKickConfirm, setShowKickConfirm] = useState<string | null>(null);
  const [showSetAdmin, setShowSetAdmin] = useState<string | null>(null);
  const [showTransferConfirm, setShowTransferConfirm] = useState<string | null>(null);

  console.log(`🎨 [RoomMembers] 渲染，房间ID: ${roomId}, 成员数: ${members.length}`);

  // 获取当前激活的角色
  const loadCurrentPersona = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/active-persona`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activePersona) {
          setCurrentPersona(data.activePersona);
          console.log(`✅ [RoomMembers] 当前角色: ${data.activePersona.displayName}`);
        }
      }
    } catch (error) {
      console.error('加载当前角色失败:', error);
    }
  }, []);

  // 加载成员列表
  const loadMembers = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/${roomId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`📋 [RoomMembers] 加载到 ${data?.length || 0} 个成员`);
      setMembers(data || []);
      
      const currentMember = (data || []).find((m: Member) => m.personaId?._id === currentPersona?._id);
      setUserRole(currentMember?.role || 'member');
      console.log(`👑 [RoomMembers] 用户角色: ${currentMember?.role || 'member'}`);
    } catch (error) {
      console.error('加载成员失败:', error);
      toast.error('加载成员列表失败');
    } finally {
      setLoading(false);
    }
  }, [roomId, currentPersona]);

  useEffect(() => {
    loadCurrentPersona();
  }, [loadCurrentPersona]);

  useEffect(() => {
    if (currentPersona) {
      loadMembers();
    }
  }, [currentPersona, loadMembers]);

  // 设置管理员
  const handleSetAdmin = async (memberPersonaId: string, isAdmin: boolean) => {
    console.log(`🔧 [RoomMembers] 设置管理员: ${memberPersonaId}, isAdmin=${isAdmin}`);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/room/${roomId}/set-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ personaId: memberPersonaId, isAdmin })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(isAdmin ? '已设为管理员' : '已取消管理员');
        loadMembers();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('设置管理员失败:', error);
      toast.error('操作失败');
    } finally {
      setShowSetAdmin(null);
    }
  };

  // 踢出成员
  const handleKickMember = async (memberPersonaId: string) => {
    console.log(`🔧 [RoomMembers] 踢出成员: ${memberPersonaId}`);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/room/${roomId}/kick-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ personaId: memberPersonaId })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success('已踢出群聊');
        loadMembers();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('踢出成员失败:', error);
      toast.error('操作失败');
    } finally {
      setShowKickConfirm(null);
    }
  };

  // 转让群主
  const handleTransferOwner = async (memberPersonaId: string) => {
    console.log(`🔧 [RoomMembers] 转让群主给: ${memberPersonaId}`);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/room/${roomId}/transfer-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newOwnerId: memberPersonaId })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success('群主已转让');
        await loadCurrentPersona();
        await loadMembers();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('转让群主失败:', error);
      toast.error('操作失败');
    } finally {
      setShowTransferConfirm(null);
    }
  };

  const canManage = userRole === 'owner' || userRole === 'admin';
  const isOwner = userRole === 'owner';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">加载成员列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* 头部 */}
      <div className={`sticky top-0 z-10 backdrop-blur-xl border-b transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-800/95 border-gray-700' : 'bg-white/80 border-gray-100'
      }`}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">成员列表</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {members.length} 人
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-gray-500">暂无成员</p>
          </div>
        ) : (
          members.map((member) => {
            const frameUrl = member.personaId?.avatarFrame || member.personaId?.equipped?.avatarFrame;
            const frameName = getFrameNameFromUrl(frameUrl);
            return (
              <div
                key={member.personaId?._id || member._id}
                className={`p-4 rounded-xl transition-colors ${
                  theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                } shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* 头像 - 使用 AvatarFrame */}
                    <AvatarFrame
                      avatarUrl={member.personaId?.avatar || ''}
                      frameName={frameName}
                      size="md"
                      className="member-list flex-shrink-0"
                    />
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {member.personaId?.displayName || member.personaId?.name || '未知角色'}
                        </p>
                        {member.title && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                            {member.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        #{member.personaId?.sameNameNumber || member.personaId?.globalNumber || '?'}
                      </p>
                    </div>
                  </div>

                  {/* 角色标签 */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      member.role === 'owner' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : member.role === 'admin'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {member.role === 'owner' ? '群主' : member.role === 'admin' ? '管理员' : '成员'}
                    </span>
                  </div>
                </div>

                {/* 操作按钮（仅管理员/群主可见，且不能操作自己和群主） */}
                {canManage && member.role !== 'owner' && member.personaId?._id !== currentPersona?._id && (
                  <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {/* 转让群主（仅当前群主可见） */}
                    {isOwner && (
                      showTransferConfirm === member.personaId?._id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleTransferOwner(member.personaId!._id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white"
                          >
                            确认转让
                          </button>
                          <button
                            onClick={() => setShowTransferConfirm(null)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowTransferConfirm(member.personaId!._id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
                        >
                          转让群主
                        </button>
                      )
                    )}
                    
                    {/* 设置/取消管理员 */}
                    {showSetAdmin === member.personaId?._id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSetAdmin(member.personaId!._id, member.role !== 'admin')}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setShowSetAdmin(null)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowSetAdmin(member.personaId!._id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                      >
                        {member.role === 'admin' ? '取消管理员' : '设为管理员'}
                      </button>
                    )}
                    
                    {/* 踢出群聊 */}
                    {showKickConfirm === member.personaId?._id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleKickMember(member.personaId!._id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white"
                        >
                          确认踢出
                        </button>
                        <button
                          onClick={() => setShowKickConfirm(null)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowKickConfirm(member.personaId!._id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                      >
                        踢出群聊
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RoomMembers;