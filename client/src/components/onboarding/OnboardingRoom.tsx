// client/src/components/onboarding/OnboardingRoom.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface OnboardingRoomProps {
  onComplete: () => void;
}

const OnboardingRoom: React.FC<OnboardingRoomProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

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

  // 加入群聊
  const handleJoinRoom = async () => {
    if (!inviteCode.trim()) {
      toast.error('请输入邀请码');
      return;
    }
    
    setJoinLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/room/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase()
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('加入群聊成功！');
        onComplete();
      } else {
        toast.error(data.error || '加入失败');
      }
    } catch (error) {
      toast.error('加入失败');
    } finally {
      setJoinLoading(false);
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
              💬 加入或创建群聊
            </h1>
            <p className="text-white/80 text-sm text-center mt-1">
              和其他角色一起互动吧！
            </p>
          </div>
          
          <div className="p-6">
            {!showCreateForm ? (
              <div className="space-y-4">
                {/* 加入群聊 */}
                <div className="space-y-3">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="输入邀请码"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={joinLoading || !inviteCode.trim()}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition disabled:opacity-50 shadow-lg"
                  >
                    {joinLoading ? '加入中...' : '🔑 加入群聊'}
                  </button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-transparent text-white/60">或者</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition"
                >
                  ✨ 创建新群聊
                </button>
                
                <button
                  onClick={onComplete}
                  className="w-full py-2 text-white/50 text-sm hover:text-white/70 transition"
                >
                  跳过，进入主页
                </button>
              </div>
            ) : (
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
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading || !roomName.trim()}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                  >
                    {loading ? '创建中...' : '创建群聊'}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white/5 px-6 py-3">
            <p className="text-white/60 text-xs text-center">
              💡 提示：群聊邀请码可以向管理员或其他群成员获取
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingRoom;