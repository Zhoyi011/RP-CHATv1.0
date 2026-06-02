// client/src/components/layout/TabletLayout.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { auth } from '../../firebase/config';
import { authApi, type User } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { useAFK } from '../../contexts/AFKContext';
import { useFriend } from '../../contexts/FriendContext';
import AddFriendModal from '../friends/AddFriendModal';
import FriendList from '../friends/FriendList';
import FriendRequests from '../friends/FriendRequests';
import PrivateChat from '../chat/PrivateChat';
import toast from 'react-hot-toast';
import { 
  Users, UserPlus, Mail, LogOut, Settings, User as UserIcon, 
  Home, MessageCircle, Newspaper, Search, ShoppingBag, Wallet,
  Menu, X, Bell, Lock 
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

interface CurrentPersona {
  _id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  sameNameNumber?: number;
}

// 动画变体
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

const menuItemVariants: Variants = {
  hidden: (i: number) => ({ x: -20, opacity: 0 }),
  visible: (i: number) => ({ x: 0, opacity: 1, transition: { delay: i * 0.05, duration: 0.3 } }),
  tap: { scale: 0.97 }
};

const TabletLayoutContent: React.FC<Props> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<CurrentPersona | null>(null);
  const [myPersonas, setMyPersonas] = useState<CurrentPersona[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  
  const { enterAFKManually } = useAFK();
  const { unreadCount: friendUnreadCount } = useFriend();

  // 好友相关状态
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<{ id: string; name: string; avatar?: string; number?: number } | null>(null);

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
          setMyPersonas(data.filter((p: any) => p.status === 'approved'));
        }
      } catch (error) {
        console.error('获取角色列表失败:', error);
      }
    };
    fetchMyPersonas();
  }, []);

  const navItems: NavItem[] = [
    {
      name: '聊天',
      path: '/chat',
      icon: <MessageCircle className="w-5 h-5" />,
      badge: unreadCount,
    },
    {
      name: '动态',
      path: '/feed',
      icon: <Newspaper className="w-5 h-5" />,
    },
    {
      name: '主页',
      path: '/home',
      icon: <Home className="w-5 h-5" />,
    },
    {
      name: '角色',
      path: '/persona',
      icon: <UserIcon className="w-5 h-5" />,
    },
    {
      name: '商城',
      path: '/shop',
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      name: '搜索',
      path: '/search',
      icon: <Search className="w-5 h-5" />,
    },
    {
      name: '钱包',
      path: '/wallet',
      icon: <Wallet className="w-5 h-5" />,
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

  // 获取当前激活的角色
  useEffect(() => {
    const fetchCurrentPersona = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('https://rp-chatv1-0.onrender.com/api/room/active-persona', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.activePersona) {
          setCurrentPersona(data.activePersona.personaId || data.activePersona);
        }
      } catch (error) {
        console.error('获取当前角色失败:', error);
      }
    };
    fetchCurrentPersona();
  }, []);

  // 获取未读消息数
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
          setUnreadCount(data.total || 0);
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
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setSidebarOpen(false);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('token');
      navigate('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/chat') return location.pathname === '/chat' || location.pathname.startsWith('/chat?');
    return location.pathname === path;
  };

  const getDisplayName = () => {
    return currentPersona?.displayName || currentPersona?.name || '未选择角色';
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
          <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            RP Chat
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 好友按钮组 */}
          <motion.button
            onClick={() => setShowFriendList(true)}
            className="relative p-2 text-gray-500 hover:text-green-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="好友列表"
          >
            <Users className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={() => setShowAddFriendModal(true)}
            className="p-2 text-gray-500 hover:text-purple-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="添加好友"
          >
            <UserPlus className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={() => setShowFriendRequests(true)}
            className="relative p-2 text-gray-500 hover:text-yellow-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="好友申请"
          >
            <Mail className="w-4 h-4" />
            {friendUnreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md"
              />
            )}
          </motion.button>

          {/* 隐私保护锁 */}
          <motion.button
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            whileTap={{ scale: 0.95 }}
            onClick={enterAFKManually}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            title="隐私模式"
          >
            <Lock className="w-4 h-4" />
          </motion.button>

          {/* 连接状态 */}
          <ConnectionStatus showText={true} />
          
          {/* 钻石余额 */}
          <DiamondBalance size="sm" />
          
          {/* 搜索按钮 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/search')}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <Search className="w-5 h-5" />
          </motion.button>

          {/* 角色头像 */}
          <motion.div className="relative">
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {getDisplayName().charAt(0).toUpperCase() || '?'}
              </div>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center shadow-md"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* 遮罩层 */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 侧边栏抽屉 */}
      <motion.div
        ref={sidebarRef}
        variants={drawerVariants}
        initial="hidden"
        animate={sidebarOpen ? "visible" : "hidden"}
        exit="exit"
        className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl z-30 flex flex-col"
      >
        {/* 侧边栏头部 */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Logo" className="w-12 h-12" />
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">RP Chat</h2>
              <p className="text-xs text-gray-400">角色扮演聊天室</p>
            </div>
          </div>
        </div>

        {/* 当前角色信息 */}
        <div className="p-4 mx-4 my-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {getDisplayName().charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                {getDisplayName()}
              </p>
              {currentPersona?.sameNameNumber && (
                <p className="text-xs text-gray-500">#{currentPersona.sameNameNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <motion.button
              key={item.path}
              custom={index}
              variants={menuItemVariants}
              initial="hidden"
              animate="visible"
              whileTap="tap"
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
              {item.badge !== undefined && item.badge > 0 && !isActive(item.path) && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </motion.span>
              )}
            </motion.button>
          ))}

          {/* 分割线 */}
          <div className="border-t border-gray-100 dark:border-gray-800 my-2"></div>

          {/* 好友相关菜单项 */}
          <motion.button
            custom={navItems.length}
            variants={menuItemVariants}
            initial="hidden"
            animate="visible"
            whileTap="tap"
            onClick={() => {
              setSidebarOpen(false);
              setShowFriendList(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200"
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">好友列表</span>
          </motion.button>

          <motion.button
            custom={navItems.length + 1}
            variants={menuItemVariants}
            initial="hidden"
            animate="visible"
            whileTap="tap"
            onClick={() => {
              setSidebarOpen(false);
              setShowAddFriendModal(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">添加好友</span>
          </motion.button>

          <motion.button
            custom={navItems.length + 2}
            variants={menuItemVariants}
            initial="hidden"
            animate="visible"
            whileTap="tap"
            onClick={() => {
              setSidebarOpen(false);
              setShowFriendRequests(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all duration-200 relative"
          >
            <Mail className="w-5 h-5" />
            <span className="font-medium flex-1 text-left">好友申请</span>
            {friendUnreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white"
              >
                {friendUnreadCount > 99 ? '99+' : friendUnreadCount}
              </motion.span>
            )}
          </motion.button>
        </nav>

        {/* 底部区域 */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNavigate('/settings')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
            <span>账号设置</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </motion.button>
          
          <p className="text-[10px] text-gray-400 text-center mt-3">v1.0.0 | RP Chat</p>
        </div>
      </motion.div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* 弹窗 */}
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

const TabletLayout: React.FC<Props> = ({ children }) => {
  return <TabletLayoutContent>{children}</TabletLayoutContent>;
};

export default TabletLayout;