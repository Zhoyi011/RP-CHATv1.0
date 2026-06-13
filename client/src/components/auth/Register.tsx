// client/src/components/auth/Register.tsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const captchaRef = useRef<HCaptcha>(null);

  const resetCaptcha = () => {
    if (captchaRef.current) {
      (captchaRef.current as any).resetCaptcha?.();
      (captchaRef.current as any).execute?.();
    }
    setCaptchaToken(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaToken) {
      toast.error('请完成验证');
      (captchaRef.current as any)?.execute?.();
      return;
    }
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      toast.error('两次输入的密码不一致');
      return;
    }
    
    if (password.length < 6) {
      setError('密码至少需要6个字符');
      toast.error('密码至少需要6个字符');
      return;
    }
    
    if (username.length < 2) {
      setError('用户名至少需要2个字符');
      toast.error('用户名至少需要2个字符');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          captchaToken
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user._id);
        toast.success('注册成功！请使用邀请码激活账号');
        navigate('/invite');
      } else {
        setError(data.error || '注册失败');
        toast.error(data.error || '注册失败');
        resetCaptcha();
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-800 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-t-3xl"></div>
        
        <div className="p-8">
          <button onClick={() => navigate('/')} className="mb-6 text-white/70 hover:text-white flex items-center gap-1 transition group">
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回登录</span>
          </button>

          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-4 border border-white/30 hover:scale-105 transition duration-300">
              <img src="/favicon.svg" alt="万物阁" className="w-14 h-14 drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">创建账号</h1>
            <p className="text-white/70 text-sm">加入 万物阁 社区</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-white rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="电子邮箱"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码 (至少6位)"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认密码"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition"
              required
            />
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 shadow-lg"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

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

          {/* 已有账号 */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              已有账号？{' '}
              <button onClick={() => navigate('/')} className="text-white font-medium hover:underline underline-offset-2 transition">
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
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default Register;