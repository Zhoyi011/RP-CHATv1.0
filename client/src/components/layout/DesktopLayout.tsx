// client/src/components/layout/DesktopLayout.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type Persona } from '../../services/api';
import { roomApi } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';
import PersonaSwitchPanel from '../common/PersonaSwitchPanel';
import AvatarFrame from '../common/AvatarFrame';
import toast from 'react-hot-toast';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { useAFK } from '../../contexts/AFKContext';
import { useFriend } from '../../contexts/FriendContext';
import { useAppData } from '../../contexts/AppDataContext';
import AddFriendModal from '../friends/AddFriendModal';
import FriendList from '../friends/FriendList';
import FriendRequests from '../friends/FriendRequests';
import PrivateChat from '../chat/PrivateChat';
import { 
  Users, UserPlus, Mail, LogOut, Settings, User as UserIcon, 
  BookOpen, ChevronDown, Lock
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

// 辅助函数
const getFrameNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/\/([^/]+)\.(png|webp|jpg|jpeg|gif|svg)$/i);
  if (match) return match[1].toLowerCase();
  return null;
};

// 动画变体
const sidebarVariants: Variants = {
  expanded: { width: 260, transition: { type: "spring", damping: 20, stiffness: 300 } },
  collapsed: { width: 72, transition: { type: "spring", damping: 20, stiffness: 300 } }
};

const navItemVariants: Variants = {
  hidden: (i: number) => ({ opacity: 0, x: -20 }),
  visible: (i: number) => ({ 
    opacity: 1, 
    x: 0, 
    transition: { delay: i * 0.05, duration: 0.3, type: "spring" } 
  }),
  tap: { scale: 0.97 }
};

const tooltipVariants: Variants = {
  hidden: { opacity: 0, x: -5, scale: 0.9 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.15 } }
};

const DesktopLayoutContent: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enterAFKManually } = useAFK();
  const { unreadCount: friendUnreadCount } = useFriend();
  
  // 🔥 从全局获取未读总数（自动轮询）
  const { unreadTotal } = useAppData();
  
  const [userData, setUserData] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [personasList, setPersonasList] = useState<Persona[]>([]);
  const [myPersonas, setMyPersonas] = useState<Persona[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // 好友相关状态
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<{ id: string; name: string; avatar?: string; number?: number } | null>(null);
  
  const personaMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  // 获取用户所有角色
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

  // 页面标题映射（使用 useMemo 缓存）
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path === '/chat' || path.startsWith('/chat?')) return '聊天室';
    if (path === '/feed') return '动态广场';
    if (path === '/home') return '个人主页';
    if (path === '/persona') return '角色管理';
    if (path === '/shop') return '奇妙商城';
    if (path === '/inventory') return '我的背包';
    if (path === '/search') return '全局搜索';
    if (path === '/settings') return '账号设置';
    if (path === '/changelog') return '更新日志';
    if (path === '/wallet') return '我的钱包';
    if (path === '/novel') return '墨香阁';
    if (path === '/author/dashboard') return '作者控制台';
    return '万物阁';
  }, [location.pathname]);

  // 页面描述（使用 useMemo 缓存）
  const pageDescription = useMemo(() => {
    const path = location.pathname;
    if (path === '/chat') return '与你的角色们畅聊';
    if (path === '/feed') return '看看大家都在聊什么';
    if (path === '/home') return '欢迎回来';
    if (path === '/persona') return '管理你的所有角色';
    if (path === '/shop') return '装扮你的角色';
    if (path === '/search') return '搜索角色、群聊或用户';
    if (path === '/wallet') return '充值钻石，查看记录';
    if (path === '/novel') return '阅读、创作、分享你的故事';
    if (path === '/author/dashboard') return '管理你的作品';
    return '✨ 享受角色扮演的乐趣';
  }, [location.pathname]);

  // 页面图标（使用 useMemo 缓存）
  const pageIcon = useMemo(() => {
    const path = location.pathname;
    if (path === '/chat' || path.startsWith('/chat?')) return '💬';
    if (path === '/feed') return '📰';
    if (path === '/home') return '🏠';
    if (path === '/persona') return '🎭';
    if (path === '/shop') return '🛒';
    if (path === '/inventory') return '🎒';
    if (path === '/search') return '🔍';
    if (path === '/settings') return '⚙️';
    if (path === '/changelog') return '📋';
    if (path === '/wallet') return '💎';
    if (path === '/novel') return '📚';
    if (path === '/author/dashboard') return '✍️';
    return '✨';
  }, [location.pathname]);

  // 导航项（使用 useMemo 缓存，依赖 unreadTotal）
  const navItems: NavItem[] = useMemo(() => [
    {
      name: '聊天',
      path: '/chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      badge: unreadTotal,
    },
    {
      name: '动态',
      path: '/feed',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      name: '主页',
      path: '/home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: '角色',
      path: '/persona',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: '商城',
      path: '/shop',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      ),
    },
    {
      name: '墨香阁',
      path: '/novel',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      name: '天仪阁',
      path: '/tianyige',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: '搜索',
      path: '/search',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      name: '钱包',
      path: '/wallet',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ], [unreadTotal]);

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

  // 获取角色列表
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

  // 切换角色
  const handleSwitchPersona = useCallback(async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      setCurrentPersona(persona);
      localStorage.setItem('lastUsedPersonaId', persona._id);
      toast.success(`已切换至 ${persona.displayName || persona.name}`);
      window.dispatchEvent(new CustomEvent('personaChanged', { detail: persona }));
      refreshCurrentPersona();
      setShowPersonaMenu(false);
    } catch (error) {
      toast.error('切换失败');
    }
  }, [refreshCurrentPersona]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaMenuRef.current && !personaMenuRef.current.contains(e.target as Node)) {
        setShowPersonaMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('lastUsedPersonaId');
      navigate('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  }, [navigate]);

  const isActive = useCallback((path: string) => {
    if (path === '/chat') return location.pathname === '/chat' || location.pathname.startsWith('/chat?');
    if (path === '/novel') return location.pathname === '/novel' || location.pathname.startsWith('/novel/');
    return location.pathname === path;
  }, [location.pathname]);

  const frameName = getFrameNameFromUrl(currentPersona?.avatarFrame || currentPersona?.equipped?.avatarFrame);

  // 计算经验条百分比
  const getExpPercentage = useCallback((): number => {
    const exp = currentPersona?.exp || 0;
    const level = currentPersona?.level || 1;
    const expNeeded = 50 + (level - 1) * 25;
    return Math.min((exp / expNeeded) * 100, 100);
  }, [currentPersona?.exp, currentPersona?.level]);

  // 计算经验值文本
  const expText = useMemo(() => {
    const exp = currentPersona?.exp || 0;
    const level = currentPersona?.level || 1;
    const expNeeded = 50 + (level - 1) * 25;
    return `${exp} / ${expNeeded} 经验`;
  }, [currentPersona?.exp, currentPersona?.level]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* ========== 侧边栏 ========== */}
      <motion.aside 
        variants={sidebarVariants}
        animate={collapsed ? "collapsed" : "expanded"}
        className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col z-20"
      >
        {/* 折叠按钮 */}
        <motion.button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 z-30"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.svg 
            className="w-3 h-3 text-gray-500 dark:text-gray-400" 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </motion.svg>
        </motion.button>

        {/* Logo 区域 */}
        <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-5'} border-b border-gray-100 dark:border-gray-800`}>
          <motion.div 
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate('/chat')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>
                  万物阁
                </span>
                <p className="text-[10px] text-gray-400 dark:text-gray-500" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>角色扮演聊天室</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <motion.button
              key={item.path}
              custom={index}
              variants={navItemVariants}
              initial="hidden"
              animate="visible"
              whileTap="tap"
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden group
                ${isActive(item.path) 
                  ? 'text-white' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {isActive(item.path) && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl"
                  transition={{ type: 'spring', duration: 0.5 }}
                />
              )}
              
              <div className="relative z-10 flex items-center gap-3 w-full">
                <div className="relative">
                  {item.name === '墨香阁' ? <BookOpen className="w-5 h-5" /> : item.icon}
                  {item.badge !== undefined && item.badge > 0 && !isActive(item.path) && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1 shadow-md"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.span>
                  )}
                </div>
                {!collapsed && (
                  <span className="text-sm font-medium" style={{ fontFamily: "'MaokenZhuyuanTi', sans-serif" }}>{item.name}</span>
                )}
              </div>
              
              {collapsed && hoveredItem === item.name && (
                <motion.div
                  variants={tooltipVariants}
                  initial="hidden"
                  animate="visible"
                  className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50"
                >
                  {item.name}
                </motion.div>
              )}
            </motion.button>
          ))}
        </nav>

        {/* ========== 底部区域 ========== */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-2">
          {/* 好友按钮组 */}
          <div className="flex items-center gap-2 px-1">
            <motion.button
              onClick={() => setShowFriendList(true)}
              onMouseEnter={() => setHoveredItem('friends')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 ${collapsed ? 'flex-col' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="好友列表"
            >
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              {!collapsed && <span className="text-xs">好友</span>}
              {friendUnreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center"
                >
                  {friendUnreadCount > 9 ? '9+' : friendUnreadCount}
                </motion.span>
              )}
            </motion.button>
            
            <motion.button
              onClick={() => setShowAddFriendModal(true)}
              onMouseEnter={() => setHoveredItem('addFriend')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all duration-200 ${collapsed ? 'flex-col' : ''}`}
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(168,85,247,0.4)" }}
              whileTap={{ scale: 0.98 }}
              title="添加好友"
            >
              <UserPlus className="w-4 h-4" />
              {!collapsed && <span className="text-xs">添加</span>}
            </motion.button>
          </div>

          {/* 好友申请按钮 */}
          <motion.button
            onClick={() => setShowFriendRequests(true)}
            onMouseEnter={() => setHoveredItem('requests')}
            onMouseLeave={() => setHoveredItem(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 relative ${collapsed ? 'justify-center' : ''}`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              {friendUnreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center"
                >
                  {friendUnreadCount > 9 ? '9+' : friendUnreadCount}
                </motion.span>
              )}
            </div>
            {!collapsed && (
              <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 text-left">好友申请</span>
            )}
            {!collapsed && friendUnreadCount > 0 && (
              <span className="text-xs text-red-500">{friendUnreadCount}个新申请</span>
            )}
            {collapsed && hoveredItem === 'requests' && (
              <motion.div
                variants={tooltipVariants}
                initial="hidden"
                animate="visible"
                className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50"
              >
                好友申请
              </motion.div>
            )}
          </motion.button>

          {/* 更新日志按钮 */}
          <motion.button
            onClick={() => navigate('/changelog')}
            onMouseEnter={() => setHoveredItem('changelog')}
            onMouseLeave={() => setHoveredItem(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!collapsed && <span className="text-sm">更新日志</span>}
            {collapsed && hoveredItem === 'changelog' && (
              <motion.div
                variants={tooltipVariants}
                initial="hidden"
                animate="visible"
                className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50"
              >
                更新日志
              </motion.div>
            )}
          </motion.button>

          {/* ✅ 角色切换区域（侧边栏底部 - 唯一入口） */}
          <div className="relative" ref={personaMenuRef}>
            <motion.button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              onMouseEnter={() => setHoveredItem('persona')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="relative">
                <AvatarFrame
                  avatarUrl={currentPersona?.avatar || ''}
                  frameName={frameName}
                  size="sm"
                  className="sidebar"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {currentPersona?.displayName || currentPersona?.name || '选择角色'}
                    </p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold flex-shrink-0">
                      Lv.{currentPersona?.level || 1}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {currentPersona?.title || '🌱 初入万物'}
                  </p>
                  <div className="mt-1">
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${getExpPercentage()}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {expText}
                  </p>
                </div>
              )}
              {!collapsed && (
                <motion.svg 
                  className="w-4 h-4 text-gray-400" 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  animate={{ rotate: showPersonaMenu ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              )}
            </motion.button>

            <AnimatePresence>
              {showPersonaMenu && (
                <div className="absolute bottom-full left-0 mb-2 z-[9999]">
                  <PersonaSwitchPanel
                    personas={personasList}
                    currentPersona={currentPersona}
                    onSelect={handleSwitchPersona}
                    onClose={() => setShowPersonaMenu(false)}
                    position="top"
                    align="left"
                  />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* 用户菜单区域 */}
          <div className="relative" ref={userMenuRef}>
            <motion.button
              onClick={() => setShowUserMenu(!showUserMenu)}
              onMouseEnter={() => setHoveredItem('user')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <UserIcon className="w-4 h-4" />
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {userData?.username || '用户'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">账号设置</p>
                </div>
              )}
              {!collapsed && (
                <motion.svg 
                  className="w-4 h-4 text-gray-400" 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  animate={{ rotate: showUserMenu ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              )}
            </motion.button>

            <AnimatePresence>
              {showUserMenu && !collapsed && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-[9999]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{userData?.username || '用户'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <DiamondBalance size="sm" />
                    </div>
                  </div>

                  {currentPersona && (
                    <motion.button
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                      onClick={() => { 
                        navigate(`/persona/${currentPersona._id}`);
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition"
                    >
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      皮主页
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                    onClick={() => { 
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    账号设置
                  </motion.button>

                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                  <motion.button
                    whileHover={{ backgroundColor: "rgba(239,68,68,0.1)" }}
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-3 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* ========== 主内容区 ========== */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* ========== 顶部栏 ========== */}
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          {/* 左侧 - 页面标题 */}
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center text-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {pageIcon}
            </motion.div>
            <div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                {pageTitle}
              </h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {pageDescription}
              </p>
            </div>
          </div>
          
          {/* ✅ 右侧 - 只保留必要按钮（无角色信息） */}
          <div className="flex items-center gap-2">
            {/* 墨香阁快捷入口 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/novel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                location.pathname === '/novel' || location.pathname.startsWith('/novel/')
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
              }`}
              title="墨香阁"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium hidden md:inline">墨香阁</span>
            </motion.button>

            {/* 手动 AFK 按钮 */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              whileTap={{ scale: 0.9 }}
              onClick={enterAFKManually}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              title="立即进入隐私保护模式"
            >
              <Lock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </motion.button>

            {/* 连接状态 */}
            <ConnectionStatus showText={true} />
            
            {/* 钻石余额 */}
            <DiamondBalance size="sm" />
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>

      {/* ========== 好友相关弹窗 ========== */}
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
    </div>
  );
};

const DesktopLayout: React.FC<Props> = ({ children }) => {
  return <DesktopLayoutContent>{children}</DesktopLayoutContent>;
};

export default DesktopLayout;