// client/src/components/emoji/EmojiPicker.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  X, Search, Star, Grid3x3, Plus, FolderPlus, 
  Trash2, ChevronLeft, Settings
} from 'lucide-react';
import { 
  getMyEmojis, getFrequentEmojis, getFavoriteEmojis,
  getCategories, createCategory, deleteCategory, updateEmoji,
  deleteEmoji, searchEmojis, incrementEmojiUse,
  type EmojiType, type EmojiCategoryType
} from '../../services/emojiApi';

interface EmojiPickerProps {
  onSelect: (emojiUrl: string, emojiId: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

type TabType = 'my' | 'frequent' | 'favorite';

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  onSelect, 
  onClose, 
  position = 'bottom' 
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [emojis, setEmojis] = useState<EmojiType[]>([]);
  const [categories, setCategories] = useState<EmojiCategoryType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmojiType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ emoji: EmojiType; x: number; y: number } | null>(null);
  
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
    loadEmojis();
  }, [activeTab, selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data.categories);
    } catch (error) {
      console.error('加载分组失败:', error);
    }
  };

  const loadEmojis = async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === 'my') {
        data = await getMyEmojis({ 
          categoryId: selectedCategory,
          limit: 100,
          sortBy: 'recent'
        });
        setEmojis(data.emojis);
      } else if (activeTab === 'frequent') {
        data = await getFrequentEmojis();
        setEmojis(data.emojis);
      } else {
        data = await getFavoriteEmojis();
        setEmojis(data.emojis);
      }
    } catch (error) {
      console.error('加载表情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setIsSearching(true);
      try {
        const data = await searchEmojis(query);
        setSearchResults(data.emojis);
      } catch (error) {
        console.error('搜索失败:', error);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleSelect = async (emoji: EmojiType) => {
    try {
      await incrementEmojiUse(emoji._id);
    } catch (error) {
      console.error('更新使用次数失败:', error);
    }
    onSelect(emoji.url, emoji._id);
    onClose();
  };

  const handleToggleFavorite = async (emoji: EmojiType, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateEmoji(emoji._id, { isFavorite: !emoji.isFavorite });
      if (activeTab === 'favorite' && emoji.isFavorite) {
        setEmojis(prev => prev.filter(e => e._id !== emoji._id));
      } else {
        setEmojis(prev => prev.map(e => 
          e._id === emoji._id ? { ...e, isFavorite: !e.isFavorite } : e
        ));
      }
      if (activeTab === 'my') loadEmojis();
    } catch (error) {
      console.error('更新收藏失败:', error);
    }
  };

  const handleDelete = async (emoji: EmojiType) => {
    try {
      await deleteEmoji(emoji._id);
      setEmojis(prev => prev.filter(e => e._id !== emoji._id));
      setContextMenu(null);
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (newCategoryName.length > 20) {
      alert('分组名称不能超过20个字符');
      return;
    }
    try {
      await createCategory(newCategoryName.trim());
      await loadCategories();
      setNewCategoryName('');
      setShowCreateCategory(false);
    } catch (error) {
      console.error('创建分组失败:', error);
      alert('创建失败，分组名可能已存在');
    }
  };

  const handleMoveToCategory = async (emoji: EmojiType, categoryId: string | null) => {
    try {
      await updateEmoji(emoji._id, { categoryId });
      setEmojis(prev => prev.filter(e => e._id !== emoji._id));
      setContextMenu(null);
    } catch (error) {
      console.error('移动失败:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const displayEmojis = isSearching ? searchResults : emojis;

  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, y: position === 'bottom' ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: position === 'bottom' ? 20 : -20, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 w-80 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
      style={position === 'bottom' ? { bottom: '100%', marginBottom: '8px', right: 0 } : { top: '100%', marginTop: '8px', right: 0 }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800/90">
        <div className="flex gap-1">
          <button
            onClick={() => { setActiveTab('my'); setIsSearching(false); setSearchQuery(''); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'my' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            我的
          </button>
          <button
            onClick={() => { setActiveTab('frequent'); setIsSearching(false); setSearchQuery(''); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'frequent' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            常用
          </button>
          <button
            onClick={() => { setActiveTab('favorite'); setIsSearching(false); setSearchQuery(''); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
              activeTab === 'favorite' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Star className="w-3 h-3 inline mr-1" />
            收藏
          </button>
        </div>
        
        {/* 右侧按钮组 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              navigate('/emojis');
              onClose();
            }}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition"
            title="管理表情包"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="p-2 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="搜索表情..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-gray-700 rounded-lg py-1.5 pl-8 pr-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* 分组栏 */}
      {activeTab === 'my' && !isSearching && categories.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition ${
              selectedCategory === null ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition ${
                selectedCategory === cat._id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => setShowCreateCategory(true)}
            className="p-0.5 hover:bg-gray-700 rounded transition"
            title="新建分组"
          >
            <Plus className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      )}

      {/* 表情网格 */}
      <div className="h-64 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
          </div>
        ) : displayEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Grid3x3 className="w-8 h-8 mb-1" />
            <p className="text-xs">
              {isSearching ? '没有找到相关表情' : activeTab === 'my' ? '暂无表情，点击⚙️管理~' : '暂无表情'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {displayEmojis.map((emoji) => (
              <div
                key={emoji._id}
                className="relative group cursor-pointer"
                onClick={() => handleSelect(emoji)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ emoji, x: e.clientX, y: e.clientY });
                }}
              >
                <img
                  src={emoji.url}
                  alt="表情"
                  className="w-12 h-12 object-contain rounded-lg hover:scale-110 transition-transform bg-gray-700/50"
                  loading="lazy"
                />
                {emoji.isGif && (
                  <span className="absolute bottom-0 right-0 text-[8px] bg-black/60 text-white px-0.5 rounded">GIF</span>
                )}
                <button
                  onClick={(e) => handleToggleFavorite(emoji, e)}
                  className="absolute top-0 right-0 p-0.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  <Star className={`w-2.5 h-2.5 ${emoji.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建分组弹窗 */}
      {showCreateCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateCategory(false)}>
          <div className="bg-gray-800 rounded-xl p-4 w-72" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-medium text-sm mb-3">新建分组</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="分组名称（最多20字）"
              maxLength={20}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:ring-1 focus:ring-purple-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateCategory(false)}
                className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleCreateCategory}
                className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed bg-gray-700 rounded-lg shadow-xl border border-gray-600 overflow-hidden z-50 min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleToggleFavorite(contextMenu.emoji, {} as React.MouseEvent)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-gray-600 w-full"
          >
            <Star className="w-3 h-3" />
            {contextMenu.emoji.isFavorite ? '取消收藏' : '收藏'}
          </button>
          
          {activeTab === 'my' && categories.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white hover:bg-gray-600 w-full">
                <FolderPlus className="w-3 h-3" />
                移动到分组
                <ChevronLeft className="w-3 h-3 ml-auto" />
              </button>
              <div className="absolute left-full top-0 ml-0.5 bg-gray-700 rounded-lg shadow-lg overflow-hidden hidden group-hover:block min-w-[100px]">
                <button
                  onClick={() => handleMoveToCategory(contextMenu.emoji, null)}
                  className="px-3 py-1 text-xs text-white hover:bg-gray-600 w-full text-left"
                >
                  未分类
                </button>
                {categories.map(cat => (
                  <button
                    key={cat._id}
                    onClick={() => handleMoveToCategory(contextMenu.emoji, cat._id)}
                    className="px-3 py-1 text-xs text-white hover:bg-gray-600 w-full text-left"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={() => handleDelete(contextMenu.emoji)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-gray-600 w-full"
          >
            <Trash2 className="w-3 h-3" />
            删除
          </button>
        </div>
      )}
    </motion.div>
  );
};