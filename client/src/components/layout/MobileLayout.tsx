import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { authApi, type User, type Persona } from '../../services/api';
import { roomApi } from '../../services/api';
import DiamondBalance from '../diamond/DiamondBalance';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import PersonaSwitchPanel from '../common/PersonaSwitchPanel';
import toast from 'react-hot-toast';

interface Props {
  children: React.ReactNode;
}

interface TabItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface CurrentPersona {
  _id: string;
  name: string;
  displayName?: string;
  avatar?: string;
}

const MobileLayout: React.FC<Props> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [userData, setUserData] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState<CurrentPersona | null>(null);
  const [personasList, setPersonasList] = useState<Persona[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);
  const switchPanelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const { isKeyboardOpen } = useKeyboardHeight();

  const tabs: TabItem[] = [
    {
      name: '聊天',
      path: '/chat',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      name: '角色',
      path: '/persona',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: '搜索',
      path: '/search',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
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
          setCurrentPersona(data.activePersona);
        }
      } catch (error) {
        console.error('获取当前角色失败:', error);
      }
    };
    fetchCurrentPersona();
  }, []);

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
  const handleSwitchPersona = async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      setCurrentPersona({
        _id: persona._id,
        name: persona.name,
        displayName: persona.displayName,
        avatar: persona.avatar
      });
      localStorage.setItem('lastUsedPersonaId', persona._id);
      toast.success(`已切换至 ${persona.displayName || persona.name}`);
      window.location.reload();
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    const currentTab = tabs.find(tab => location.pathname.startsWith(tab.path));
    if (currentTab) {
      setActiveTab(currentTab.name.toLowerCase());
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
      navigate('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部导航栏 - fixed */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            RP Chat
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <DiamondBalance size="sm" />
          
          <button
            onClick={() => navigate('/search')}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-all duration-200 active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* 当前角色头像 - 点击切换角色 */}
          <div className="relative" ref={switchPanelRef}>
            <button
              onClick={() => setShowSwitchPanel(!showSwitchPanel)}
              className="relative focus:outline-none transition-all duration-200 active:scale-90"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {currentPersona?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-white"></div>
            </button>

            {showSwitchPanel && (
              <PersonaSwitchPanel
                personas={personasList}
                currentPersona={currentPersona}
                onSelect={handleSwitchPersona}
                onClose={() => setShowSwitchPanel(false)}
                position="bottom"
              />
            )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div 
        className="absolute top-[61px] bottom-0 left-0 right-0 overflow-y-auto"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          bottom: isKeyboardOpen ? '0px' : '65px'
        }}
      >
        {children}
      </div>

      {/* 底部 Tab 栏 */}
      <div 
        className={`fixed left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 flex justify-around py-2 safe-bottom shadow-lg z-30 transition-all duration-300 ${
          isKeyboardOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
        style={{ bottom: 0 }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => handleTabChange(tab.name.toLowerCase(), tab.path)}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-90 ${
              activeTab === tab.name.toLowerCase() 
                ? 'text-blue-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              {tab.icon}
              {tab.name === '聊天' && unreadCount > 0 && activeTab !== 'chat' && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-xs mt-1 ${activeTab === tab.name.toLowerCase() ? 'font-medium' : ''}`}>
              {tab.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileLayout;