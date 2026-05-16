import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '../../hooks/useResponsive';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../../contexts/ThemeContext';
import { adminApi } from '../../services/api';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface InviteCode {
  _id: string;
  code: string;
  type: 'user' | 'admin';
  createdBy: { username: string; role: string };
  usedBy?: { username: string; email: string };
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { isAdmin, isOwner } = usePermissions();
  const { theme, setTheme, toggleTheme } = useTheme();
  const canManageInvites = isAdmin || isOwner;

  // 本地设置状态
  const [notifications, setNotifications] = useState(() => localStorage.getItem('notifications') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [defaultTranslate, setDefaultTranslate] = useState(() => localStorage.getItem('defaultTranslate') || 'off');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 邀请码状态
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generating, setGenerating] = useState<string | false>(false);
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 加载设置
  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/auth/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications !== false);
        setSoundEnabled(data.soundEnabled !== false);
        setDefaultTranslate(data.defaultTranslate || 'off');
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 加载邀请码
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
    if (showInviteSection) loadInviteCodes();
  }, [showInviteSection, loadInviteCodes]);

  // 保存设置
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme, notifications, soundEnabled, defaultTranslate })
      });

      localStorage.setItem('notifications', String(notifications));
      localStorage.setItem('soundEnabled', String(soundEnabled));
      localStorage.setItem('defaultTranslate', defaultTranslate);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('保存设置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 生成邀请码
  const handleGenerateCode = async (type: 'user' | 'admin' = 'user') => {
    setGenerating(type);
    try {
      const data = await adminApi.generateInviteCode(undefined, type);
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

  // 删除邀请码
  const handleDeleteCode = async (codeId: string, code: string) => {
    if (!confirm(`确定要删除邀请码 ${code} 吗？`)) return;
    try {
      await adminApi.deleteInviteCode(codeId);
      await loadInviteCodes();
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  };

  const getCodeStatus = (code: InviteCode) => {
    if (code.usedBy) return { text: '已使用', color: 'text-gray-400', bg: 'bg-gray-100', icon: '✅' };
    if (!code.isActive || new Date(code.expiresAt) < new Date()) return { text: '已过期', color: 'text-red-500', bg: 'bg-red-50', icon: '⏰' };
    return { text: '有效', color: 'text-green-600', bg: 'bg-green-50', icon: '🟢' };
  };

  const validCodes = inviteCodes.filter(c => c.isActive && !c.usedBy && new Date(c.expiresAt) > new Date());
  const usedCodes = inviteCodes.filter(c => c.usedBy);

  const activeTabBg = 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md scale-105';
  const inactiveTabBg = theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
  const cardBg = theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800';
  const subBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-gray-100'
    }`}>
      {/* 头部 */}
      <div className={`sticky top-0 z-10 backdrop-blur-xl border-b transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-800/95 border-gray-700' : 'bg-white/80 border-gray-100'
      }`}>
        <div className="px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">设置</h1>
        </div>
      </div>

      <div className={`max-w-2xl mx-auto ${isMobile ? 'p-3' : 'p-6'} space-y-4`}>
        {/* ===== 外观设置（仅深色模式）===== */}
        <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${cardBg}`}>
          <h3 className="font-medium mb-4 flex items-center gap-2">🎨 外观设置</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'light', icon: '☀️', label: '浅色模式' },
              { value: 'dark', icon: '🌙', label: '深色模式' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setTheme(item.value as any)}
                className={`p-3 rounded-xl text-center transition-all duration-200 ${
                  theme === item.value ? activeTabBg : inactiveTabBg
                }`}
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs font-medium">{item.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ===== 通知设置 ===== */}
        <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${cardBg}`}>
          <h3 className="font-medium mb-4 flex items-center gap-2">🔔 通知设置</h3>
          <label className="flex items-center justify-between cursor-pointer py-2">
            <div>
              <span>新消息通知</span>
              <p className="text-xs text-gray-400 mt-0.5">收到新消息时推送通知</p>
            </div>
            <button onClick={() => setNotifications(!notifications)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${notifications ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer py-2">
            <div>
              <span>声音提示</span>
              <p className="text-xs text-gray-400 mt-0.5">新消息时播放提示音</p>
            </div>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${soundEnabled ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
        </div>

        {/* ===== 语言设置 ===== */}
        <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${cardBg}`}>
          <h3 className="font-medium mb-4 flex items-center gap-2">💬 简繁转换</h3>
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
                  defaultTranslate === item.value ? activeTabBg : inactiveTabBg
                }`}
              >
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-xs font-medium">{item.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">设置默认转换行为，可通过聊天中按钮临时切换</p>
        </div>

        {/* ===== 邀请码管理 ===== */}
        {canManageInvites && (
          <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${cardBg}`}>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowInviteSection(!showInviteSection)}>
              <h3 className="font-medium flex items-center gap-2">🔑 邀请码管理</h3>
              <svg className={`w-5 h-5 transition-transform duration-200 ${showInviteSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {showInviteSection && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-green-50'}`}>
                    <div className="text-xl font-bold text-green-600">{validCodes.length}</div>
                    <div className="text-[10px] text-gray-500">可用邀请码</div>
                  </div>
                  <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}`}>
                    <div className="text-xl font-bold text-blue-600">{usedCodes.length}</div>
                    <div className="text-[10px] text-gray-500">已被使用</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isOwner && (
                    <button onClick={() => handleGenerateCode('admin')} disabled={generating === 'admin'} className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-2.5 rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition disabled:opacity-50 shadow-md text-sm active:scale-95">
                      {generating === 'admin' ? '生成中...' : '👑 管理员邀请码'}
                    </button>
                  )}
                  <button onClick={() => handleGenerateCode('user')} disabled={generating === 'user'} className={`${isOwner ? 'flex-1' : 'w-full'} bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2.5 rounded-xl font-medium hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-50 shadow-md text-sm active:scale-95`}>
                    {generating === 'user' ? '生成中...' : '🎲 普通邀请码'}
                  </button>
                </div>
                {isAdmin && !isOwner && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                    <span>⚠️</span>管理员每天只能创建 <strong>1 个</strong>普通用户邀请码，且无法创建管理员邀请码
                  </div>
                )}
                {isOwner && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                    <span>ℹ️</span>群主可无限创建邀请码。<strong>管理员邀请码</strong>会让使用者获得管理员权限，请谨慎发放。
                  </div>
                )}
                {copiedCode && (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in">
                    <span>✅</span>邀请码 <strong className="font-mono">{copiedCode}</strong> 已复制到剪贴板！
                  </div>
                )}
                {loadingCodes ? (
                  <div className="text-center py-8 text-gray-400">加载中...</div>
                ) : inviteCodes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">暂无邀请码</div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {inviteCodes.map(code => {
                      const status = getCodeStatus(code);
                      return (
                        <div key={code._id} className={`flex items-center justify-between p-3 rounded-xl ${subBg}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="font-mono font-bold text-sm tracking-wider">{code.code}</code>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.icon} {status.text}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${code.type === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {code.type === 'admin' ? '👑 管理员' : '👤 普通用户'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {code.usedBy ? `使用者: ${code.usedBy.username} (${code.usedBy.email})` : `过期: ${new Date(code.expiresAt).toLocaleDateString()} · 创建者: ${code.createdBy?.username || '?'}`}
                            </p>
                          </div>
                          {!code.usedBy && (
                            <button onClick={() => handleDeleteCode(code._id, code.code)} className="text-red-400 hover:text-red-600 p-1.5 transition hover:bg-red-50 rounded-lg ml-2 flex-shrink-0" title="删除">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
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
        <div className={`rounded-2xl shadow-sm p-5 transition-colors duration-300 ${cardBg}`}>
          <h3 className="font-medium mb-4 flex items-center gap-2">ℹ️ 关于</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1"><span className="text-gray-500">版本</span><span className="font-mono">v1.4.0</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-500">开发者</span><span>RP Chat Team</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-500">GitHub</span><a href="https://github.com/Zhoyi011/RP-CHATv1.0" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@Zhoyi011</a></div>
          </div>
        </div>

        {/* 保存按钮 */}
        <button onClick={handleSave} disabled={saving} className={`w-full py-3 rounded-xl font-medium transition-all duration-200 shadow-md active:scale-[0.98] ${saved ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'} disabled:opacity-50`}>
          {saving ? '保存中...' : saved ? '✅ 已保存' : '保存设置'}
        </button>
        <div className="pb-8" />
      </div>
    </div>
  );
};

export default Settings;