import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '../../hooks/useResponsive';

const Settings = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState('light');

  const handleSave = () => {
    localStorage.setItem('notifications', String(notifications));
    localStorage.setItem('soundEnabled', String(soundEnabled));
    localStorage.setItem('theme', theme);
    alert('设置已保存');
  };

  useEffect(() => {
    // 加载保存的设置
    const savedNotifications = localStorage.getItem('notifications');
    const savedSound = localStorage.getItem('soundEnabled');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedNotifications !== null) setNotifications(savedNotifications === 'true');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    if (savedTheme) setTheme(savedTheme);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            设置
          </h1>
        </div>
      </div>

      <div className={`${isMobile ? 'p-3' : 'p-4'} max-w-2xl mx-auto space-y-4`}>
        {/* 通知设置 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-medium text-gray-800 mb-4">通知设置</h3>
          
          <label className="flex items-center justify-between cursor-pointer py-2">
            <div>
              <span className="text-gray-700">新消息通知</span>
              <p className="text-xs text-gray-400 mt-0.5">收到新消息时推送通知</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                notifications ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
          
          <label className="flex items-center justify-between cursor-pointer py-2 mt-2">
            <div>
              <span className="text-gray-700">声音提示</span>
              <p className="text-xs text-gray-400 mt-0.5">新消息时播放提示音</p>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                soundEnabled ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-200 ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        {/* 外观设置 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-medium text-gray-800 mb-4">外观设置</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={(e) => setTheme(e.target.value)}
                className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-gray-700">浅色模式</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={(e) => setTheme(e.target.value)}
                className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-gray-700">深色模式</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="auto"
                checked={theme === 'auto'}
                onChange={(e) => setTheme(e.target.value)}
                className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-gray-700">跟随系统</span>
            </label>
          </div>
        </div>

        {/* 关于 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-medium text-gray-800 mb-4">关于</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-500">版本</span>
              <span className="text-gray-700 font-mono">v1.0.0</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">开发者</span>
              <span className="text-gray-700">RP Chat Team</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">GitHub</span>
              <a 
                href="https://github.com/Zhoyi011/RP-CHATv1.0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline"
              >
                @Zhoyi011
              </a>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition shadow-md"
        >
          保存设置
        </button>
      </div>
    </div>
  );
};

export default Settings;