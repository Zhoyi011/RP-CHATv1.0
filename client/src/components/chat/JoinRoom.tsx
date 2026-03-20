import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth } from '../../firebase/config';

const JoinRoom = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedPersona, setSelectedPersona] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRoomAndPersonas();
  }, [roomId]);

  const loadRoomAndPersonas = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 获取房间信息
      const roomRes = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const roomData = await roomRes.json();
      setRoom(roomData);
      
      // 获取我的角色
      const personasRes = await fetch(`https://rp-chatv1-0.onrender.com/api/persona/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const personasData = await personasRes.json();
      const approvedPersonas = personasData.filter((p: any) => p.status === 'approved');
      setPersonas(approvedPersonas);
      if (approvedPersonas.length > 0) {
        setSelectedPersona(approvedPersonas[0]._id);
      }
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedPersona) {
      alert('请选择一个角色');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/join-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          personaId: selectedPersona,
          message
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('申请已提交，等待群主/管理员审核');
        navigate('/chat');
      } else {
        alert(data.error || '申请失败');
      }
    } catch (error) {
      console.error('申请失败:', error);
      alert('申请失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-bold mb-2">申请加入群组</h2>
          <p className="text-gray-500 mb-4">{room?.name}</p>
          <p className="text-gray-600 mb-4">{room?.description}</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">选择角色</label>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              {personas.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">申请留言（可选）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="说说你为什么想加入..."
              className="w-full p-2 border rounded-lg"
              rows={3}
            />
          </div>

          <button
            onClick={handleApply}
            disabled={submitting}
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {submitting ? '提交中...' : '提交申请'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;