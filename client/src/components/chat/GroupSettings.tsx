import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useResponsive } from '../../hooks/useResponsive';
import toast from 'react-hot-toast';

interface Member {
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

interface Title {
  _id: string;
  name: string;
  color: string;
  icon: string;
  isActive: boolean;
}

const GroupSettings = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'members' | 'titles' | 'pending'>('basic');
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showCreateTitleModal, setShowCreateTitleModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTitleColor, setNewTitleColor] = useState('#6b7280');
  const [newTitleIcon, setNewTitleIcon] = useState('🏷️');
  const [currentRole, setCurrentRole] = useState<string>('');
  const [currentPersonaId, setCurrentPersonaId] = useState<string>('');
  const [formData, setFormData] = useState({ 
    name: '', description: '', announcement: '', 
    isPublic: true, requireApproval: true 
  });

  const isOwner = currentRole === 'owner';
  const isAdmin = isOwner || currentRole === 'admin';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // 获取当前激活 Persona
      const activeRes = await fetch(`https://rp-chatv1-0.onrender.com/api/room/active-persona`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const activeData = await activeRes.json();
      const currentPersonaIdFromApi = activeData.activePersona?.personaId?._id;
      setCurrentPersonaId(currentPersonaIdFromApi);

      const [roomRes, membersRes, titlesRes] = await Promise.all([
        fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        }),
        fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/members`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        }),
        fetch(`https://rp-chatv1-0.onrender.com/api/title/room/${roomId}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        }).catch(() => ({ json: () => [] }))
      ]);

      const roomData = await roomRes.json();
      const membersData = await membersRes.json();
      const titlesData = await titlesRes.json();
      const membersArr = Array.isArray(membersData) ? membersData : [];
      
      setRoom(roomData);
      setMembers(membersArr);
      setTitles(Array.isArray(titlesData) ? titlesData : []);
      setFormData({
        name: roomData.name || '',
        description: roomData.description || '',
        announcement: roomData.announcement || '',
        isPublic: roomData.isPublic !== false,
        requireApproval: roomData.requireApproval !== false
      });

      // ✅ 用当前 Persona 检查权限
      if (currentPersonaIdFromApi && membersArr.length > 0) {
        const member = membersArr.find((m: Member) => m.personaId?._id === currentPersonaIdFromApi);
        const role = member?.role || '';
        setCurrentRole(role);
        console.log(`✅ 当前用户角色: ${role}, isOwner: ${role === 'owner'}`);
      }

      await loadPendingCount();
    } catch (error) { 
      console.error('加载失败:', error);
      toast.error('加载失败');
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
      console.error('获取待审核失败:', error); 
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('请输入群名称'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) { 
        toast.success('保存成功'); 
        loadData(); 
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

  // 设置成员头衔
  const handleSetTitle = async () => {
    if (!selectedMember?.personaId?._id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/set-title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personaId: selectedMember.personaId._id, title: newTitle })
      });
      if (res.ok) { 
        toast.success('头衔设置成功'); 
        setShowTitleModal(false); 
        setNewTitle(''); 
        setSelectedMember(null); 
        loadData(); 
      } else { 
        const data = await res.json(); 
        toast.error(data.error || '设置失败'); 
      }
    } catch (error) { 
      toast.error('设置失败'); 
    }
  };

  // 创建新头衔
  const handleCreateTitle = async () => {
    if (!newTitle.trim()) { toast.error('请输入头衔名称'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/title/room/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          name: newTitle.trim(), 
          color: newTitleColor, 
          icon: newTitleIcon 
        })
      });
      if (res.ok) { 
        toast.success('头衔创建成功'); 
        setShowCreateTitleModal(false); 
        setNewTitle(''); 
        loadData(); 
      } else { 
        const data = await res.json(); 
        toast.error(data.error || '创建失败'); 
      }
    } catch (error) { 
      toast.error('创建失败'); 
    }
  };

  // 删除头衔
  const handleDeleteTitle = async (titleId: string, titleName: string) => {
    if (!confirm(`确定要删除头衔「${titleName}」吗？`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/title/${titleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { 
        toast.success('头衔已删除'); 
        loadData(); 
      } else { 
        const data = await res.json(); 
        toast.error(data.error || '删除失败'); 
      }
    } catch (error) { 
      toast.error('删除失败'); 
    }
  };

  const handleSetAdmin = async (personaId: string, name: string, makeAdmin: boolean) => {
    if (!confirm(`确定要将 ${name} ${makeAdmin ? '设为管理员' : '取消管理员'} 吗？`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/set-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personaId, isAdmin: makeAdmin })
      });
      if (res.ok) { 
        toast.success(makeAdmin ? '✅ 已设为管理员' : '✅ 已取消管理员'); 
        loadData(); 
      } else { 
        const data = await res.json(); 
        toast.error(data.error || '操作失败'); 
      }
    } catch (error) { 
      toast.error('操作失败'); 
    }
  };

  const handleKickMember = async (personaId: string, name: string) => {
    if (!confirm(`确定要将 ${name} 移出群聊吗？`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/kick-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ personaId })
      });
      if (res.ok) { 
        toast.success('已移出群聊'); 
        loadData(); 
      } else { 
        const data = await res.json(); 
        toast.error(data.error || '操作失败'); 
      }
    } catch (error) { 
      toast.error('操作失败'); 
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">👑 群主</span>;
    if (role === 'admin') return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">🛡️ 管理员</span>;
    return <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">成员</span>;
  };

  const getDisplayName = (member: Member) => {
    return member.personaId?.displayName || member.personaId?.name || '未知角色';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  // ✅ 修复：正确检查权限
  if (!isOwner && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">无权限访问</h2>
          <p className="text-gray-500 mb-4">只有群主或管理员可以访问群管理页面</p>
          <p className="text-xs text-gray-400 mb-4">当前角色: {currentRole || '未知'}</p>
          <button onClick={() => navigate(`/group/${roomId}`)} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl">返回群资料</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">群管理</h1>
          <button onClick={loadData} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition" title="刷新">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex gap-4 overflow-x-auto">
          <button onClick={() => setActiveTab('basic')} className={`py-3 text-sm font-medium transition relative whitespace-nowrap ${activeTab === 'basic' ? 'text-blue-600' : 'text-gray-500'}`}>
            基本设置{activeTab === 'basic' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>}
          </button>
          <button onClick={() => setActiveTab('members')} className={`py-3 text-sm font-medium transition relative whitespace-nowrap ${activeTab === 'members' ? 'text-blue-600' : 'text-gray-500'}`}>
            成员管理{activeTab === 'members' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>}
          </button>
          <button onClick={() => setActiveTab('titles')} className={`py-3 text-sm font-medium transition relative whitespace-nowrap ${activeTab === 'titles' ? 'text-blue-600' : 'text-gray-500'}`}>
            头衔管理{activeTab === 'titles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>}
          </button>
          <button onClick={() => { setActiveTab('pending'); loadPendingCount(); }} className={`py-3 text-sm font-medium transition relative whitespace-nowrap ${activeTab === 'pending' ? 'text-blue-600' : 'text-gray-500'}`}>
            待审核{pendingCount > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{pendingCount}</span>}
            {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>}
          </button>
        </div>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} space-y-4 max-w-2xl mx-auto`}>
        {/* 基本设置 */}
        {activeTab === 'basic' && (
          <>
            <div className="bg-white rounded-2xl shadow p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">群名称</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" maxLength={30} />
            </div>
            <div className="bg-white rounded-2xl shadow p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">群描述</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none" rows={3} maxLength={200} />
            </div>
            <div className="bg-white rounded-2xl shadow p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">群公告</label>
              <textarea value={formData.announcement} onChange={(e) => setFormData({ ...formData, announcement: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none" rows={3} maxLength={500} />
            </div>
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-medium text-gray-800 mb-4">入群设置</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div><span className="text-gray-700">公开群组</span><p className="text-xs text-gray-400 mt-0.5">公开后可在搜索中被找到</p></div>
                  <button onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${formData.isPublic ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${formData.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div><span className="text-gray-700">需要审核</span><p className="text-xs text-gray-400 mt-0.5">开启后新成员需要管理员审核才能加入</p></div>
                  <button onClick={() => setFormData({ ...formData, requireApproval: !formData.requireApproval })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${formData.requireApproval ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${formData.requireApproval ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </label>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 shadow-md">
              {saving ? '保存中...' : '保存设置'}
            </button>
          </>
        )}

        {/* 成员管理 */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">成员列表</h3>
                <p className="text-xs text-gray-400">共 {members.length} 位</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {members.map(member => {
                const displayName = getDisplayName(member);
                const isSelf = member.personaId?._id === currentPersonaId;
                return (
                  <div key={member._id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-sm">{displayName.charAt(0).toUpperCase()}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{displayName}</span>
                        {getRoleBadge(member.role)}
                        {member.title && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{member.title}</span>}
                        {isSelf && <span className="text-xs text-gray-400">(你)</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {member.personaId?.sameNameNumber ? `#${member.personaId.sameNameNumber}` : ''}
                        {member.personaId?.globalNumber ? ` · 全局 #${member.personaId.globalNumber}` : ''}
                        {' · '}{new Date(member.joinedAt).toLocaleDateString()} 加入
                      </p>
                    </div>
                    {isOwner && member.role !== 'owner' && !isSelf && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleSetAdmin(member.personaId!._id, displayName, member.role !== 'admin')} className="text-xs text-blue-500 hover:text-blue-600">{member.role === 'admin' ? '取消管理' : '设为管理'}</button>
                        <button onClick={() => { setSelectedMember(member); setNewTitle(member.title || ''); setShowTitleModal(true); }} className="text-xs text-gray-500 hover:text-blue-600">头衔</button>
                        <button onClick={() => handleKickMember(member.personaId!._id, displayName)} className="text-xs text-red-500 hover:text-red-600">踢出</button>
                      </div>
                    )}
                    {isAdmin && !isOwner && member.role !== 'owner' && member.role !== 'admin' && !isSelf && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => { setSelectedMember(member); setNewTitle(member.title || ''); setShowTitleModal(true); }} className="text-xs text-gray-500 hover:text-blue-600">头衔</button>
                        <button onClick={() => handleKickMember(member.personaId!._id, displayName)} className="text-xs text-red-500 hover:text-red-600">踢出</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 头衔管理 */}
        {activeTab === 'titles' && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-medium text-gray-800">头衔列表</h3>
              <button
                onClick={() => setShowCreateTitleModal(true)}
                className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1.5 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition"
              >
                + 创建头衔
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {titles.length === 0 ? (
                <div className="p-8 text-center text-gray-400">暂无头衔，点击上方按钮创建</div>
              ) : (
                titles.map(title => (
                  <div key={title._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{title.icon}</span>
                      <span className="font-medium" style={{ color: title.color }}>{title.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteTitle(title._id, title.name)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 待审核 */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-medium text-gray-800">待审核申请</h3>
              <p className="text-xs text-gray-400 mt-1">共 {pendingCount} 个</p>
            </div>
            <div className="p-4">
              <button onClick={() => navigate(`/room/${roomId}/pending`)} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition shadow-md flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                查看待审核申请{pendingCount > 0 && <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">{pendingCount}</span>}
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
                <h3 className="text-lg font-semibold text-gray-800">设置 {getDisplayName(selectedMember)} 的头衔</h3>
                <button onClick={() => { setShowTitleModal(false); setSelectedMember(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="输入头衔（例如：元老、活跃分子）" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition mb-4" maxLength={20} />
              <div className="flex gap-3">
                <button onClick={() => { setShowTitleModal(false); setSelectedMember(null); }} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">取消</button>
                <button onClick={handleSetTitle} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition shadow-md">确认设置</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建头衔弹窗 */}
      {showCreateTitleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">创建新头衔</h3>
                <button onClick={() => { setShowCreateTitleModal(false); setNewTitle(''); }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">头衔名称</label>
                  <input 
                    type="text" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)} 
                    placeholder="例如：元老" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    maxLength={20} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">头衔颜色</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={newTitleColor} 
                      onChange={(e) => setNewTitleColor(e.target.value)} 
                      className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" 
                    />
                    <span className="text-sm text-gray-500">选择颜色</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">头衔图标</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      value={newTitleIcon} 
                      onChange={(e) => setNewTitleIcon(e.target.value)} 
                      placeholder="例如：🌟" 
                      className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center" 
                      maxLength={2} 
                    />
                    <span className="text-sm text-gray-500">输入 emoji 或符号</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowCreateTitleModal(false); setNewTitle(''); }} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">取消</button>
                <button onClick={handleCreateTitle} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition shadow-md">创建头衔</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettings;