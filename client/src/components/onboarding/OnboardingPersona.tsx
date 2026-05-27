// client/src/components/onboarding/OnboardingPersona.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface OnboardingPersonaProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const OnboardingPersona: React.FC<OnboardingPersonaProps> = ({ onComplete, onSkip }) => {
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [personaName, setPersonaName] = useState('');
  const [personaDesc, setPersonaDesc] = useState('');

  // 快速创建角色
  const handleCreatePersona = async () => {
    if (!personaName.trim()) {
      toast.error('请填写角色名称');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/persona/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: personaName.trim(),
          description: personaDesc.trim() || '一个等待展开故事的角色',
          tags: ['新手']
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('角色创建成功！');
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
              🎭 创建你的第一个角色
            </h1>
            <p className="text-white/80 text-sm text-center mt-1">
              角色是你在 RP Chat 中的身份
            </p>
          </div>
          
          <div className="p-6">
            {!showCreateForm ? (
              <div className="space-y-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg"
                >
                  ✨ 创建新角色
                </button>
                
                <button
                  onClick={onComplete}
                  className="w-full py-4 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition"
                >
                  🔍 稍后探索/搜索角色
                </button>
                
                {onSkip && (
                  <button
                    onClick={onSkip}
                    className="w-full py-3 text-white/60 text-sm hover:text-white/80 transition"
                  >
                    跳过，进入主页
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    角色名称 <span className="text-red-300">*</span>
                  </label>
                  <input
                    type="text"
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    placeholder="例如：莉莉丝"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    角色描述
                  </label>
                  <textarea
                    value={personaDesc}
                    onChange={(e) => setPersonaDesc(e.target.value)}
                    placeholder="简单介绍一下这个角色..."
                    rows={3}
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
                    onClick={handleCreatePersona}
                    disabled={loading || !personaName.trim()}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                  >
                    {loading ? '创建中...' : '创建角色'}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white/5 px-6 py-3">
            <p className="text-white/60 text-xs text-center">
              💡 提示：角色可以是原创人物、已有角色或 AI 角色
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingPersona;