import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type UserSettings } from '../../services/api';
import AvatarUpload from '../common/AvatarUpload';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
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
      setDisplayName(userData.displayName || userData.username);
      setSettings(settingsData);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('昵称不能为空');
      return;
    }

    setSaving(true);
    try {
      // 更新用户资料
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api'}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ displayName: displayName.trim() })
      });

      if (response.ok) {
        toast.success('保存成功');
        setIsEditing(false);
        loadUserData();
      } else {
        const data = await response.json();
        toast.error(data.error || '保存失败');
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
          <h1 className="text-xl font-bold flex-1">个人资料</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 头像卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <div className="flex flex-col items-center">
            <div 
              className="relative group cursor-pointer"
              onClick={() => setShowAvatarUpload(true)}
            >
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName || user.username}&background=3b82f6&color=fff&size=112`}
                  alt="头像"
                  className="w-full h-full object-cover group-hover:opacity-80 transition"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">点击更换头像</p>
          </div>
        </div>

        {/* 基本信息卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">基本信息</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-500 hover:text-blue-600 transition"
              >
                编辑
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(user.displayName || user.username);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-600 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="text-sm text-blue-500 hover:text-blue-600 transition disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">用户名</span>
              <span className="text-gray-800 dark:text-gray-200">{user.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">昵称</span>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <span className="text-gray-800 dark:text-gray-200">{user.displayName || user.username}</span>
              )}
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

        {/* 统计数据卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">统计数据</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{user.stats?.totalMessages || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">发送消息</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{user.stats?.totalRooms || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">加入群聊</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{user.stats?.totalPersonas || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">拥有角色</p>
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
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{user.diamonds || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪙</span>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">金币</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{user.coins || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 设置卡片 */}
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

      {/* 头像上传弹窗 */}
      <AnimatePresence>
        {showAvatarUpload && (
          <AvatarUpload
            currentAvatar={user.avatar}
            onUpload={(url) => {
              setUser(prev => prev ? { ...prev, avatar: url } : prev);
              toast.success('头像已更新');
            }}
            onClose={() => setShowAvatarUpload(false)}
            title="更换头像"
            type="user"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;