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

interface RoomData {
  _id: string;
  name: string;
  description: string;
  announcement: string;
  avatar: string;
  createdAt: string;
  memberCount: number;
}

const GroupDetail = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserTitle, setCurrentUserTitle] = useState<string>('');
  const currentUser = auth.currentUser;

  useEffect(() => {
    loadRoomData();
    loadMembers();
  }, [roomId]);

  const loadRoomData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRoom(data);
    } catch (error) {
      console.error('加载房间数据失败:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
      
      const currentMember = (Array.isArray(data) ? data : []).find(
        (m: Member) => m.userId._id === currentUser?.uid
      );
      setCurrentUserRole(currentMember?.role || 'member');
      setCurrentUserTitle(currentMember?.title || '');
    } catch (error) {
      console.error('加载成员失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') {
      return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">群主</span>;
    }
    if (role === 'admin') {
      return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">管理员</span>;
    }
    return null;
  };

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return '👑';
    if (role === 'admin') return '🛡️';
    return null;
  };

  // 分离群主、管理员、普通成员
  const owners = members.filter(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');
  const normalMembers = members.filter(m => m.role === 'member');
  
  const displayedMembers = showAllMembers ? members : members.slice(0, 5);

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
          <button 
            onClick={() => navigate('/chat')} 
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            群资料
          </h1>
          {/* 右上角三个点 - 进入管理页面 */}
          <button
            onClick={() => navigate(`/group/${roomId}/settings`)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} max-w-2xl mx-auto space-y-4`}>
        {/* 群头像和名称 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
              {room?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{room?.name}</h2>
              <p className="text-sm text-gray-500 mt-1">创建于 {new Date(room?.createdAt || '').toLocaleDateString()}</p>
              <p className="text-xs text-emerald-600 mt-1">{members.length} 位成员</p>
            </div>
          </div>
        </div>

        {/* 群简介 */}
        {room?.description && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-medium text-gray-800 mb-2">群简介</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{room.description}</p>
          </div>
        )}

        {/* 群公告 */}
        {room?.announcement && (
          <div className="bg-amber-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <span className="text-sm font-medium text-amber-700">群公告</span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{room.announcement}</p>
          </div>
        )}

        {/* 我的头衔 */}
        {currentUserTitle && (
          <div className="bg-gray-50 rounded-2xl p-5">
            <p className="text-xs text-gray-500 mb-1">我的头衔</p>
            <p className="text-lg font-medium text-gray-700">{currentUserTitle}</p>
          </div>
        )}

        {/* 成员列表 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">成员列表</h3>
            {members.length > 5 && !showAllMembers && (
              <button
                onClick={() => setShowAllMembers(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                查看全部 ({members.length})
              </button>
            )}
            {showAllMembers && (
              <button
                onClick={() => setShowAllMembers(false)}
                className="text-sm text-gray-400 hover:text-gray-500"
              >
                收起
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {/* 群主 */}
            {owners.map(member => (
              <div key={member._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                  {member.personaId?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{member.personaId?.name}</span>
                    {getRoleBadge(member.role)}
                  </div>
                  {member.title && <p className="text-xs text-gray-400">{member.title}</p>}
                </div>
                <span className="text-lg">{getRoleIcon(member.role)}</span>
              </div>
            ))}
            
            {/* 管理员 */}
            {admins.map(member => (
              <div key={member._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                  {member.personaId?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{member.personaId?.name}</span>
                    {getRoleBadge(member.role)}
                  </div>
                  {member.title && <p className="text-xs text-gray-400">{member.title}</p>}
                </div>
                <span className="text-lg">{getRoleIcon(member.role)}</span>
              </div>
            ))}
            
            {/* 普通成员 */}
            {(showAllMembers ? normalMembers : normalMembers.slice(0, 5)).map(member => (
              <div key={member._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold">
                  {member.personaId?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{member.personaId?.name}</span>
                  {member.title && <p className="text-xs text-gray-400">{member.title}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;