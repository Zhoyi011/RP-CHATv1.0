// client/src/components/feed/MobileFeed.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, MoreVertical, UserPlus, Bell, BellOff } from 'lucide-react';
import { useFriend } from '../../contexts/FriendContext';
import { friendApi } from '../../services/friendApi';
import toast from 'react-hot-toast';

interface Post {
  _id: string;
  content: string;
  images?: string[];
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  personaId?: {
    _id: string;
    name: string;
    displayName?: string;
    avatar?: string;
  };
  likes: string[];
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export const MobileFeed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [lastViewTime, setLastViewTime] = useState<string | null>(null);

  // 获取好友动态
  const fetchFeedPosts = useCallback(async () => {
    try {
      const res = await friendApi.getFriendFeedPosts(20);
      if (res.success) {
        setPosts(res.data);
        setHasNewPosts(res.hasNewPosts);
        setLastViewTime(res.lastFeedView);
      }
    } catch (error) {
      console.error('获取动态失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 标记动态已查看
  const markAsViewed = useCallback(async () => {
    if (hasNewPosts) {
      try {
        await friendApi.markFeedViewed();
        setHasNewPosts(false);
      } catch (error) {
        console.error('标记已查看失败:', error);
      }
    }
  }, [hasNewPosts]);

  // 进入页面时获取动态，并标记已查看
  useEffect(() => {
    fetchFeedPosts();
    
    // 滚动到顶部时标记已查看
    const handleScroll = () => {
      if (window.scrollY === 0 && hasNewPosts) {
        markAsViewed();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchFeedPosts, markAsViewed, hasNewPosts]);

  // 定时刷新（每30秒）
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeedPosts();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchFeedPosts]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    // 这里调用点赞 API
    toast.success(isLiked ? '已取消点赞' : '点赞成功');
    // 更新本地状态
    setPosts(prev => prev.map(post => 
      post._id === postId 
        ? { 
            ...post, 
            isLiked: !isLiked, 
            likeCount: post.likeCount + (isLiked ? -1 : 1) 
          }
        : post
    ));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <p className="text-gray-500 mt-3">加载动态中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">好友动态</h1>
            {/* 新动态红点 */}
            {hasNewPosts && (
              <div className="relative">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="absolute -top-1 -right-1 text-xs text-red-500">●</span>
              </div>
            )}
          </div>
          <button
            onClick={() => fetchFeedPosts()}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          只显示好友的最新动态
        </p>
      </div>

      {/* 动态列表 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserPlus className="w-16 h-16 text-gray-400 mb-3" />
            <p className="text-gray-500 mb-2">暂无好友动态</p>
            <p className="text-sm text-gray-400">添加好友后，他们的动态会显示在这里</p>
          </div>
        ) : (
          posts.map((post, index) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-900 p-4"
            >
              {/* 用户信息 */}
              <div className="flex items-start gap-3">
                <img
                  src={post.personaId?.avatar || post.userId.avatar || '/default-avatar.png'}
                  alt={post.personaId?.displayName || post.userId.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {post.personaId?.displayName || post.personaId?.name || post.userId.username}
                    </span>
                    {post.personaId && (
                      <span className="text-xs text-gray-400">
                        @{post.userId.username}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatTime(post.createdAt)}
                    </span>
                  </div>
                  
                  {/* 动态内容 */}
                  <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  
                  {/* 图片 */}
                  {post.images && post.images.length > 0 && (
                    <div className={`grid gap-2 mt-3 ${
                      post.images.length === 1 ? 'grid-cols-1' :
                      post.images.length === 2 ? 'grid-cols-2' :
                      'grid-cols-3'
                    }`}>
                      {post.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt=""
                          className="rounded-lg object-cover w-full aspect-square cursor-pointer"
                          onClick={() => window.open(img, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center gap-6 mt-3">
                    <button
                      onClick={() => handleLike(post._id, post.isLiked || false)}
                      className={`flex items-center gap-1 transition-colors ${
                        post.isLiked 
                          ? 'text-red-500' 
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-500' : ''}`} />
                      <span className="text-sm">{post.likeCount || 0}</span>
                    </button>
                    <button className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.commentCount || 0}</span>
                    </button>
                    <button className="ml-auto text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 新动态提示条 */}
      <AnimatePresence>
        {hasNewPosts && window.scrollY > 100 && (
          <motion.button
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              markAsViewed();
            }}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-20"
          >
            <Bell className="w-4 h-4" />
            有新动态
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileFeed;