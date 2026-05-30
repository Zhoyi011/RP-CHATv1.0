// client/src/components/settings/Settings.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type UserSettings, adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../../contexts/ThemeContext';
import { useAFK } from '../../contexts/AFKContext';
import NotificationSettings from '../common/NotificationSettings';
import CreateRedeemCode from '../admin/CreateRedeemCode';
import MaintenanceScheduler from '../admin/MaintenanceScheduler';
import GlassDatePicker from '../common/GlassDatePicker';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// 星座列表
const zodiacSigns = [
  { name: '白羊座', dates: '3.21-4.19', icon: '♈', color: 'from-red-400 to-orange-500' },
  { name: '金牛座', dates: '4.20-5.20', icon: '♉', color: 'from-amber-500 to-yellow-600' },
  { name: '双子座', dates: '5.21-6.21', icon: '♊', color: 'from-green-400 to-teal-500' },
  { name: '巨蟹座', dates: '6.22-7.22', icon: '♋', color: 'from-slate-400 to-gray-500' },
  { name: '狮子座', dates: '7.23-8.22', icon: '♌', color: 'from-orange-400 to-red-500' },
  { name: '处女座', dates: '8.23-9.22', icon: '♍', color: 'from-emerald-400 to-green-500' },
  { name: '天秤座', dates: '9.23-10.23', icon: '♎', color: 'from-pink-400 to-rose-500' },
  { name: '天蝎座', dates: '10.24-11.22', icon: '♏', color: 'from-purple-600 to-indigo-700' },
  { name: '射手座', dates: '11.23-12.21', icon: '♐', color: 'from-indigo-400 to-purple-500' },
  { name: '摩羯座', dates: '12.22-1.19', icon: '♑', color: 'from-gray-600 to-slate-700' },
  { name: '水瓶座', dates: '1.20-2.18', icon: '♒', color: 'from-cyan-400 to-blue-500' },
  { name: '双鱼座', dates: '2.19-3.20', icon: '♓', color: 'from-blue-300 to-purple-400' },
];

interface InviteCode {
  _id: string;
  code: string;
  type: 'user' | 'admin' | 'super_admin';
  createdBy: { username: string; role: string };
  usedBy?: { username: string; email: string };
  usedAt?: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  maxUses: number;
  usesCount: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}

// 动画变体
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { duration: 0.4, type: 'spring' as const, stiffness: 100 } 
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isOwner } = usePermissions();
  const { theme: currentTheme, setTheme: setCurrentTheme, toggleTheme } = useTheme();
  const { 
    setCustomTimeout, 
    isAFK, 
    afkDuration, 
    setAFKPassword, 
    afkPassword, 
    afkPasswordEnabled, 
    setAFKPasswordEnabled 
  } = useAFK();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'admin'>('account');
  const [activeSection, setActiveSection] = useState<string>('maintenance');
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [zodiac, setZodiac] = useState('');
  const [editing, setEditing] = useState(false);
  
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    notifications: true,
    soundEnabled: true,
    defaultTranslate: 'off'
  });
  const [saving, setSaving] = useState(false);

  // AFK 设置
  const [afkTimeout, setAfkTimeout] = useState(5);
  const [localAfkPassword, setLocalAfkPassword] = useState('');
  const [localAfkPasswordEnabled, setLocalAfkPasswordEnabled] = useState(false);

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteType, setInviteType] = useState<'user' | 'admin' | 'super_admin'>('user');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [customCode, setCustomCode] = useState('');
  const [loadingInvites, setLoadingInvites] = useState(false);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndTime, setMaintenanceEndTime] = useState<Date | null>(null);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  
  const [exemptAdmin, setExemptAdmin] = useState(false);
  const [togglingExempt, setTogglingExempt] = useState(false);

  const canCreateAdmin = user?.role === 'owner' || user?.role === 'super_admin';
  const canCreateSuperAdmin = user?.role === 'owner';
  const isSuperAdmin = user?.role === 'owner' || user?.role === 'super_admin';

  const adminNavItems: NavItem[] = [
    { id: 'maintenance', label: '维护模式', icon: '🔧', color: 'from-blue-500 to-cyan-500' },
    { id: 'schedule', label: '定时维护', icon: '📅', color: 'from-purple-500 to-pink-500' },
    { id: 'redeem', label: '充值码管理', icon: '💎', color: 'from-amber-500 to-orange-500' },
    { id: 'invite', label: '创建邀请码', icon: '📨', color: 'from-emerald-500 to-teal-500' },
    { id: 'inviteList', label: '邀请码列表', icon: '📋', color: 'from-indigo-500 to-purple-500' },
  ];

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`admin-section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const loadExemptSetting = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/maintenance/exempt-admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setExemptAdmin(data.exemptAdmin);
    } catch (error) {
      console.error('加载豁免设置失败:', error);
    }
  };

  const toggleExemptAdmin = async () => {
    setTogglingExempt(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/maintenance/exempt-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ exemptAdmin: !exemptAdmin })
      });
      const data = await res.json();
      if (data.success) {
        setExemptAdmin(!exemptAdmin);
        toast.success(exemptAdmin ? '管理员将受维护模式影响' : '管理员将不受维护模式影响');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setTogglingExempt(false);
    }
  };

  useEffect(() => {
    loadUserData();
    if (isAdmin || isOwner) {
      loadInviteCodes();
    }
    if (isSuperAdmin) {
      loadMaintenanceStatus();
      loadExemptSetting();
    }
  }, [isAdmin, isOwner, isSuperAdmin]);

  // 加载 AFK 设置
  useEffect(() => {
    const savedAFKTimeout = localStorage.getItem('afkTimeout');
    if (savedAFKTimeout) {
      const timeout = parseInt(savedAFKTimeout, 10);
      setAfkTimeout(timeout);
      setCustomTimeout(timeout * 60);
    }
    setLocalAfkPassword(afkPassword);
    setLocalAfkPasswordEnabled(afkPasswordEnabled);
  }, [setCustomTimeout, afkPassword, afkPasswordEnabled]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userData, settingsData] = await Promise.all([
        authApi.getCurrentUser(),
        authApi.getSettings()
      ]);
      setUser(userData);
      setDisplayName(userData.displayName || '');
      if (userData.birthday) {
        setBirthday(new Date(userData.birthday));
      }
      setZodiac(userData.zodiac || '');
      
      let defaultTranslate: 'off' | 'simplified' | 'traditional' = 'off';
      if (userData.defaultTranslate === 'simplified') {
        defaultTranslate = 'simplified';
      } else if (userData.defaultTranslate === 'traditional') {
        defaultTranslate = 'traditional';
      }
      
      setSettings({
        theme: userData.theme === 'dark' ? 'dark' : 'light',
        notifications: userData.notifications !== false,
        soundEnabled: userData.soundEnabled !== false,
        defaultTranslate
      });
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

  const loadMaintenanceStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/maintenance/status`);
      const data = await res.json();
      setMaintenanceEnabled(data.maintenanceMode);
      setMaintenanceMessage(data.message || '服务器正在维护中，请稍后再试。');
      if (data.endTime) {
        setMaintenanceEndTime(new Date(data.endTime));
      }
    } catch (error) {
      console.error('加载维护状态失败:', error);
    }
  };

  const toggleMaintenance = async () => {
    setTogglingMaintenance(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/maintenance/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: !maintenanceEnabled,
          message: maintenanceMessage,
          endTime: maintenanceEndTime ? maintenanceEndTime.toISOString() : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMaintenanceEnabled(!maintenanceEnabled);
        toast.success(data.message);
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

  const saveMaintenanceSettings = async () => {
    setTogglingMaintenance(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/maintenance/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: maintenanceMessage,
          endTime: maintenanceEndTime ? maintenanceEndTime.toISOString() : null
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

  const calculateZodiacFromDate = (date: Date | null) => {
    if (!date) return '';
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

  const handleBirthdayChange = (date: Date | null) => {
    setBirthday(date);
    const newZodiac = calculateZodiacFromDate(date);
    setZodiac(newZodiac);
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          displayName, 
          birthday: birthday ? birthday.toISOString().split('T')[0] : null, 
          zodiac 
        })
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
      await authApi.updateSettings({
        theme: settings.theme,
        notifications: settings.notifications,
        soundEnabled: settings.soundEnabled,
        defaultTranslate: settings.defaultTranslate
      });
      toast.success('设置已保存');
    } catch (error) {
      toast.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeToggle = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    setSettings({ ...settings, theme: newTheme });
  };

  const handleAFKTimeoutChange = (minutes: number) => {
    setAfkTimeout(minutes);
    setCustomTimeout(minutes * 60);
    localStorage.setItem('afkTimeout', minutes.toString());
    toast.success(`AFK 超时已设为 ${minutes} 分钟`);
  };

  const handleAFKPasswordChange = (password: string) => {
    setLocalAfkPassword(password);
    setAFKPassword(password);
    toast.success('AFK 解锁密码已保存');
  };

  const handleAFKPasswordEnabledChange = () => {
    const newValue = !localAfkPasswordEnabled;
    setLocalAfkPasswordEnabled(newValue);
    setAFKPasswordEnabled(newValue);
    toast.success(newValue ? 'AFK 密码保护已开启' : 'AFK 密码保护已关闭');
  };

  const handleCreateInviteCode = async () => {
    setCreatingInvite(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/admin/create-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: inviteType,
          maxUses,
          expiresInDays,
          customCode: customCode || undefined
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(`邀请码创建成功: ${data.code}`);
        setCustomCode('');
        loadInviteCodes();
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteInviteCode = async (codeId: string) => {
    if (!confirm('确定要删除这个邀请码吗？')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/admin/invite-codes/${codeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        toast.success('删除成功');
        loadInviteCodes();
      } else {
        const data = await response.json();
        toast.error(data.error || '删除失败');
      }
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  const getZodiacIcon = (zodiacName: string) => {
    const zodiac = zodiacSigns.find(z => z.name === zodiacName);
    return zodiac?.icon || '✨';
  };

  const getZodiacColor = (zodiacName: string) => {
    const zodiac = zodiacSigns.find(z => z.name === zodiacName);
    return zodiac?.color || 'from-gray-400 to-gray-500';
  };

  const getInviteTypeDisplay = (type: string) => {
    switch (type) {
      case 'super_admin': return { text: '超级管理员', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '👑' };
      case 'admin': return { text: '管理员', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', icon: '⚙️' };
      default: return { text: '普通用户', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', icon: '👤' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 dark:text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
    >
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

      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* 账号设置 */}
          {activeTab === 'account' && (
            <motion.div
              key="account"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="space-y-6"
            >
              {/* 账号信息卡片 */}
              <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">账号信息</h2>
                  {!editing ? (
                    <button onClick={() => setEditing(true)} className="text-sm text-blue-500 hover:text-blue-600 transition">
                      编辑
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(false);
                          setDisplayName(user?.displayName || '');
                          setBirthday(user?.birthday ? new Date(user.birthday) : null);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-600 transition"
                      >
                        取消
                      </button>
                      <button onClick={handleSaveAccount} disabled={saving} className="text-sm text-blue-500 hover:text-blue-600 transition disabled:opacity-50">
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
                      <GlassDatePicker
                        selected={birthday}
                        onChange={handleBirthdayChange}
                        placeholderText="选择生日"
                        className="px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <span className="text-gray-800 dark:text-gray-200">
                        {birthday ? birthday.toLocaleDateString('zh-CN') : '未设置'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500 dark:text-gray-400">星座</span>
                    {zodiac ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getZodiacColor(zodiac)} flex items-center justify-center text-white text-sm shadow-md`}>
                          {getZodiacIcon(zodiac)}
                        </div>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{zodiac}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">未设置</span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* 资产卡片 */}
              <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">资产</h2>
                <div className="flex gap-6">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <span className="text-3xl">💎</span>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">钻石</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{user?.diamonds || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
                    <span className="text-3xl">🪙</span>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">金币</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{user?.coins || 0}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 账户信息卡片 */}
              <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">账户信息</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">角色权限</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user?.role === 'owner' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                      user?.role === 'super_admin' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                      user?.role === 'admin' ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {user?.role === 'owner' && '👑 超级管理员'}
                      {user?.role === 'super_admin' && '👑 超级管理员'}
                      {user?.role === 'admin' && '⚙️ 管理员'}
                      {user?.role === 'user' && '👤 普通用户'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500 dark:text-gray-400">注册时间</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* 退出登录按钮 */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (confirm('确定要退出登录吗？')) {
                    localStorage.removeItem('token');
                    await auth.signOut();
                    navigate('/');
                  }
                }}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-xl font-medium hover:from-red-600 hover:to-rose-700 transition shadow-md"
              >
                退出登录
              </motion.button>
            </motion.div>
          )}

          {/* 偏好设置 */}
          {activeTab === 'preferences' && (
            <motion.div
              key="preferences"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="space-y-6"
            >
              <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">偏好设置</h2>
                <div className="space-y-4">
                  {/* 深色模式 */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">🌙 深色模式</span>
                    <button onClick={handleThemeToggle} className={`w-12 h-6 rounded-full transition-all duration-200 ${currentTheme === 'dark' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${currentTheme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  {/* 消息通知 */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">🔔 消息通知</span>
                    <button onClick={() => setSettings({ ...settings, notifications: !settings.notifications })} className={`w-12 h-6 rounded-full transition-all duration-200 ${settings.notifications ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${settings.notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  {/* 音效 */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">🎵 音效</span>
                    <button onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })} className={`w-12 h-6 rounded-full transition-all duration-200 ${settings.soundEnabled ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  {/* 简繁转换默认 */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">🌐 默认翻译</span>
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

                  {/* 翻译目标语言 */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">🌍 消息翻译</span>
                      <p className="text-xs text-gray-400">将外文消息翻译成此语言</p>
                    </div>
                    <select
                      value={localStorage.getItem('translateTargetLang') || 'zh'}
                      onChange={(e) => {
                        const lang = e.target.value;
                        localStorage.setItem('translateTargetLang', lang);
                        const langNames: Record<string, string> = {
                          'zh': '简体中文',
                          'zh-TW': '繁體中文',
                          'en': 'English',
                          'ja': '日本語',
                          'ko': '한국어',
                          'fr': 'Français',
                          'de': 'Deutsch',
                          'es': 'Español'
                        };
                        toast.success(`翻译语言已切换为 ${langNames[lang] || lang}`);
                      }}
                      className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="zh">简体中文</option>
                      <option value="zh-TW">繁體中文</option>
                      <option value="en">English</option>
                      <option value="ja">日本語</option>
                      <option value="ko">한국어</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="es">Español</option>
                    </select>
                  </div>

                  {/* AFK 超时设置 */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">😴 离开状态 (AFK)</span>
                      <p className="text-xs text-gray-400">无操作后自动进入挂机模式</p>
                    </div>
                    <select
                      value={afkTimeout}
                      onChange={(e) => handleAFKTimeoutChange(Number(e.target.value))}
                      className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value={1}>1 分钟</option>
                      <option value={3}>3 分钟</option>
                      <option value={5}>5 分钟</option>
                      <option value={10}>10 分钟</option>
                      <option value={15}>15 分钟</option>
                      <option value={30}>30 分钟</option>
                      <option value={60}>60 分钟</option>
                    </select>
                  </div>

                  {/* 🔐 AFK 密码保护开关 */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">🔐 AFK 密码保护</span>
                      <p className="text-xs text-gray-400">开启后需要输入密码才能退出挂机模式</p>
                    </div>
                    <button
                      onClick={handleAFKPasswordEnabledChange}
                      className={`w-12 h-6 rounded-full transition-all duration-200 ${localAfkPasswordEnabled ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${localAfkPasswordEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* 🔑 AFK 解锁密码（仅在开启密码保护时显示） */}
                  {localAfkPasswordEnabled && (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 dark:text-gray-300">🔑 解锁密码</span>
                        <p className="text-xs text-gray-400">设置解锁密码，默认 1234</p>
                      </div>
                      <input
                        type="password"
                        value={localAfkPassword}
                        onChange={(e) => handleAFKPasswordChange(e.target.value)}
                        placeholder="默认: 1234"
                        className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white w-32"
                      />
                    </div>
                  )}

                  {/* 当前 AFK 状态显示 */}
                  {isAFK && (
                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                        <span>🔴</span>
                        当前处于挂机模式 (已持续 {Math.floor(afkDuration / 60)} 分钟 {afkDuration % 60} 秒)
                      </p>
                    </div>
                  )}
                </div>
                
                <button onClick={handleSaveSettings} disabled={saving} className="mt-4 w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-2 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50 shadow-md">
                  {saving ? '保存中...' : '保存设置'}
                </button>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">🔔 通知设置</h2>
                <NotificationSettings />
              </motion.div>
            </motion.div>
          )}

          {/* 管理面板 */}
          {(isAdmin || isOwner) && activeTab === 'admin' && (
            <motion.div
              key="admin"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              className="flex flex-col lg:flex-row gap-6"
            >
              {/* 左侧目录导航 */}
              <div className="hidden lg:block w-64 flex-shrink-0 sticky top-24 h-fit">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4 px-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-lg">📋</span>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">快速导航</h3>
                  </div>
                  <div className="space-y-1.5">
                    {adminNavItems.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                          activeSection === item.id
                            ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                        {activeSection === item.id && <span className="ml-auto text-xs opacity-70">●</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 右侧内容区 */}
              <div ref={contentRef} className="flex-1 space-y-6">
                {/* 维护模式控制 */}
                {isSuperAdmin && (
                  <div id="admin-section-maintenance" className="scroll-mt-20">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔧</span>
                          <h2 className="text-lg font-semibold text-white">维护模式</h2>
                          {maintenanceEnabled && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full animate-pulse">已开启</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">维护模式开关</span>
                            <p className="text-xs text-gray-400 mt-0.5">开启后普通用户无法访问，仅超级管理员可登录</p>
                          </div>
                          <button
                            onClick={toggleMaintenance}
                            disabled={togglingMaintenance}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${maintenanceEnabled ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-200 ${maintenanceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>

                        {/* 管理员豁免开关 */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">👑 管理员豁免</span>
                            <p className="text-xs text-gray-400">开启后，管理员也不受维护模式影响</p>
                          </div>
                          <button
                            onClick={toggleExemptAdmin}
                            disabled={togglingExempt}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${exemptAdmin ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-200 ${exemptAdmin ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📝 提示消息</label>
                          <textarea
                            value={maintenanceMessage}
                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                            rows={2}
                            placeholder="请输入维护提示信息"
                            disabled={togglingMaintenance}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">⏰ 预计恢复时间 <span className="text-xs text-gray-400">（可选，24小时制）</span></label>
                          <GlassDatePicker
                            selected={maintenanceEndTime}
                            onChange={setMaintenanceEndTime}
                            showTimeSelect
                            placeholderText="选择结束时间"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                            disabled={togglingMaintenance}
                          />
                          <p className="text-xs text-gray-400 mt-1">设置后用户将看到倒计时</p>
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                          {maintenanceEnabled && (
                            <button
                              onClick={saveMaintenanceSettings}
                              disabled={togglingMaintenance}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 shadow-md"
                            >
                              {togglingMaintenance ? '保存中...' : '💾 保存设置'}
                            </button>
                          )}
                          <button
                            onClick={toggleMaintenance}
                            disabled={togglingMaintenance}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition disabled:opacity-50 shadow-md ${
                              maintenanceEnabled 
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300' 
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
                            }`}
                          >
                            {togglingMaintenance ? '处理中...' : (maintenanceEnabled ? '🔒 关闭维护模式' : '🔓 开启维护模式')}
                          </button>
                        </div>
                        
                        {maintenanceEnabled && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                              <span>💡</span>维护模式已开启，普通用户访问时会看到维护页面。如有设置恢复时间，用户将看到倒计时。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 定时维护计划 */}
                {isSuperAdmin && (
                  <div id="admin-section-schedule" className="scroll-mt-20">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📅</span>
                          <h2 className="text-lg font-semibold text-white">定时维护计划</h2>
                        </div>
                        <p className="text-white/80 text-sm mt-1">设置定时维护，到时间自动开启，结束后自动关闭</p>
                      </div>
                      <div className="p-6">
                        <MaintenanceScheduler />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 充值码管理 */}
                {isSuperAdmin && (
                  <div id="admin-section-redeem" className="scroll-mt-20">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">💎</span>
                          <h2 className="text-lg font-semibold text-white">充值码管理</h2>
                        </div>
                        <p className="text-white/80 text-sm mt-1">创建用于外部销售的充值码，用户可在钱包页面兑换钻石</p>
                      </div>
                      <div className="p-6">
                        <CreateRedeemCode />
                      </div>
                    </div>
                  </div>
                )}

                {/* 创建邀请码 */}
                <div id="admin-section-invite" className="scroll-mt-20">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📨</span>
                        <h2 className="text-lg font-semibold text-white">创建邀请码</h2>
                      </div>
                      <p className="text-white/80 text-sm mt-1">生成新用户注册所需的邀请码</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邀请码类型</label>
                          <div className="flex gap-3 flex-wrap">
                            <button
                              onClick={() => setInviteType('user')}
                              className={`px-4 py-2 rounded-xl font-medium transition ${
                                inviteType === 'user'
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              👤 普通用户
                            </button>
                            {canCreateAdmin && (
                              <button
                                onClick={() => setInviteType('admin')}
                                className={`px-4 py-2 rounded-xl font-medium transition ${
                                  inviteType === 'admin'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                ⚙️ 管理员
                              </button>
                            )}
                            {canCreateSuperAdmin && (
                              <button
                                onClick={() => setInviteType('super_admin')}
                                className={`px-4 py-2 rounded-xl font-medium transition ${
                                  inviteType === 'super_admin'
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                👑 超级管理员
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🎫 自定义邀请码（可选）</label>
                          <input
                            type="text"
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                            placeholder="留空则自动生成，如: SA-MYCODE001"
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                            maxLength={30}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📊 最大使用次数: {maxUses}</label>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={maxUses}
                            onChange={(e) => setMaxUses(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">⏰ 有效期: {expiresInDays} 天</label>
                          <input
                            type="range"
                            min="1"
                            max="365"
                            value={expiresInDays}
                            onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-emerald-500"
                          />
                        </div>

                        <button
                          onClick={handleCreateInviteCode}
                          disabled={creatingInvite}
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 shadow-md"
                        >
                          {creatingInvite ? '✨ 创建中...' : '🎁 生成邀请码'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 邀请码列表 */}
                <div id="admin-section-inviteList" className="scroll-mt-20">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📋</span>
                          <h2 className="text-lg font-semibold text-white">邀请码列表</h2>
                        </div>
                        <button onClick={loadInviteCodes} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition text-white">🔄 刷新</button>
                      </div>
                      <p className="text-white/80 text-sm mt-1">管理已生成的邀请码</p>
                    </div>
                    <div className="p-6">
                      {loadingInvites ? (
                        <div className="text-center py-12 text-gray-400">
                          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                          <p className="mt-2">加载中...</p>
                        </div>
                      ) : inviteCodes.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <span className="text-5xl mb-3 block">📭</span>
                          <p>暂无邀请码</p>
                          <p className="text-xs mt-1">点击上方创建你的第一个邀请码</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {inviteCodes.map((code) => {
                            const typeInfo = getInviteTypeDisplay(code.type);
                            const isExpired = new Date(code.expiresAt) < new Date() && code.usesCount < code.maxUses;
                            const isFullyUsed = code.usesCount >= code.maxUses;
                            const isUsed = !!code.usedBy;
                            
                            return (
                              <div key={code._id} className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                                isUsed || isFullyUsed
                                  ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-70'
                                  : isExpired
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                              }`}>
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <code className={`text-sm font-mono font-bold px-2 py-1 rounded ${
                                      code.type === 'super_admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                      code.type === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>{code.code}</code>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>{typeInfo.icon} {typeInfo.text}</span>
                                    {isUsed && <span className="text-xs bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">✅ 已使用</span>}
                                    {!isUsed && isFullyUsed && <span className="text-xs bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">📊 已达上限</span>}
                                    {!isUsed && !isFullyUsed && isExpired && <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">⏰ 已过期</span>}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400">📊 {code.usesCount}/{code.maxUses} 次</span>
                                    {!isUsed && !isFullyUsed && !isExpired && (
                                      <button onClick={() => handleDeleteInviteCode(code._id)} className="text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50">🗑️ 删除</button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                                  <span>👤 创建者: {code.createdBy?.username}</span>
                                  <span>📅 有效期至: {new Date(code.expiresAt).toLocaleDateString()}</span>
                                </div>
                                {code.usedBy && (
                                  <div className="mt-1 text-xs text-green-600">✅ 使用者: {code.usedBy.username} {code.usedAt && `于 ${new Date(code.usedAt).toLocaleDateString()}`}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 权限说明 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">👑</span>
                    <h3 className="font-semibold text-blue-700 dark:text-blue-300">权限说明</h3>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    • 超级管理员 (owner/super_admin)：可以创建所有类型的邀请码，管理充值码<br />
                    • 管理员 (admin)：只能创建普通用户邀请码，每天1个<br />
                    • 邀请码支持多次使用（可设置最大使用次数）<br />
                    • 支持自定义邀请码（注意不要重复）<br />
                    • 充值码格式：RP-XXXX-XXXX，有效期14天
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Settings;