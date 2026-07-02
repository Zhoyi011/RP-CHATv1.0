// client/src/pages/novel/NovelMobileHome.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi, roomApi, authApi } from '../../services/api';
import type { Persona, User as AuthUserType } from '../../services/api';
import type { Novel } from '../../types/novel';
import { usePersona } from '../../hooks/usePersona';
import DiamondBalance from '../../components/diamond/DiamondBalance';
import PersonaSwitchPanel from '../../components/common/PersonaSwitchPanel';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import { setGlobalAFKDisabled } from '../../contexts/AFKContext';
import { 
  ArrowLeft, 
  BookOpen, 
  Search, 
  X, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Heart,
  Menu,
  User,
  Users,
  Bookmark,
  PlusCircle,
  Shield,
  Info,
  LogOut,
  ChevronDown,
  Star,
  Gem,
  Eye,
  Calendar,
  Copy,
  Lock
} from 'lucide-react';
import '../../styles/novel-mobile.css';

// 🔥 在组件外部定义 User 类型别名，避免冲突
type AuthUser = AuthUserType;

const NovelMobileHome: React.FC = () => {
  const navigate = useNavigate();
  
  // ========== 用户状态 ==========
  // 🔥 传入 enabled: true，但 usePersona 内部会检查 isLoggedIn
  const { currentPersona, myPersonas, refresh: refreshPersona, isLoggedIn: personaLoggedIn } = usePersona({ 
    enabled: true 
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [followsCount, setFollowsCount] = useState(0);
  
  // ========== 小说数据 ==========
  const [novels, setNovels] = useState<Novel[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'likes' | 'wordCount'>('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  
  // ========== 小说详情 ==========
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // ========== 阅读器 ==========
  const [showReader, setShowReader] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<{ id: string; content: string; title: string; number: number } | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isReaderAuthorMode, setIsReaderAuthorMode] = useState(false);
  
  // ========== 作者申请 ==========
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  
  // ========== 赞赏 ==========
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState(10);
  const [donateMessage, setDonateMessage] = useState('');
  
  // ========== 统计数据 ==========
  const [stats, setStats] = useState({ novelsCount: 0, totalWords: 0, categoriesCount: 9 });

  // 🔥 使用 usePersona 返回的登录状态
  const isLoggedIn = personaLoggedIn;
  
  // ========== Refs ==========
  const menuRef = useRef<HTMLDivElement>(null);
  const switchPanelRef = useRef<HTMLDivElement>(null);

  // ========== 辅助函数：检查是否有 token ==========
  const hasToken = useCallback(() => {
    return !!localStorage.getItem('token');
  }, []);

  // ========== 禁用 AFK ==========
  useEffect(() => {
    setGlobalAFKDisabled(true);
    return () => setGlobalAFKDisabled(false);
  }, []);

  // ========== Memoized 数据 ==========
  const categories = useMemo(() => 
    ['全部', '武侠', '玄幻', '言情', '历史', '悬疑', '科幻', '文学', '其他'],
  []);

  const sortOptions = useMemo(() => [
    { value: 'latest', label: '最新发布', icon: <Clock size={14} /> },
    { value: 'popular', label: '最多阅读', icon: <TrendingUp size={14} /> },
    { value: 'likes', label: '最多点赞', icon: <Heart size={14} /> },
    { value: 'wordCount', label: '字数最多', icon: <BookOpen size={14} /> },
  ], []);

  // ========== 辅助函数 ==========
  const getAuthorId = useCallback((novel: Novel): string => {
    if (typeof novel.authorPersonaId === 'string') return novel.authorPersonaId;
    return novel.authorPersonaId?._id || '';
  }, []);

  const formatWordCount = useCallback((count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  }, []);

  const formatTotalWordCount = useCallback((count: number) => {
    if (count >= 1000000) return (count / 10000).toFixed(0) + '万';
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  }, []);

  // ========== 返回按钮 ==========
  const handleBack = useCallback(() => {
    if (isLoggedIn) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  // ========== 检查登录 ==========
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

  // ========== 加载用户统计（有 token 才加载） ==========
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
      if (error instanceof Error && (error.message?.includes('token') || error.message?.includes('登录'))) {
        localStorage.removeItem('token');
      }
    }
  }, [currentPersona, hasToken]);

  useEffect(() => {
    if (currentPersona) loadUserStats();
  }, [currentPersona, loadUserStats]);

  // ========== 切换角色 ==========
  const handleSwitchPersona = useCallback(async (persona: Persona) => {
    if (!checkAuth()) return;
    try {
      await roomApi.setActivePersona(persona._id);
      localStorage.setItem('lastUsedPersonaId', persona._id);
      await refreshPersona();
      toast.success(`已切换至 ${persona.displayName || persona.name}`);
      window.dispatchEvent(new CustomEvent('personaChanged', { detail: persona }));
      setShowSwitchPanel(false);
    } catch (error) {
      toast.error('切换失败');
    }
  }, [refreshPersona, checkAuth]);

  // ========== 加载小说列表 ==========
  const loadNovels = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    try {
      const params: any = { limit: 15, page: reset ? 1 : page, sort: sortBy };
      if (searchKeyword) params.search = searchKeyword;
      if (selectedCategory !== '全部') params.category = selectedCategory;
      const res = await novelApi.getNovels(params);
      if (reset) {
        setNovels(res.novels);
      } else {
        setNovels(prev => [...prev, ...res.novels]);
      }
      setHasMore(res.pagination.page < res.pagination.pages);
      if (reset) setPage(1);
      
      const total = res.novels.reduce((sum, n) => sum + (n.wordCount || 0), 0);
      setTotalWords(prev => reset ? total : prev + total);
      setStats(prev => ({
        ...prev,
        novelsCount: res.pagination.total || res.novels.length,
        totalWords: reset ? total : prev.totalWords + total
      }));
    } catch (error) {
      console.error('加载小说失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, selectedCategory, sortBy, page]);

  useEffect(() => {
    loadNovels(true);
  }, [searchKeyword, selectedCategory, sortBy, loadNovels]);

  useEffect(() => {
    if (page > 1) loadNovels(false);
  }, [page, loadNovels]);

  // ========== 滚动加载 ==========
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      const scrollTop = document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollTop + windowHeight >= docHeight - 200) {
        setPage(p => p + 1);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  // ========== 点击外部关闭菜单 ==========
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (switchPanelRef.current && !switchPanelRef.current.contains(e.target as Node)) {
        setShowSwitchPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ========== 打开小说详情 ==========
  const handleOpenNovel = useCallback(async (novelId: string) => {
    try {
      const res = await novelApi.getNovelDetail(novelId);
      setSelectedNovel(res.novel);
      setChapters(res.chapters);
      setShowDetail(true);
      
      // 🔥 只有登录且有角色时才查询收藏/关注状态
      if (isLoggedIn && currentPersona) {
        try {
          const favRes = await novelApi.getMyFavorites(currentPersona._id);
          setIsFavorited(favRes.favorites.some(f => {
            if (typeof f.novelId === 'string') return f.novelId === novelId;
            return f.novelId?._id === novelId;
          }));
        } catch (e) {}
        
        try {
          const followRes = await novelApi.getMyFollows(currentPersona._id);
          const authorId = getAuthorId(res.novel);
          setIsFollowing(followRes.follows.some(f => {
            const id = typeof f.authorPersonaId === 'string' ? f.authorPersonaId : f.authorPersonaId?._id;
            return id === authorId;
          }));
        } catch (e) {}
      }
    } catch (error) {
      toast.error('加载失败');
    }
  }, [currentPersona, getAuthorId, isLoggedIn]);

  // ========== 收藏（需要登录） ==========
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

  // ========== 关注（需要登录） ==========
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

  // ========== 复制书名 ==========
  const handleCopyTitle = useCallback((title: string) => {
    navigator.clipboard.writeText(title);
    toast.success('书名已复制', { icon: '📋' });
  }, []);

  // ========== 开始阅读（公开） ==========
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
    setShowDetail(false);
    setCurrentChapterIndex(0);
    await loadChapterContent(chapters[0]._id);
    setShowReader(true);
  }, [selectedNovel, chapters, currentPersona]);

  // ========== 加载章节 ==========
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
      toast.error('加载章节失败');
    }
  }, [selectedNovel]);

  // ========== 章节切换 ==========
  const changeChapter = useCallback((chapterId: string) => {
    const idx = chapters.findIndex(c => c._id === chapterId);
    if (idx !== -1) {
      setCurrentChapterIndex(idx);
      loadChapterContent(chapterId);
    }
  }, [chapters, loadChapterContent]);

  const prevChapter = useCallback(() => {
    if (currentChapterIndex > 0) {
      const newIdx = currentChapterIndex - 1;
      setCurrentChapterIndex(newIdx);
      loadChapterContent(chapters[newIdx]._id);
    }
  }, [currentChapterIndex, chapters, loadChapterContent]);

  const nextChapter = useCallback(() => {
    if (currentChapterIndex < chapters.length - 1) {
      const newIdx = currentChapterIndex + 1;
      setCurrentChapterIndex(newIdx);
      loadChapterContent(chapters[newIdx]._id);
    }
  }, [currentChapterIndex, chapters, loadChapterContent]);

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

  // ========== 申请作者（需要登录） ==========
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
        if (error instanceof Error && (error.message?.includes('token') || error.message?.includes('登录'))) {
          localStorage.removeItem('token');
        }
      }
    };
    checkStatus();
  }, [currentPersona, hasToken]);

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

  // ========== 滚动到指定区域 ==========
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setShowMenu(false);
  }, []);

  // ========== 计算阅读进度 ==========
  const progressPercent = useMemo(() => {
    if (chapters.length > 0 && currentChapterIndex >= 0) {
      return Math.round(((currentChapterIndex + 1) / chapters.length) * 100);
    }
    return 0;
  }, [chapters, currentChapterIndex]);

  // ========== 渲染 ==========
  return (
    <div className="novel-mobile">
      {/* 顶部导航栏 */}
      <div className="mobile-header">
        <div className="header-left">
          <button 
            className="back-btn"
            onClick={handleBack}
            title={isLoggedIn ? "返回聊天" : "返回登录"}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="logo" onClick={() => window.location.href = '/novel'}>
            <BookOpen size={18} />
            <span>墨香阁</span>
          </div>
        </div>
        
        <div className="header-right">
          {/* 🔥 只有登录才显示钻石余额 */}
          <DiamondBalance size="sm" enabled={isLoggedIn} />
          
          {/* 🔥 只有登录才显示角色切换按钮 */}
          {isLoggedIn && (
            <button 
              className="role-switch-btn" 
              onClick={() => setShowSwitchPanel(true)}
              aria-label="切换角色"
            >
              {currentPersona ? (
                <img src={currentPersona.avatar || '/default-avatar.png'} alt="角色" />
              ) : (
                <User size={20} />
              )}
            </button>
          )}
          
          <button 
            className="menu-btn" 
            onClick={() => setShowMenu(!showMenu)}
            aria-label="菜单"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* 角色切换面板遮罩 - 只有登录才显示 */}
      {showSwitchPanel && isLoggedIn && (
        <div className="switch-overlay" onClick={() => setShowSwitchPanel(false)}>
          <div className="switch-container" ref={switchPanelRef} onClick={(e) => e.stopPropagation()}>
            <PersonaSwitchPanel
              personas={myPersonas}
              currentPersona={currentPersona}
              onSelect={handleSwitchPersona}
              onClose={() => setShowSwitchPanel(false)}
              position="bottom"
              align="left"
            />
          </div>
        </div>
      )}

      {/* 侧边菜单 */}
      {showMenu && (
        <>
          <div className="menu-overlay" onClick={() => setShowMenu(false)} />
          <div className="mobile-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            {isLoggedIn ? (
              // 🔥 登录用户菜单
              <>
                <div className="menu-user">
                  <img src={currentPersona?.avatar || '/default-avatar.png'} alt="" />
                  <div className="menu-user-info">
                    <div className="name">{currentPersona?.displayName || currentPersona?.name || '未选择角色'}</div>
                    <div className="number">#{currentPersona?.sameNameNumber || '?'}</div>
                  </div>
                </div>
                
                <div className="menu-divider"></div>
                
                <button className="menu-item" onClick={() => { navigate('/novel/favorites'); setShowMenu(false); }}>
                  <Bookmark size={18} />
                  <span>我的收藏</span>
                  {favoritesCount > 0 && <span className="badge">{favoritesCount}</span>}
                </button>
                <button className="menu-item" onClick={() => { navigate('/novel/follows'); setShowMenu(false); }}>
                  <Users size={18} />
                  <span>我的关注</span>
                  {followsCount > 0 && <span className="badge">{followsCount}</span>}
                </button>
                {currentPersona && (
                  <button className="menu-item" onClick={() => { navigate(`/persona/${currentPersona._id}`); setShowMenu(false); }}>
                    <User size={18} />
                    <span>我的主页</span>
                  </button>
                )}
                
                {currentPersona?.isAuthor && (
                  <>
                    <div className="menu-divider"></div>
                    <button className="menu-item" onClick={() => { navigate('/author/dashboard'); setShowMenu(false); }}>
                      <Star size={18} />
                      <span>作者控制台</span>
                    </button>
                    <button className="menu-item" onClick={() => { navigate('/novel/create'); setShowMenu(false); }}>
                      <PlusCircle size={18} />
                      <span>创建新小说</span>
                    </button>
                  </>
                )}
                
                {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'owner') && (
                  <>
                    <div className="menu-divider"></div>
                    <button className="menu-item" onClick={() => { navigate('/admin/applications'); setShowMenu(false); }}>
                      <Shield size={18} />
                      <span>作者申请审核</span>
                    </button>
                  </>
                )}
                
                <div className="menu-divider"></div>
                
                <button className="menu-item" onClick={() => { scrollToSection('about'); }}>
                  <Info size={18} />
                  <span>关于墨香阁</span>
                </button>
                <button className="menu-item" onClick={() => { 
                  if (checkAuth()) {
                    setShowApplyModal(true);
                    setShowMenu(false);
                  }
                }}>
                  <Sparkles size={18} />
                  <span>成为作者</span>
                </button>
                
                <div className="menu-divider"></div>
                
                <button className="menu-item logout" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>退出登录</span>
                </button>
              </>
            ) : (
              // 🔥 游客菜单
              <>
                <div className="menu-user">
                  <div className="menu-user-info">
                    <div className="name">游客</div>
                    <div className="number">登录后可解锁更多功能</div>
                  </div>
                </div>
                
                <div className="menu-divider"></div>
                
                <button className="menu-item" onClick={() => { scrollToSection('about'); setShowMenu(false); }}>
                  <Info size={18} />
                  <span>关于墨香阁</span>
                </button>
                
                <div className="menu-divider"></div>
                
                <button className="menu-item" onClick={() => { navigate('/login'); setShowMenu(false); }} style={{ color: 'var(--primary-color)' }}>
                  <LogOut size={18} />
                  <span>去登录</span>
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* 搜索栏 */}
      <div className="mobile-search">
        <Search size={18} />
        <input
          type="text"
          placeholder="搜索书名或作者..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadNovels(true)}
        />
        {searchKeyword && (
          <button className="clear-btn" onClick={() => setSearchKeyword('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="mobile-filters">
        <button className="filter-btn" onClick={() => setShowCategorySheet(true)}>
          <span>{selectedCategory}</span>
          <ChevronDown size={14} />
        </button>
        <button className="filter-btn" onClick={() => setShowSortSheet(true)}>
          <span>{sortOptions.find(s => s.value === sortBy)?.label || '最新发布'}</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* 分类选择面板 */}
      {showCategorySheet && (
        <div className="sheet-overlay" onClick={() => setShowCategorySheet(false)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <span>选择分类</span>
              <button onClick={() => setShowCategorySheet(false)}>完成</button>
            </div>
            <div className="sheet-list">
              {categories.map(cat => (
                <div
                  key={cat}
                  className={`sheet-item ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowCategorySheet(false);
                  }}
                >
                  {cat}
                  {selectedCategory === cat && <Star size={16} className="check-icon" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 排序选择面板 */}
      {showSortSheet && (
        <div className="sheet-overlay" onClick={() => setShowSortSheet(false)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <span>排序方式</span>
              <button onClick={() => setShowSortSheet(false)}>完成</button>
            </div>
            <div className="sheet-list">
              {sortOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`sheet-item ${sortBy === opt.value ? 'active' : ''}`}
                  onClick={() => {
                    setSortBy(opt.value as any);
                    setShowSortSheet(false);
                  }}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                  {sortBy === opt.value && <Star size={16} className="check-icon" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 小说列表 */}
      <div className="mobile-novel-list" id="novels">
        {loading && novels.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>加载中...</span>
          </div>
        ) : novels.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <p>暂无作品</p>
            <button className="btn-outline" onClick={() => loadNovels(true)}>刷新</button>
          </div>
        ) : (
          <>
            {novels.map((novel) => (
              <div 
                key={novel._id} 
                className="mobile-novel-card" 
                onClick={() => handleOpenNovel(novel._id)}
              >
                <div className="card-cover">
                  <BookOpen size={24} />
                  <div className="word-count">{formatWordCount(novel.wordCount)}字</div>
                </div>
                <div className="card-info">
                  <h3>{novel.title}</h3>
                  <div className="meta">
                    <span><User size={12} /> {novel.authorName}</span>
                    <span><Calendar size={12} /> {new Date(novel.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="description">{novel.description}</p>
                  <div className="tags">
                    {novel.tags.slice(0, 2).map(tag => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                </div>
              </div>
            ))}
            {loading && novels.length > 0 && <div className="loading-more">加载更多...</div>}
          </>
        )}
      </div>

      {/* 关于区域 */}
      <div className="about-section-mobile" id="about">
        <div className="section-header-mobile">
          <Info size={18} />
          <h3>关于墨香阁</h3>
        </div>
        <div className="about-content-mobile">
          <div className="about-text-mobile">
            <p>墨香阁创建于2025年12月21日，是一个专注于文学作品分享与阅读的静态网站。我们致力于提供优雅、舒适的阅读体验，让读者在数字时代依然能够感受到纸质书籍的质感与温度。</p>
            <p>本站收录的文学作品均为原创或已获得授权，我们尊重每一位作者的创作成果，也欢迎更多作者加入我们，共同打造一个纯净的文学阅读空间。</p>
            <div className="about-quote">
              <p>"书卷多情似故人，晨昏忧乐每相亲。"</p>
              <span>—— 于谦《观书》</span>
            </div>
          </div>
          <div className="about-stats-mobile">
            <div className="stat-item-mobile">
              <h4>藏书数量</h4>
              <p className="stat-number">{stats.novelsCount}</p>
            </div>
            <div className="stat-item-mobile">
              <h4>累计字数</h4>
              <p className="stat-number">{formatTotalWordCount(stats.totalWords)}</p>
            </div>
            <div className="stat-item-mobile">
              <h4>作品分类</h4>
              <p className="stat-number">{stats.categoriesCount}+</p>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="footer-mobile" id="contact">
        <div className="footer-logo-mobile">
          <BookOpen size={24} />
          <h3>墨香阁</h3>
          <p>优雅阅读，静心品味</p>
        </div>
        <div className="footer-links-mobile">
          <div className="footer-col">
            <h4>快速链接</h4>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>首页</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('novels'); }}>书库</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>关于我们</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); if (checkAuth()) setShowApplyModal(true); }}>成为作者</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>联系我们</h4>
            <p><a href="mailto:zhoyi.lee@gmail.com">📧 zhoyi.lee@gmail.com</a></p>
            <p><span>📱 暂时无地址</span></p>
            <p><span>🔄 本站最后更新: {new Date().toLocaleDateString()}</span></p>
          </div>
        </div>
        <div className="footer-bottom-mobile">
          <p>© 2025 墨香阁 · 万物阁 保留所有权利</p>
        </div>
      </footer>

      {/* 底部 Tab 栏 */}
      <div className="mobile-bottom-tab">
        <button className="tab-item active" onClick={() => window.location.href = '/novel'}>
          <BookOpen size={18} />
          <span>书库</span>
        </button>
        <button className="tab-item" onClick={() => window.location.href = '/chat'}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>聊天</span>
        </button>
        <button className="tab-item" onClick={() => window.location.href = '/home'}>
          <User size={18} />
          <span>我的</span>
        </button>
      </div>

      {/* 小说详情弹窗 */}
      {showDetail && selectedNovel && (
        <div className="detail-overlay" onClick={() => setShowDetail(false)}>
          <div className="mobile-detail" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div className="detail-title">
                <h2>{selectedNovel.title}</h2>
                <button className="copy-btn" onClick={() => handleCopyTitle(selectedNovel.title)}>
                  <Copy size={16} />
                </button>
              </div>
              <button className="close-btn" onClick={() => setShowDetail(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="detail-info">
              <div className="author"><User size={14} /> {selectedNovel.authorName}</div>
              <div className="meta">
                <span><BookOpen size={12} /> {selectedNovel.totalChapters}章</span>
                <span><Gem size={12} /> {formatWordCount(selectedNovel.wordCount)}字</span>
                <span><Eye size={12} /> {selectedNovel.views}</span>
              </div>
              <p className="description">{selectedNovel.description}</p>
              
              {isLoggedIn && currentPersona ? (
                <div className="action-buttons">
                  <button className={`btn-follow ${isFollowing ? 'following' : ''}`} onClick={handleToggleFollow}>
                    <Users size={16} />
                    {isFollowing ? '已关注' : '关注作者'}
                  </button>
                  <button className="btn-donate" onClick={() => setShowDonateModal(true)}>
                    <Gem size={16} /> 赞赏
                  </button>
                </div>
              ) : (
                <div className="action-buttons login-hint">
                  <span className="text-gray-400 text-sm">
                    <Lock size={14} /> 登录后可关注作者和赞赏
                  </span>
                </div>
              )}
              
              <button className="btn-start" onClick={handleStartReading}>
                <BookOpen size={16} /> 开始阅读
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 阅读器 */}
      {showReader && selectedNovel && currentChapter && (
        <div className="reader-overlay" onClick={() => setShowReader(false)}>
          <div className={`mobile-reader ${isReaderAuthorMode ? 'author-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="reader-header">
              <div className="reader-title">{selectedNovel.title}</div>
              <div className="reader-controls">
                <button onClick={prevChapter} disabled={currentChapterIndex === 0}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span>{currentChapterIndex + 1} / {chapters.length}</span>
                <button onClick={nextChapter} disabled={currentChapterIndex === chapters.length - 1}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button className="close-btn" onClick={() => setShowReader(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="reader-content" style={{ fontSize: `${fontSize}px` }}>
              <h3>{currentChapter.title}</h3>
              <div 
                className="chapter-text"
                onCopy={(e) => {
                  if (!isReaderAuthorMode) {
                    e.preventDefault();
                    toast.error('📚 尊重原创，请勿复制', { icon: '📖' });
                  }
                }}
                onContextMenu={(e) => {
                  if (!isReaderAuthorMode) {
                    e.preventDefault();
                  }
                }}
              >
                {currentChapter.content.split('\n').map((para, idx) => <p key={idx}>{para}</p>)}
              </div>
            </div>
            <div className="reader-footer">
              <div className="progress">阅读进度: {progressPercent}%</div>
              <div className="font-controls">
                <button onClick={() => setFontSize(prev => Math.max(14, prev - 2))}>A-</button>
                <button onClick={() => setFontSize(prev => Math.min(24, prev + 2))}>A+</button>
                <button onClick={() => setIsDarkMode(prev => !prev)}>
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 作者申请弹窗 */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>申请成为作者</h3>
            {applicationStatus === 'pending' ? (
              <>
                <Clock size={32} style={{ color: 'var(--primary-color)', marginBottom: '16px' }} />
                <p>您的申请正在审核中，请耐心等待~</p>
              </>
            ) : applicationStatus === 'approved' ? (
              <>
                <Star size={32} style={{ color: 'var(--primary-color)', marginBottom: '16px' }} />
                <p>恭喜！您已经是作者了</p>
                <button className="btn" onClick={() => navigate('/author/dashboard')}>进入作者中心</button>
              </>
            ) : (
              <>
                <p>成为作者需要支付 <strong>10钻石</strong>，审核通过后即可发布小说。</p>
                <div className="apply-info-small">
                  <p><span>✅</span> 可创作最多5本小说</p>
                  <p><span>✅</span> 需要管理员审核</p>
                  <p><span>✅</span> 审核通过后会扣除钻石</p>
                </div>
                <div className="modal-actions">
                  <button className="btn-outline" onClick={() => setShowApplyModal(false)}>取消</button>
                  <button className="btn" onClick={handleApplyAuthor}>提交申请</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 赞赏弹窗 */}
      {showDonateModal && (
        <div className="modal-overlay" onClick={() => setShowDonateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>赞赏《{selectedNovel?.title}》</h3>
            <div className="donate-amounts">
              {[5, 10, 20, 50, 100].map(amount => (
                <button
                  key={amount}
                  className={`amount-btn ${donateAmount === amount ? 'active' : ''}`}
                  onClick={() => setDonateAmount(amount)}
                >
                  {amount}💎
                </button>
              ))}
            </div>
            <textarea
              placeholder="留言（选填）"
              value={donateMessage}
              onChange={(e) => setDonateMessage(e.target.value)}
              rows={2}
            />
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowDonateModal(false)}>取消</button>
              <button className="btn" onClick={handleDonate}>确认赞赏</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovelMobileHome;