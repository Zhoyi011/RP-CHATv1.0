// client/src/pages/novel/MyFollows.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi } from '../../services/api';
import { usePersona } from '../../hooks/usePersona';
import type { FollowAuthor } from '../../types/novel';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

const MyFollows: React.FC = () => {
  const navigate = useNavigate();
  const { currentPersona } = usePersona();
  const [follows, setFollows] = useState<FollowAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFollows = async () => {
      if (!currentPersona) return;
      try {
        const res = await novelApi.getMyFollows(currentPersona._id);
        setFollows(res.follows);
      } catch (error) {
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadFollows();
  }, [currentPersona]);

  const handleUnfollow = async (authorPersonaId: string) => {
    if (!currentPersona) return;
    try {
      await novelApi.toggleFollow(authorPersonaId, currentPersona._id);
      setFollows(prev => prev.filter(f => {
        const id = typeof f.authorPersonaId === 'string' ? f.authorPersonaId : f.authorPersonaId?._id;
        return id !== authorPersonaId;
      }));
      toast.success('已取消关注');
    } catch (error) {
      toast.error('操作失败');
    }
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
            <h1>墨香阁 - 我的关注</h1>
          </div>
          <button className="btn-outline" onClick={() => navigate('/novel')}>
            <i className="fas fa-arrow-left"></i> 返回书库
          </button>
        </div>
      </nav>

      <main className="container">
        <div className="follows-container">
          <h2><i className="fas fa-users"></i> 我的关注 ({follows.length})</h2>
          
          {follows.length === 0 ? (
            <div className="no-follows">
              <i className="fas fa-user-plus"></i>
              <p>还没有关注任何作者，去发现喜欢的作者吧~</p>
              <button className="btn" onClick={() => navigate('/novel')}>
                去书库逛逛
              </button>
            </div>
          ) : (
            <div className="follows-grid">
              {follows.map(follow => {
                const author = follow.authorPersonaId;
                const authorId = typeof author === 'string' ? author : author?._id;
                const authorName = typeof author === 'string' ? '加载中...' : author?.displayName || author?.name;
                const authorAvatar = typeof author === 'string' ? '' : author?.avatar;
                const authorNovelCount = typeof author === 'string' ? 0 : author?.createdNovelCount || 0;
                
                return (
                  <div key={follow._id} className="follow-card">
                    <div className="follow-info" onClick={() => navigate(`/persona/${authorId}`)}>
                      <div className="follow-avatar">
                        <img src={authorAvatar || '/default-avatar.png'} alt={authorName} />
                      </div>
                      <div className="follow-details">
                        <h3>{authorName}</h3>
                        <p><i className="fas fa-book"></i> 作品 {authorNovelCount} 部</p>
                      </div>
                    </div>
                    <button 
                      className="btn-unfollow" 
                      onClick={() => handleUnfollow(authorId!)}
                    >
                      <i className="fas fa-user-minus"></i> 取消关注
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyFollows;