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
  const [selectedRequest, setSelectedRequest] = useState<PendingMember | null>(null);
  const [showDetail, setShowDetail] = useState(false);

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
      console.log('待审核申请:', data);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, approve: boolean, rejectReason?: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://rp-chatv1-0.onrender.com/api/room/${roomId}/approve-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, approve, rejectReason })
      });
      
      if (res.ok) {
        setRequests(requests.filter(r => r.userId._id !== userId));
        alert(approve ? '已批准加入' : '已拒绝申请');
        setShowDetail(false);
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
              <div 
                key={req._id} 
                className="bg-white rounded-2xl shadow overflow-hidden cursor-pointer hover:shadow-md transition"
                onClick={() => {
                  setSelectedRequest(req);
                  setShowDetail(true);
                }}
              >
                <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {req.personaId.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{req.personaId.name}</p>
                        <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">待审核</span>
                      </div>
                      <p className="text-sm text-gray-500">{req.userId.username}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        申请于 {new Date(req.appliedAt).toLocaleString()}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {req.message && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">申请理由：</p>
                      <p className="text-sm text-gray-600">"{req.message}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 申请详情弹窗 */}
      {showDetail && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500"></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">申请详情</h3>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                  {selectedRequest.personaId.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{selectedRequest.personaId.name}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.userId.username}</p>
                </div>
              </div>
              
              {selectedRequest.message && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">申请理由：</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedRequest.message}</p>
                </div>
              )}
              
              <p className="text-xs text-gray-400 mb-4">
                申请时间：{new Date(selectedRequest.appliedAt).toLocaleString()}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selectedRequest.userId._id, false)}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition shadow-md"
                >
                  拒绝
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.userId._id, true)}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition shadow-md"
                >
                  批准加入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingRequests;