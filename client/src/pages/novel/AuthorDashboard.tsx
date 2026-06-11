// client/src/pages/novel/AuthorDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi, roomApi } from '../../services/api';
import { usePersona } from '../../hooks/usePersona';
import type { Novel } from '../../types/novel';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

const AuthorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentPersona, refresh: refreshPersona } = usePersona();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [novelSlots, setNovelSlots] = useState(5);
  const [createdCount, setCreatedCount] = useState(0);
  const [showExpandModal, setShowExpandModal] = useState(false);

  // 检查是否是作者
  useEffect(() => {
    if (currentPersona && !currentPersona.isAuthor) {
      toast.error('您还不是作者，请先申请');
      navigate('/novel');
    }
  }, [currentPersona, navigate]);

  // 加载我的小说
  useEffect(() => {
    const loadMyNovels = async () => {
      if (!currentPersona) return;
      try {
        const res = await novelApi.getMyNovels(currentPersona._id);
        setNovels(res.novels);
        setNovelSlots(res.novelSlots);
        setCreatedCount(res.createdNovelCount);
      } catch (error) {
        console.error('加载小说失败:', error);
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadMyNovels();
  }, [currentPersona]);

  // 扩展创作名额
  const handleExpandSlot = async () => {
    if (!currentPersona) return;
    try {
      const res = await novelApi.expandNovelSlot(currentPersona._id);
      setNovelSlots(res.novelSlots);
      setCreatedCount(res.createdNovelCount);
      setShowExpandModal(false);
      toast.success('扩展成功！新增1个创作名额');
    } catch (error: any) {
      toast.error(error.message || '扩展失败');
    }
  };

  // 删除小说
  const handleDeleteNovel = async (novelId: string) => {
    if (!confirm('确定要删除这部小说吗？所有章节也会被删除。')) return;
    try {
      await novelApi.deleteNovel(novelId);
      setNovels(prev => prev.filter(n => n._id !== novelId));
      setCreatedCount(prev => prev - 1);
      toast.success('小说已删除');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  };

  const remainingSlots = novelSlots - createdCount;

  return (
    <div className="rp-novel-app author-dashboard">
      {/* 复用相同的导航栏（简化版） */}
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <i className="fas fa-book-open"></i>
            <h1>墨香阁 - 作者中心</h1>
          </div>
          <button className="btn-outline" onClick={() => navigate('/novel')}>
            <i className="fas fa-arrow-left"></i> 返回书库
          </button>
        </div>
      </nav>

      <main className="container">
        {/* 作者信息卡片 */}
        <div className="author-info-card">
          <div className="author-avatar">
            <img src={currentPersona?.avatar || '/default-avatar.png'} alt={currentPersona?.displayName} />
          </div>
          <div className="author-details">
            <h2>{currentPersona?.displayName || currentPersona?.name}</h2>
            <p className="author-bio">{currentPersona?.description}</p>
          </div>
        </div>

        {/* 创作统计 */}
        <div className="stats-cards">
          <div className="stat-card">
            <i className="fas fa-book"></i>
            <div className="stat-info">
              <span className="stat-value">{createdCount}</span>
              <span className="stat-label">已创作</span>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-plus-circle"></i>
            <div className="stat-info">
              <span className="stat-value">{remainingSlots}</span>
              <span className="stat-label">剩余名额</span>
            </div>
            {remainingSlots === 0 && (
              <button className="btn-expand" onClick={() => setShowExpandModal(true)}>
                <i className="fas fa-gem"></i> 扩展名额
              </button>
            )}
          </div>
          <div className="stat-card">
            <i className="fas fa-users"></i>
            <div className="stat-info">
              <span className="stat-value">{currentPersona?.followersCount || 0}</span>
              <span className="stat-label">粉丝</span>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-gem"></i>
            <div className="stat-info">
              <span className="stat-value">{currentPersona?.totalDonationIncome || 0}</span>
              <span className="stat-label">赞赏收入</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="dashboard-actions">
          <button className="btn" onClick={() => navigate('/novel/create')}>
            <i className="fas fa-plus"></i> 创建新小说
          </button>
        </div>

        {/* 小说列表 */}
        <div className="my-novels">
          <h3><i className="fas fa-book"></i> 我的作品</h3>
          {loading ? (
            <div className="loading-placeholder">加载中...</div>
          ) : novels.length === 0 ? (
            <div className="no-results">
              <i className="fas fa-pen-fancy"></i>
              <p>还没有作品，点击上方按钮创建第一部小说吧！</p>
            </div>
          ) : (
            <div className="novel-manage-list">
              {novels.map(novel => (
                <div key={novel._id} className="novel-manage-item">
                  <div className="novel-manage-info">
                    <h4>{novel.title}</h4>
                    <div className="novel-manage-meta">
                      <span><i className="fas fa-layer-group"></i> {novel.totalChapters}章</span>
                      <span><i className="fas fa-file-word"></i> {formatWordCount(novel.wordCount)}字</span>
                      <span><i className="fas fa-eye"></i> {novel.views}阅读</span>
                      <span className={`status ${novel.status === '连载' ? 'ongoing' : 'completed'}`}>
                        {novel.status}
                      </span>
                    </div>
                  </div>
                  <div className="novel-manage-actions">
                    <button className="btn-small" onClick={() => navigate(`/novel/edit/${novel._id}`)}>
                      <i className="fas fa-edit"></i> 编辑
                    </button>
                    <button className="btn-small" onClick={() => navigate(`/novel/${novel._id}/chapters`)}>
                      <i className="fas fa-list"></i> 管理章节
                    </button>
                    <button className="btn-small danger" onClick={() => handleDeleteNovel(novel._id)}>
                      <i className="fas fa-trash"></i> 删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 扩展名额模态框 */}
      {showExpandModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowExpandModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <span className="close-modal" onClick={() => setShowExpandModal(false)}>&times;</span>
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <i className="fas fa-gem" style={{ fontSize: '48px', color: 'var(--primary-color)', marginBottom: '20px' }}></i>
              <h3 style={{ marginBottom: '15px' }}>扩展创作名额</h3>
              <p style={{ marginBottom: '20px', color: 'var(--light-text)' }}>
                花费 <strong style={{ color: 'var(--primary-color)' }}>10钻石</strong> 增加1个创作名额
              </p>
              <div className="modal-actions">
                <button className="btn-outline" onClick={() => setShowExpandModal(false)}>取消</button>
                <button className="btn" onClick={handleExpandSlot}>确认扩展</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorDashboard;