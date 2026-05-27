// client/src/components/onboarding/OnboardingProfile.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import GlassDatePicker from '../common/GlassDatePicker';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface OnboardingProfileProps {
  onComplete: (data: { username: string; displayName: string; birthday: string | null }) => void;
}

const OnboardingProfile: React.FC<OnboardingProfileProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  // 检查用户名是否可用
  const checkUsername = async (value: string) => {
    if (value.length < 3) {
      setUsernameError('用户名至少3个字符');
      return false;
    }
    if (value.length > 20) {
      setUsernameError('用户名最多20个字符');
      return false;
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
      setUsernameError('用户名只能包含字母、数字、下划线和中文字符');
      return false;
    }
    
    setCheckingUsername(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/user/check-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: value })
      });
      const data = await res.json();
      if (data.exists) {
        setUsernameError('用户名已被占用');
        return false;
      }
      setUsernameError('');
      return true;
    } catch (error) {
      console.error('检查用户名失败:', error);
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUsername(value);
    if (value.length >= 3) {
      await checkUsername(value);
    } else {
      setUsernameError('');
    }
  };

  const handleSubmit = async () => {
    if (!username) {
      toast.error('请填写用户名');
      return;
    }
    if (usernameError) {
      toast.error(usernameError);
      return;
    }
    if (username.length < 3) {
      toast.error('用户名至少3个字符');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/user/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          displayName: displayName.trim() || undefined,
          birthday: birthday ? birthday.toISOString().split('T')[0] : null
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success('信息保存成功！');
        onComplete({ username, displayName, birthday: birthday ? birthday.toISOString().split('T')[0] : null });
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
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
          {/* 头部 */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
            <h1 className="text-xl font-bold text-white text-center">
              ✨ 欢迎来到 RP Chat ✨
            </h1>
            <p className="text-white/80 text-sm text-center mt-1">
              让我们先认识一下你
            </p>
          </div>
          
          {/* 表单 */}
          <div className="p-6 space-y-5">
            {/* 用户名（不可更改） */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                用户名 <span className="text-red-300">*</span>
                <span className="text-white/60 text-xs ml-2">（注册后不可更改）</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="3-20个字符，字母/数字/下划线"
                className={`w-full px-4 py-2.5 rounded-xl bg-white/20 border ${
                  usernameError ? 'border-red-400' : 'border-white/30'
                } text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition`}
                autoComplete="off"
              />
              {usernameError && (
                <p className="text-xs text-red-300 mt-1">{usernameError}</p>
              )}
              {checkingUsername && (
                <p className="text-xs text-white/60 mt-1">检查中...</p>
              )}
            </div>
            
            {/* 昵称（可选） */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                昵称 <span className="text-white/60 text-xs">（可选，显示在头像旁）</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="给自己取个昵称吧"
                className="w-full px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
              />
            </div>
            
            {/* 生日 */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                生日 <span className="text-white/60 text-xs">（可选，用于星座展示）</span>
              </label>
              <GlassDatePicker
                selected={birthday}
                onChange={setBirthday}
                placeholderText="选择你的生日"
                className="w-full px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50"
              />
            </div>
            
            {/* 下一步按钮 */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={loading || !!usernameError || username.length < 3}
              className="w-full py-3 mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? '保存中...' : '🎉 开始旅程 →'}
            </motion.button>
          </div>
          
          {/* 提示 */}
          <div className="bg-white/5 px-6 py-3">
            <p className="text-white/60 text-xs text-center">
              用户名将作为你的唯一标识，之后无法修改，请慎重填写
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingProfile;