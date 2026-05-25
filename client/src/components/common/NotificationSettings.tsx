// client/src/components/common/NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/Notification';
import toast from 'react-hot-toast';

const NotificationSettings: React.FC = () => {
  const [config, setConfig] = useState(notificationService.getConfig());

  const updateConfig = (key: keyof typeof config, value: boolean | number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    notificationService.saveConfig(newConfig);
    toast.success('通知设置已保存');
  };

  const testNotification = () => {
    notificationService.testSound();
    notificationService.testVibration();
    toast.success('测试完成，请检查声音和振动');
  };

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      toast.success('通知权限已开启');
    } else {
      toast.error('通知权限被拒绝');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-gray-700 dark:text-gray-300">桌面通知</span>
          <p className="text-xs text-gray-400">有新消息时显示系统通知</p>
        </div>
        <button
          onClick={() => updateConfig('desktopEnabled', !config.desktopEnabled)}
          className={`w-12 h-6 rounded-full transition ${config.desktopEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.desktopEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <span className="text-gray-700 dark:text-gray-300">提示音</span>
          <p className="text-xs text-gray-400">新消息时播放声音</p>
        </div>
        <button
          onClick={() => updateConfig('soundEnabled', !config.soundEnabled)}
          className={`w-12 h-6 rounded-full transition ${config.soundEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <span className="text-gray-700 dark:text-gray-300">标题闪烁</span>
          <p className="text-xs text-gray-400">页面后台时闪烁标题</p>
        </div>
        <button
          onClick={() => updateConfig('flashTitleEnabled', !config.flashTitleEnabled)}
          className={`w-12 h-6 rounded-full transition ${config.flashTitleEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.flashTitleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <span className="text-gray-700 dark:text-gray-300">振动</span>
          <p className="text-xs text-gray-400">手机端新消息振动</p>
        </div>
        <button
          onClick={() => updateConfig('vibrationEnabled', !config.vibrationEnabled)}
          className={`w-12 h-6 rounded-full transition ${config.vibrationEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${config.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="pt-3 flex gap-3">
        <button
          onClick={testNotification}
          className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
        >
          测试通知
        </button>
        <button
          onClick={requestPermission}
          className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          开启通知权限
        </button>
      </div>

      <div className="text-xs text-gray-400 text-center pt-2">
        {Notification.permission === 'granted' ? '✅ 通知权限已开启' : '⚠️ 通知权限未开启'}
      </div>
    </div>
  );
};

export default NotificationSettings;