import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { personaApi } from '../../services/api';
import toast from 'react-hot-toast';
import { auth } from '../../firebase/config';

interface Post {
  _id: string;
  content: string;
  images?: string[];
  likes: string[];
  likeCount: number;
  userId?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  comments: Array<{
    userId: { _id: string; username: string; avatar?: string };
    content: string;
    createdAt: string;
  }>;
  createdAt: string;
  isLiked?: boolean;
}

interface Props {
  personaId: string;
  isOwner: boolean;
}

const PersonaPosts: React.FC<Props> = ({ personaId, isOwner }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const currentUser = auth.currentUser;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadPosts();
  }, [personaId, page]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await personaApi.getPosts(personaId, page);
      // 确保每个 post 都有 isLiked 字段
      const postsWithLikeStatus = data.posts.map((post: Post) => ({
        ...post,
        isLiked: post.likes?.includes(currentUser?.uid || '') || false
      }));
      setPosts(postsWithLikeStatus);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('加载动态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPost = async () => {
    if (!newPostContent.trim()) {
      toast.error('请输入内容');
      return;
    }

    setSubmitting(true);
    try {
      await personaApi.addPost(personaId, newPostContent);
      toast.success('发布成功');
      setNewPostContent('');
      setSelectedImages([]);
      loadPosts();
    } catch (error) {
      toast.error('发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const result = await personaApi.likePost(personaId, postId);
      // result 的类型是 { message: string; isLiked: boolean; likeCount: number }
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { ...post, isLiked: result.isLiked, likeCount: result.likeCount }
          : post
      ));
    } catch (error) {
      toast.error('点赞失败');
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return `${diffDays}天前`;
  };

  if (loading && page === 1) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 发布动态 */}
      {isOwner && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {currentUser?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="分享你的角色故事..."
                className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                rows={3}
              />
              
              {/* 图片预览 */}
              {selectedImages.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {selectedImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg" />
                      <button
                        onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between items-center mt-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImageUpload(!showImageUpload)}
                    className="text-gray-400 hover:text-blue-500 transition p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={handleAddPost}
                  disabled={submitting || !newPostContent.trim()}
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50 shadow-md"
                >
                  {submitting ? '发布中...' : '发布动态'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 动态列表 */}
      {posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            {isOwner ? '还没有动态，发布第一条吧' : '还没有动态'}
          </div>
        </div>
      ) : (
        posts.map((post, index) => (
          <motion.div
            key={post._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                {(post.userId?.username?.charAt(0) || '?').toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {post.userId?.username || '用户'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>
                {post.images && post.images.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {post.images.map((img, i) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt="" 
                        className="w-24 h-24 object-cover rounded-xl hover:opacity-90 transition cursor-pointer" 
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                )}
                <div className="flex gap-4 mt-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-1.5 text-sm transition ${
                      post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{post.likeCount || 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{post.comments?.length || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonaPosts;