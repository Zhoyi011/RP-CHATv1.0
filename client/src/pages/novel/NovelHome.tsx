// client/src/pages/novel/NovelHome.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi, roomApi, authApi, type Persona, type User } from '../../services/api';
import type { Novel } from '../../types/novel';
import { usePersona } from '../../hooks/usePersona';
import { useAppData } from '../../contexts/AppDataContext';
import DiamondBalance from '../../components/diamond/DiamondBalance';
import PersonaSwitchPanel from '../../components/common/PersonaSwitchPanel';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import { setGlobalAFKDisabled } from '../../contexts/AFKContext';
import { ArrowLeft, BookOpen, Search, X, Sparkles, TrendingUp, Clock, Heart } from 'lucide-react';
import '../../styles/novel.css';

const NovelHome: React.FC = () => {
  const navigate = useNavigate();
  
  // ========== 用户状态 ==========
  const { currentPersona, myPersonas, refresh: refreshPersona, isLoggedIn: personaLoggedIn, loading: personaLoading } = usePersona({ 
    enabled: true 
  });
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPersonaSwitch, setShowPersonaSwitch] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [followsCount, setFollowsCount] = useState(0);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const personaPanelRef = useRef<HTMLDivElement>(null);
  
  // 🔥 从全局获取小说数据（自动轮询）
  const { novels, refreshNovels } = useAppData();
  
  // ========== 本地状态（只保留UI相关） ==========
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes' | 'wordCount'>('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // ========== 小说详情模态框 ==========
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // ========== 阅读器 ==========
  const [showReader, setShowReader] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<{ id: string; content: string; title: string; number: number } | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isReaderAuthorMode, setIsReaderAuthorMode] = useState(false);
  
  // ========== 作者申请 ==========
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  
  // ========== 赞赏 ==========
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState(10);
  const [donateMessage, setDonateMessage] = useState('');
  
  // ========== 导航高亮 ==========
  const [activeNav, setActiveNav] = useState('home');

  // 🔥 使用 usePersona 返回的登录状态
  const isLoggedIn = personaLoggedIn;

  // 🔥 检查 token 是否存在
  const hasToken = useCallback(() => {
    return !!localStorage.getItem('token');
  }, []);

  // 🆕 等待角色加载完成后再渲染内容
  const [authReady, setAuthReady] = useState(false);

  // ========== 排序选项 ==========
  const sortOptions = useMemo(() => [
    { value: 'latest', label: '最新发布', icon: <Clock size={14} /> },
    { value: 'popular', label: '最多阅读', icon: <TrendingUp size={14} /> },
    { value: 'likes', label: '最多点赞', icon: <Heart size={14} /> },
    { value: 'wordCount', label: '字数最多', icon: <BookOpen size={14} /> },
  ], []);

  // ========== 分类列表 ==========
  const categories = useMemo(() => 
    ['全部', '武侠', '玄幻', '言情', '历史', '悬疑', '科幻', '文学', '其他'],
  []);

  // 🆕 等待 auth 和 persona 加载完成
  useEffect(() => {
    // 如果有 token，等待 persona 加载完成
    if (hasToken()) {
      if (!personaLoading) {
        setAuthReady(true);
      }
    } else {
      // 没有 token，直接准备就绪
      setAuthReady(true);
    }
  }, [hasToken, personaLoading]);

  // ========== 禁用 AFK ==========
  useEffect(() => {
    setGlobalAFKDisabled(true);
    return () => setGlobalAFKDisabled(false);
  }, []);

  // ========== 辅助函数 ==========
  const formatWordCount = useCallback((count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  }, []);

  const isRecentUpdate = useCallback((dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }, []);

  const scrollToSection = useCallback((sectionId: string, navName: string) => {
    setActiveNav(navName);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const getAuthorId = useCallback((novel: Novel): string => {
    if (typeof novel.authorPersonaId === 'string') {
      return novel.authorPersonaId;
    }
    return novel.authorPersonaId?._id || '';
  }, []);

  const getNovelId = useCallback((favorite: any): string => {
    if (typeof favorite.novelId === 'string') {
      return favorite.novelId;
    }
    return favorite.novelId?._id || '';
  }, []);

  const getFollowAuthorId = useCallback((follow: any): string => {
    if (typeof follow.authorPersonaId === 'string') {
      return follow.authorPersonaId;
    }
    return follow.authorPersonaId?._id || '';
  }, []);

  // 🔥 返回按钮处理：已登录回聊天，未登录回登录页
  const handleBack = useCallback(() => {
    if (isLoggedIn) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  // 🔥 检查登录状态
  const checkAuth = useCallback((): boolean => {
    if (!isLoggedIn) {
      toast.error('请先登录后再操作', { icon: '🔒' });
      return false;
    }
    return true;
  }, [isLoggedIn]);

  // ========== 加载用户信息（有 token 才加载） ==========
  useEffect(() => {
    const loadUser = async () => {
      if (!hasToken()) {
        setUser(null);
        return;
      }
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('加载用户失败:', error);
        localStorage.removeItem('token');
      }
    };
    loadUser();
  }, [hasToken]);

  // ========== 加载用户统计数据（有 token 才加载） ==========
  const loadUserStats = useCallback(async () => {
    if (!hasToken() || !currentPersona) return;
    try {
      const [favRes, followRes] = await Promise.all([
        novelApi.getMyFavorites(currentPersona._id),
        novelApi.getMyFollows(currentPersona._id)
      ]);
      setFavoritesCount(favRes.favorites.length);
      setFollowsCount(followRes.follows.length);
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  }, [currentPersona, hasToken]);

  const loadPendingCount = useCallback(async () => {
    if (!hasToken()) return;
    if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'owner') return;
    try {
      const res = await novelApi.getPendingApplications();
      setPendingApplicationsCount(res.applications.filter(a => a.status === 'pending').length);
    } catch (error) {
      console.error('加载待审核数量失败:', error);
    }
  }, [user, hasToken]);

  useEffect(() => {
    if (currentPersona) {
      loadUserStats();
    }
    if (user) {
      loadPendingCount();
    }
  }, [currentPersona, user, loadUserStats, loadPendingCount]);

  // ========== 加载小说列表 ==========
  const loadNovels = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    try {
      const params: any = { limit: 20, page: reset ? 1 : page, sort: sortBy };
      if (searchKeyword) params.search = searchKeyword;
      if (selectedCategory !== '全部') params.category = selectedCategory;
      
      await refreshNovels();
      
      const res = await novelApi.getNovels(params);
      if (reset) {
        const total = res.novels.reduce((sum: number, n: any) => sum + (n.wordCount || 0), 0);
        setTotalWords(total);
        setPage(1);
      } else {
        setTotalWords(prev => prev + res.novels.reduce((sum: number, n: any) => sum + (n.wordCount || 0), 0));
      }
      setHasMore(res.pagination.page < res.pagination.pages);
    } catch (error) {
      console.error('加载小说失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, selectedCategory, sortBy, page, refreshNovels]);

  // 当筛选条件变化时重新加载
  useEffect(() => {
    loadNovels(true);
  }, [searchKeyword, selectedCategory, sortBy, loadNovels]);

  // ========== 滚动加载更多 ==========
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      const scrollTop = document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollTop + windowHeight >= docHeight - 300) {
        setPage(p => p + 1);
        loadNovels(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, loadNovels]);

  // 点击外部关闭菜单和角色切换面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (personaPanelRef.current && !personaPanelRef.current.contains(e.target as Node)) {
        setShowPersonaSwitch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ========== 退出登录 ==========
  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('lastUsedPersonaId');
      window.location.href = '/';
    } catch (error) {
      toast.error('退出失败');
    }
  }, []);

  // ========== 切换角色 ==========
  const switchPersona = useCallback(async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      localStorage.setItem('lastUsedPersonaId', persona._id);
      await refreshPersona();
      setShowPersonaSwitch(false);
      toast.success(`已切换至 ${persona.displayName || persona.name}`);
    } catch (error) {
      toast.error('切换角色失败');
    }
  }, [refreshPersona]);

  // ========== 打开小说详情 ==========
  const handleOpenNovel = useCallback(async (novelId: string) => {
    try {
      const res = await novelApi.getNovelDetail(novelId);
      setSelectedNovel(res.novel);
      setChapters(res.chapters);
      setShowModal(true);
      
      if (isLoggedIn && currentPersona) {
        try {
          const favRes = await novelApi.getMyFavorites(currentPersona._id);
          setIsFavorited(favRes.favorites.some(f => getNovelId(f) === novelId));
        } catch (e) {}
        
        try {
          const followRes = await novelApi.getMyFollows(currentPersona._id);
          const authorId = getAuthorId(res.novel);
          setIsFollowing(followRes.follows.some(f => getFollowAuthorId(f) === authorId));
        } catch (e) {}
      }
    } catch (error) {
      console.error('加载小说详情失败:', error);
      toast.error('加载失败');
    }
  }, [currentPersona, getAuthorId, getFollowAuthorId, getNovelId, isLoggedIn]);

  // ========== 收藏/取消收藏（需要登录） ==========
  const handleToggleFavorite = useCallback(async () => {
    if (!checkAuth()) return;
    if (!currentPersona || !selectedNovel) {
      toast.error('请先选择角色');
      return;
    }
    try {
      const res = await novelApi.toggleFavorite(selectedNovel._id, currentPersona._id);
      setIsFavorited(res.action === 'added');
      toast.success(res.message);
      loadUserStats();
    } catch (error) {
      toast.error('操作失败');
    }
  }, [checkAuth, currentPersona, selectedNovel, loadUserStats]);

  // ========== 关注/取消关注作者（需要登录） ==========
  const handleToggleFollow = useCallback(async () => {
    if (!checkAuth()) return;
    if (!currentPersona || !selectedNovel) {
      toast.error('请先选择角色');
      return;
    }
    try {
      const authorId = getAuthorId(selectedNovel);
      const res = await novelApi.toggleFollow(authorId, currentPersona._id);
      setIsFollowing(res.action === 'followed');
      toast.success(res.message);
      loadUserStats();
    } catch (error) {
      toast.error('操作失败');
    }
  }, [checkAuth, currentPersona, selectedNovel, getAuthorId, loadUserStats]);

  // ========== 开始阅读（公开，不需要登录） ==========
  const handleStartReading = useCallback(async () => {
    if (!selectedNovel || chapters.length === 0) {
      toast.error('暂无章节');
      return;
    }
    
    const isAuthor = currentPersona && 
      (typeof selectedNovel.authorPersonaId === 'string'
        ? selectedNovel.authorPersonaId === currentPersona._id
        : selectedNovel.authorPersonaId?._id === currentPersona._id);
    
    setIsReaderAuthorMode(isAuthor);
    setShowModal(false);
    await loadChapterContent(chapters[0]._id);
    setShowReader(true);
  }, [selectedNovel, chapters, currentPersona]);

  // ========== 加载章节内容 ==========
  const loadChapterContent = useCallback(async (chapterId: string) => {
    if (!selectedNovel) return;
    try {
      const res = await novelApi.getChapter(selectedNovel._id, chapterId);
      setCurrentChapter({
        id: res.chapter._id,
        content: res.chapter.content,
        title: res.chapter.title,
        number: res.chapter.chapterNumber
      });
    } catch (error) {
      console.error('加载章节失败:', error);
      toast.error('加载章节失败');
    }
  }, [selectedNovel]);

  // ========== 章节切换 ==========
  const changeChapter = useCallback(async (chapterId: string) => {
    await loadChapterContent(chapterId);
  }, [loadChapterContent]);

  const prevChapter = useCallback(() => {
    if (!currentChapter || !chapters.length) return;
    const idx = chapters.findIndex(c => c._id === currentChapter.id);
    if (idx > 0) loadChapterContent(chapters[idx - 1]._id);
  }, [currentChapter, chapters, loadChapterContent]);

  const nextChapter = useCallback(() => {
    if (!currentChapter || !chapters.length) return;
    const idx = chapters.findIndex(c => c._id === currentChapter.id);
    if (idx < chapters.length - 1) loadChapterContent(chapters[idx + 1]._id);
  }, [currentChapter, chapters, loadChapterContent]);

  // ========== 阅读器设置 ==========
  const changeFontSize = useCallback((delta: number) => {
    setFontSize(prev => Math.min(24, Math.max(14, prev + delta)));
  }, []);

  const toggleReaderTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
    document.body.classList.toggle('dark-mode');
  }, []);

  // ========== 赞赏（需要登录） ==========
  const handleDonate = useCallback(async () => {
    if (!checkAuth()) return;
    if (!currentPersona || !selectedNovel) {
      toast.error('请先选择角色');
      return;
    }
    if (donateAmount < 1) {
      toast.error('请输入有效的赞赏金额');
      return;
    }
    try {
      await novelApi.donate(selectedNovel._id, donateAmount, donateMessage);
      toast.success(`赞赏成功！送出 ${donateAmount} 钻石`);
      setShowDonateModal(false);
      setDonateAmount(10);
      setDonateMessage('');
    } catch (error: any) {
      toast.error(error.message || '赞赏失败');
    }
  }, [checkAuth, currentPersona, selectedNovel, donateAmount, donateMessage]);

  // ========== 申请成为作者（需要登录） ==========
  const handleApplyAuthor = useCallback(async () => {
    if (!checkAuth()) return;
    if (!currentPersona) {
      toast.error('请先选择角色');
      return;
    }
    try {
      await novelApi.applyAuthor(currentPersona._id);
      toast.success('申请已提交，等待管理员审核');
      setShowApplyModal(false);
      setApplicationStatus('pending');
    } catch (error: any) {
      toast.error(error.message || '申请失败');
    }
  }, [checkAuth, currentPersona]);

  // ========== 检查申请状态（有 token 才加载） ==========
  useEffect(() => {
    const checkStatus = async () => {
      if (!hasToken() || !currentPersona) return;
      try {
        const res = await novelApi.getMyApplication(currentPersona._id);
        setApplicationStatus(res.application?.status || null);
      } catch (error) {
        console.error('检查申请状态失败:', error);
      }
    };
    checkStatus();
  }, [currentPersona, hasToken]);

  // ========== 复制书名 ==========
  const handleCopyTitle = useCallback((title: string) => {
    navigator.clipboard.writeText(title);
    toast.success('书名已复制', { icon: '📋' });
  }, []);

  // ========== 计算阅读进度 ==========
  const currentChapterIndex = currentChapter ? chapters.findIndex(c => c._id === currentChapter.id) : -1;
  const progressPercent = useMemo(() => {
    if (chapters.length > 0 && currentChapterIndex >= 0) {
      return Math.round(((currentChapterIndex + 1) / chapters.length) * 100);
    }
    return 0;
  }, [chapters, currentChapterIndex]);

  // 🆕 如果还没准备好，显示加载状态
  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#f8f4ef' }}>
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" style={{ width: '40px', height: '40px', border: '3px solid #d4a574', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <p className="text-gray-500" style={{ color: '#8a7a6a' }}>加载中...</p>
        </div>
      </div>
    );
  }

  // ========== 渲染 ==========
  return (
    <div className="rp-novel-app">
      {/* 导航栏 - 完整保持不变 */}
      <nav className="navbar">
        <div className="container">
          <div className="logo" onClick={() => window.location.href = '/novel'}>
            <i className="fas fa-book-open"></i>
            <h1>墨香阁</h1>
          </div>
          
          <ul className="nav-links">
            <li><a href="#" className={activeNav === 'home' ? 'active' : ''} onClick={(e) => { e.preventDefault(); scrollToSection('hero', 'home'); }}>首页</a></li>
            <li><a href="#novels" className={activeNav === 'library' ? 'active' : ''} onClick={(e) => { e.preventDefault(); scrollToSection('novels', 'library'); }}>书库</a></li>
            <li><a href="#about" className={activeNav === 'about' ? 'active' : ''} onClick={(e) => { e.preventDefault(); scrollToSection('about', 'about'); }}>关于</a></li>
            <li><a href="#contact" className={activeNav === 'contact' ? 'active' : ''} onClick={(e) => { e.preventDefault(); scrollToSection('contact', 'contact'); }}>联系</a></li>
          </ul>
          
          {/* 右侧用户菜单 */}
          <div className="nav-right">
            {isLoggedIn ? (
              <button 
                className="btn-chat-return" 
                onClick={() => navigate('/chat')}
              >
                <i className="fas fa-comment-dots"></i> 聊天
              </button>
            ) : (
              <button 
                className="btn-login" 
                onClick={() => navigate('/login')}
                style={{
                  background: 'var(--primary-color, #d4a574)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.85';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <i className="fas fa-sign-in-alt"></i> 去登录
              </button>
            )}

            <DiamondBalance size="sm" enabled={isLoggedIn} />
            
            {/* 用户菜单下拉 */}
            <div className="user-menu" ref={userMenuRef}>
              <div className="user-menu-trigger" onClick={() => setShowUserMenu(!showUserMenu)}>
                {isLoggedIn && currentPersona ? (
                  <>
                    <img src={currentPersona.avatar || '/default-avatar.png'} alt={currentPersona.displayName || currentPersona.name} />
                    <span className="persona-name">{currentPersona.displayName || currentPersona.name}</span>
                    <i className={`fas fa-chevron-${showUserMenu ? 'up' : 'down'}`}></i>
                  </>
                ) : (
                  <span className="persona-name">游客 <i className="fas fa-chevron-down"></i></span>
                )}
              </div>
              
              {showUserMenu && (
                <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                  {isLoggedIn ? (
                    <>
                      <div className="current-persona-section">
                        <div className="current-persona-header">
                          <span className="section-title">当前角色</span>
                          <button 
                            className="switch-persona-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPersonaSwitch(true);
                              setShowUserMenu(false);
                            }}
                          >
                            <i className="fas fa-exchange-alt"></i> 切换
                          </button>
                        </div>
                        <div className="current-persona-info">
                          <img 
                            src={currentPersona?.avatar || '/default-avatar.png'} 
                            alt=""
                            className="persona-avatar"
                          />
                          <div className="persona-details">
                            <div className="persona-name">{currentPersona?.displayName || currentPersona?.name || '未选择'}</div>
                            <div className="persona-number">#{currentPersona?.sameNameNumber || '?'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="menu-section">
                        <div className="menu-section-header">
                          <i className="fas fa-user-circle"></i> 个人中心
                        </div>
                        <button className="menu-item" onClick={() => { navigate('/novel/favorites'); setShowUserMenu(false); }}>
                          <i className="fas fa-bookmark"></i>
                          <span>我的收藏</span>
                          {favoritesCount > 0 && <span className="badge">{favoritesCount}</span>}
                        </button>
                        <button className="menu-item" onClick={() => { navigate('/novel/follows'); setShowUserMenu(false); }}>
                          <i className="fas fa-users"></i>
                          <span>我的关注</span>
                          {followsCount > 0 && <span className="badge">{followsCount}</span>}
                        </button>
                        {currentPersona && (
                          <button className="menu-item" onClick={() => { navigate(`/persona/${currentPersona._id}`); setShowUserMenu(false); }}>
                            <i className="fas fa-id-card"></i>
                            <span>我的主页</span>
                          </button>
                        )}
                      </div>

                      {currentPersona?.isAuthor && (
                        <>
                          <div className="menu-divider"></div>
                          <div className="menu-section">
                            <div className="menu-section-header">
                              <i className="fas fa-feather-alt"></i> 作者中心
                            </div>
                            <button className="menu-item author-item" onClick={() => { navigate('/author/dashboard'); setShowUserMenu(false); }}>
                              <i className="fas fa-tachometer-alt"></i>
                              <span>作者控制台</span>
                            </button>
                            <button className="menu-item author-item" onClick={() => { navigate('/novel/create'); setShowUserMenu(false); }}>
                              <i className="fas fa-plus-circle"></i>
                              <span>创建新小说</span>
                            </button>
                          </div>
                        </>
                      )}

                      {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'owner') && (
                        <>
                          <div className="menu-divider"></div>
                          <div className="menu-section">
                            <div className="menu-section-header">
                              <i className="fas fa-shield-alt"></i> 管理面板
                            </div>
                            <button className="menu-item" onClick={() => { navigate('/admin/applications'); setShowUserMenu(false); }}>
                              <i className="fas fa-user-check"></i>
                              <span>作者申请审核</span>
                              {pendingApplicationsCount > 0 && <span className="badge warning">{pendingApplicationsCount}</span>}
                            </button>
                          </div>
                        </>
                      )}

                      <div className="menu-footer">
                        <button className="logout-btn" onClick={handleLogout}>
                          <i className="fas fa-sign-out-alt"></i> 退出登录
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="menu-section">
                        <div className="menu-section-header">
                          <i className="fas fa-info-circle"></i> 访客模式
                        </div>
                        <div className="guest-info" style={{ padding: '12px 16px', color: 'var(--light-text)', fontSize: '14px' }}>
                          <p>您当前以游客身份浏览</p>
                          <p style={{ fontSize: '12px', marginTop: '4px' }}>登录后可收藏、关注、赞赏</p>
                        </div>
                      </div>
                      <div className="menu-footer">
                        <button className="logout-btn" onClick={() => navigate('/login')} style={{ background: 'var(--primary-color)', color: '#fff' }}>
                          <i className="fas fa-sign-in-alt"></i> 去登录
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {showPersonaSwitch && isLoggedIn && (
              <div className="persona-switch-wrapper" ref={personaPanelRef}>
                <PersonaSwitchPanel
                  personas={myPersonas}
                  currentPersona={currentPersona}
                  onSelect={switchPersona}
                  onClose={() => setShowPersonaSwitch(false)}
                  position="bottom"
                  align="right"
                />
              </div>
            )}
            
            <div className="search-box">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="搜索书名或作者..." 
                value={searchKeyword} 
                onChange={(e) => setSearchKeyword(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && loadNovels(true)} 
              />
              {searchKeyword && (
                <button className="clear-search" onClick={() => setSearchKeyword('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 - 完整保持不变 */}
      <main className="container">
        <section className="hero" id="hero">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} />
              <span>书香致远 · 墨韵流长</span>
            </div>
            <h2>墨香阁</h2>
            <p>收录各类优质文学作品，让您在繁忙的生活中寻得一片宁静的阅读天地。<br/>静心阅读，品味文字之美。</p>
            <a href="#novels" className="btn" onClick={(e) => { e.preventDefault(); scrollToSection('novels', 'library'); }}>
              <BookOpen size={16} />
              开始阅读
            </a>
          </div>
          <div className="hero-decoration">
            <div className="ink-splash"></div>
            <div className="chinese-ornament">書</div>
          </div>
        </section>

        <section className="novel-section" id="novels">
          <div className="section-header">
            <h2><i className="fas fa-book"></i> 藏书阁</h2>
            <p>精选优质文学作品，持续更新中</p>
          </div>

          <div className="filters">
            <div className="category-tabs">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  className={`category-tab ${selectedCategory === cat ? 'active' : ''}`} 
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="sort-select">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="novel-grid">
            {loading && novels.length === 0 ? (
              <div className="loading-placeholder">
                <div className="loading-spinner"></div>
                <span>加载中...</span>
              </div>
            ) : novels.length === 0 ? (
              <div className="no-results">
                <Search size={48} />
                <h3>未找到相关作品</h3>
                <p>尝试使用其他关键词搜索</p>
              </div>
            ) : (
              novels.map((novel, index) => (
                <div 
                  key={novel._id} 
                  className="novel-card" 
                  onClick={() => handleOpenNovel(novel._id)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="novel-cover">
                    <i className="fas fa-book"></i>
                    <div className="word-count-badge">{formatWordCount(novel.wordCount)}字</div>
                    {isRecentUpdate(novel.updatedAt) && <div className="update-badge">近期更新</div>}
                  </div>
                  <div className="novel-info">
                    <h3>{novel.title}</h3>
                    <div className="novel-meta">
                      <span><i className="fas fa-user-pen"></i> {novel.authorName}</span>
                      <span><i className="fas fa-calendar-alt"></i> {new Date(novel.updatedAt).toLocaleDateString()}</span>
                      <span><i className="fas fa-file-word"></i> {formatWordCount(novel.wordCount)}</span>
                    </div>
                    <p className="novel-description">{novel.description}</p>
                    <div className="novel-tags">
                      {novel.tags.slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                    <button className="btn-outline read-btn">查看详情</button>
                  </div>
                </div>
              ))
            )}
            {loading && novels.length > 0 && <div className="loading-more">加载更多...</div>}
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="section-header">
            <h2><i className="fas fa-info-circle"></i> 关于墨香阁</h2>
          </div>
          <div className="about-content">
            <div className="about-text">
              <p>墨香阁创建于2025年12月21日，是一个专注于文学作品分享与阅读的静态网站。我们致力于提供优雅、舒适的阅读体验，让读者在数字时代依然能够感受到纸质书籍的质感与温度。</p>
              <p>本站收录的文学作品均为原创或已获得授权，我们尊重每一位作者的创作成果，也欢迎更多作者加入我们，共同打造一个纯净的文学阅读空间。</p>
              <blockquote>
                <p>书卷多情似故人，晨昏忧乐每相亲。</p>
                <footer>—— 于谦《观书》</footer>
              </blockquote>
            </div>
            <div className="about-stats">
              <div className="stat-item">
                <h3>藏书数量</h3>
                <p>{novels.length}</p>
              </div>
              <div className="stat-item">
                <h3>累计字数</h3>
                <p>{formatWordCount(totalWords)}</p>
              </div>
              <div className="stat-item">
                <h3>作品分类</h3>
                <p>6+</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 页脚 */}
      <footer className="footer" id="contact">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <i className="fas fa-book-open"></i>
              <h2>墨香阁</h2>
              <p>优雅阅读，静心品味</p>
            </div>
            <div className="footer-links">
              <h3>快速链接</h3>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('hero', 'home'); }}>首页</a></li>
                <li><a href="#novels" onClick={(e) => { e.preventDefault(); scrollToSection('novels', 'library'); }}>书库</a></li>
                <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about', 'about'); }}>关于我们</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); if (checkAuth()) setShowApplyModal(true); }}>成为作者</a></li>
              </ul>
            </div>
            <div className="footer-contact">
              <h3>联系我们</h3>
              <p><i className="fas fa-envelope"></i> zhoyi.lee@gmail.com</p>
              <p><i className="fas fa-map-marker-alt"></i> 暂时无地址</p>
              <p><i className="fas fa-sync-alt"></i> 本站最后更新: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 墨香阁. 俊毅保留所有权利.</p>
          </div>
        </div>
      </footer>

      {/* 模态框 - 完整保持不变 */}
      {showModal && selectedNovel && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
            <div className="modal-body">
              <div className="modal-novel-cover">
                <div className="cover-placeholder">
                  <i className="fas fa-book"></i>
                  <div className="word-count-badge-large">{formatWordCount(selectedNovel.wordCount)}字</div>
                </div>
              </div>
              <div className="modal-novel-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>{selectedNovel.title}</h2>
                  <button 
                    className="btn-icon-small" 
                    onClick={() => handleCopyTitle(selectedNovel.title)}
                    title="复制书名"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
                <div className="meta-info">
                  <span><i className="fas fa-user-pen"></i> 作者: {selectedNovel.authorName}</span>
                  <span><i className="fas fa-calendar-alt"></i> 更新: {new Date(selectedNovel.updatedAt).toLocaleDateString()}</span>
                  <span><i className="fas fa-tags"></i> {selectedNovel.category}</span>
                  <span><i className="fas fa-layer-group"></i> {selectedNovel.totalChapters}章</span>
                </div>
                
                {isLoggedIn && currentPersona ? (
                  <div className="author-actions">
                    <button className={`btn-follow ${isFollowing ? 'following' : ''}`} onClick={handleToggleFollow}>
                      <i className={`fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}`}></i>
                      {isFollowing ? '已关注' : '关注作者'}
                    </button>
                    <button className="btn-donate" onClick={() => setShowDonateModal(true)}>
                      <i className="fas fa-gem"></i> 赞赏
                    </button>
                  </div>
                ) : (
                  <div className="author-actions login-hint">
                    <span className="text-gray-400 text-sm">
                      <i className="fas fa-lock"></i> 登录后可关注作者和赞赏
                    </span>
                  </div>
                )}

                <div className="novel-stats">
                  <div className="stat-item">
                    <span className="stat-label">总字数</span>
                    <span className="stat-value">{formatWordCount(selectedNovel.wordCount)}字</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">阅读量</span>
                    <span className="stat-value">{selectedNovel.views}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">点赞</span>
                    <span className="stat-value">{selectedNovel.likes}</span>
                  </div>
                </div>

                <p>{selectedNovel.description}</p>
                
                {chapters.length > 0 && (
                  <div className="chapter-list">
                    <h4>章节列表</h4>
                    <div className="chapters">
                      {chapters.slice(0, 10).map((ch, idx) => (
                        <button key={ch._id} className="chapter-item" onClick={() => { setShowModal(false); loadChapterContent(ch._id); setShowReader(true); }}>
                          第{idx + 1}章 {ch.title}
                        </button>
                      ))}
                      {chapters.length > 10 && <span className="more-chapters">共{chapters.length}章，阅读更多请打开阅读器</span>}
                    </div>
                  </div>
                )}
                
                <div className="modal-actions">
                  <button className="btn" onClick={handleStartReading}><i className="fas fa-book-reader"></i> 开始阅读</button>
                  {isLoggedIn && currentPersona && (
                    <button className={`btn-outline ${isFavorited ? 'favorited' : ''}`} onClick={handleToggleFavorite}>
                      <i className="fas fa-bookmark"></i>
                      {isFavorited ? '已收藏' : '加入书签'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReader && selectedNovel && currentChapter && (
        <div 
          className={`modal reader-modal ${isReaderAuthorMode ? 'author-mode' : ''}`}
          style={{ display: 'flex' }}
          onClick={() => setShowReader(false)}
        >
          <div className="reader-content" onClick={(e) => e.stopPropagation()}>
            <div className="reader-header">
              <h2>{selectedNovel.title}</h2>
              <div className="reader-controls-header">
                <select className="chapter-select" value={currentChapter.id} onChange={(e) => changeChapter(e.target.value)}>
                  {chapters.map((ch, idx) => (
                    <option key={ch._id} value={ch._id}>第{idx + 1}章 {ch.title}</option>
                  ))}
                </select>
                <div className="reader-settings">
                  <button className="btn-icon" onClick={() => changeFontSize(-1)} title="减小字体"><i className="fas fa-font"></i> -</button>
                  <button className="btn-icon" onClick={() => changeFontSize(1)} title="增大字体"><i className="fas fa-font"></i> +</button>
                  <button className="btn-icon" onClick={toggleReaderTheme} title="切换主题"><i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i></button>
                </div>
              </div>
              <span className="close-reader" onClick={() => setShowReader(false)}>&times;</span>
            </div>
            <div className="reader-controls">
              <button className="btn-small" onClick={prevChapter} disabled={currentChapterIndex === 0}>
                <i className="fas fa-arrow-left"></i> 上一章
              </button>
              <button className="btn-small" onClick={nextChapter} disabled={currentChapterIndex === chapters.length - 1}>
                下一章 <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            <div className="reader-body">
              <div className="chapter-content" style={{ fontSize: `${fontSize}px` }}>
                <div className="chapter-header">
                  <h3>{currentChapter.title}</h3>
                  <div className="chapter-meta">
                    <span className="chapter-index">第{currentChapter.number}章 / 共{chapters.length}章</span>
                  </div>
                </div>
                <div 
                  className="chapter-text"
                  onCopy={(e) => {
                    if (!isReaderAuthorMode) {
                      e.preventDefault();
                      toast.error('📚 尊重原创，请勿复制', { icon: '📖' });
                      return false;
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!isReaderAuthorMode) {
                      e.preventDefault();
                      return false;
                    }
                  }}
                >
                  {currentChapter.content.split('\n').map((para, idx) => <p key={idx}>{para}</p>)}
                </div>
              </div>
            </div>
            <div className="reader-footer">
              <div className="progress-info">阅读进度: {progressPercent}%</div>
            </div>
          </div>
        </div>
      )}

      {showApplyModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowApplyModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <span className="close-modal" onClick={() => setShowApplyModal(false)}>&times;</span>
            <div className="apply-body" style={{ padding: '30px' }}>
              <h2 style={{ color: 'var(--primary-color)', marginBottom: '20px' }}>申请成为作者</h2>
              {applicationStatus === 'pending' ? (
                <div className="pending-message">
                  <i className="fas fa-clock"></i>
                  <p>您的申请正在审核中，请耐心等待~</p>
                </div>
              ) : applicationStatus === 'approved' ? (
                <div className="approved-message">
                  <i className="fas fa-check-circle"></i>
                  <p>恭喜！您已经是作者了，快去创作吧！</p>
                  <button className="btn" onClick={() => navigate('/author/dashboard')}>进入作者中心</button>
                </div>
              ) : (
                <>
                  <p style={{ marginBottom: '20px', color: 'var(--light-text)' }}>
                    成为作者需要支付 <strong style={{ color: 'var(--primary-color)' }}>10钻石</strong>，审核通过后即可发布小说。
                  </p>
                  <div className="apply-info">
                    <p><i className="fas fa-check-circle"></i> 可创作最多5本小说</p>
                    <p><i className="fas fa-check-circle"></i> 需要管理员审核</p>
                    <p><i className="fas fa-check-circle"></i> 审核通过后会扣除钻石</p>
                  </div>
                  <div className="modal-actions" style={{ marginTop: '30px' }}>
                    <button className="btn-outline" onClick={() => setShowApplyModal(false)}>取消</button>
                    <button className="btn" onClick={handleApplyAuthor}>提交申请</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showDonateModal && selectedNovel && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowDonateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <span className="close-modal" onClick={() => setShowDonateModal(false)}>&times;</span>
            <div className="donate-body" style={{ padding: '30px' }}>
              <h2 style={{ color: 'var(--primary-color)', marginBottom: '20px' }}>赞赏《{selectedNovel.title}》</h2>
              <p style={{ marginBottom: '20px', color: 'var(--light-text)' }}>
                赞赏金额将直接赠送给作者，仅限<strong style={{ color: 'var(--primary-color)' }}>付费钻石</strong>。
              </p>
              <div className="donate-amounts">
                {[5, 10, 20, 50, 100].map(amount => (
                  <button key={amount} className={`donate-amount ${donateAmount === amount ? 'active' : ''}`} onClick={() => setDonateAmount(amount)}>
                    {amount}💎
                  </button>
                ))}
                <div className="custom-amount">
                  <input type="number" placeholder="自定义" value={donateAmount} onChange={(e) => setDonateAmount(parseInt(e.target.value) || 0)} />
                  <span>💎</span>
                </div>
              </div>
              <textarea 
                placeholder="留言（选填）" 
                value={donateMessage} 
                onChange={(e) => setDonateMessage(e.target.value)}
                style={{ width: '100%', marginTop: '20px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)' }}
                rows={3}
              />
              <div className="modal-actions" style={{ marginTop: '30px' }}>
                <button className="btn-outline" onClick={() => setShowDonateModal(false)}>取消</button>
                <button className="btn" onClick={handleDonate}>确认赞赏 {donateAmount}💎</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovelHome;