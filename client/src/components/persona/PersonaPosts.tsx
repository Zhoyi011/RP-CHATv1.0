import React, { useState, useEffect } from 'react';
import { personaApi } from '../../services/api';
import toast from 'react-hot-toast';
import { auth } from '../../firebase/config';

interface Post {
  _id: string;
  content: string;
  images?: string[];
  likes: string[];
  comments: Array<{
    userId: { _id: string; username: string; avatar?: string };
    content: string;
    createdAt: string;
  }>;
  createdAt: string;
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
  const currentUser = auth.currentUser;

  useEffect(() => {
    loadPosts();
  }, [personaId, page]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await personaApi.getPosts(personaId, page);
      setPosts(data.posts);
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
      loadPosts();
    } catch (error) {
      toast.error('发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await personaApi.likePost(personaId, postId);
      loadPosts();
    } catch (error) {
      toast.error('点赞失败');
    }
  };

  if (loading && page === 1) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <div className="text-center py-8 text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 发布动态 */}
      {isOwner && (
        <div className="bg-white rounded-xl shadow p-4">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="分享你的角色故事..."
            className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddPost}
              disabled={submitting || !newPostContent.trim()}
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
            >
              {submitting ? '发布中...' : '发布动态'}
            </button>
          </div>
        </div>
      )}

      {/* 动态列表 */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center py-8 text-gray-400">
            还没有动态，{isOwner ? '发布第一条吧' : '等 Ta 来分享'}
          </div>
        </div>
      ) : (
        posts.map(post => (
          <div key={post._id} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                {currentUser?.email?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">你</span>
                  <span className="text-xs text-gray-400">
                    {new Date(post.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700 mt-2 whitespace-pre-wrap">{post.content}</p>
                {post.images && post.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {post.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-20 h-20 object-cover rounded" />
                    ))}
                  </div>
                )}
                <div className="flex gap-4 mt-3">
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-1 text-sm ${
                      post.likes.includes(currentUser?.uid || '') ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    ❤️ {post.likes.length}
                  </button>
                  <button className="flex items-center gap-1 text-sm text-gray-400">
                    💬 {post.comments.length}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-1">
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonaPosts;