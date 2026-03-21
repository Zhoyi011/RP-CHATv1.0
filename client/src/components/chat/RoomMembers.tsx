import React, { useState, useEffect } from 'react';
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
  };
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
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const currentUser = auth.currentUser;

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
        alert(isAdmin ? `已设为管理员` : `已取消管理员权限`);
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
      return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">群主</span>;
    }
    if (role === 'admin') {
      return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">管理员</span>;
    }
    return <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">成员</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            成员列表
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">{roomName} · {members.length}人</p>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} space-y-2`}>
        {members.map(member => (
          <div key={member._id} className="bg-white rounded-xl shadow p-4 hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {member.personaId?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{member.personaId?.name}</span>
                  {getRoleBadge(member.role)}
                  {member.title && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {member.title}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{member.userId.username}</p>
                <p className="text-xs text-gray-400">
                  加入于 {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>
              
              {/* 管理员操作按钮 */}
              {(currentUserRole === 'owner' || (currentUserRole === 'admin' && member.role !== 'owner')) && 
               member.userId._id !== currentUser?.uid && (
                <div className="flex gap-2">
                  {currentUserRole === 'owner' && member.role !== 'owner' && (
                    <button
                      onClick={() => handleSetAdmin(member.userId._id, member.userId.username, member.role !== 'admin')}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      {member.role === 'admin' ? '取消管理' : '设为管理'}
                    </button>
                  )}
                  <button
                    onClick={() => handleKickMember(member.userId._id, member.userId.username)}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    踢出
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomMembers;