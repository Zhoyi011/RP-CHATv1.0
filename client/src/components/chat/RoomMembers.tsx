import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useResponsive } from '../../hooks/useResponsive';

interface Member {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  personaId: {
    _id: string;
    name: string;
    avatar?: string;
  } | null;
  role: 'owner' | 'admin' | 'member';
  nickname: string;
  title: string;
  joinedAt: string;
}

const RoomMembers = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const currentUser = auth.currentUser;
  const isOwner = currentUserRole === 'owner';
  const isAdmin = isOwner || currentUserRole === 'admin';

  useEffect(() => {
    loadMembers();
  }, [roomId]);

  const loadMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const roomRes = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const roomData = await roomRes.json();
      setRoomName(roomData.name);
      
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
      
      const currentMember = (Array.isArray(data) ? data : []).find(
        (m: Member) => m.userId._id === currentUser?.uid
      );
      setCurrentUserRole(currentMember?.role || '');
    } catch (error) {
      console.error('加载成员失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKickMember = async (userId: string, username: string) => {
    if (!confirm(`确定要将 ${username} 移出群聊吗？`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/kick-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      
      if (res.ok) {
        alert('已移出群聊');
        loadMembers();
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('踢出失败:', error);
      alert('操作失败，请重试');
    }
  };

  const handleSetAdmin = async (userId: string, username: string, isAdmin: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/set-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, isAdmin })
      });
      
      if (res.ok) {
        alert(isAdmin ? `✅ 已设为管理员` : `✅ 已取消管理员权限`);
        loadMembers();
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') {
      return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">👑 群主</span>;
    }
    if (role === 'admin') {
      return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">🛡️ 管理员</span>;
    }
    return <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">成员</span>;
  };

  const getDisplayName = (member: Member) => {
    if (member.personaId?.name) {
      return member.personaId.name;
    }
    return member.userId?.username || '未知用户';
  };

  const filteredMembers = members.filter(member =>
    getDisplayName(member).toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.userId.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            成员列表
          </h1>
          <button
            onClick={loadMembers}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
            title="刷新"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">{roomName} · {members.length} 位成员</p>
        
        {/* 搜索框 */}
        <div className="mt-3">
          <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索成员..."
              className="bg-transparent flex-1 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} space-y-2`}>
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-gray-400">未找到匹配的成员</p>
          </div>
        ) : (
          filteredMembers.map(member => {
            const displayName = getDisplayName(member);
            const isCurrentUser = member.userId._id === currentUser?.uid;
            
            return (
              <div key={member._id} className="bg-white rounded-xl shadow p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{displayName}</span>
                      {getRoleBadge(member.role)}
                      {member.title && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {member.title}
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">我</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{member.userId.username}</p>
                    <p className="text-xs text-gray-400">
                      加入于 {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* 管理员操作按钮 */}
                  {(isOwner || (isAdmin && member.role !== 'owner')) && !isCurrentUser && (
                    <div className="flex gap-2">
                      {isOwner && member.role !== 'owner' && (
                        <button
                          onClick={() => handleSetAdmin(member.userId._id, member.userId.username, member.role !== 'admin')}
                          className="text-xs text-blue-500 hover:text-blue-600 whitespace-nowrap"
                        >
                          {member.role === 'admin' ? '取消管理' : '设为管理'}
                        </button>
                      )}
                      <button
                        onClick={() => handleKickMember(member.userId._id, member.userId.username)}
                        className="text-xs text-red-500 hover:text-red-600 whitespace-nowrap"
                      >
                        踢出
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RoomMembers;