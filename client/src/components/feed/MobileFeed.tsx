// client/src/components/feed/MobileFeed.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface Post {
  _id: string;
  content: string;
  images: string[];
  likes: string[];
  likeCount: number;
  comments: any[];
  createdAt: string;
  personaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
  };
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const MobileFeed = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 获取动态列表
  useEffect(() => {
    fetchPosts();
  }, [page]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/post/feed?page=${page}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setPosts(data.posts || []);
        } else {
          setPosts(prev => [...prev, ...(data.posts || [])]);
        }
        setHasMore(data.posts?.length === 10);
      }
    } catch (error) {
      console.error('加载动态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/post/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(prev => prev.map(post => 
          post._id === postId 
            ? { ...post, likes: data.isLiked ? [...post.likes, 'user'] : post.likes.filter(l => l !== 'user'), likeCount: data.likeCount }
            : post
        ));
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${Math.floor(hours)}小时前`;
    if (hours < 48) return '昨天';
    return `${Math.floor(hours / 24)}天前`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 - 带返回按钮 */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/chat')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex-1">动态</h1>
        <button
          onClick={() => navigate('/search')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* 动态列表 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {loading && page === 1 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-400 dark:text-gray-500">暂无动态</p>
            <p className="text-xs text-gray-400 mt-2">发布角色动态后会显示在这里</p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <div key={post._id} className="p-4 bg-white dark:bg-gray-800">
                {/* 发布者信息 */}
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    onClick={() => navigate(`/persona/${post.personaId?._id}`)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition"
                  >
                    {(post.personaId?.displayName || post.personaId?.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div 
                      onClick={() => navigate(`/persona/${post.personaId?._id}`)}
                      className="font-medium text-gray-800 dark:text-gray-200 cursor-pointer hover:text-blue-500"
                    >
                      {post.personaId?.displayName || post.personaId?.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(post.createdAt)}
                    </div>
                  </div>
                </div>
                
                {/* 内容 */}
                <div className="mb-3">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>
                </div>
                
                {/* 图片 */}
                {post.images && post.images.length > 0 && (
                  <div className={`grid gap-1 mb-3 ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {post.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="rounded-lg aspect-square object-cover w-full cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                )}
                
                {/* 操作按钮 */}
                <div className="flex items-center gap-6 pt-2">
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-1.5 transition ${post.likes.includes('user') ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                  >
                    <svg className="w-5 h-5" fill={post.likes.includes('user') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-sm">{post.likeCount || 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-500 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm">{post.comments?.length || 0}</span>
                  </button>
                </div>
              </div>
            ))}
            
            {/* 加载更多 */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MobileFeed;