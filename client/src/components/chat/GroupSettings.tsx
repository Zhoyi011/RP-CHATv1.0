// client/src/components/chat/GroupSettings.tsx
import React, { useState, useEffect, useCallback } from 'react';
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

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 } 
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

const GroupSettings = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { isLoading, userRole, isOwner, isAdmin, refresh, members, currentPersonaId } = useGroupPermission(roomId);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'announcement' | 'members' | 'titles'>('basic');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [formData, setFormData] = useState({ 
    name: '', description: '', announcement: '', 
    isPublic: true, requireApproval: true 
  });

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
        setFormData({
          name: data.name || '',
          description: data.description || '',
          announcement: data.announcement || '',
          isPublic: data.isPublic !== false,
          requireApproval: data.requireApproval !== false
        });
      } catch (error) {
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    if (roomId) loadRoom();
  }, [roomId]);

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('请输入群名称'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/${roomId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) { 
        toast.success('保存成功');
        setRoom({ ...room, ...formData });
      } else { 
        const data = await res.json(); 
        toast.error(data.error || '保存失败'); 
      }
    } catch (error) { 
      toast.error('保存失败'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleSetTitle = async () => {
    if (!selectedMember?.personaId?._id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/${roomId}/set-title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personaId: selectedMember.personaId._id, title: newTitle })
      });
      if (res.ok) { 
        toast.success('头衔设置成功'); 
        setShowTitleModal(false); 
        setNewTitle(''); 
        setSelectedMember(null); 
        refresh(); 
      } else { 
        toast.error('设置失败'); 
      }
    } catch (error) { 
      toast.error('设置失败'); 
    }
  };

  const handleSetAdmin = async (personaId: string, name: string, makeAdmin: boolean) => {
    if (!confirm(`确定要将 ${name} ${makeAdmin ? '设为管理员' : '取消管理员'} 吗？`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/${roomId}/set-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personaId, isAdmin: makeAdmin })
      });
      if (res.ok) { 
        toast.success(makeAdmin ? '✅ 已设为管理员' : '✅ 已取消管理员'); 
        refresh(); 
      } else { 
        toast.error('操作失败'); 
      }
    } catch (error) { 
      toast.error('操作失败'); 
    }
  };

  const handleKickMember = async (personaId: string, name: string) => {
    if (!confirm(`确定要将 ${name} 移出群聊吗？`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/${roomId}/kick-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personaId })
      });
      if (res.ok) { 
        toast.success('已移出群聊'); 
        refresh(); 
      } else { 
        toast.error('操作失败'); 
      }
    } catch (error) { 
      toast.error('操作失败'); 
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') return <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full">👑 群主</span>;
    if (role === 'admin') return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">🛡️ 管理员</span>;
    return <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">成员</span>;
  };

  const getDisplayName = (member: any) => {
    return member.personaId?.displayName || member.personaId?.name || '未知角色';
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOwner && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8 text-center max-w-sm">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold mb-2">无权限访问</h2>
          <p className="text-gray-500 mb-4">只有群主或管理员可以访问群管理页面</p>
          <button onClick={() => navigate(`/group/${roomId}`)} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl">返回群资料</button>
        </div>
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
          <button onClick={() => navigate(-1)} className="mr-3 p-1 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">群管理</h1>
        </div>

        {/* Tab 导航 */}
        <div className="flex px-4 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'basic' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'}`}
          >
            ⚙️ 基本设置
          </button>
          <button
            onClick={() => setActiveTab('announcement')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'announcement' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'}`}
          >
            📢 群公告
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'members' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'}`}
          >
            👥 成员管理
          </button>
          <button
            onClick={() => setActiveTab('titles')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'titles' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'}`}
          >
            🏷️ 头衔管理
          </button>
        </div>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} max-w-2xl mx-auto space-y-4`}>
        <AnimatePresence mode="wait">
          {/* 基本设置 */}
          {activeTab === 'basic' && (
            <motion.div
              key="basic"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="space-y-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">群名称</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  maxLength={30} 
                />
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">群简介</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                  rows={3} 
                  maxLength={200} 
                  placeholder="介绍一下这个群..." 
                />
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-4">入群设置</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div><span className="text-gray-700 dark:text-gray-300">公开群组</span><p className="text-xs text-gray-400 mt-0.5">公开后可在搜索中被找到</p></div>
                    <button 
                      onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })} 
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${formData.isPublic ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div><span className="text-gray-700 dark:text-gray-300">需要审核</span><p className="text-xs text-gray-400 mt-0.5">开启后新成员需要管理员审核才能加入</p></div>
                    <button 
                      onClick={() => setFormData({ ...formData, requireApproval: !formData.requireApproval })} 
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${formData.requireApproval ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.requireApproval ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </label>
                </div>
              </div>
              
              <button
                onClick={handleSave} 
                disabled={saving} 
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 shadow-md"
              >
                {saving ? '保存中...' : '保存设置'}
              </button>
            </motion.div>
          )}

          {/* 群公告 */}
          {activeTab === 'announcement' && (
            <motion.div
              key="announcement"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5"
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">群公告</label>
              <textarea
                value={formData.announcement}
                onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                rows={5}
                maxLength={500}
                placeholder="输入群公告...（支持换行，最多500字）"
              />
              <p className="text-xs text-gray-400 mt-2 text-right">{formData.announcement.length}/500</p>
              <button
                onClick={handleSave} 
                disabled={saving} 
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50 shadow-md"
              >
                {saving ? '保存中...' : '发布公告'}
              </button>
            </motion.div>
          )}

          {/* 成员管理 */}
          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-medium text-gray-800 dark:text-gray-200">成员列表 ({members.length})</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                {members.map(member => {
                  const displayName = getDisplayName(member);
                  const isSelf = member.personaId?._id === currentPersonaId;
                  return (
                    <div key={member._id} className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{displayName}</span>
                          {getRoleBadge(member.role)}
                          {member.title && <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">{member.title}</span>}
                          {isSelf && <span className="text-xs text-gray-400">(你)</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">#{member.personaId?.sameNameNumber || '?'} · {new Date(member.joinedAt).toLocaleDateString()} 加入</p>
                      </div>
                      {isOwner && member.role !== 'owner' && !isSelf && (
                        <div className="flex gap-2">
                          <button onClick={() => handleSetAdmin(member.personaId!._id, displayName, member.role !== 'admin')} className="text-xs text-blue-500 hover:text-blue-600">
                            {member.role === 'admin' ? '取消管理' : '设为管理'}
                          </button>
                          <button onClick={() => handleKickMember(member.personaId!._id, displayName)} className="text-xs text-red-500 hover:text-red-600">踢出</button>
                        </div>
                      )}
                      {isAdmin && !isOwner && member.role !== 'owner' && member.role !== 'admin' && !isSelf && (
                        <button onClick={() => handleKickMember(member.personaId!._id, displayName)} className="text-xs text-red-500 hover:text-red-600">踢出</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 头衔管理 */}
          {activeTab === 'titles' && (
            <motion.div
              key="titles"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-800 dark:text-gray-200">设置成员头衔</h3>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {members.filter(m => m.role !== 'owner').map(member => {
                  const displayName = getDisplayName(member);
                  const isSelf = member.personaId?._id === currentPersonaId;
                  return (
                    <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{displayName}</span>
                        {member.title && <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">{member.title}</span>}
                        {isSelf && <span className="ml-2 text-xs text-gray-400">(你)</span>}
                      </div>
                      <button
                        onClick={() => { setSelectedMember(member); setNewTitle(member.title || ''); setShowTitleModal(true); }}
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        {member.title ? '修改头衔' : '设置头衔'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 设置头衔弹窗 */}
      <AnimatePresence>
        {showTitleModal && selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShowTitleModal(false); setSelectedMember(null); }}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">设置 {getDisplayName(selectedMember)} 的头衔</h3>
                  <button onClick={() => { setShowTitleModal(false); setSelectedMember(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="输入头衔（例如：元老、活跃分子）"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                  maxLength={20}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowTitleModal(false); setSelectedMember(null); }}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSetTitle}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition shadow-md"
                  >
                    确认设置
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GroupSettings;