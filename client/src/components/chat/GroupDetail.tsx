// client/src/components/chat/GroupDetail.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';
import { useGroupPermission } from '../../hooks/useGroupPermission';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// 动画变体（修复类型）
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { duration: 0.4, type: 'spring' as const, stiffness: 100 } 
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

const GroupDetail = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { isLoading, members, creatorName, userRole, isOwner, isAdmin, refresh, currentPersonaId } = useGroupPermission(roomId);
  const [room, setRoom] = useState<any>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'announcement'>('info');

  // 加载房间信息
  useEffect(() => {
    const loadRoom = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/room/${roomId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setRoom(data);
      } catch (error) {
        console.error('加载失败:', error);
      }
    };
    if (roomId) loadRoom();
  }, [roomId]);

  // 获取待审核数量
  useEffect(() => {
    const fetchPending = async () => {
      if (!roomId || (!isOwner && !isAdmin)) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/room/${roomId}/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setPendingCount(Array.isArray(data) ? data.length : 0);
      } catch (error) {
        console.error('获取待审核失败:', error);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [roomId, isOwner, isAdmin]);

  const owners = members.filter(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');
  const normalMembers = members.filter(m => m.role === 'member');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white sticky top-0 z-10 shadow-md">
        <div className="px-4 py-3 flex items-center">
          <button onClick={() => navigate('/chat')} className="mr-3 p-1 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">群资料</h1>
          {(isOwner || isAdmin) && (
            <button
              onClick={() => navigate(`/group/${roomId}/settings`)}
              className="p-1.5 hover:bg-white/20 rounded-full transition"
              title="群管理"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Tab 切换 */}
        <div className="flex px-4 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'info' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'}`}
          >
            📋 群信息
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'members' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'}`}
          >
            👥 成员 ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('announcement')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'announcement' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'}`}
          >
            📢 群公告
            {room?.announcement && <span className="ml-1 text-xs">●</span>}
          </button>
          {(isOwner || isAdmin) && pendingCount > 0 && (
            <button
              onClick={() => navigate(`/room/${roomId}/pending`)}
              className="relative px-4 py-2 text-sm font-medium rounded-t-lg transition text-white hover:bg-white/10"
            >
              ⏳ 待审
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{pendingCount}</span>
            </button>
          )}
        </div>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} max-w-2xl mx-auto`}>
        <AnimatePresence mode="wait">
          {/* 群信息 Tab */}
          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="space-y-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                    {room?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{room?.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      创建于 {room?.createdAt ? new Date(room.createdAt).toLocaleDateString() : '未知'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {members.length} 位成员 · 群主: {creatorName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">群简介</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {room?.description || '这个群还没有简介'}
                </p>
              </div>

              {(() => {
                const currentMember = members.find(m => m.personaId?._id === currentPersonaId);
                if (currentMember?.title) {
                  return (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-5 border border-purple-100 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🏷️</span>
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">我的头衔</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-medium">{currentMember.title}</p>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('members')}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>查看成员</span>
                </button>
                <button
                  onClick={() => setActiveTab('announcement')}
                  className="flex items-center justify-center gap-2 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  <span>查看公告</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* 成员列表 Tab */}
          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">成员列表</h3>
                <span className="text-xs text-gray-500">{members.length} 人</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                {/* 群主 */}
                {owners.map(member => (
                  <div key={member._id} className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                      {(member.personaId?.displayName || member.personaId?.name || '?').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {member.personaId?.displayName || member.personaId?.name}
                        </span>
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">群主</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        #{member.personaId?.sameNameNumber || '?'} · {new Date(member.joinedAt).toLocaleDateString()} 加入
                      </p>
                    </div>
                  </div>
                ))}
                {/* 管理员 */}
                {admins.map(member => (
                  <div key={member._id} className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                      {(member.personaId?.displayName || member.personaId?.name || '?').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {member.personaId?.displayName || member.personaId?.name}
                        </span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">管理员</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        #{member.personaId?.sameNameNumber || '?'} · {new Date(member.joinedAt).toLocaleDateString()} 加入
                      </p>
                    </div>
                  </div>
                ))}
                {/* 普通成员 */}
                {(showAllMembers ? normalMembers : normalMembers.slice(0, 10)).map(member => (
                  <div key={member._id} className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold">
                      {(member.personaId?.displayName || member.personaId?.name || '?').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {member.personaId?.displayName || member.personaId?.name}
                      </span>
                      <p className="text-xs text-gray-400">
                        #{member.personaId?.sameNameNumber || '?'} · {new Date(member.joinedAt).toLocaleDateString()} 加入
                      </p>
                    </div>
                  </div>
                ))}
                {normalMembers.length > 10 && !showAllMembers && (
                  <div className="p-3 text-center">
                    <button
                      onClick={() => setShowAllMembers(true)}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      查看更多成员 ({normalMembers.length - 10} 人)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 群公告 Tab */}
          {activeTab === 'announcement' && (
            <motion.div
              key="announcement"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">群公告</h3>
              </div>
              {room?.announcement ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {room.announcement}
                  </p>
                  <p className="text-xs text-gray-400 mt-3 text-right">
                    最后更新: {room.updatedAt ? new Date(room.updatedAt).toLocaleDateString() : '未知'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  <p>暂无群公告</p>
                  {(isOwner || isAdmin) && (
                    <button
                      onClick={() => navigate(`/group/${roomId}/settings`)}
                      className="mt-2 text-sm text-blue-500 hover:text-blue-600"
                    >
                      去添加公告 →
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GroupDetail;