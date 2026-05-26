import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const InviteCode = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  // 自动检测登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      const token = localStorage.getItem('token');
      
      // 没有登录，跳回首页
      if (!user) {
        navigate('/');
        return;
      }

      // 有 token，检查是否已有访问权限
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (userData.hasAccess) {
              // 已有权限，直接跳转
              navigate('/chat', { replace: true });
              return;
            }
          }
        } catch (err) {
          console.error('检查用户状态失败:', err);
        }
      }
      
      setChecking(false);
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      const token = localStorage.getItem('token');
      
      if (!user || !token) {
        navigate('/');
        return;
      }

      const response = await fetch(`${API_BASE}/auth/verify-invite`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          inviteCode: inviteCode.toUpperCase().trim(),
          firebaseUid: user.uid
        })
      });

      const data = await response.json();

      if (response.ok) {
        // 更新 token（角色可能变了）
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        
        const role = data.user?.role || 'user';
        const roleText = role === 'admin' ? '管理员' : role === 'owner' ? '群主' : '用户';
        
        // 成功后跳转
        setTimeout(() => {
          navigate('/chat', { replace: true });
        }, 500);
      } else {
        setError(data.error || '邀请码无效');
      }
    } catch (err: any) {
      console.error('验证邀请码失败:', err);
      setError('验证失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center animate-in fade-in duration-500">
          <img src="/favicon.svg" alt="RP Chat" className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60 text-lg">检查权限中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      
      {/* 星星粒子 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              opacity: 0.2 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>
      
      {/* 主卡片 */}
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/20 animate-in zoom-in-95 fade-in duration-500">
        <div className="h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-t-3xl"></div>
        
        <div className="p-8">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate('/')}
            className="mb-6 text-white/80 hover:text-white flex items-center gap-1 transition-colors duration-200 hover:gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回登录
          </button>

          {/* 图标和标题 */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-4 border border-white/30 hover:scale-105 transition-transform duration-300">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-500">
              输入邀请码
            </h2>
            <p className="text-white/80 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-100">
              RP Chat 采用邀请制<br />
              需要有效邀请码才能继续
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-white rounded-xl text-sm animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* 邀请码输入表单 */}
          <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200">
            <div>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-4 text-center text-xl tracking-[0.3em] bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/30 outline-none transition-all duration-300 font-mono font-bold"
                placeholder="输入邀请码"
                maxLength={10}
                required
                disabled={loading}
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-white/40 text-center mt-2">邀请码不区分大小写</p>
            </div>

            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="w-full bg-white text-gray-800 py-3.5 rounded-xl font-medium hover:bg-gray-100 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  验证中...
                </span>
              ) : '验证邀请码'}
            </button>
          </form>

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl animate-in fade-in duration-500 delay-300">
            <p className="text-sm text-white/90 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                邀请码由管理员发放<br />
                <strong>每个账号只需要输入一次</strong>，输入成功后永久有效<br />
                未使用的邀请码将在 <strong>7 天后过期</strong>
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 动画 */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.5); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default InviteCode;