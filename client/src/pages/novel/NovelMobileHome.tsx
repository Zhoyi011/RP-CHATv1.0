// client/src/pages/novel/NovelMobileHome.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi, roomApi, authApi, type Persona, type User } from '../../services/api';
import type { Novel } from '../../types/novel';
import { usePersona } from '../../hooks/usePersona';
import DiamondBalance from '../../components/diamond/DiamondBalance';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import '../../styles/novel-mobile.css';

const NovelMobileHome: React.FC = () => {
  const navigate = useNavigate();
  
  // ========== 用户状态 ==========
  const { currentPersona, myPersonas, refresh: refreshPersona } = usePersona();
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [followsCount, setFollowsCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  
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
  
  // ========== 作者申请 ==========
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  
  // ========== 赞赏 ==========
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState(10);
  const [donateMessage, setDonateMessage] = useState('');

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

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // 开始阅读
  const handleStartReading = async () => {
    if (!selectedNovel || chapters.length === 0) {
      toast.error('暂无章节');
      return;
    }
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
  const changeChapter = async (chapterId: string) => {
    await loadChapterContent(chapterId);
    const idx = chapters.findIndex(c => c._id === chapterId);
    setCurrentChapterIndex(idx);
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

  return (
    <div className="novel-mobile">
      {/* 顶部导航栏 */}
      <div className="mobile-header">
        <div className="header-left">
          <div className="logo" onClick={() => window.location.href = '/novel'}>
            <i className="fas fa-book-open"></i>
            <span>墨香阁</span>
          </div>
        </div>
        
        <div className="header-right">
          <DiamondBalance size="sm" />
          <div className="menu-btn" onClick={() => setShowMenu(!showMenu)} ref={menuRef}>
            {currentPersona ? (
              <img src={currentPersona.avatar || '/default-avatar.png'} alt="" />
            ) : (
              <i className="fas fa-user-circle"></i>
            )}
          </div>
        </div>
      </div>

      {/* 下拉菜单 */}
      {showMenu && (
        <div className="mobile-menu-dropdown">
          <div className="menu-section">
            <div className="menu-user">
              <img src={currentPersona?.avatar || '/default-avatar.png'} alt="" />
              <div className="menu-user-info">
                <div className="name">{currentPersona?.displayName || currentPersona?.name || '未选择角色'}</div>
                <div className="number">#{currentPersona?.sameNameNumber}</div>
              </div>
            </div>
          </div>
          
          <div className="menu-divider"></div>
          
          <div className="menu-section">
            <div className="menu-item" onClick={() => { navigate('/novel/favorites'); setShowMenu(false); }}>
              <i className="fas fa-bookmark"></i>
              <span>我的收藏</span>
              {favoritesCount > 0 && <span className="badge">{favoritesCount}</span>}
            </div>
            <div className="menu-item" onClick={() => { navigate('/novel/follows'); setShowMenu(false); }}>
              <i className="fas fa-users"></i>
              <span>我的关注</span>
              {followsCount > 0 && <span className="badge">{followsCount}</span>}
            </div>
            {currentPersona && (
              <div className="menu-item" onClick={() => { navigate(`/persona/${currentPersona._id}`); setShowMenu(false); }}>
                <i className="fas fa-id-card"></i>
                <span>我的主页</span>
              </div>
            )}
          </div>
          
          {currentPersona?.isAuthor && (
            <>
              <div className="menu-divider"></div>
              <div className="menu-section">
                <div className="menu-item" onClick={() => { navigate('/author/dashboard'); setShowMenu(false); }}>
                  <i className="fas fa-tachometer-alt"></i>
                  <span>作者控制台</span>
                </div>
                <div className="menu-item" onClick={() => { navigate('/novel/create'); setShowMenu(false); }}>
                  <i className="fas fa-plus-circle"></i>
                  <span>创建新小说</span>
                </div>
              </div>
            </>
          )}
          
          {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'owner') && (
            <>
              <div className="menu-divider"></div>
              <div className="menu-section">
                <div className="menu-item" onClick={() => { navigate('/admin/applications'); setShowMenu(false); }}>
                  <i className="fas fa-user-check"></i>
                  <span>作者申请审核</span>
                </div>
              </div>
            </>
          )}
          
          <div className="menu-divider"></div>
          
          <div className="menu-section">
            <div className="menu-item logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>退出登录</span>
            </div>
          </div>
        </div>
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
        <div className="mobile-sheet" onClick={() => setShowCategorySheet(false)}>
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
        <div className="mobile-sheet" onClick={() => setShowSortSheet(false)}>
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
      <div className="mobile-novel-list">
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
        <div className="mobile-detail-overlay" onClick={() => setShowDetail(false)}>
          <div className="mobile-detail" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <h2>{selectedNovel.title}</h2>
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
                <button className="btn-follow" onClick={handleToggleFollow}>
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
        <div className="mobile-reader-overlay" onClick={() => setShowReader(false)}>
          <div className="mobile-reader" onClick={(e) => e.stopPropagation()}>
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
              <div className="chapter-text">
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
        <div className="mobile-modal" onClick={() => setShowApplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>申请成为作者</h3>
            {applicationStatus === 'pending' ? (
              <p>您的申请正在审核中，请耐心等待~</p>
            ) : applicationStatus === 'approved' ? (
              <>
                <p>恭喜！您已经是作者了</p>
                <button className="btn" onClick={() => navigate('/author/dashboard')}>进入作者中心</button>
              </>
            ) : (
              <>
                <p>成为作者需要支付 <strong>10钻石</strong>，审核通过后即可发布小说。</p>
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
        <div className="mobile-modal" onClick={() => setShowDonateModal(false)}>
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