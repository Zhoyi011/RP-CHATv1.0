import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type UserSettings } from '../../services/api';
import toast from 'react-hot-toast';

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

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'preferences'>('account');
  
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

  useEffect(() => {
    loadUserData();
  }, []);

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

  const getZodiacIcon = (zodiacName: string) => {
    const zodiac = zodiacSigns.find(z => z.name === zodiacName);
    return zodiac?.icon || '✨';
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
        <div className="flex px-4 gap-2">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 text-sm font-medium transition rounded-t-lg ${
              activeTab === 'account' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
            }`}
          >
            账号设置
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2 text-sm font-medium transition rounded-t-lg ${
              activeTab === 'preferences' ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
            }`}
          >
            偏好设置
          </button>
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
                    {user?.role === 'owner' ? '超级管理员' : user?.role === 'admin' ? '管理员' : '普通用户'}
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
      </div>
    </div>
  );
};

export default Settings;