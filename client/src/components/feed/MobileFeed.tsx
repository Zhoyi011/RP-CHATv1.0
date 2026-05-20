import React, { useState, useEffect } from 'react';

interface FeedItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  createdAt: string;
}

const MobileFeed: React.FC = () => {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载好友动态（需要后端支持）
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('https://rp-chatv1-0.onrender.com/api/feed/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFeeds(data);
      }
    } catch (error) {
      console.error('加载动态失败:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="p-4 space-y-4">
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
              <img src={feed.userAvatar} className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-medium text-gray-800">{feed.userName}</p>
                <p className="text-xs text-gray-400">{formatTime(feed.createdAt)}</p>
              </div>
            </div>
            <p className="text-gray-700 mb-3">{feed.content}</p>
            {feed.images && feed.images.length > 0 && (
              <div className="flex gap-2 mb-3">
                {feed.images.map((img, i) => (
                  <img key={i} src={img} className="w-24 h-24 object-cover rounded-xl" />
                ))}
              </div>
            )}
            <div className="flex gap-4 pt-2 border-t border-gray-100">
              <button className="flex items-center gap-1 text-sm text-gray-400">
                ❤️ {feed.likes}
              </button>
              <button className="flex items-center gap-1 text-sm text-gray-400">
                💬 {feed.comments}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MobileFeed;