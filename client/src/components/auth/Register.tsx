import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const navigate = useNavigate();

  // 重置验证码
  const resetCaptcha = () => {
    if (captchaRef.current) {
      (captchaRef.current as any).resetCaptcha?.();
      (captchaRef.current as any).execute?.();
    }
    setCaptchaToken(null);
  };

  // 邮箱密码注册
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaToken) {
      toast.error('请完成验证');
      (captchaRef.current as any)?.execute?.();
      return;
    }

    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      toast.error('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符');
      toast.error('密码至少需要6个字符');
      setLoading(false);
      return;
    }

    if (username.length < 2) {
      setError('用户名至少需要2个字符');
      toast.error('用户名至少需要2个字符');
      setLoading(false);
      return;
    }

    try {
      // 1. 创建 Firebase 用户
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // 2. 更新 Firebase 用户资料
      await updateProfile(firebaseUser, { displayName: username });
      
      // 3. 调用后端注册 API
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: email,
          username: username,
          displayName: username,
          captchaToken
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        toast.success('注册成功！');
        navigate('/invite');
      } else {
        setError(data.error || '注册失败');
        toast.error(data.error || '注册失败');
        resetCaptcha();
      }
    } catch (err: any) {
      console.error('注册失败:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('该邮箱已被注册');
        toast.error('该邮箱已被注册');
      } else if (err.code === 'auth/weak-password') {
        setError('密码强度不足');
        toast.error('密码强度不足');
      } else {
        setError(err.message || '注册失败，请稍后重试');
        toast.error(err.message || '注册失败');
      }
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Google 注册
  const handleGoogleRegister = async () => {
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
      
      const response = await fetch(`${API_BASE}/auth/register/google`, {
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
        toast.success('注册成功！');
        navigate('/invite');
      } else {
        setError(data.error || '注册失败');
        toast.error(data.error || '注册失败');
        resetCaptcha();
      }
    } catch (err: any) {
      console.error('Google 注册失败:', err);
      setError(err.message || 'Google 注册失败');
      toast.error(err.message || 'Google 注册失败');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      
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
        <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-t-3xl"></div>
        
        <div className="p-8">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate('/')}
            className="mb-6 text-white/70 hover:text-white flex items-center gap-1 transition group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回登录</span>
          </button>

          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-4 border border-white/30 
              hover:scale-105 transition duration-300">
              <img 
                src="/favicon.svg" 
                alt="RP Chat" 
                className="w-14 h-14 drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">创建账号</h1>
            <p className="text-white/70 text-sm">加入 RP Chat 社区</p>
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

          {/* 邮箱注册表单 */}
          <form onSubmit={handleEmailRegister} className="space-y-4 mb-6">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                  text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400 
                  focus:border-transparent outline-none transition"
                required
              />
            </div>
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="电子邮箱"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                  text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400 
                  focus:border-transparent outline-none transition"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码 (至少6位)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                  text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400 
                  focus:border-transparent outline-none transition"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="确认密码"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                  text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400 
                  focus:border-transparent outline-none transition"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl 
                font-medium hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 
                shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? '注册中...' : '邮箱注册'}
            </button>
          </form>

          {/* 分割线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-white/50">或使用第三方注册</span>
            </div>
          </div>

          {/* Google 注册 */}
          <button
            onClick={handleGoogleRegister}
            disabled={loading}
            onMouseEnter={() => setHoveredButton('google')}
            onMouseLeave={() => setHoveredButton(null)}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 rounded-xl 
              font-medium hover:bg-white/20 transition duration-300 flex items-center justify-center gap-3 
              hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="w-5 h-5 transition duration-300" 
              style={{ transform: hoveredButton === 'google' ? 'rotate(-10deg) scale(1.1)' : 'rotate(0deg)' }}
              viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google 注册</span>
          </button>

          {/* hCaptcha 验证码 */}
          <div className="mt-6 flex justify-center">
            <HCaptcha
              ref={captchaRef}
              sitekey="4c64d60e-17bc-4c06-9026-9c1e500a675e"
              onVerify={(token) => {
                console.log('✅ hCaptcha 验证成功');
                setCaptchaToken(token);
              }}
              onExpire={() => {
                console.log('⚠️ hCaptcha 已过期');
                setCaptchaToken(null);
              }}
              onError={(err) => {
                console.error('hCaptcha 错误:', err);
                toast.error('验证码加载失败，请刷新页面');
              }}
              theme="dark"
              size="normal"
            />
          </div>

          {/* 已有账号 */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              已有账号？{' '}
              <button
                onClick={() => navigate('/')}
                className="text-white font-medium hover:underline underline-offset-2 transition"
              >
                立即登录
              </button>
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

export default Register;