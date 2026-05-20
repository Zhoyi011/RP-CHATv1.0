import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User, type UserSettings } from '../../services/api';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
      setSettings(settingsData);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await authApi.updateSettings(settings);
      toast.success('设置已保存');
      // 应用主题
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (error) {
      toast.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '未知';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-500">用户不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white sticky top-0 z-10 shadow-md">
        <div className="px-4 py-3 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-1 hover:bg-white/20 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1">账号设置</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 提示卡片 */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">角色形象在这里设置</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                头像、简介等信息请在角色主页中编辑
              </p>
            </div>
          </div>
        </div>

        {/* 账号信息卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">账号信息</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">用户名</span>
              <span className="text-gray-800 dark:text-gray-200">{user.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">邮箱</span>
              <span className="text-gray-800 dark:text-gray-200">{user.email || '未绑定'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">角色权限</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                user.role === 'owner' ? 'bg-red-100 text-red-600' :
                user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {user.role === 'owner' ? '超级管理员' : user.role === 'admin' ? '管理员' : '普通用户'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-gray-400">注册时间</span>
              <span className="text-gray-800 dark:text-gray-200">{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 偏好设置卡片 */}
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

        {/* 退出登录按钮 */}
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

        <div className="h-4" />
      </div>
    </div>
  );
};

export default Profile;