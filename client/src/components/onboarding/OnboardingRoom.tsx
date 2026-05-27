// client/src/components/onboarding/OnboardingRoom.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface OnboardingRoomProps {
  onComplete: () => void;
}

const OnboardingRoom: React.FC<OnboardingRoomProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');

  // 创建群聊
  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('请填写群聊名称');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: roomName.trim(),
          description: roomDesc.trim() || ''
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('群聊创建成功！');
        onComplete();
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
            <h1 className="text-xl font-bold text-white text-center">
              💬 创建或加入群聊
            </h1>
            <p className="text-white/80 text-sm text-center mt-1">
              和其他角色一起互动吧！
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  群聊名称 <span className="text-red-300">*</span>
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="例如：奇幻冒险公会"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  群聊简介
                </label>
                <textarea
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  placeholder="简单介绍一下这个群聊..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition resize-none"
                />
              </div>
              
              <button
                onClick={handleCreateRoom}
                disabled={loading || !roomName.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 shadow-lg"
              >
                {loading ? '创建中...' : '✨ 创建群聊'}
              </button>
              
              <button
                onClick={onComplete}
                className="w-full py-2 text-white/50 text-sm hover:text-white/70 transition"
              >
                跳过，进入主页
              </button>
            </div>
          </div>
          
          <div className="bg-white/5 px-6 py-3">
            <p className="text-white/60 text-xs text-center">
              💡 提示：稍后也可以在聊天页面搜索或加入更多群聊
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingRoom;