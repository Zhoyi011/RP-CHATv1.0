// client/src/components/auth/Login.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const Login = () => {
  const navigate = useNavigate();
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  
  // 登录表单
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const captchaRef = useRef<HCaptcha>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 自动检测登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          if (userData.hasAccess) {
            navigate('/chat');
          } else {
            navigate('/invite');
          }
          return;
        }
        localStorage.removeItem('token');
      } catch (err) {}
      setCheckingAuth(false);
    };
    checkAuth();
  }, [navigate]);

  const resetCaptcha = () => {
    if (captchaRef.current) {
      (captchaRef.current as any).resetCaptcha?.();
      (captchaRef.current as any).execute?.();
    }
    setCaptchaToken(null);
  };

// 邮箱密码登录
const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!captchaToken) {
    toast.error('请完成验证');
    (captchaRef.current as any)?.execute?.();
    return;
  }
  
  setLoading(true);
  setError('');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, captchaToken })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      toast.success('登录成功');
      
      // 👇 修改跳转逻辑
      if (data.needsInvite) {
        navigate('/invite');
      } else if (data.user?.onboarded) {
        navigate('/chat');
      } else {
        navigate('/onboarding');
      }
    } else {
      setError(data.error || '登录失败');
      toast.error(data.error || '登录失败');
      resetCaptcha();
    }
  } catch (err) {
    setError('网络错误，请稍后重试');
    toast.error('网络错误');
  } finally {
    setLoading(false);
  }
};
  // Google 登录
const handleGoogleLogin = async () => {
  if (!captchaToken) {
    toast.error('请完成验证');
    (captchaRef.current as any)?.execute?.();
    return;
  }
  
  setLoading(true);
  setError('');
  
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    
    const response = await fetch(`${API_BASE}/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebaseUid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        captchaToken
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      toast.success('登录成功');
      
      // 👇 修改跳转逻辑
      if (data.needsInvite) {
        navigate('/invite');
      } else if (data.user?.onboarded) {
        navigate('/chat');
      } else {
        navigate('/onboarding');
      }
    } else {
      setError(data.error || '登录失败');
      toast.error(data.error || '登录失败');
      resetCaptcha();
    }
  } catch (err: any) {
    console.error('Google 登录失败:', err);
    setError(err.message || 'Google 登录失败');
    toast.error(err.message || 'Google 登录失败');
    resetCaptcha();
  } finally {
    setLoading(false);
  }
};

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center">
          <img src="/favicon.svg" alt="RP Chat" className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60 text-lg">加载中...</p>
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
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
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
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-t-3xl"></div>
        
        <div className="p-8">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-4 border border-white/30 hover:scale-105 transition duration-300">
              <img src="/favicon.svg" alt="RP Chat" className="w-16 h-16 drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">RP Chat</h1>
            <p className="text-white/80 text-sm">角色扮演聊天室 · 开启你的第二人生</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-white rounded-xl text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* 邮箱登录表单（点击展开） */}
          {!showEmailLogin ? (
            // 简洁模式：只显示两个按钮
            <div className="space-y-3">
              {/* 邮箱登录按钮 */}
              <button
                onClick={() => setShowEmailLogin(true)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3.5 rounded-xl font-medium hover:bg-white/20 transition duration-300 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>使用邮箱登录</span>
              </button>

              {/* Google 登录按钮 */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                onMouseEnter={() => setHoveredButton('google')}
                onMouseLeave={() => setHoveredButton(null)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3.5 rounded-xl font-medium hover:bg-white/20 transition duration-300 flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5 transition-transform duration-300" 
                  style={{ transform: hoveredButton === 'google' ? 'rotate(-10deg) scale(1.1)' : 'rotate(0deg)' }}
                  viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>继续使用 Google</span>
              </button>
            </div>
          ) : (
            // 邮箱登录模式
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white text-lg font-medium">邮箱登录</h2>
                <button
                  type="button"
                  onClick={() => setShowEmailLogin(false)}
                  className="text-white/60 hover:text-white text-sm transition"
                >
                  ← 返回
                </button>
              </div>
              
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱 / 用户名"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50 shadow-lg"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          {/* 注册入口（在 hCaptcha 上面） */}
          <div className="text-center mt-6">
            <p className="text-white/50 text-sm">
              还没有账号？{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-white hover:underline underline-offset-2 transition font-medium"
              >
                前往注册
              </button>
            </p>
          </div>

          {/* hCaptcha 验证码 */}
          <div className="mt-6 flex justify-center">
            <HCaptcha
              ref={captchaRef}
              sitekey="4c64d60e-17bc-4c06-9026-9c1e500a675e"
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => toast.error('验证码加载失败，请刷新页面')}
              theme="dark"
              size="normal"
            />
          </div>

          {/* 服务条款 */}
          <div className="mt-6 text-center">
            <p className="text-white/40 text-xs">
              继续即表示你同意我们的
              <span onClick={() => navigate('/terms')} className="text-white/60 hover:text-white underline mx-1 cursor-pointer">服务条款</span>
              和
              <span onClick={() => navigate('/privacy')} className="text-white/60 hover:text-white underline mx-1 cursor-pointer">隐私政策</span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default Login;