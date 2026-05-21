import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface FeedItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  personaName: string;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}

const MobileFeed: React.FC = () => {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // TODO: 替换为真实 API
      const response = await fetch('https://rp-chatv1-0.onrender.com/api/feed/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFeeds(data);
      } else {
        // 模拟数据
        setFeeds([]);
      }
    } catch (error) {
      console.error('加载动态失败:', error);
      setFeeds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (feedId: string) => {
    // TODO: 实现点赞功能
    setFeeds(prev => prev.map(feed => 
      feed.id === feedId 
        ? { ...feed, isLiked: !feed.isLiked, likes: feed.isLiked ? feed.likes - 1 : feed.likes + 1 }
        : feed
    ));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 1) return '刚刚';
    if (diff < 60) return `${diff}分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
    return `${Math.floor(diff / 1440)}天前`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {feeds.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">📭</div>
          <p>暂无好友动态</p>
          <p className="text-xs mt-2">添加好友后，他们的动态会显示在这里</p>
        </div>
      ) : (
        feeds.map(feed => (
          <div key={feed.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                {feed.userName.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-800">{feed.userName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">🎭 {feed.personaName}</span>
                  <span className="text-xs text-gray-400">{formatTime(feed.createdAt)}</span>
                </div>
              </div>
            </div>
            <p className="text-gray-700 mb-3 leading-relaxed">{feed.content}</p>
            {feed.images && feed.images.length > 0 && (
              <div className="flex gap-2 mb-3">
                {feed.images.map((img, i) => (
                  <img key={i} src={img} className="w-24 h-24 object-cover rounded-xl" />
                ))}
              </div>
            )}
            <div className="flex gap-4 pt-2 border-t border-gray-100">
              <button 
                onClick={() => handleLike(feed.id)}
                className={`flex items-center gap-1 text-sm transition ${feed.isLiked ? 'text-red-500' : 'text-gray-400'}`}
              >
                <svg className="w-5 h-5" fill={feed.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{feed.likes}</span>
              </button>
              <button className="flex items-center gap-1 text-sm text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{feed.comments}</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MobileFeed;