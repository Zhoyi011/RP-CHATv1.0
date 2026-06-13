// client/src/pages/novel/NovelHome.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi, roomApi, authApi, type Persona, type User } from '../../services/api';
import type { Novel } from '../../types/novel';
import { usePersona } from '../../hooks/usePersona';
import DiamondBalance from '../../components/diamond/DiamondBalance';
import PersonaSwitchPanel from '../../components/common/PersonaSwitchPanel';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import { setGlobalAFKDisabled } from '../../contexts/AFKContext';
import '../../styles/novel.css';

const NovelHome: React.FC = () => {
  const navigate = useNavigate();
  
  // ========== 用户状态 ==========
  const { currentPersona, myPersonas, refresh: refreshPersona } = usePersona();
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPersonaSwitch, setShowPersonaSwitch] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [followsCount, setFollowsCount] = useState(0);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const personaPanelRef = useRef<HTMLDivElement>(null);
  
  // ========== 小说数据 ==========
  const [novels, setNovels] = useState<Novel[]>([]);
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

  // ========== 禁用 AFK ==========
  useEffect(() => {
    setGlobalAFKDisabled(true);
    return () => setGlobalAFKDisabled(false);
  }, []);

  // ========== 辅助函数 ==========
  const formatWordCount = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  };

  const isRecentUpdate = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  };

  const scrollToSection = (sectionId: string, navName: string) => {
    setActiveNav(navName);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  // 获取作者ID（兼容对象和字符串）
  const getAuthorId = (novel: Novel): string => {
    if (typeof novel.authorPersonaId === 'string') {
      return novel.authorPersonaId;
    }
    return novel.authorPersonaId?._id || '';
  };

  // 获取小说ID（兼容对象和字符串）
  const getNovelId = (favorite: any): string => {
    if (typeof favorite.novelId === 'string') {
      return favorite.novelId;
    }
    return favorite.novelId?._id || '';
  };

  // 获取关注作者ID（兼容对象和字符串）
  const getFollowAuthorId = (follow: any): string => {
    if (typeof follow.authorPersonaId === 'string') {
      return follow.authorPersonaId;
    }
    return follow.authorPersonaId?._id || '';
  };

  // ========== 加载用户信息 ==========
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('加载用户失败:', error);
      }
    };
    loadUser();
  }, []);

  // ========== 加载用户统计数据 ==========
  const loadUserStats = useCallback(async () => {
    if (!currentPersona) return;
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
  }, [currentPersona]);

  // 加载待审核申请数量（管理员/super_admin/owner）
  const loadPendingCount = useCallback(async () => {
    if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'owner') return;
    try {
      const res = await novelApi.getPendingApplications();
      setPendingApplicationsCount(res.applications.filter(a => a.status === 'pending').length);
    } catch (error) {
      console.error('加载待审核数量失败:', error);
    }
  }, [user]);

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
    } catch (error) {
      console.error('加载小说失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, selectedCategory, sortBy, page]);

  useEffect(() => {
    loadNovels(true);
  }, [searchKeyword, selectedCategory, sortBy]);

  useEffect(() => {
    if (page > 1) loadNovels(false);
  }, [page]);

  // ========== 滚动加载更多 ==========
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      const scrollTop = document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollTop + windowHeight >= docHeight - 300) {
        setPage(p => p + 1);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  // 点击外部关闭菜单和角色切换面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 关闭用户菜单
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      // 关闭角色切换面板
      if (personaPanelRef.current && !personaPanelRef.current.contains(e.target as Node)) {
        setShowPersonaSwitch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ========== 退出登录 ==========
  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('lastUsedPersonaId');
      window.location.href = '/';
    } catch (error) {
      toast.error('退出失败');
    }
  };

  // ========== 切换角色 ==========
  const switchPersona = async (persona: Persona) => {
    try {
      await roomApi.setActivePersona(persona._id);
      localStorage.setItem('lastUsedPersonaId', persona._id);
      await refreshPersona();
      setShowPersonaSwitch(false);
      toast.success(`已切换至 ${persona.displayName || persona.name}`);
    } catch (error) {
      toast.error('切换角色失败');
    }
  };

  // ========== 打开小说详情 ==========
  const handleOpenNovel = async (novelId: string) => {
    try {
      const res = await novelApi.getNovelDetail(novelId);
      setSelectedNovel(res.novel);
      setChapters(res.chapters);
      setShowModal(true);
      
      if (currentPersona) {
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
  };

  // ========== 收藏/取消收藏 ==========
  const handleToggleFavorite = async () => {
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
  };

  // ========== 关注/取消关注作者 ==========
  const handleToggleFollow = async () => {
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
  };

  // ========== 开始阅读 ==========
  const handleStartReading = async () => {
    if (!selectedNovel || chapters.length === 0) {
      toast.error('暂无章节');
      return;
    }
    
    // 判断是否是作者
    const isAuthor = currentPersona && 
      (typeof selectedNovel.authorPersonaId === 'string'
        ? selectedNovel.authorPersonaId === currentPersona._id
        : selectedNovel.authorPersonaId?._id === currentPersona._id);
    
    setIsReaderAuthorMode(isAuthor);
    setShowModal(false);
    await loadChapterContent(chapters[0]._id);
    setShowReader(true);
  };

  // ========== 加载章节内容 ==========
  const loadChapterContent = async (chapterId: string) => {
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
  };

  // ========== 章节切换 ==========
  const changeChapter = async (chapterId: string) => {
    await loadChapterContent(chapterId);
  };

  const prevChapter = () => {
    if (!currentChapter || !chapters.length) return;
    const idx = chapters.findIndex(c => c._id === currentChapter.id);
    if (idx > 0) loadChapterContent(chapters[idx - 1]._id);
  };

  const nextChapter = () => {
    if (!currentChapter || !chapters.length) return;
    const idx = chapters.findIndex(c => c._id === currentChapter.id);
    if (idx < chapters.length - 1) loadChapterContent(chapters[idx + 1]._id);
  };

  // ========== 阅读器设置 ==========
  const changeFontSize = (delta: number) => {
    setFontSize(prev => Math.min(24, Math.max(14, prev + delta)));
  };

  const toggleReaderTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };

  // ========== 赞赏 ==========
  const handleDonate = async () => {
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
  };

  // ========== 申请成为作者 ==========
  const handleApplyAuthor = async () => {
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
  };

  // ========== 检查申请状态 ==========
  const checkApplicationStatus = async () => {
    if (!currentPersona) return;
    try {
      const res = await novelApi.getMyApplication(currentPersona._id);
      setApplicationStatus(res.application?.status || null);
    } catch (error) {
      console.error('检查申请状态失败:', error);
    }
  };

  useEffect(() => {
    if (currentPersona) {
      checkApplicationStatus();
    }
  }, [currentPersona]);

  // ========== 复制书名 ==========
  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title);
    toast.success('书名已复制', { icon: '📋' });
  };

  const currentChapterIndex = currentChapter ? chapters.findIndex(c => c._id === currentChapter.id) : -1;
  const progressPercent = chapters.length > 0 && currentChapterIndex >= 0 
    ? Math.round(((currentChapterIndex + 1) / chapters.length) * 100) 
    : 0;

  // ========== 渲染 ==========
  return (
    <div className="rp-novel-app">
      {/* 导航栏 */}
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
            {/* 返回聊天按钮 */}
            <button 
              className="btn-chat-return" 
              onClick={() => navigate('/chat')}
            >
              <i className="fas fa-comment-dots"></i> 聊天
            </button>

            <DiamondBalance size="sm" />
            
            {/* 用户菜单下拉 */}
            <div className="user-menu" ref={userMenuRef}>
              <div className="user-menu-trigger" onClick={() => setShowUserMenu(!showUserMenu)}>
                {currentPersona ? (
                  <>
                    <img src={currentPersona.avatar || '/default-avatar.png'} alt={currentPersona.displayName || currentPersona.name} />
                    <span className="persona-name">{currentPersona.displayName || currentPersona.name}</span>
                    <i className={`fas fa-chevron-${showUserMenu ? 'up' : 'down'}`}></i>
                  </>
                ) : (
                  <span className="persona-name">选择角色 <i className="fas fa-chevron-down"></i></span>
                )}
              </div>
              
              {/* 用户下拉菜单 */}
              {showUserMenu && (
                <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                  {/* 当前角色区块 */}
                  <div className="current-persona-section">
                    <div className="current-persona-header">
                      <span className="section-title">当前角色</span>
                      {/* 🔧 修复：切换按钮添加正确的 onClick 和 stopPropagation */}
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

                  {/* 个人中心 */}
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

                  {/* 作者中心（仅作者可见） */}
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

                  {/* 管理面板（管理员可见） */}
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

                  {/* 底部退出 */}
                  <div className="menu-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i> 退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* 🔧 修复：角色切换面板 - 独立放置在用户菜单外部 */}
            {showPersonaSwitch && (
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
            
            {/* 搜索框 */}
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input 
                type="text" 
                placeholder="搜索书名或作者..." 
                value={searchKeyword} 
                onChange={(e) => setSearchKeyword(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && loadNovels(true)} 
              />
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="container">
        {/* 欢迎区域 */}
        <section className="hero" id="hero">
          <div className="hero-content">
            <h2>书香致远，墨韵流长</h2>
            <p>墨香阁收录各类优质文学作品，让您在繁忙的生活中寻得一片宁静的阅读天地。静心阅读，品味文字之美。</p>
            <a href="#novels" className="btn" onClick={(e) => { e.preventDefault(); scrollToSection('novels', 'library'); }}>开始阅读</a>
          </div>
          <div className="hero-decoration">
            <div className="ink-splash"></div>
            <div className="chinese-ornament">書</div>
          </div>
        </section>

        {/* 小说列表 */}
        <section className="novel-section" id="novels">
          <div className="section-header">
            <h2><i className="fas fa-book"></i> 藏书阁</h2>
            <p>精选优质文学作品，持续更新中</p>
          </div>

          <div className="filters">
            <div className="category-tabs">
              {['全部', '武侠', '玄幻', '言情', '历史', '悬疑', '科幻', '文学', '其他'].map(cat => (
                <button key={cat} className={`category-tab ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="sort-select">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="latest">最新发布</option>
                <option value="popular">最多阅读</option>
                <option value="likes">最多点赞</option>
                <option value="wordCount">字数最多</option>
              </select>
            </div>
          </div>

          <div className="novel-grid">
            {loading && novels.length === 0 ? (
              <div className="loading-placeholder">加载中...</div>
            ) : novels.length === 0 ? (
              <div className="no-results">
                <i className="fas fa-search"></i>
                <h3>未找到相关作品</h3>
                <p>尝试使用其他关键词搜索</p>
              </div>
            ) : (
              novels.map(novel => (
                <div key={novel._id} className="novel-card" onClick={() => handleOpenNovel(novel._id)}>
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

        {/* 关于区域 */}
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
                <li><a href="#" onClick={() => currentPersona ? setShowApplyModal(true) : toast.error('请先选择角色')}>成为作者</a></li>
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

      {/* ========== 模态框 ========== */}
      
      {/* 小说详情模态框 */}
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
                
                <div className="author-actions">
                  <button className={`btn-follow ${isFollowing ? 'following' : ''}`} onClick={handleToggleFollow}>
                    <i className={`fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}`}></i>
                    {isFollowing ? '已关注' : '关注作者'}
                  </button>
                  <button className="btn-donate" onClick={() => setShowDonateModal(true)}>
                    <i className="fas fa-gem"></i> 赞赏
                  </button>
                </div>

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
                  <button className={`btn-outline ${isFavorited ? 'favorited' : ''}`} onClick={handleToggleFavorite}>
                    <i className="fas fa-bookmark"></i>
                    {isFavorited ? '已收藏' : '加入书签'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 阅读器模态框 */}
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

      {/* 作者申请模态框 */}
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

      {/* 赞赏模态框 */}
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