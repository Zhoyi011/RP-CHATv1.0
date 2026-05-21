import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type UserSettings, adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

// 星座列表
const zodiacSigns = [
  { name: '白羊座', dates: '3.21-4.19', icon: '♈' },
  { name: '金牛座', dates: '4.20-5.20', icon: '♉' },
  { name: '双子座', dates: '5.21-6.21', icon: '♊' },
  { name: '巨蟹座', dates: '6.22-7.22', icon: '♋' },
  { name: '狮子座', dates: '7.23-8.22', icon: '♌' },
  { name: '处女座', dates: '8.23-9.22', icon: '♍' },
  { name: '天秤座', dates: '9.23-10.23', icon: '♎' },
  { name: '天蝎座', dates: '10.24-11.22', icon: '♏' },
  { name: '射手座', dates: '11.23-12.21', icon: '♐' },
  { name: '摩羯座', dates: '12.22-1.19', icon: '♑' },
  { name: '水瓶座', dates: '1.20-2.18', icon: '♒' },
  { name: '双鱼座', dates: '2.19-3.20', icon: '♓' },
];

interface InviteCode {
  _id: string;
  code: string;
  type: 'user' | 'admin';
  createdBy: { username: string; role: string };
  usedBy?: { username: string; email: string };
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isOwner } = usePermissions();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'admin'>('account');
  
  // 账号信息
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [zodiac, setZodiac] = useState('');
  const [editing, setEditing] = useState(false);
  
  // 偏好设置
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'auto',
    notifications: true,
    soundEnabled: true,
    defaultTranslate: 'off'
  });
  const [saving, setSaving] = useState(false);

  // 邀请码相关
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteType, setInviteType] = useState<'user' | 'admin'>('user');
  const [loadingInvites, setLoadingInvites] = useState(false);

  useEffect(() => {
    loadUserData();
    if (isAdmin || isOwner) {
      loadInviteCodes();
    }
  }, [isAdmin, isOwner]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userData, settingsData] = await Promise.all([
        authApi.getCurrentUser(),
        authApi.getSettings()
      ]);
      setUser(userData);
      setDisplayName(userData.displayName || '');
      setBirthday(userData.birthday || '');
      setZodiac(userData.zodiac || '');
      setSettings(settingsData);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadInviteCodes = async () => {
    try {
      setLoadingInvites(true);
      const codes = await adminApi.getInviteCodes();
      setInviteCodes(codes);
    } catch (error) {
      console.error('加载邀请码失败:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  // 根据生日自动计算星座
  const calculateZodiac = (birthdayStr: string) => {
    if (!birthdayStr) return '';
    const date = new Date(birthdayStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '白羊座';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return '双子座';
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return '巨蟹座';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '狮子座';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '处女座';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return '天秤座';
    if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '天蝎座';
    if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '摩羯座';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '双鱼座';
    return '';
  };

  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBirthday = e.target.value;
    setBirthday(newBirthday);
    const newZodiac = calculateZodiac(newBirthday);
    setZodiac(newZodiac);
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api'}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName, birthday, zodiac })
      });
      
      if (response.ok) {
        toast.success('保存成功');
        setEditing(false);
        loadUserData();
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await authApi.updateSettings(settings);
      toast.success('设置已保存');
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      toast.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  // 创建邀请码
  const handleCreateInviteCode = async () => {
    setCreatingInvite(true);
    try {
      const result = await adminApi.generateInviteCode(undefined, inviteType);
      toast.success(`邀请码创建成功: ${result.code}`);
      loadInviteCodes();
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    } finally {
      setCreatingInvite(false);
    }
  };

  // 删除邀请码
  const handleDeleteInviteCode = async (codeId: string) => {
    if (!confirm('确定要删除这个邀请码吗？')) return;
    try {
      await adminApi.deleteInviteCode(codeId);
      toast.success('删除成功');
      loadInviteCodes();
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const getZodiacIcon = (zodiacName: string) => {
    const zodiac = zodiacSigns.find(z => z.name === zodiacName);
    return zodiac?.icon || '✨';
  };

  // 格式化时间
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white sticky top-0 z-10 shadow-md">
        <div className="px-4 py-3 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1 hover:bg-white/20 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">设置</h1>
        </div>
        
        {/* Tab 切换 */}
        <div className="flex px-4 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 text-sm font-medium transition rounded-t-lg whitespace-nowrap ${
              activeTab === 'account' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
            }`}
          >
            账号设置
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2 text-sm font-medium transition rounded-t-lg whitespace-nowrap ${
              activeTab === 'preferences' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
            }`}
          >
            偏好设置
          </button>
          {(isAdmin || isOwner) && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-sm font-medium transition rounded-t-lg whitespace-nowrap ${
                activeTab === 'admin' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
              }`}
            >
              👑 管理面板
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 账号设置 */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* 账号信息卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">账号信息</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-blue-500 hover:text-blue-600 transition"
                  >
                    编辑
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(false);
                        setDisplayName(user?.displayName || '');
                        setBirthday(user?.birthday || '');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-600 transition"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveAccount}
                      disabled={saving}
                      className="text-sm text-blue-500 hover:text-blue-600 transition disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">用户名</span>
                  <span className="text-gray-800 dark:text-gray-200">{user?.username}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">邮箱</span>
                  <span className="text-gray-800 dark:text-gray-200">{user?.email || '未绑定'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">昵称</span>
                  {editing ? (
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="输入昵称"
                    />
                  ) : (
                    <span className="text-gray-800 dark:text-gray-200">{displayName || '未设置'}</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">生日</span>
                  {editing ? (
                    <input
                      type="date"
                      value={birthday}
                      onChange={handleBirthdayChange}
                      className="px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  ) : (
                    <span className="text-gray-800 dark:text-gray-200">{birthday || '未设置'}</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 dark:text-gray-400">星座</span>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 dark:text-gray-200">
                        {zodiac ? `${getZodiacIcon(zodiac)} ${zodiac}` : '选择生日后自动显示'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-800 dark:text-gray-200">
                      {zodiac ? `${getZodiacIcon(zodiac)} ${zodiac}` : '未设置'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 资产卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">资产</h2>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">钻石</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{user?.diamonds || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🪙</span>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">金币</p>
                    <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{user?.coins || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 角色权限 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">账户信息</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">角色权限</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    user?.role === 'owner' ? 'bg-red-100 text-red-600' :
                    user?.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {user?.role === 'owner' ? '👑 超级管理员' : user?.role === 'admin' ? '🛡️ 管理员' : '👤 普通用户'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 dark:text-gray-400">注册时间</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                  </span>
                </div>
              </div>
            </div>

            {/* 退出登录 */}
            <button
              onClick={async () => {
                if (confirm('确定要退出登录吗？')) {
                  localStorage.removeItem('token');
                  await auth.signOut();
                  navigate('/');
                }
              }}
              className="w-full bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition shadow-md"
            >
              退出登录
            </button>
          </div>
        )}

        {/* 偏好设置 */}
        {activeTab === 'preferences' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">偏好设置</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">深色模式</span>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'auto' })}
                  className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="auto">跟随系统</option>
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">消息通知</span>
                <button
                  onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                  className={`w-10 h-5 rounded-full transition ${settings.notifications ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.notifications ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">音效</span>
                <button
                  onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className={`w-10 h-5 rounded-full transition ${settings.soundEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">默认翻译</span>
                <select
                  value={settings.defaultTranslate}
                  onChange={(e) => setSettings({ ...settings, defaultTranslate: e.target.value as 'off' | 'simplified' | 'traditional' })}
                  className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="off">不翻译</option>
                  <option value="simplified">转为简体</option>
                  <option value="traditional">转为繁体</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="mt-4 w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-2 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50 shadow-md"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        )}

        {/* 管理面板（仅管理员可见） */}
        {(isAdmin || isOwner) && activeTab === 'admin' && (
          <div className="space-y-6">
            {/* 创建邀请码 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">创建邀请码</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    邀请码类型
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setInviteType('user')}
                      className={`flex-1 px-4 py-2 rounded-xl font-medium transition ${
                        inviteType === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      👤 普通用户
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => setInviteType('admin')}
                        className={`flex-1 px-4 py-2 rounded-xl font-medium transition ${
                          inviteType === 'admin'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        👑 管理员
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleCreateInviteCode}
                  disabled={creatingInvite}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 shadow-md"
                >
                  {creatingInvite ? '创建中...' : '生成邀请码'}
                </button>
              </div>
            </div>

            {/* 邀请码列表 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">邀请码列表</h2>
                <button
                  onClick={loadInviteCodes}
                  className="text-sm text-blue-500 hover:text-blue-600 transition"
                >
                  刷新
                </button>
              </div>
              
              {loadingInvites ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : inviteCodes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">暂无邀请码</div>
              ) : (
                <div className="space-y-3">
                  {inviteCodes.map((code) => (
                    <div
                      key={code._id}
                      className={`p-4 rounded-xl border ${
                        code.usedBy
                          ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-mono font-bold ${
                            code.type === 'admin' ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {code.code}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            code.type === 'admin'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {code.type === 'admin' ? '管理员' : '普通用户'}
                          </span>
                          {code.usedBy && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                              已使用
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            创建于 {formatDate(code.createdAt)}
                          </span>
                          {!code.usedBy && (
                            <button
                              onClick={() => handleDeleteInviteCode(code._id)}
                              className="text-xs text-red-400 hover:text-red-600 transition"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <span>创建者: {code.createdBy?.username}</span>
                        {code.usedBy && (
                          <span className="ml-4">使用者: {code.usedBy.username}</span>
                        )}
                        {code.expiresAt && new Date(code.expiresAt) < new Date() && !code.usedBy && (
                          <span className="ml-4 text-red-500">已过期</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 权限说明 */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>👑 权限说明：</strong><br />
                • 超级管理员 (owner)：可以创建管理员和普通用户邀请码<br />
                • 管理员 (admin)：只能创建普通用户邀请码，每天1个<br />
                • 已使用的邀请码不可删除，但会显示使用状态
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;