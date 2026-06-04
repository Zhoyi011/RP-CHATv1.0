// client/src/components/emoji/EmojiManager.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Trash2, Edit2, FolderPlus, X, Check, 
  Image, Search, Star, Upload, Loader2, AlertCircle
} from 'lucide-react';
import { 
  getMyEmojis, getCategories, createCategory, updateCategory, 
  deleteCategory, updateEmoji, deleteEmoji, batchDeleteEmojis,
  type EmojiType, type EmojiCategoryType
} from '../../services/emojiApi';
import { EmojiUploader } from './EmojiUploader';
import toast from 'react-hot-toast';

export const EmojiManager: React.FC = () => {
  const navigate = useNavigate();
  const [emojis, setEmojis] = useState<EmojiType[]>([]);
  const [categories, setCategories] = useState<EmojiCategoryType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<EmojiCategoryType | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [selectedEmojis, setSelectedEmojis] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'favorite' | 'most-used'>('recent');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEmoji, setDeletingEmoji] = useState<EmojiType | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData.categories);
      
      const data = await getMyEmojis({
        page,
        limit: 50,
        categoryId: selectedCategory,
        sortBy
      });
      setEmojis(data.emojis);
      setTotal(data.total);
      setHasMore(page < data.totalPages);
    } catch (error) {
      console.error('加载表情失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('请输入分组名称');
      return;
    }
    if (newCategoryName.length > 20) {
      toast.error('分组名称不能超过20个字符');
      return;
    }
    try {
      await createCategory(newCategoryName.trim());
      toast.success('分组创建成功');
      setNewCategoryName('');
      setShowCreateCategory(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || '创建失败');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;
    if (editCategoryName.length > 20) {
      toast.error('分组名称不能超过20个字符');
      return;
    }
    try {
      await updateCategory(editingCategory._id, editCategoryName.trim());
      toast.success('分组已更新');
      setEditingCategory(null);
      setEditCategoryName('');
      loadData();
    } catch (error: any) {
      toast.error(error.message || '更新失败');
    }
  };

  const handleDeleteCategory = async (category: EmojiCategoryType) => {
    if (!confirm(`确定要删除分组「${category.name}」吗？分组内的表情将移至「未分类」。`)) return;
    try {
      await deleteCategory(category._id);
      toast.success('分组已删除');
      if (selectedCategory === category._id) setSelectedCategory(null);
      loadData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleToggleFavorite = async (emoji: EmojiType) => {
    try {
      await updateEmoji(emoji._id, { isFavorite: !emoji.isFavorite });
      loadData();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleDeleteEmoji = async (emoji: EmojiType) => {
    try {
      await deleteEmoji(emoji._id);
      toast.success('已删除');
      loadData();
    } catch (error) {
      toast.error('删除失败');
    }
    setDeletingEmoji(null);
    setShowDeleteConfirm(false);
  };

  const handleBatchDelete = async () => {
    if (selectedEmojis.size === 0) return;
    if (!confirm(`确定要删除 ${selectedEmojis.size} 个表情吗？`)) return;
    try {
      await batchDeleteEmojis(Array.from(selectedEmojis));
      toast.success(`已删除 ${selectedEmojis.size} 个表情`);
      setSelectedEmojis(new Set());
      setIsSelectionMode(false);
      loadData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleSelectAll = () => {
    if (selectedEmojis.size === filteredEmojis.length) {
      setSelectedEmojis(new Set());
    } else {
      setSelectedEmojis(new Set(filteredEmojis.map(e => e._id)));
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(p => p + 1);
    }
  };

  const filteredEmojis = searchQuery
    ? emojis.filter(e => 
        e.keywords.some(k => k.includes(searchQuery.toLowerCase())) ||
        e.url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : emojis;

  const getUsageStats = () => {
    const totalEmojis = emojis.length;
    const favoriteCount = emojis.filter(e => e.isFavorite).length;
    const gifCount = emojis.filter(e => e.isGif).length;
    const totalUses = emojis.reduce((sum, e) => sum + e.useCount, 0);
    return { totalEmojis, favoriteCount, gifCount, totalUses };
  };

  const stats = getUsageStats();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">我的表情包</h1>
              <span className="text-sm text-gray-500">({stats.totalEmojis}/300)</span>
            </div>
            <div className="flex items-center gap-2">
              {isSelectionMode ? (
                <>
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    {selectedEmojis.size === filteredEmojis.length ? '取消全选' : '全选'}
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    disabled={selectedEmojis.size === 0}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
                  >
                    删除 ({selectedEmojis.size})
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedEmojis(new Set());
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsSelectionMode(true)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    title="批量管理"
                  >
                    <Trash2 className="w-5 h-5 text-gray-500" />
                  </button>
                  {/* 🔥 上传按钮 - 紫色渐变，显眼位置 */}
                  <button
                    onClick={() => setShowUploader(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-md"
                  >
                    <Upload className="w-4 h-4" />
                    上传表情
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 统计栏 */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">📷 共 {stats.totalEmojis} 张</span>
          <span className="text-gray-600 dark:text-gray-400">⭐ 收藏 {stats.favoriteCount} 张</span>
          <span className="text-gray-600 dark:text-gray-400">🎬 GIF {stats.gifCount} 张</span>
          <span className="text-gray-600 dark:text-gray-400">📊 总使用 {stats.totalUses} 次</span>
        </div>
      </div>

      {/* 工具栏 - 包含搜索、排序、分组管理 */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* 搜索 */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索表情..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 排序 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="recent">最新上传</option>
            <option value="favorite">收藏优先</option>
            <option value="most-used">使用最多</option>
          </select>

          {/* 🔥 分组筛选 + 新建分组按钮 */}
          <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                selectedCategory === null
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              全部
            </button>
            {categories.map(cat => (
              <div key={cat._id} className="relative group">
                <button
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                    selectedCategory === cat._id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {cat.name}
                </button>
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10 min-w-[100px]">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setEditCategoryName(cat.name);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> 重命名
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 删除
                  </button>
                </div>
              </div>
            ))}
            {/* 🔥 新建分组按钮 - + 号 */}
            <button
              onClick={() => setShowCreateCategory(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-300"
              title="新建分组"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="text-sm">新建分组</span>
            </button>
          </div>
        </div>
      </div>

      {/* 表情网格 */}
      <div className="max-w-6xl mx-auto px-4 py-4 pb-8">
        {loading && page === 1 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : filteredEmojis.length === 0 ? (
          <div className="text-center py-12">
            <Image className="w-16 h-16 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">暂无表情，点击「上传表情」添加~</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {filteredEmojis.map((emoji) => (
                <div
                  key={emoji._id}
                  className={`relative group cursor-pointer bg-white dark:bg-gray-800 rounded-xl p-2 shadow-sm hover:shadow-md transition ${
                    isSelectionMode && selectedEmojis.has(emoji._id) ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => {
                    if (isSelectionMode) {
                      setSelectedEmojis(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(emoji._id)) newSet.delete(emoji._id);
                        else newSet.add(emoji._id);
                        return newSet;
                      });
                    }
                  }}
                >
                  <img
                    src={emoji.url}
                    alt="表情"
                    className="w-full aspect-square object-contain rounded-lg"
                    loading="lazy"
                  />
                  
                  {emoji.isGif && (
                    <span className="absolute top-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded">GIF</span>
                  )}
                  
                  {!isSelectionMode && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center gap-2 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(emoji);
                        }}
                        className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition"
                      >
                        <Star className={`w-4 h-4 ${emoji.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingEmoji(emoji);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                  
                  {isSelectionMode && selectedEmojis.has(emoji._id) && (
                    <div className="absolute top-1 left-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 加载更多 */}
            {hasMore && (
              <div className="text-center py-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="text-sm text-purple-500 hover:text-purple-600 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                  加载更多...
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 创建分组弹窗 */}
      <AnimatePresence>
        {showCreateCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateCategory(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">新建分组</h3>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="分组名称（最多20字）"
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateCategory(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateCategory}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  创建
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 重命名分组弹窗 */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingCategory(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">重命名分组</h3>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateCategory}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  保存
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {showDeleteConfirm && deletingEmoji && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">确认删除</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                确定要删除这个表情吗？此操作不可恢复。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDeleteEmoji(deletingEmoji)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 上传弹窗 */}
      <AnimatePresence>
        {showUploader && (
          <EmojiUploader
            onClose={() => setShowUploader(false)}
            onSuccess={() => {
              setShowUploader(false);
              setPage(1);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmojiManager;