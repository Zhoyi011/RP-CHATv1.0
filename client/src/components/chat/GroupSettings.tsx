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

const GroupSettings = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'members' | 'pending'>('basic');
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    announcement: '',
    isPublic: true,
    requireApproval: true
  });
  const currentUser = auth.currentUser;

  // 获取当前用户角色
  const currentUserMember = members.find(m => m.userId._id === currentUser?.uid);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = isOwner || currentUserMember?.role === 'admin';

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }
      
      // 加载房间信息
      const roomRes = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const roomData = await roomRes.json();
      setRoom(roomData);
      setFormData({
        name: roomData.name || '',
        description: roomData.description || '',
        announcement: roomData.announcement || '',
        isPublic: roomData.isPublic !== false,
        requireApproval: roomData.requireApproval !== false
      });
      
      // 加载成员列表
      const membersRes = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const membersData = await membersRes.json();
      setMembers(Array.isArray(membersData) ? membersData : []);
      
      // 加载待审核数量
      await loadPendingCount();
      
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadPendingCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPendingCount(Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.error('加载待审核数量失败:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('请输入群名称');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert('保存成功');
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleSetTitle = async () => {
    if (!selectedMember) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/set-title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedMember.userId._id,
          title: newTitle
        })
      });
      
      if (res.ok) {
        alert('头衔设置成功');
        setShowTitleModal(false);
        setNewTitle('');
        setSelectedMember(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || '设置失败');
      }
    } catch (error) {
      console.error('设置头衔失败:', error);
      alert('设置失败，请重试');
    }
  };

  const handleSetAdmin = async (userId: string, username: string, isAdmin: boolean) => {
    if (!confirm(`确定要将 ${username} ${isAdmin ? '设为管理员' : '取消管理员'} 吗？`)) return;
    
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
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
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
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('踢出失败:', error);
      alert('操作失败，请重试');
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">群主</span>;
    if (role === 'admin') return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">管理员</span>;
    return <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">成员</span>;
  };

  const getDisplayName = (member: Member) => {
    if (member.personaId?.name) {
      return member.personaId.name;
    }
    return member.userId?.username || '未知用户';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  // 如果不是管理员，显示无权限
  if (!isOwner && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">无权限访问</h2>
          <p className="text-gray-500 mb-4">只有群主或管理员可以访问群管理页面</p>
          <button
            onClick={() => navigate(`/group/${roomId}`)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl"
          >
            返回群资料
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/group/${roomId}`)} 
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            群管理
          </h1>
          <button
            onClick={loadData}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
            title="刷新"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-3 text-sm font-medium transition relative ${
              activeTab === 'basic' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            基本设置
            {activeTab === 'basic' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 text-sm font-medium transition relative ${
              activeTab === 'members' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            成员管理
            {activeTab === 'members' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('pending');
              loadPendingCount();
            }}
            className={`py-3 text-sm font-medium transition relative ${
              activeTab === 'pending' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            待审核
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
            {activeTab === 'pending' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            )}
          </button>
        </div>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} space-y-4 max-w-2xl mx-auto`}>
        
        {/* 基本设置 Tab */}
        {activeTab === 'basic' && (
          <>
            <div className="bg-white rounded-2xl shadow p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">群名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="群名称"
                maxLength={30}
              />
              <p className="text-xs text-gray-400 mt-1">最多30个字符</p>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">群描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                rows={3}
                placeholder="简单介绍一下这个群..."
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">最多200个字符</p>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">群公告</label>
              <textarea
                value={formData.announcement}
                onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                rows={3}
                placeholder="群公告..."
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-2">公告会显示在群详情页顶部</p>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-medium text-gray-800 mb-4">入群设置</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-gray-700">公开群组</span>
                    <p className="text-xs text-gray-400 mt-0.5">公开后可在搜索中被找到</p>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                      formData.isPublic ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${
                        formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-gray-700">需要审核</span>
                    <p className="text-xs text-gray-400 mt-0.5">开启后新成员需要管理员审核才能加入</p>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, requireApproval: !formData.requireApproval })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                      formData.requireApproval ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${
                        formData.requireApproval ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
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
          </>
        )}

        {/* 成员管理 Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">成员列表</h3>
                <p className="text-xs text-gray-400">共 {members.length} 位成员</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {members.map(member => {
                const displayName = getDisplayName(member);
                return (
                  <div key={member._id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{displayName}</span>
                        {getRoleBadge(member.role)}
                        {member.title && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {member.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{member.userId.username}</p>
                      <p className="text-xs text-gray-400">
                        加入于 {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* 操作按钮 */}
                    {isOwner && member.role !== 'owner' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleSetAdmin(member.userId._id, member.userId.username, member.role !== 'admin')}
                          className="text-xs text-blue-500 hover:text-blue-600"
                        >
                          {member.role === 'admin' ? '取消管理' : '设为管理'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setNewTitle(member.title || '');
                            setShowTitleModal(true);
                          }}
                          className="text-xs text-gray-500 hover:text-blue-600"
                        >
                          头衔
                        </button>
                        <button
                          onClick={() => handleKickMember(member.userId._id, member.userId.username)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          踢出
                        </button>
                      </div>
                    )}
                    
                    {isAdmin && !isOwner && member.role !== 'owner' && member.role !== 'admin' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setNewTitle(member.title || '');
                            setShowTitleModal(true);
                          }}
                          className="text-xs text-gray-500 hover:text-blue-600"
                        >
                          头衔
                        </button>
                        <button
                          onClick={() => handleKickMember(member.userId._id, member.userId.username)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          踢出
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 待审核 Tab */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">待审核申请</h3>
                <p className="text-xs text-gray-400">共 {pendingCount} 个申请等待处理</p>
              </div>
            </div>
            
            <div className="p-4">
              <button
                onClick={() => navigate(`/room/${roomId}/pending`)}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                查看待审核申请
                {pendingCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 设置头衔弹窗 */}
      {showTitleModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  设置 {getDisplayName(selectedMember)} 的头衔
                </h3>
                <button
                  onClick={() => {
                    setShowTitleModal(false);
                    setSelectedMember(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="输入头衔（例如：元老、活跃分子）"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition mb-4"
                maxLength={20}
              />
              <p className="text-xs text-gray-400 mb-4">头衔会显示在成员列表中</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTitleModal(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition"
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
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettings;