// client/src/pages/novel/ChapterManage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { novelApi } from '../../services/api';
import { usePersona } from '../../hooks/usePersona';
import type { Novel, Chapter } from '../../types/novel';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

const ChapterManage: React.FC = () => {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { currentPersona } = usePersona();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载小说和章节
  useEffect(() => {
    const fetchData = async () => {
      if (!novelId) return;
      try {
        const novelRes = await novelApi.getNovelDetail(novelId);
        setNovel(novelRes.novel);
        
        const chaptersRes = await novelApi.getAuthorChapters(novelId);
        setChapters(chaptersRes.chapters);
      } catch (error) {
        console.error('加载失败:', error);
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [novelId]);

  // 删除章节
  const handleDeleteChapter = async (chapterId: string, chapterNumber: number) => {
    if (!confirm(`确定要删除第 ${chapterNumber} 章吗？此操作不可恢复。`)) return;
    try {
      await novelApi.deleteChapter(chapterId);
      setChapters(prev => prev.filter(c => c._id !== chapterId));
      toast.success('章节已删除');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  };

  if (loading) {
    return (
      <div className="rp-novel-app">
        <div className="loading-placeholder">加载中...</div>
      </div>
    );
  }

  return (
    <div className="rp-novel-app">
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <i className="fas fa-book-open"></i>
            <h1>墨香阁 - 章节管理</h1>
          </div>
          <button className="btn-outline" onClick={() => navigate('/author/dashboard')}>
            <i className="fas fa-arrow-left"></i> 返回
          </button>
        </div>
      </nav>

      <main className="container">
        <div className="chapter-manage-container">
          {/* 小说信息 */}
          <div className="novel-info-card">
            <h2>{novel?.title}</h2>
            <p className="novel-status">状态: {novel?.status}</p>
          </div>

          {/* 操作栏 */}
          <div className="chapter-actions-bar">
            <button className="btn" onClick={() => navigate(`/novel/chapter/create/${novelId}`)}>
              <i className="fas fa-plus"></i> 创建新章节
            </button>
            <button className="btn-outline" onClick={() => navigate(`/novel/edit/${novelId}`)}>
              <i className="fas fa-edit"></i> 编辑小说信息
            </button>
          </div>

          {/* 章节列表 */}
          <div className="chapters-list">
            <h3><i className="fas fa-list"></i> 章节列表 ({chapters.length}章)</h3>
            {chapters.length === 0 ? (
              <div className="no-chapters">
                <i className="fas fa-feather-alt"></i>
                <p>还没有章节，点击上方按钮创建第一章吧！</p>
              </div>
            ) : (
              <div className="chapters-table">
                {chapters.map((chapter, idx) => (
                  <div key={chapter._id} className="chapter-row">
                    <div className="chapter-info">
                      <span className="chapter-number">第{chapter.chapterNumber}章</span>
                      <span className="chapter-title">{chapter.title}</span>
                      <span className="chapter-word-count">{formatWordCount(chapter.wordCount)}字</span>
                      <span className="chapter-date">{new Date(chapter.createdAt).toLocaleDateString()}</span>
                      <span className={`chapter-status ${chapter.isPublished ? 'published' : 'draft'}`}>
                        {chapter.isPublished ? '已发布' : '草稿'}
                      </span>
                    </div>
                    <div className="chapter-actions">
                      <button 
                        className="btn-icon-small" 
                        onClick={() => navigate(`/novel/chapter/edit/${chapter._id}`)}
                        title="编辑"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn-icon-small danger" 
                        onClick={() => handleDeleteChapter(chapter._id, chapter.chapterNumber)}
                        title="删除"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChapterManage;