// client/src/components/layout/MobileLayout.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type Persona } from '../../services/api';
import { roomApi } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import PersonaSwitchPanel from '../common/PersonaSwitchPanel';
import AvatarFrame from '../common/AvatarFrame';
import toast from 'react-hot-toast';
import { useAFK } from '../../contexts/AFKContext';
import { useFriend } from '../../contexts/FriendContext';
import AddFriendModal from '../friends/AddFriendModal';
import FriendList from '../friends/FriendList';
import FriendRequests from '../friends/FriendRequests';
import PrivateChat from '../chat/PrivateChat';
import { 
  Users, UserPlus, Mail, Menu, Home, MessageCircle, Newspaper, 
  Lock, Search, LogOut, Settings, User as UserIcon, ShoppingBag, Wallet,
  ChevronRight, BookOpen, Sparkles
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface TabItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

// ========== 动画变体 ==========
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

const headerVariants: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } }
};

const tabBarVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300, delay: 0.1 } }
};

const menuItemVariants: Variants = {
  hidden: (i: number) => ({ x: -20, opacity: 0 }),
  visible: (i: number) => ({ x: 0, opacity: 1, transition: { delay: i * 0.05, duration: 0.3, type: "spring" } }),
  tap: { scale: 0.97 }
};

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const drawerVariants: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { type: "spring", damping: 25, stiffness: 200 } },
  exit: { x: '-100%', transition: { type: "spring", damping: 25, stiffness: 200 } }
};

const tabVariants: Variants = {
  tap: { scale: 0.92 },
  hover: { scale: 1.05 }
};

const badgeVariants: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1, transition: { type: "spring", stiffness: 500, damping: 30 } }
};

// ========== 主组件 ==========
const MobileLayoutContent: React.FC<Props> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [userData, setUserData] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [personasList, setPersonasList] = useState<Persona[]>([]);
  const [myPersonas, setMyPersonas] = useState<Persona[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const switchPanelRef = useRef<HTMLDivElement>(null);
  const sideMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const { isKeyboardOpen } = useKeyboardHeight();
  const { enterAFKManually, requestIOSPlayback } = useAFK();
  const { unreadCount: friendUnreadCount } = useFriend();

  // 好友相关状态
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<{ id: string; name: string; avatar?: string; number?: number } | null>(null);

  // 🆕 手动进入 AFK 并处理 iOS 播放
  const handleEnterAFK = useCallback(() => {
    enterAFKManually();
    // iOS 设备：进入后延迟请求播放
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      setTimeout(() => {
        requestIOSPlayback?.();
      }, 500);
    }
  }, [enterAFKManually, requestIOSPlayback]);

  // 获取用户所有角色（用于申请添加好友时选择自己的角色）
  useEffect(() => {
    const fetchMyPersonas = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/persona/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setMyPersonas(data.filter((p: Persona) => p.status === 'approved'));
        }
      } catch (error) {
        console.error('获取角色列表失败:', error);
      }
    };
    fetchMyPersonas();
  }, []);

  // 获取所有已批准角色（用于角色切换面板）
  useEffect(() => {
    const fetchPersonas = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/persona/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPersonasList(data.filter((p: Persona) => p.status === 'approved'));
        }
      } catch (error) {
        console.error('获取角色列表失败:', error);
      }
    };
    fetchPersonas();
  }, []);

  // 底部 Tab 配置（新增小说 Tab）
  const tabs: TabItem[] = [
    {
      name: '聊天',
      path: '/chat',
      icon: <MessageCircle className="w-5 h-5" />,
      activeIcon: <MessageCircle className="w-5 h-5 fill-current" />,
    },
    {
      name: '动态',
      path: '/feed',
      icon: <Newspaper className="w-5 h-5" />,
      activeIcon: <Newspaper className="w-5 h-5 fill-current" />,
    },
    {
      name: '主页',
      path: '/home',
      icon: <Home className="w-5 h-5" />,
      activeIcon: <Home className="w-5 h-5 fill-current" />,
    },
    {
      name: '小说',
      path: '/novel',
      icon: <BookOpen className="w-5 h-5" />,
      activeIcon: <BookOpen className="w-5 h-5 fill-current" />,
    },
  ];

  // 加载用户数据
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const data = await authApi.getCurrentUser();
        setUserData(data);
      } catch (error) {
        console.error('加载用户数据失败:', error);
      }
    };
    loadUserData();
  }, [user]);

  // 刷新当前角色
  const refreshCurrentPersona = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/active-persona', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.activePersona) {
        const personaId = data.activePersona.personaId?._id || data.activePersona._id;
        const personaRes = await fetch(`https://rp-chatv1-0.onrender.com/api/persona/${personaId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (personaRes.ok) {
          const fullPersona = await personaRes.json();
          setCurrentPersona(fullPersona);
        } else {
          setCurrentPersona(data.activePersona.personaId || data.activePersona);
        }
      }
    } catch (error) {
      console.error('刷新角色失败:', error);
    }
  }, []);

  useEffect(() => {
    refreshCurrentPersona();
    const handlePersonaChanged = () => refreshCurrentPersona();
    window.addEventListener('personaChanged', handlePersonaChanged);
    return () => window.removeEventListener('personaChanged', handlePersonaChanged);
  }, [refreshCurrentPersona]);

  // 切换角色
  const handleSwitchPersona = async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      setCurrentPersona(persona);
      localStorage.setItem('lastUsedPersonaId', persona._id);
      toast.success(`已切换至 ${persona.displayName || persona.name}`);
      window.dispatchEvent(new CustomEvent('personaChanged', { detail: persona }));
      refreshCurrentPersona();
      setShowSwitchPanel(false);
    } catch (error) {
      toast.error('切换失败');
    }
  };

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switchPanelRef.current && !switchPanelRef.current.contains(e.target as Node)) {
        setShowSwitchPanel(false);
      }
      if (sideMenuRef.current && !sideMenuRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('.menu-trigger')) {
        setShowSideMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取未读消息总数
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/unread-total', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(Number(data.total) || 0);
        }
      } catch (error) {
        console.error('获取未读消息失败:', error);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // 根据路径同步活跃 Tab
  useEffect(() => {
    const path = location.pathname;
    if (path === '/chat' || path.startsWith('/chat?')) {
      setActiveTab('chat');
    } else if (path === '/feed') {
      setActiveTab('feed');
    } else if (path === '/home') {
      setActiveTab('home');
    } else if (path === '/novel' || path.startsWith('/novel/')) {
      setActiveTab('novel');
    }
  }, [location.pathname]);

  const handleTabChange = useCallback((tab: string, path: string) => {
    setActiveTab(tab);
    navigate(path);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('lastUsedPersonaId');
      navigate('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const frameName = getFrameNameFromUrl(currentPersona?.avatarFrame || currentPersona?.equipped?.avatarFrame);
  const displayName = currentPersona?.displayName || currentPersona?.name || '未选择角色';

  // 🆕 计算经验条百分比
  const getExpPercentage = useCallback((): number => {
    const exp = currentPersona?.exp || 0;
    const level = currentPersona?.level || 1;
    const expNeeded = 50 + (level - 1) * 25;
    return Math.min((exp / expNeeded) * 100, 100);
  }, [currentPersona?.exp, currentPersona?.level]);

  // 侧边菜单项
  const menuItems = [
    { icon: <Users className="w-4 h-4" />, label: '好友列表', action: 'friends', color: 'from-green-500 to-emerald-500' },
    { icon: <UserPlus className="w-4 h-4" />, label: '添加好友', action: 'addFriend', color: 'from-purple-500 to-pink-500' },
    { icon: <Mail className="w-4 h-4" />, label: '好友申请', action: 'requests', color: 'from-amber-500 to-orange-500', badge: friendUnreadCount },
    { icon: <Search className="w-4 h-4" />, label: '搜索', action: 'search', color: 'from-blue-500 to-cyan-500' },
    { icon: <UserIcon className="w-4 h-4" />, label: '角色管理', action: 'persona', color: 'from-purple-500 to-pink-500' },
    { icon: <ShoppingBag className="w-4 h-4" />, label: '商城', action: 'shop', color: 'from-blue-500 to-cyan-500' },
    { icon: <Wallet className="w-4 h-4" />, label: '钱包', action: 'wallet', color: 'from-amber-500 to-orange-500' },
    { icon: <Settings className="w-4 h-4" />, label: '账号设置', action: 'settings', color: 'from-gray-500 to-gray-600' },
  ];

  const handleMenuAction = (action: string) => {
    setShowSideMenu(false);
    switch (action) {
      case 'friends':
        setShowFriendList(true);
        break;
      case 'addFriend':
        setShowAddFriendModal(true);
        break;
      case 'requests':
        setShowFriendRequests(true);
        break;
      case 'search':
        navigate('/search');
        break;
      case 'persona':
        navigate('/persona');
        break;
      case 'shop':
        navigate('/shop');
        break;
      case 'wallet':
        navigate('/wallet');
        break;
      case 'settings':
        navigate('/settings');
        break;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* 顶部导航栏 */}
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 z-20"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-3 py-2">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-1.5"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.img 
              src="/favicon.svg" 
              alt="Logo" 
              className="w-6 h-6"
            />
            <h1 className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              万物阁
            </h1>
          </motion.div>

          {/* 右侧按钮组 */}
          <div className="flex items-center gap-1">
            {/* 🆕 隐私保护锁 */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleEnterAFK}
              className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              title="隐私模式"
            >
              <Lock className="w-4 h-4" />
            </motion.button>

            {/* 钻石余额 */}
            <div className="scale-90">
              <DiamondBalance size="sm" />
            </div>

            {/* 菜单按钮 */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSideMenu(true)}
              className="menu-trigger p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 relative"
              title="菜单"
            >
              <Menu className="w-4 h-4" />
              {friendUnreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md"
                />
              )}
            </motion.button>

            {/* 角色切换按钮 */}
            <div className="relative ml-0.5" ref={switchPanelRef}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSwitchPanel(!showSwitchPanel)}
                className="relative focus:outline-none"
              >
                <AvatarFrame
                  avatarUrl={currentPersona?.avatar || ''}
                  frameName={frameName}
                  size="sm"
                  className="mobile-header"
                />
                <motion.div 
                  className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full ring-1 ring-white dark:ring-gray-900"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </motion.button>

              <AnimatePresence>
                {showSwitchPanel && (
                  <div className="absolute top-full right-0 mt-2 z-[9999]">
                    <PersonaSwitchPanel
                      personas={personasList}
                      currentPersona={currentPersona}
                      onSelect={handleSwitchPersona}
                      onClose={() => setShowSwitchPanel(false)}
                      position="bottom"
                      align="right"
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 🆕 顶部栏角色信息（紧凑显示） - 仅在非键盘弹出时显示 */}
        {!isKeyboardOpen && currentPersona && (
          <div className="flex items-center justify-between px-3 pb-1.5 border-t border-gray-100/50 dark:border-gray-800/50 pt-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* 角色名称 */}
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
                {displayName}
              </span>
              {/* 🆕 等级徽章 */}
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold flex-shrink-0">
                Lv.{currentPersona?.level || 1}
              </span>
              {/* 🆕 头衔（仅当有空间时显示） */}
              <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate hidden xs:inline max-w-[80px]">
                {currentPersona?.title || '🌱 初入万物'}
              </span>
            </div>
            {/* 🆕 经验条（紧凑版） */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${getExpPercentage()}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-mono">
                {currentPersona?.exp || 0}/{50 + ((currentPersona?.level || 1) - 1) * 25}
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* 主内容区 */}
      <motion.div 
        className="absolute inset-x-0 overflow-y-auto overscroll-y-contain"
        style={{ 
          top: currentPersona && !isKeyboardOpen ? '72px' : '52px', 
          bottom: '56px' 
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {children}
      </motion.div>

      {/* 底部 Tab 栏 */}
      <motion.div
        variants={tabBarVariants}
        initial="hidden"
        animate="visible"
        className={`fixed left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-20 transition-all duration-300`}
        style={{ bottom: 'env(safe-area-inset-bottom, 0px)', height: '56px' }}
      >
        <div className="flex justify-around items-center h-full">
          {tabs.map((tab) => {
            const isActiveTab = activeTab === tab.name.toLowerCase();
            return (
              <motion.button
                key={tab.name}
                variants={tabVariants}
                whileTap="tap"
                whileHover="hover"
                onClick={() => handleTabChange(tab.name.toLowerCase(), tab.path)}
                className={`flex flex-col items-center justify-center relative py-1 px-2 rounded-full transition-all duration-200 ${
                  isActiveTab ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <div className="relative">
                  {isActiveTab ? (tab.activeIcon || tab.icon) : tab.icon}
                  {tab.name === '聊天' && unreadCount > 0 && !isActiveTab && (
                    <motion.span
                      variants={badgeVariants}
                      initial="initial"
                      animate="animate"
                      className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center px-1 shadow-md"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                  )}
                </div>
                <motion.span 
                  className={`text-[10px] mt-0.5 ${isActiveTab ? 'font-medium' : ''}`}
                  animate={isActiveTab ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {tab.name}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* 侧边菜单抽屉 */}
      <AnimatePresence>
        {showSideMenu && (
          <>
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
              onClick={() => setShowSideMenu(false)}
            />
            
            <motion.div
              ref={sideMenuRef}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl z-40 flex flex-col"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
              {/* 菜单头部 - 角色信息（完整显示） */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: "spring", damping: 20 }}
                className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"
              >
                <motion.div 
                  className="flex items-center gap-3"
                  whileHover={{ scale: 1.02 }}
                >
                  <AvatarFrame
                    avatarUrl={currentPersona?.avatar || ''}
                    frameName={frameName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    {/* 名称 + 等级徽章 */}
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-lg truncate">
                        {displayName}
                      </p>
                      {/* 🆕 等级徽章 */}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold flex-shrink-0">
                        Lv.{currentPersona?.level || 1}
                      </span>
                    </div>
                    {/* 🆕 头衔 */}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentPersona?.title || '🌱 初入万物'}
                    </p>
                    {/* 🆕 经验条 */}
                    <div className="mt-1.5 w-full">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${getExpPercentage()}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">
                          {currentPersona?.exp || 0}/{50 + ((currentPersona?.level || 1) - 1) * 25}
                        </span>
                      </div>
                    </div>
                    {currentPersona?.sameNameNumber && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        #{currentPersona.sameNameNumber}
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>

              {/* 菜单选项 */}
              <div className="flex-1 py-2 overflow-y-auto">
                {menuItems.map((item, index) => (
                  <motion.button
                    key={item.label}
                    custom={index}
                    variants={menuItemVariants}
                    initial="hidden"
                    animate="visible"
                    whileTap="tap"
                    onClick={() => handleMenuAction(item.action)}
                    className="w-full px-5 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition group relative"
                  >
                    <motion.div 
                      className={`w-8 h-8 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center text-white shadow-md`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {item.icon}
                    </motion.div>
                    <span className="font-medium">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white font-medium shadow-sm"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </motion.button>
                ))}
              </div>

              {/* 底部 */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 border-t border-gray-100 dark:border-gray-800"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </motion.button>
                <p className="text-[10px] text-gray-400 text-center mt-3">
                  v1.0.0 | 万物阁
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 弹窗组件 */}
      <AddFriendModal 
        isOpen={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
        availablePersonas={myPersonas}
      />

      <AnimatePresence>
        {showFriendList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
            >
              <FriendList 
                onSelectFriend={(id, name, avatar, number) => {
                  setShowFriendList(false);
                  setSelectedPrivateChat({ id, name, avatar, number });
                }}
                onClose={() => setShowFriendList(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFriendRequests && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
            >
              <FriendRequests 
                onClose={() => setShowFriendRequests(false)}
                onAccept={() => setShowFriendRequests(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PrivateChat
        isOpen={!!selectedPrivateChat}
        onClose={() => setSelectedPrivateChat(null)}
        targetPersonaId={selectedPrivateChat?.id || ''}
        targetPersonaName={selectedPrivateChat?.name || ''}
        targetPersonaAvatar={selectedPrivateChat?.avatar}
        targetPersonaNumber={selectedPrivateChat?.number}
      />
    </motion.div>
  );
};

const MobileLayout: React.FC<Props> = ({ children }) => {
  return <MobileLayoutContent>{children}</MobileLayoutContent>;
};

export default MobileLayout;