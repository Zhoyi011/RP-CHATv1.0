import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '../../firebase/config';

interface Persona {
  _id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  description: string;
}

const JoinRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState('');
  const [roomPersonas, setRoomPersonas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPersonaSelect, setShowPersonaSelect] = useState(false);
  const currentUser = auth.currentUser;

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
      
      // 获取房间成员
      const membersRes = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const membersData = await membersRes.json();
      const existingPersonaIds = membersData.map((m: any) => m.personaId?._id).filter(Boolean);
      setRoomPersonas(existingPersonaIds);
      
      // 获取我的角色
      const personasRes = await fetch(`https://rp-chatv1-0.onrender.com/api/persona/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const personasData = await personasRes.json();
      const approvedPersonas = personasData.filter((p: any) => p.status === 'approved');
      setPersonas(approvedPersonas);
      
      // 自动选择一个未加入的角色
      const availablePersona = approvedPersonas.find(p => !existingPersonaIds.includes(p._id));
      if (availablePersona) {
        setSelectedPersona(availablePersona._id);
      }
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedPersona = () => {
    return personas.find(p => p._id === selectedPersona);
  };

  const isPersonaInRoom = (personaId: string) => {
    return roomPersonas.includes(personaId);
  };

  const handleApply = async () => {
    if (!selectedPersona) {
      alert('请选择一个角色');
      return;
    }
    
    if (isPersonaInRoom(selectedPersona)) {
      alert('该角色已在群中，不能重复申请');
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const selected = getSelectedPersona();
  const availablePersonas = personas.filter(p => !isPersonaInRoom(p._id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-gray-500 hover:text-blue-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>返回</span>
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
          
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">申请加入群组</h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 mb-6">
              <p className="font-medium text-gray-800">{room?.name}</p>
              <p className="text-sm text-gray-500 mt-1">{room?.description}</p>
            </div>
            
            {/* 角色选择 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择角色 <span className="text-red-500">*</span>
              </label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPersonaSelect(!showPersonaSelect)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between hover:border-blue-400 transition"
                >
                  {selected ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                        {selected.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800">{selected.displayName || selected.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{selected.description}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">请选择角色</span>
                  )}
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${showPersonaSelect ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showPersonaSelect && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {availablePersonas.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        所有角色都已加入该群
                        <button
                          onClick={() => navigate('/persona/create')}
                          className="block mt-2 text-blue-500 hover:text-blue-600"
                        >
                          创建新角色 →
                        </button>
                      </div>
                    ) : (
                      availablePersonas.map(persona => {
                        const isInRoom = isPersonaInRoom(persona._id);
                        return (
                          <button
                            key={persona._id}
                            onClick={() => {
                              if (!isInRoom) {
                                setSelectedPersona(persona._id);
                                setShowPersonaSelect(false);
                              }
                            }}
                            disabled={isInRoom}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition text-left ${
                              selectedPersona === persona._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            } ${isInRoom ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                              {persona.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{persona.displayName || persona.name}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{persona.description}</p>
                            </div>
                            {isInRoom && (
                              <span className="text-xs text-green-600">✓ 已在群</span>
                            )}
                            {selectedPersona === persona._id && !isInRoom && (
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 申请留言 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                申请加入原因 <span className="text-gray-400">(可选)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="说说你为什么想加入这个群组..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">{message.length}/200</p>
            </div>

            {/* 提交按钮 */}
            <button
              onClick={handleApply}
              disabled={submitting || !selectedPersona}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 shadow-md"
            >
              {submitting ? '提交中...' : '提交申请'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;