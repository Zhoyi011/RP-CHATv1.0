// client/src/components/admin/MaintenanceControl.tsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

interface MaintenanceControlProps {
  isSuperAdmin: boolean;
}

const MaintenanceControl: React.FC<MaintenanceControlProps> = ({ isSuperAdmin }) => {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndTime, setMaintenanceEndTime] = useState('');
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // 加载维护模式状态
  const loadMaintenanceStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/maintenance/status`);
      const data = await res.json();
      setMaintenanceEnabled(data.maintenanceMode);
      setMaintenanceMessage(data.message || '服务器正在维护中，请稍后再试。');
      if (data.endTime) {
        const date = new Date(data.endTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setMaintenanceEndTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
    } catch (error) {
      console.error('加载维护状态失败:', error);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadMaintenanceStatus();
    }
  }, [isSuperAdmin]);

  // 切换维护模式
  const toggleMaintenance = async () => {
    setTogglingMaintenance(true);
    try {
      const token = localStorage.getItem('token');
      let formattedEndTime = null;
      if (maintenanceEndTime) {
        formattedEndTime = new Date(maintenanceEndTime).toISOString();
      }
      
      const res = await fetch(`${API_BASE}/admin/maintenance/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: !maintenanceEnabled,
          message: maintenanceMessage,
          endTime: formattedEndTime
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMaintenanceEnabled(!maintenanceEnabled);
        toast.success(data.message);
        // 触发全局事件，让其他组件立即更新
        window.dispatchEvent(new CustomEvent('maintenanceToggled'));
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  // 保存维护模式设置
  const saveMaintenanceSettings = async () => {
    setTogglingMaintenance(true);
    try {
      const token = localStorage.getItem('token');
      let formattedEndTime = null;
      if (maintenanceEndTime) {
        formattedEndTime = new Date(maintenanceEndTime).toISOString();
      }
      
      const res = await fetch(`${API_BASE}/admin/maintenance/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: maintenanceMessage,
          endTime: formattedEndTime
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('设置已保存');
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <span className="text-2xl">🔧</span> 维护模式
        {maintenanceEnabled && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            已开启
          </span>
        )}
      </h2>
      
      <div className="space-y-4">
        {/* 开关 */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-700 dark:text-gray-300">维护模式开关</span>
            <p className="text-xs text-gray-400">开启后普通用户无法访问，仅超级管理员可登录</p>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={togglingMaintenance}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${maintenanceEnabled ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-200 ${maintenanceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        
        {/* 提示消息 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">提示消息</label>
          <textarea
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
            rows={2}
            placeholder="请输入维护提示信息"
            disabled={togglingMaintenance}
          />
        </div>
        
        {/* 预计恢复时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            预计恢复时间 <span className="text-xs text-gray-400">（可选）</span>
          </label>
          <input
            type="datetime-local"
            value={maintenanceEndTime}
            onChange={(e) => setMaintenanceEndTime(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
            disabled={togglingMaintenance}
          />
          <p className="text-xs text-gray-400 mt-1">
            设置后用户将看到倒计时
          </p>
        </div>
        
        {/* 按钮 */}
        <div className="flex gap-3">
          {maintenanceEnabled && (
            <button
              onClick={saveMaintenanceSettings}
              disabled={togglingMaintenance}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50"
            >
              {togglingMaintenance ? '保存中...' : '保存设置'}
            </button>
          )}
          <button
            onClick={toggleMaintenance}
            disabled={togglingMaintenance}
            className={`flex-1 py-2 rounded-xl font-medium transition disabled:opacity-50 ${maintenanceEnabled ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'}`}
          >
            {togglingMaintenance ? '处理中...' : (maintenanceEnabled ? '关闭维护模式' : '开启维护模式')}
          </button>
        </div>
        
        {/* 预览提示 */}
        {maintenanceEnabled && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>💡</span>
              维护模式已开启，普通用户访问时会看到维护页面。
              如有设置恢复时间，用户将看到倒计时。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceControl;