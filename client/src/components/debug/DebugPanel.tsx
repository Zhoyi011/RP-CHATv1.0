// client/src/components/debug/DebugPanel.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'request' | 'code' | 'active'>('request');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // 检查是否有活跃的调试会话
  useEffect(() => {
    const token = localStorage.getItem('debug_session_token');
    const expiry = localStorage.getItem('debug_session_expiry');
    
    if (token && expiry && new Date(expiry) > new Date()) {
      setSessionToken(token);
      setExpiresAt(expiry);
      setStep('active');
    }
  }, []);

  // 申请验证码
  const requestCode = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/debug/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setStep('code');
        toast.success('验证码已发送');
        if (data.code) {
          // 开发环境自动填充
          setCode(data.code);
        }
      } else {
        toast.error(data.error || '申请失败');
      }
    } catch (error) {
      toast.error('申请失败');
    } finally {
      setLoading(false);
    }
  };

  // 验证码验证
  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/debug/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Debug-Code': code
        }
      });
      
      const data = await response.json();
      if (response.ok && data.debugToken) {
        setSessionToken(data.debugToken);
        setExpiresAt(data.expiresAt);
        setStep('active');
        
        // 保存到 localStorage
        localStorage.setItem('debug_session_token', data.debugToken);
        localStorage.setItem('debug_session_expiry', data.expiresAt);
        
        // 设置全局请求拦截器
        setupDebugInterceptor(data.debugToken);
        
        toast.success('调试模式已激活');
      } else {
        toast.error(data.error || '验证失败');
      }
    } catch (error) {
      toast.error('验证失败');
    } finally {
      setLoading(false);
    }
  };

  // 设置全局调试拦截器
  const setupDebugInterceptor = (token: string) => {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      if (args[1]) {
        args[1].headers = {
          ...args[1].headers,
          'X-Debug-Token': token
        };
      } else {
        args[1] = { headers: { 'X-Debug-Token': token } };
      }
      return originalFetch.apply(this, args);
    };
  };

  // 退出调试模式
  const revokeSession = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/debug/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionToken })
      });
    } catch (error) {}
    
    localStorage.removeItem('debug_session_token');
    localStorage.removeItem('debug_session_expiry');
    setSessionToken(null);
    setExpiresAt(null);
    setStep('request');
    setCode('');
    
    toast.success('调试模式已退出');
    
    // 刷新页面恢复原始 fetch
    setTimeout(() => window.location.reload(), 500);
  };

  // 触发调试请求（测试用）
  const triggerDebugRequest = async () => {
    try {
      const response = await fetch('/api/test?_debug=true', {
        headers: {
          'X-Debug-Token': sessionToken || ''
        }
      });
      const data = await response.json();
      toast.success('调试请求成功');
      console.log('调试响应:', data);
    } catch (error) {
      toast.error('请求失败');
    }
  };

  return (
    <>
      {/* 调试按钮（悬浮球） */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[9998] w-10 h-10 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all flex items-center justify-center"
        title="调试面板"
      >
        🐛
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐛</span>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">调试面板</h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              {step === 'request' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    调试模式可以临时绕过安全检查，方便开发调试。
                    每次授权有效期为 <strong className="text-red-500">30分钟</strong>。
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      ⚠️ 注意：调试模式会降低安全级别，请在调试完成后及时退出。
                    </p>
                  </div>
                  <button
                    onClick={requestCode}
                    disabled={loading}
                    className="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50"
                  >
                    {loading ? '申请中...' : '申请调试验证码'}
                  </button>
                </div>
              )}

              {step === 'code' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    请输入发送到您邮箱的 6 位验证码
                  </p>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-2xl tracking-widest py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                    maxLength={6}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('request')}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                    >
                      返回
                    </button>
                    <button
                      onClick={verifyCode}
                      disabled={loading || code.length !== 6}
                      className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50"
                    >
                      {loading ? '验证中...' : '验证'}
                    </button>
                  </div>
                </div>
              )}

              {step === 'active' && (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg text-center">
                    <p className="text-green-600 dark:text-green-400 font-medium">✅ 调试模式已激活</p>
                    <p className="text-xs text-gray-500 mt-1">
                      有效期至: {expiresAt ? new Date(expiresAt).toLocaleString() : '未知'}
                    </p>
                  </div>
                  
                  <button
                    onClick={triggerDebugRequest}
                    className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    测试调试请求
                  </button>
                  
                  <button
                    onClick={revokeSession}
                    className="w-full py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
                  >
                    退出调试模式
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DebugPanel;