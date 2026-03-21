import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useResponsive } from '../../hooks/useResponsive';

interface PendingMember {
  _id: string;
  userId: { _id: string; username: string; email: string };
  personaId: { _id: string; name: string; avatar: string };
  message: string;
  appliedAt: string;
}

const PendingRequests = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [requests, setRequests] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    loadRoomAndRequests();
  }, [roomId]);

  const loadRoomAndRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const roomRes = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const roomData = await roomRes.json();
      setRoomName(roomData.name);
      
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, approve: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/approve-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, approve })
      });
      
      if (res.ok) {
        setRequests(requests.filter(r => r.userId._id !== userId));
        alert(approve ? '已批准加入' : '已拒绝申请');
      } else {
        const data = await res.json();
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
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
            待审核申请
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">{roomName}</p>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400">暂无待审核申请</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req._id} className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {req.personaId.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{req.personaId.name}</p>
                      <p className="text-sm text-gray-500">{req.userId.username}</p>
                      {req.message && (
                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg">
                          "{req.message}"
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        申请于 {new Date(req.appliedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req.userId._id, true)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-xl text-sm hover:from-emerald-600 hover:to-teal-700 transition shadow-md"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => handleApprove(req.userId._id, false)}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-sm hover:bg-red-600 transition shadow-md"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingRequests;