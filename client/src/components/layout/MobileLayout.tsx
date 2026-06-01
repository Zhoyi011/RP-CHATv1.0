// client/src/components/layout/MobileLayout.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User, type Persona } from '../../services/api';
import { roomApi } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import PersonaSwitchPanel from '../common/PersonaSwitchPanel';
import AvatarFrame from '../common/AvatarFrame';
import toast from 'react-hot-toast';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { useAFK } from '../../contexts/AFKContext';
import { useFriend } from '../../contexts/FriendContext';
import { DraggableAFKStatus } from '../common/DraggableAFKStatus';
import AddFriendModal from '../friends/AddFriendModal';
import FriendList from '../friends/FriendList';
import FriendRequests from '../friends/FriendRequests';
import PrivateChat from '../chat/PrivateChat';

interface Props {
  children: React.ReactNode;
}

interface TabItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

// 辅助函数
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
  hidden: { x: -20, opacity: 0 },
  visible: (i: number) => ({ x: 0, opacity: 1, transition: { delay: i * 0.05, duration: 0.3 } }),
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

// ========== 联系人菜单弹窗（智能定位） ==========
const ContactMenuModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onFriendList: () => void;
  onAddFriend: () => void;
  onFriendRequests: () => void;
  unreadCount: number;
  anchorRect?: DOMRect | null;
}> = ({ isOpen, onClose, onFriendList, onAddFriend, onFriendRequests, unreadCount, anchorRect }) => {
  const [position, setPosition] = useState({ top: 0, right: 8, left: undefined as number | undefined });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && anchorRect && menuRef.current) {
      const menuWidth = menuRef.current.offsetWidth;
      const windowWidth = window.innerWidth;
      
      // 计算从右边展开的位置
      let right = windowWidth - anchorRect.right + 8;
      let left: number | undefined = undefined;
      
      // 如果右边空间不够，改为从左边展开
      if (right + menuWidth > windowWidth - 8) {
        right = 8;
        left = anchorRect.left - menuWidth + 8;
        if (left && left < 8) left = 8;
      }
      
      setPosition({
        top: anchorRect.bottom + 4,
        right: right,
        left: left,
      });
    }
  }, [isOpen, anchorRect]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ type: "spring", damping: 20, stiffness: 400, mass: 0.6 }}
        className="fixed z-50 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
        style={{
          top: position.top,
          right: position.right,
          left: position.left,
        }}
      >
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">联系人</span>
          </div>
        </div>

        <button
          onClick={() => { onFriendList(); onClose(); }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 group"
        >
          <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-sm">👥</span>
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">好友列表</span>
        </button>

        <button
          onClick={() => { onAddFriend(); onClose(); }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 border-t border-gray-100 dark:border-gray-800 group"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-sm">➕</span>
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">添加好友</span>
        </button>

        <button
          onClick={() => { onFriendRequests(); onClose(); }}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 border-t border-gray-100 dark:border-gray-800 group"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center relative group-hover:scale-110 transition-transform">
            <span className="text-sm">📨</span>
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-left">好友申请</span>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white font-medium shadow-sm"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

// ========== 主组件 ==========
const MobileLayoutContent: React.FC<Props> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [userData, setUserData] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [personasList, setPersonasList] = useState<Persona[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const switchPanelRef = useRef<HTMLDivElement>(null);
  const sideMenuRef = useRef<HTMLDivElement>(null);
  const contactButtonRef = useRef<HTMLButtonElement>(null);
  const [contactAnchorRect, setContactAnchorRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const { isKeyboardOpen } = useKeyboardHeight();
  const { enterAFKManually } = useAFK();
  const { unreadCount: friendUnreadCount } = useFriend();

  // 好友相关状态
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  const tabs: TabItem[] = [
    {
      name: '聊天',
      path: '/chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      name: '动态',
      path: '/feed',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
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
      activeIcon: (
        <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
  ];

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

  const handleSwitchPersona = async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      setCurrentPersona(persona);
      localStorage.setItem('lastUsedPersonaId', persona._id);
      toast.success(`已切换至 ${persona.displayName || persona.name}`);
      window.dispatchEvent(new CustomEvent('personaChanged', { detail: persona }));
      refreshCurrentPersona();
    } catch (error) {
      toast.error('切换失败');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switchPanelRef.current && !switchPanelRef.current.contains(e.target as Node)) {
        setShowSwitchPanel(false);
      }
      if (sideMenuRef.current && !sideMenuRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('.menu-trigger')) {
        setShowSideMenu(false);
      }
      if (contactButtonRef.current && !contactButtonRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('.contact-trigger')) {
        setShowContactMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  useEffect(() => {
    if (location.pathname === '/chat' || location.pathname.startsWith('/chat?')) {
      setActiveTab('chat');
    } else if (location.pathname === '/feed') {
      setActiveTab('feed');
    } else if (location.pathname === '/home') {
      setActiveTab('home');
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

  const menuItems = [
    { icon: '🔍', label: '搜索', path: '/search', color: 'from-blue-500 to-cyan-500' },
    { icon: '🎭', label: '角色管理', path: '/persona', color: 'from-purple-500 to-pink-500' },
    { icon: '🛒', label: '商城', path: '/shop', color: 'from-blue-500 to-cyan-500' },
    { icon: '💎', label: '钱包', path: '/wallet', color: 'from-amber-500 to-orange-500' },
    { icon: '⚙️', label: '账号设置', path: '/settings', color: 'from-gray-500 to-gray-600' },
    { icon: '📋', label: '更新日志', path: '/changelog', color: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
    >
      <DraggableAFKStatus />

      {/* 顶部导航栏 */}
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 z-20 safe-top"
      >
        <div className="flex items-center justify-between px-3 py-2">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-1.5"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img src="/favicon.svg" alt="Logo" className="w-6 h-6" />
            <h1 className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              RP Chat
            </h1>
          </motion.div>

          {/* 右侧按钮组 */}
          <div className="flex items-center gap-1">
            {/* 1. 联系人按钮 */}
            <div className="relative">
              <motion.button
                ref={contactButtonRef}
                onClick={() => {
                  if (contactButtonRef.current) {
                    setContactAnchorRect(contactButtonRef.current.getBoundingClientRect());
                  }
                  setShowContactMenu(!showContactMenu);
                }}
                className="contact-trigger p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="联系人"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {friendUnreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full shadow-md"
                  />
                )}
              </motion.button>

              <ContactMenuModal
                isOpen={showContactMenu}
                onClose={() => setShowContactMenu(false)}
                onFriendList={() => setShowFriendList(true)}
                onAddFriend={() => setShowAddFriendModal(true)}
                onFriendRequests={() => setShowFriendRequests(true)}
                unreadCount={friendUnreadCount}
                anchorRect={contactAnchorRect}
              />
            </div>

            {/* 2. 隐私保护锁 */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
              whileTap={{ scale: 0.95 }}
              onClick={enterAFKManually}
              className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              title="隐私模式"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </motion.button>

            {/* 3. 钻石余额 */}
            <div className="scale-90">
              <DiamondBalance size="sm" />
            </div>

            {/* 4. 菜单按钮 */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSideMenu(true)}
              className="menu-trigger p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              title="菜单"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>

            {/* 5. 角色切换 */}
            <div className="relative ml-0.5" ref={switchPanelRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
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
                  <PersonaSwitchPanel
                    personas={personasList}
                    currentPersona={currentPersona}
                    onSelect={handleSwitchPersona}
                    onClose={() => setShowSwitchPanel(false)}
                    position="bottom"
                    align="right"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 主内容区 */}
      <motion.div 
        className="absolute inset-x-0 overflow-y-auto overscroll-y-contain"
        style={{ top: '52px', bottom: '56px' }}
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
        className={`fixed left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-20 transition-all duration-300 safe-bottom ${
          isKeyboardOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
        style={{ bottom: 0, height: '56px' }}
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
                className={`flex flex-col items-center justify-center relative py-1 px-3 rounded-full transition-all duration-200 ${
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
            >
              {/* 菜单头部 */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
              >
                <div className="flex items-center gap-3">
                  <AvatarFrame
                    avatarUrl={currentPersona?.avatar || ''}
                    frameName={frameName}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {currentPersona?.displayName || currentPersona?.name || '未选择角色'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {userData?.username || '用户'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 菜单选项 */}
              <div className="flex-1 py-4 overflow-y-auto">
                {menuItems.map((item, index) => (
                  <motion.button
                    key={item.label}
                    custom={index}
                    variants={menuItemVariants}
                    initial="hidden"
                    animate="visible"
                    whileTap="tap"
                    onClick={() => {
                      navigate(item.path);
                      setShowSideMenu(false);
                    }}
                    className="w-full px-5 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition group"
                  >
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-200`}>
                      <span className="text-sm">{item.icon}</span>
                    </div>
                    <span className="font-medium">{item.label}</span>
                    <motion.svg 
                      className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      initial={{ x: -5 }}
                      whileHover={{ x: 0 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </motion.svg>
                  </motion.button>
                ))}
              </div>

              {/* 底部 */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 border-t border-gray-100 dark:border-gray-800"
              >
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>退出登录</span>
                </motion.button>
                <p className="text-[10px] text-gray-400 text-center mt-3">v1.0.0 | RP Chat</p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 弹窗 */}
      <AddFriendModal isOpen={showAddFriendModal} onClose={() => setShowAddFriendModal(false)} />

      {showFriendList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md h-[500px] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                好友列表
              </h2>
              <button onClick={() => setShowFriendList(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FriendList 
              onSelectFriend={(id, name, avatar) => {
                setShowFriendList(false);
                setSelectedPrivateChat({ id, name, avatar });
              }}
              onClose={() => setShowFriendList(false)}
            />
          </div>
        </div>
      )}

      {showFriendRequests && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md h-[500px] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                好友申请
                {friendUnreadCount > 0 && (
                  <span className="text-sm text-red-500 ml-1">({friendUnreadCount})</span>
                )}
              </h2>
              <button onClick={() => setShowFriendRequests(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FriendRequests 
              onClose={() => setShowFriendRequests(false)}
              onAccept={() => setShowFriendRequests(false)}
            />
          </div>
        </div>
      )}

      <PrivateChat
        isOpen={!!selectedPrivateChat}
        onClose={() => setSelectedPrivateChat(null)}
        targetPersonaId={selectedPrivateChat?.id || ''}
        targetPersonaName={selectedPrivateChat?.name || ''}
        targetPersonaAvatar={selectedPrivateChat?.avatar}
      />
    </motion.div>
  );
};

const MobileLayout: React.FC<Props> = ({ children }) => {
  return <MobileLayoutContent>{children}</MobileLayoutContent>;
};

export default MobileLayout;