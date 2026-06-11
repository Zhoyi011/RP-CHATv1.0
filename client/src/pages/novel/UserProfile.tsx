// client/src/pages/novel/UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { novelApi, personaApi } from '../../services/api';
import { usePersona } from '../../hooks/usePersona';
import type { Persona, Novel } from '../../types/novel';
import toast from 'react-hot-toast';
import '../../styles/novel.css';

const UserProfile: React.FC = () => {
  const { personaId } = useParams<{ personaId: string }>();
  const navigate = useNavigate();
  const { currentPersona } = usePersona();
  const [profile, setProfile] = useState<Persona | null>(null);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // 加载用户资料
  useEffect(() => {
    const loadProfile = async () => {
      if (!personaId) return;
      try {
        const [profileRes, novelsRes] = await Promise.all([
          personaApi.getPersonaDetail(personaId),
          novelApi.getNovels({ authorId: personaId, limit: 20 })
        ]);
        setProfile(profileRes);
        setNovels(novelsRes.novels);
        
        // 检查是否已关注
        if (currentPersona) {
          const followRes = await novelApi.getMyFollows(currentPersona._id);
          setIsFollowing(followRes.follows.some(f => {
            const id = typeof f.authorPersonaId === 'string' ? f.authorPersonaId : f.authorPersonaId?._id;
            return id === personaId;
          }));
        }
      } catch (error) {
        console.error('加载失败:', error);
        toast.error('加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [personaId, currentPersona]);

  // 关注/取消关注
  const handleToggleFollow = async () => {
    if (!currentPersona) {
      toast.error('请先选择角色');
      return;
    }
    try {
      const res = await novelApi.toggleFollow(personaId!, currentPersona._id);
      setIsFollowing(res.action === 'followed');
      toast.success(res.message);
    } catch (error) {
      toast.error('操作失败');
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

  if (!profile) {
    return (
      <div className="rp-novel-app">
        <div className="no-results">用户不存在</div>
      </div>
    );
  }

  return (
    <div className="rp-novel-app">
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <i className="fas fa-book-open"></i>
            <h1>墨香阁 - 作者主页</h1>
          </div>
          <button className="btn-outline" onClick={() => navigate('/novel')}>
            <i className="fas fa-arrow-left"></i> 返回书库
          </button>
        </div>
      </nav>

      <main className="container">
        {/* 作者信息卡片 */}
        <div className="profile-header">
          <div className="profile-avatar">
            <img src={profile.avatar || '/default-avatar.png'} alt={profile.displayName || profile.name} />
          </div>
          <div className="profile-info">
            <h2>{profile.displayName || profile.name}</h2>
            <p className="profile-number">#{profile.sameNameNumber}</p>
            <p className="profile-bio">{profile.description}</p>
            <div className="profile-stats">
              <div className="stat">
                <span className="value">{novels.length}</span>
                <span className="label">作品</span>
              </div>
              <div className="stat">
                <span className="value">{profile.followersCount || 0}</span>
                <span className="label">粉丝</span>
              </div>
              <div className="stat">
                <span className="value">{profile.totalDonationIncome || 0}</span>
                <span className="label">赞赏收入</span>
              </div>
            </div>
            {currentPersona?._id !== personaId && (
              <button 
                className={`btn-follow ${isFollowing ? 'following' : ''}`}
                onClick={handleToggleFollow}
              >
                <i className={`fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}`}></i>
                {isFollowing ? '已关注' : '关注作者'}
              </button>
            )}
          </div>
        </div>

        {/* 作品列表 */}
        <div className="profile-novels">
          <h3><i className="fas fa-book"></i> 作品集 ({novels.length})</h3>
          {novels.length === 0 ? (
            <div className="no-novels">
              <i className="fas fa-feather-alt"></i>
              <p>暂无作品</p>
            </div>
          ) : (
            <div className="novels-grid">
              {novels.map(novel => (
                <div key={novel._id} className="novel-card" onClick={() => navigate(`/novel/${novel._id}`)}>
                  <div className="novel-cover">
                    <i className="fas fa-book"></i>
                    <div className="word-count-badge">{formatWordCount(novel.wordCount)}字</div>
                  </div>
                  <div className="novel-info">
                    <h3>{novel.title}</h3>
                    <div className="novel-meta">
                      <span><i className="fas fa-layer-group"></i> {novel.totalChapters}章</span>
                      <span><i className="fas fa-eye"></i> {novel.views}阅读</span>
                    </div>
                    <p className="novel-description">{novel.description}</p>
                    <button className="btn-outline read-btn">查看详情</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserProfile;