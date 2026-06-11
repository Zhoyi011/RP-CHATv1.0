// client/src/pages/novel/MyFavorites.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { novelApi } from '../../services/api';
import { usePersona } from '../../hooks/usePersona';
import type { Favorite } from '../../types/novel';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

const MyFavorites: React.FC = () => {
  const navigate = useNavigate();
  const { currentPersona } = usePersona();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!currentPersona) return;
      try {
        const res = await novelApi.getMyFavorites(currentPersona._id);
        setFavorites(res.favorites);
      } catch (error) {
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadFavorites();
  }, [currentPersona]);

  const handleRemoveFavorite = async (novelId: string) => {
    if (!currentPersona) return;
    try {
      await novelApi.toggleFavorite(novelId, currentPersona._id);
      setFavorites(prev => prev.filter(f => 
        (typeof f.novelId === 'string' ? f.novelId : f.novelId?._id) !== novelId
      ));
      toast.success('已取消收藏');
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const formatWordCount = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    return count.toLocaleString();
  };

  if (loading) {
    return <div className="loading-placeholder">加载中...</div>;
  }

  return (
    <div className="rp-novel-app">
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <i className="fas fa-book-open"></i>
            <h1>墨香阁 - 我的收藏</h1>
          </div>
          <button className="btn-outline" onClick={() => navigate('/novel')}>
            <i className="fas fa-arrow-left"></i> 返回书库
          </button>
        </div>
      </nav>

      <main className="container">
        <div className="favorites-container">
          <h2><i className="fas fa-bookmark"></i> 我的收藏 ({favorites.length})</h2>
          
          {favorites.length === 0 ? (
            <div className="no-favorites">
              <i className="fas fa-bookmark"></i>
              <p>暂无收藏，去书库找找感兴趣的小说吧~</p>
              <button className="btn" onClick={() => navigate('/novel')}>
                去书库逛逛
              </button>
            </div>
          ) : (
            <div className="favorites-grid">
              {favorites.map(fav => {
                const novel = fav.novelId;
                const novelId = typeof novel === 'string' ? novel : novel?._id;
                const novelTitle = typeof novel === 'string' ? '加载中...' : novel?.title;
                const novelAuthor = typeof novel === 'string' ? '加载中...' : novel?.authorName;
                const novelWordCount = typeof novel === 'string' ? 0 : novel?.wordCount;
                
                return (
                  <div key={fav._id} className="favorite-card">
                    <div className="favorite-info" onClick={() => navigate(`/novel/${novelId}`)}>
                      <div className="favorite-cover">
                        <i className="fas fa-book"></i>
                      </div>
                      <div className="favorite-details">
                        <h3>{novelTitle}</h3>
                        <p>{novelAuthor}</p>
                        <span className="word-count">{formatWordCount(novelWordCount || 0)}字</span>
                      </div>
                    </div>
                    <button 
                      className="btn-remove" 
                      onClick={() => handleRemoveFavorite(novelId!)}
                    >
                      <i className="fas fa-trash"></i>
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

export default MyFavorites;