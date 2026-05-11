import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useResponsive } from '../../hooks/useResponsive';
import { usePermissions } from '../../hooks/usePermissions';
import { adminApi } from '../../services/api';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface InviteCode {
  _id: string;
  code: string;
  createdBy: { username: string };
  usedBy?: { username: string; email: string };
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { isAdmin, isOwner } = usePermissions();
  const canManageInvites = isAdmin || isOwner;

  // ===== 设置状态 =====
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = useState(() => localStorage.getItem('notifications') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [defaultTranslate, setDefaultTranslate] = useState(() => localStorage.getItem('defaultTranslate') || 'off');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ===== 邀请码管理状态 =====
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ===== 加载设置 =====
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/auth/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.theme) {
          setTheme(data.theme);
          applyTheme(data.theme);
        }
        setNotifications(data.notifications !== false);
        setSoundEnabled(data.soundEnabled !== false);
        setDefaultTranslate(data.defaultTranslate || 'off');
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  // ===== 加载邀请码 =====
  const loadInviteCodes = useCallback(async () => {
    if (!canManageInvites) return;
    setLoadingCodes(true);
    try {
      const data = await adminApi.getInviteCodes();
      setInviteCodes(data);
    } catch (error) {
      console.error('加载邀请码失败:', error);
    } finally {
      setLoadingCodes(false);
    }
  }, [canManageInvites]);

  useEffect(() => {
    if (showInviteSection) {
      loadInviteCodes();
    }
  }, [showInviteSection, loadInviteCodes]);

  // ===== 应用主题 =====
  const applyTheme = (newTheme: string) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else if (newTheme === 'auto') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // ===== 保存设置 =====
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // 保存到后端
      await fetch(`${API_BASE}/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme, notifications, soundEnabled, defaultTranslate })
      });

      // 保存到本地
      localStorage.setItem('theme', theme);
      localStorage.setItem('notifications', String(notifications));
      localStorage.setItem('soundEnabled', String(soundEnabled));
      localStorage.setItem('defaultTranslate', defaultTranslate);
      
      applyTheme(theme);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('保存设置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // ===== 生成邀请码 =====
  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const data = await adminApi.generateInviteCode();
      await loadInviteCodes();
      navigator.clipboard.writeText(data.code);
      setCopiedCode(data.code);
      setTimeout(() => setCopiedCode(null), 3000);
    } catch (error: any) {
      alert(error.message || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // ===== 删除邀请码 =====
  const handleDeleteCode = async (codeId: string, code: string) => {
    if (!confirm(`确定要删除邀请码 ${code} 吗？`)) return;
    try {
      await adminApi.deleteInviteCode(codeId);
      await loadInviteCodes();
    } catch (error) {
      alert('删除失败');
    }
  };

  // ===== 获取邀请码状态 =====
  const getCodeStatus = (code: InviteCode) => {
    if (code.usedBy) {
      return { text: '已使用', color: 'text-gray-400', bg: 'bg-gray-100' };
    }
    if (!code.isActive) {
      return { text: '已过期', color: 'text-red-500', bg: 'bg-red-50' };
    }
    if (new Date(code.expiresAt) < new Date()) {
      return { text: '已过期', color: 'text-red-500', bg: 'bg-red-50' };
    }
    return { text: '有效', color: 'text-green-600', bg: 'bg-green-50' };
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-gray-100'
    }`}>
      {/* 头部 */}
      <div className={`sticky top-0 z-10 backdrop-blur-xl border-b transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-white/80 border-gray-100'
      }`}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={`text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent`}>
            设置
          </h1>
        </div>
      </div>

      <div className={`max-w-2xl mx-auto ${isMobile ? 'p-3' : 'p-6'} space-y-4`}>
        
        {/* ===== 外观设置 ===== */}
        <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <span>🎨</span> 外观设置
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'light', icon: '☀️', label: '浅色模式', desc: '明亮舒适' },
              { value: 'dark', icon: '🌙', label: '深色模式', desc: '护眼暗色' },
              { value: 'auto', icon: '🔄', label: '跟随系统', desc: '自动切换' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setTheme(item.value)}
                className={`p-3 rounded-xl text-center transition-all duration-200 ${
                  theme === item.value
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md scale-105'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs font-medium">{item.label}</div>
                <div className="text-[10px] opacity-70">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ===== 通知设置 ===== */}
        <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <span>🔔</span> 通知设置
          </h3>
          
          <label className="flex items-center justify-between cursor-pointer py-2">
            <div>
              <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>新消息通知</span>
              <p className="text-xs text-gray-400 mt-0.5">收到新消息时推送通知</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                notifications ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${
                notifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </label>
          
          <label className="flex items-center justify-between cursor-pointer py-2 mt-2">
            <div>
              <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>声音提示</span>
              <p className="text-xs text-gray-400 mt-0.5">新消息时播放提示音</p>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                soundEnabled ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </label>
        </div>

        {/* ===== 语言设置 ===== */}
        <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <span>💬</span> 简繁转换
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'off', icon: '✖️', label: '关闭' },
              { value: 'simplified', icon: '简', label: '转为简体' },
              { value: 'traditional', icon: '繁', label: '转为繁体' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setDefaultTranslate(item.value)}
                className={`p-3 rounded-xl text-center transition-all duration-200 ${
                  defaultTranslate === item.value
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md scale-105'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-xs font-medium">{item.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            设置默认的简繁转换行为，可通过聊天中的转换按钮临时切换
          </p>
        </div>

        {/* ===== 邀请码管理（管理员专属）===== */}
        {canManageInvites && (
          <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
          }`}>
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowInviteSection(!showInviteSection)}
            >
              <h3 className="font-medium flex items-center gap-2">
                <span>🔑</span> 邀请码管理
                <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">管理员</span>
              </h3>
              <svg className={`w-5 h-5 transition-transform duration-200 ${showInviteSection ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {showInviteSection && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                {/* 统计信息 */}
                <div className="flex gap-3 text-center">
                  <div className={`flex-1 p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-green-50'}`}>
                    <div className="text-2xl font-bold text-green-600">
                      {inviteCodes.filter(c => c.isActive && !c.usedBy && new Date(c.expiresAt) > new Date()).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">可用邀请码</div>
                  </div>
                  <div className={`flex-1 p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}`}>
                    <div className="text-2xl font-bold text-blue-600">
                      {inviteCodes.filter(c => c.usedBy).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">已被使用</div>
                  </div>
                  <div className={`flex-1 p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-red-50'}`}>
                    <div className="text-2xl font-bold text-red-500">
                      {inviteCodes.filter(c => !c.isActive || new Date(c.expiresAt) < new Date()).filter(c => !c.usedBy).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">已过期</div>
                  </div>
                </div>

                {/* 生成按钮 */}
                <button
                  onClick={handleGenerateCode}
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2.5 rounded-xl font-medium 
                    hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-50 shadow-md text-sm"
                >
                  {generating ? '生成中...' : '🎲 生成随机邀请码'}
                </button>

                {/* 复制成功提示 */}
                {copiedCode && (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in">
                    <span>✅</span>
                    邀请码 <strong>{copiedCode}</strong> 已复制到剪贴板！
                  </div>
                )}

                {/* 邀请码列表 */}
                {loadingCodes ? (
                  <div className="text-center py-4 text-gray-400">加载中...</div>
                ) : inviteCodes.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">暂无邀请码</div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {inviteCodes.map(code => {
                      const status = getCodeStatus(code);
                      return (
                        <div key={code._id} className={`flex items-center justify-between p-3 rounded-xl ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="font-mono font-bold text-sm">{code.code}</code>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                                {status.text}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {code.usedBy 
                                ? `使用者: ${code.usedBy.username}`
                                : `过期: ${new Date(code.expiresAt).toLocaleDateString()}`
                              }
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteCode(code._id, code.code)}
                            className="text-red-400 hover:text-red-600 p-1 transition"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== 关于 ===== */}
        <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <span>ℹ️</span> 关于
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-500">版本</span>
              <span className="font-mono">v1.2.0</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">开发者</span>
              <span>RP Chat Team</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">GitHub</span>
              <a 
                href="https://github.com/Zhoyi011/RP-CHATv1.0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                @Zhoyi011
              </a>
            </div>
          </div>
        </div>

        {/* ===== 保存按钮 ===== */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-medium transition-all duration-200 shadow-md ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
          } disabled:opacity-50`}
        >
          {saving ? '保存中...' : saved ? '✅ 已保存' : '保存设置'}
        </button>
      </div>

      {/* 夜间模式全局样式 */}
      {theme === 'dark' && (
        <style>{`
          body {
            background-color: #111827;
          }
        `}</style>
      )}
    </div>
  );
};

export default Settings;