// client/src/pages/novel/NovelMobileHome.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi, roomApi, authApi, type Persona, type User } from '../../services/api';
import type { Novel } from '../../types/novel';
import { usePersona } from '../../hooks/usePersona';
import DiamondBalance from '../../components/diamond/DiamondBalance';
import PersonaSwitchPanel from '../../components/common/PersonaSwitchPanel';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import { setGlobalAFKDisabled } from '../../contexts/AFKContext';
import '../../styles/novel-mobile.css';

const NovelMobileHome: React.FC = () => {
  const navigate = useNavigate();
  
  // ========== 用户状态 ==========
  const { currentPersona, myPersonas, refresh: refreshPersona } = usePersona();
  const [user, setUser] = useState<User | null>(null);
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

  // ========== 禁用 AFK ==========
  useEffect(() => {
    setGlobalAFKDisabled(true);
    return () => setGlobalAFKDisabled(false);
  }, []);

  // 获取作者ID
  const getAuthorId = (novel: Novel): string => {
    if (typeof novel.authorPersonaId === 'string') return novel.authorPersonaId;
    return novel.authorPersonaId?._id || '';
  };

  // 加载用户信息
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

  // 加载用户统计
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

  useEffect(() => {
    if (currentPersona) loadUserStats();
  }, [currentPersona, loadUserStats]);

  // 切换角色
  const handleSwitchPersona = async (persona: Persona) => {
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
  };

  // 加载小说列表
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
  }, [searchKeyword, selectedCategory, sortBy]);

  useEffect(() => {
    if (page > 1) loadNovels(false);
  }, [page]);

  // 滚动加载
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

  // 打开小说详情
  const handleOpenNovel = async (novelId: string) => {
    try {
      const res = await novelApi.getNovelDetail(novelId);
      setSelectedNovel(res.novel);
      setChapters(res.chapters);
      setShowDetail(true);
      
      if (currentPersona) {
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
  };

  // 收藏/取消收藏
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

  // 关注/取消关注
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

  // 复制书名
  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title);
    toast.success('书名已复制', { icon: '📋' });
  };

  // 开始阅读
  const handleStartReading = async () => {
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
  };

  // 加载章节内容
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
      toast.error('加载章节失败');
    }
  };

  // 切换章节
  const changeChapter = (chapterId: string) => {
    const idx = chapters.findIndex(c => c._id === chapterId);
    if (idx !== -1) {
      setCurrentChapterIndex(idx);
      loadChapterContent(chapterId);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      const newIdx = currentChapterIndex - 1;
      setCurrentChapterIndex(newIdx);
      loadChapterContent(chapters[newIdx]._id);
    }
  };

  const nextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const newIdx = currentChapterIndex + 1;
      setCurrentChapterIndex(newIdx);
      loadChapterContent(chapters[newIdx]._id);
    }
  };

  // 赞赏
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

  // 申请成为作者
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

  // 检查申请状态
  useEffect(() => {
    const checkStatus = async () => {
      if (!currentPersona) return;
      try {
        const res = await novelApi.getMyApplication(currentPersona._id);
        setApplicationStatus(res.application?.status || null);
      } catch (error) {
        console.error('检查申请状态失败:', error);
      }
    };
    checkStatus();
  }, [currentPersona]);

  const formatWordCount = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  };

  const formatTotalWordCount = (count: number) => {
    if (count >= 1000000) return (count / 10000).toFixed(0) + '万';
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  };

  const categories = ['全部', '武侠', '玄幻', '言情', '历史', '悬疑', '科幻', '文学', '其他'];
  const sortOptions = [
    { value: 'latest', label: '最新发布' },
    { value: 'popular', label: '最多阅读' },
    { value: 'likes', label: '最多点赞' },
    { value: 'wordCount', label: '字数最多' }
  ];

  const progressPercent = chapters.length > 0 && currentChapterIndex >= 0 
    ? Math.round(((currentChapterIndex + 1) / chapters.length) * 100) : 0;

  // 退出登录
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setShowMenu(false);
  };

  // 关闭菜单的辅助函数
  const closeMenu = () => setShowMenu(false);

  return (
    <div className="novel-mobile" onClick={closeMenu}>
      {/* 顶部导航栏 - 阻止冒泡防止点击关闭菜单 */}
      <div className="mobile-header" onClick={(e) => e.stopPropagation()}>
        <div className="header-left">
          <div className="logo" onClick={() => window.location.href = '/novel'}>
            <i className="fas fa-book-open"></i>
            <span>墨香阁</span>
          </div>
        </div>
        
        <div className="header-right">
          <DiamondBalance size="sm" />
          
          {/* 角色切换按钮 */}
          <div className="role-switch-btn" onClick={() => setShowSwitchPanel(true)}>
            {currentPersona ? (
              <img src={currentPersona.avatar || '/default-avatar.png'} alt="角色" />
            ) : (
              <i className="fas fa-user-circle"></i>
            )}
          </div>
          
          {/* 菜单按钮 */}
          <div className="menu-btn" onClick={() => setShowMenu(!showMenu)}>
            <i className="fas fa-bars"></i>
          </div>
        </div>
      </div>

      {/* 角色切换面板遮罩 */}
      {showSwitchPanel && (
        <div className="switch-overlay" onClick={() => setShowSwitchPanel(false)}>
          <div className="switch-container" onClick={(e) => e.stopPropagation()}>
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

      {/* 侧边菜单遮罩和菜单 */}
      {showMenu && (
        <>
          <div className="menu-overlay" onClick={closeMenu} />
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            {/* 用户信息 */}
            <div className="menu-user">
              <img src={currentPersona?.avatar || '/default-avatar.png'} alt="" />
              <div className="menu-user-info">
                <div className="name">{currentPersona?.displayName || currentPersona?.name || '未选择角色'}</div>
                <div className="number">#{currentPersona?.sameNameNumber || '?'}</div>
              </div>
            </div>
            
            <div className="menu-divider"></div>
            
            {/* 收藏和关注 */}
            <div className="menu-item" onClick={() => { navigate('/novel/favorites'); closeMenu(); }}>
              <i className="fas fa-bookmark"></i>
              <span>我的收藏</span>
              {favoritesCount > 0 && <span className="badge">{favoritesCount}</span>}
            </div>
            <div className="menu-item" onClick={() => { navigate('/novel/follows'); closeMenu(); }}>
              <i className="fas fa-users"></i>
              <span>我的关注</span>
              {followsCount > 0 && <span className="badge">{followsCount}</span>}
            </div>
            {currentPersona && (
              <div className="menu-item" onClick={() => { navigate(`/persona/${currentPersona._id}`); closeMenu(); }}>
                <i className="fas fa-id-card"></i>
                <span>我的主页</span>
              </div>
            )}
            
            {/* 作者区域 */}
            {currentPersona?.isAuthor && (
              <>
                <div className="menu-divider"></div>
                <div className="menu-item" onClick={() => { navigate('/author/dashboard'); closeMenu(); }}>
                  <i className="fas fa-tachometer-alt"></i>
                  <span>作者控制台</span>
                </div>
                <div className="menu-item" onClick={() => { navigate('/novel/create'); closeMenu(); }}>
                  <i className="fas fa-plus-circle"></i>
                  <span>创建新小说</span>
                </div>
              </>
            )}
            
            {/* 管理员区域 */}
            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'owner') && (
              <>
                <div className="menu-divider"></div>
                <div className="menu-item" onClick={() => { navigate('/admin/applications'); closeMenu(); }}>
                  <i className="fas fa-user-check"></i>
                  <span>作者申请审核</span>
                </div>
              </>
            )}
            
            <div className="menu-divider"></div>
            
            {/* 关于和成为作者 */}
            <div className="menu-item" onClick={() => { scrollToSection('about'); }}>
              <i className="fas fa-info-circle"></i>
              <span>关于墨香阁</span>
            </div>
            <div className="menu-item" onClick={() => { setShowApplyModal(true); closeMenu(); }}>
              <i className="fas fa-feather-alt"></i>
              <span>成为作者</span>
            </div>
            
            <div className="menu-divider"></div>
            
            {/* 退出登录 */}
            <div className="menu-item logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>退出登录</span>
            </div>
          </div>
        </>
      )}

      {/* 搜索栏 */}
      <div className="mobile-search">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="搜索书名或作者..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadNovels(true)}
        />
        {searchKeyword && (
          <button className="clear-btn" onClick={() => setSearchKeyword('')}>
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="mobile-filters">
        <button className="filter-btn" onClick={() => setShowCategorySheet(true)}>
          <span>{selectedCategory}</span>
          <i className="fas fa-chevron-down"></i>
        </button>
        <button className="filter-btn" onClick={() => setShowSortSheet(true)}>
          <span>{sortOptions.find(s => s.value === sortBy)?.label || '最新发布'}</span>
          <i className="fas fa-chevron-down"></i>
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
                  {selectedCategory === cat && <i className="fas fa-check"></i>}
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
                  {opt.label}
                  {sortBy === opt.value && <i className="fas fa-check"></i>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 小说列表 */}
      <div className="mobile-novel-list" id="novels">
        {loading && novels.length === 0 ? (
          <div className="loading-state">加载中...</div>
        ) : novels.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-book-open"></i>
            <p>暂无作品</p>
            <button className="btn-outline" onClick={() => loadNovels(true)}>刷新</button>
          </div>
        ) : (
          <>
            {novels.map(novel => (
              <div key={novel._id} className="mobile-novel-card" onClick={() => handleOpenNovel(novel._id)}>
                <div className="card-cover">
                  <i className="fas fa-book"></i>
                  <div className="word-count">{formatWordCount(novel.wordCount)}字</div>
                </div>
                <div className="card-info">
                  <h3>{novel.title}</h3>
                  <div className="meta">
                    <span><i className="fas fa-user-pen"></i> {novel.authorName}</span>
                    <span><i className="fas fa-calendar-alt"></i> {new Date(novel.updatedAt).toLocaleDateString()}</span>
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
          <i className="fas fa-info-circle"></i>
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
          <i className="fas fa-book-open"></i>
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
              <li><a href="#" onClick={(e) => { e.preventDefault(); setShowApplyModal(true); }}>成为作者</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>联系我们</h4>
            <p><i className="fas fa-envelope"></i> zhoyi.lee@gmail.com</p>
            <p><i className="fas fa-map-marker-alt"></i> 暂时无地址</p>
            <p><i className="fas fa-sync-alt"></i> 本站最后更新: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="footer-bottom-mobile">
          <p>© 2025 墨香阁 · 万物阁 保留所有权利</p>
        </div>
      </footer>

      {/* 底部 Tab 栏 */}
      <div className="mobile-bottom-tab">
        <div className="tab-item active" onClick={() => window.location.href = '/novel'}>
          <i className="fas fa-home"></i>
          <span>书库</span>
        </div>
        <div className="tab-item" onClick={() => window.location.href = '/chat'}>
          <i className="fas fa-comments"></i>
          <span>聊天</span>
        </div>
        <div className="tab-item" onClick={() => window.location.href = '/home'}>
          <i className="fas fa-user"></i>
          <span>我的</span>
        </div>
      </div>

      {/* 小说详情弹窗 */}
      {showDetail && selectedNovel && (
        <div className="detail-overlay" onClick={() => setShowDetail(false)}>
          <div className="mobile-detail" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div className="detail-title">
                <h2>{selectedNovel.title}</h2>
                <button className="copy-btn" onClick={() => handleCopyTitle(selectedNovel.title)}>
                  <i className="fas fa-copy"></i>
                </button>
              </div>
              <button className="close-btn" onClick={() => setShowDetail(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="detail-info">
              <div className="author">{selectedNovel.authorName}</div>
              <div className="meta">
                <span><i className="fas fa-book"></i> {selectedNovel.totalChapters}章</span>
                <span><i className="fas fa-file-word"></i> {formatWordCount(selectedNovel.wordCount)}字</span>
                <span><i className="fas fa-eye"></i> {selectedNovel.views}</span>
              </div>
              <p className="description">{selectedNovel.description}</p>
              
              <div className="action-buttons">
                <button className={`btn-follow ${isFollowing ? 'following' : ''}`} onClick={handleToggleFollow}>
                  <i className={`fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}`}></i>
                  {isFollowing ? '已关注' : '关注作者'}
                </button>
                <button className="btn-donate" onClick={() => setShowDonateModal(true)}>
                  <i className="fas fa-gem"></i> 赞赏
                </button>
              </div>
              
              <button className="btn-start" onClick={handleStartReading}>
                <i className="fas fa-book-reader"></i> 开始阅读
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
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span>{currentChapterIndex + 1} / {chapters.length}</span>
                <button onClick={nextChapter} disabled={currentChapterIndex === chapters.length - 1}>
                  <i className="fas fa-chevron-right"></i>
                </button>
                <button className="close-btn" onClick={() => setShowReader(false)}>
                  <i className="fas fa-times"></i>
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
                <button onClick={() => setIsDarkMode(!isDarkMode)}>
                  <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
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
                <i className="fas fa-clock" style={{ fontSize: '32px', color: 'var(--primary-color)', marginBottom: '16px' }}></i>
                <p>您的申请正在审核中，请耐心等待~</p>
              </>
            ) : applicationStatus === 'approved' ? (
              <>
                <i className="fas fa-check-circle" style={{ fontSize: '32px', color: 'var(--primary-color)', marginBottom: '16px' }}></i>
                <p>恭喜！您已经是作者了</p>
                <button className="btn" onClick={() => navigate('/author/dashboard')}>进入作者中心</button>
              </>
            ) : (
              <>
                <p>成为作者需要支付 <strong>10钻石</strong>，审核通过后即可发布小说。</p>
                <div className="apply-info-small">
                  <p><i className="fas fa-check-circle"></i> 可创作最多5本小说</p>
                  <p><i className="fas fa-check-circle"></i> 需要管理员审核</p>
                  <p><i className="fas fa-check-circle"></i> 审核通过后会扣除钻石</p>
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