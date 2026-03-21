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
  };
  personaId: {
    _id: string;
    name: string;
  };
  role: string;
  nickname: string;
  title: string;
}

const RoomSettings = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
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

  useEffect(() => {
    loadRoom();
    loadMembers();
  }, [roomId]);

  const loadRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}`, {
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
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
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
    } catch (error) {
      console.error('加载成员失败:', error);
    }
  };

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
        navigate(-1);
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
        loadMembers();
      } else {
        const data = await res.json();
        alert(data.error || '设置失败');
      }
    } catch (error) {
      console.error('设置头衔失败:', error);
      alert('设置失败，请重试');
    }
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
            群设置
          </h1>
        </div>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} space-y-4 max-w-2xl mx-auto`}>
        {/* 群名称 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">群名称</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            placeholder="群名称"
          />
        </div>

        {/* 群描述 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">群描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
            rows={3}
            placeholder="简单介绍一下这个群..."
          />
        </div>

        {/* 群公告 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">群公告</label>
          <textarea
            value={formData.announcement}
            onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
            rows={3}
            placeholder="群公告..."
          />
          <p className="text-xs text-gray-400 mt-2">公告会显示在聊天室顶部</p>
        </div>

        {/* 入群设置 */}
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
                  formData.isPublic ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gray-300'
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
                  formData.requireApproval ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gray-300'
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

        {/* 成员管理 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">成员管理</h3>
            <button
              onClick={() => navigate(`/room/${roomId}/members`)}
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              查看全部 →
            </button>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {members.slice(0, 5).map(member => (
              <div key={member._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                    {member.personaId?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{member.personaId?.name}</p>
                    {member.title && (
                      <p className="text-xs text-gray-400">{member.title}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    member.role === 'owner' ? 'bg-amber-100 text-amber-700' :
                    member.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {member.role === 'owner' ? '群主' : member.role === 'admin' ? '管理员' : '成员'}
                  </span>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setNewTitle(member.title || '');
                        setShowTitleModal(true);
                      }}
                      className="text-xs text-gray-400 hover:text-emerald-600"
                    >
                      设置头衔
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 shadow-md"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>

      {/* 设置头衔弹窗 */}
      {showTitleModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  设置 {selectedMember.personaId?.name} 的头衔
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition mb-4"
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
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition shadow-md"
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

export default RoomSettings;