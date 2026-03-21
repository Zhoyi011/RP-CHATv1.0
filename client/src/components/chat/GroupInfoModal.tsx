import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';

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

interface Props {
  roomId: string;
  roomName: string;
  roomDescription: string;
  roomAnnouncement: string;
  onClose: () => void;
  onOpenSettings?: () => void;
}

const GroupInfoModal: React.FC<Props> = ({
  roomId,
  roomName,
  roomDescription,
  roomAnnouncement,
  onClose,
  onOpenSettings
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserTitle, setCurrentUserTitle] = useState<string>('');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    loadMembers();
  }, [roomId]);

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

  const handleLeaveRoom = async () => {
    if (!confirm('确定要退出该群聊吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '已退出群聊');
        onClose();
        window.location.reload();
      } else {
        alert(data.error || '退出失败');
      }
    } catch (error) {
      console.error('退出失败:', error);
      alert('退出失败，请重试');
    }
  };

  // 分离群主、管理员、普通成员
  const owners = members.filter(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');
  const normalMembers = members.filter(m => m.role === 'member');

  const displayedMembers = showAllMembers ? members : members.slice(0, 5);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            群资料
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 群名称和描述 */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {roomName?.charAt(0) || '?'}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{roomName}</h3>
                <p className="text-xs text-gray-400">{members.length} 位成员</p>
              </div>
            </div>
            {roomDescription && (
              <p className="text-sm text-gray-500 mt-2">{roomDescription}</p>
            )}
          </div>

          {/* 群公告 */}
          {roomAnnouncement && (
            <div className="bg-amber-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                <span className="text-xs font-medium text-amber-700">群公告</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{roomAnnouncement}</p>
            </div>
          )}

          {/* 我的头衔 */}
          {currentUserTitle && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">我的头衔</p>
              <p className="text-sm font-medium text-gray-700">{currentUserTitle}</p>
            </div>
          )}

          {/* 成员列表 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">成员列表</h4>
              {members.length > 5 && !showAllMembers && (
                <button
                  onClick={() => setShowAllMembers(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  查看全部 ({members.length})
                </button>
              )}
              {showAllMembers && (
                <button
                  onClick={() => setShowAllMembers(false)}
                  className="text-xs text-gray-400 hover:text-gray-500"
                >
                  收起
                </button>
              )}
            </div>
            
            <div className="space-y-2">
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

        {/* 底部按钮 */}
        <div className="p-5 border-t border-gray-100 space-y-2">
          {/* 群管理按钮 - 仅群主/管理员可见 */}
          {(currentUserRole === 'owner' || currentUserRole === 'admin') && onOpenSettings && (
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              群管理
            </button>
          )}
          
          {/* 退出群聊按钮 - 所有人可见 */}
          <button
            onClick={handleLeaveRoom}
            className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl font-medium hover:bg-red-50 transition"
          >
            退出群聊
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;