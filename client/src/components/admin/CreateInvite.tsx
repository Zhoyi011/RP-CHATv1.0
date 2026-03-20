import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const InviteCode = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      const token = localStorage.getItem('token');
      
      console.log('Invite page - Auth check:', { 
        hasUser: !!user, 
        hasToken: !!token,
        userEmail: user?.email 
      });

      // 如果没有登录，跳回首页
      if (!user) {
        console.log('No user found, redirecting to login');
        navigate('/');
        return;
      }

      // 如果有 token，检查用户是否已经有访问权限
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('User data from server:', userData);
            
            // 如果已经有访问权限，直接跳转到聊天室
            if (userData.hasAccess) {
              console.log('User already has access, redirecting to chat');
              navigate('/chat');
            }
          }
        } catch (err) {
          console.error('Error checking user status:', err);
        }
      }
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      const token = localStorage.getItem('token');
      
      console.log('Submitting invite code:', { 
        inviteCode: inviteCode.toUpperCase(), 
        hasUser: !!user, 
        hasToken: !!token 
      });

      if (!user || !token) {
        console.log('Missing user or token, redirecting to login');
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
          inviteCode: inviteCode.toUpperCase(),
          firebaseUid: user.uid
        })
      });

      const data = await response.json();
      console.log('Invite verification response:', { status: response.status, data });

      if (response.ok) {
        // 更新 token
        if (data.token) {
          localStorage.setItem('token', data.token);
          console.log('New token saved');
        }
        // 跳转到聊天室
        console.log('Invite valid, redirecting to chat');
        navigate('/chat');
      } else {
        setError(data.error || '邀请码无效');
      }
    } catch (err: any) {
      console.error('Invite verification error:', err);
      setError('验证失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      
      {/* 主卡片 */}
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-t-3xl"></div>
        
        <div className="p-8">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate('/')}
            className="mb-6 text-white/80 hover:text-white flex items-center gap-1 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>

          {/* 图标和标题 */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-4 border border-white/30">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">输入邀请码</h2>
            <p className="text-white/80">
              RP Chat 采用邀请制<br />
              需要有效邀请码才能继续
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-white rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* 邀请码输入表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-4 text-center text-xl tracking-widest bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/30 outline-none transition"
                placeholder="输入邀请码"
                maxLength={10}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inviteCode}
              className="w-full bg-white text-gray-800 py-3.5 rounded-xl font-medium hover:bg-gray-100 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? '验证中...' : '验证邀请码'}
            </button>
          </form>

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl">
            <p className="text-sm text-white/90 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                邀请码由管理员发放，<strong>每个账号只能使用一次</strong>
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 动画关键帧 */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default InviteCode;
