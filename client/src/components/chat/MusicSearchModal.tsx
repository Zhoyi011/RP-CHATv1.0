// client/src/components/chat/MusicSearchModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface MusicResult {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  videoUrl: string;
  platform: 'youtube';
  duration?: string;
  channelName?: string;
  publishDate?: string;
  durationSeconds?: number;
}

interface MusicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (music: MusicResult) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const MusicSearchModal: React.FC<MusicSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<MusicResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searchMusic = async () => {
    if (!searchQuery.trim()) {
      toast.error('请输入搜索内容');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/music/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '搜索失败');
      setResults(data.items || []);
      if (data.items?.length === 0) toast.error('未找到相关音乐');
    } catch (error) {
      console.error('搜索失败:', error);
      toast.error('搜索失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (music: MusicResult) => {
    setSelectedId(music.id);
    // 获取视频详细信息（频道名、发布日期、时长）
    try {
      const infoRes = await fetch(`${API_BASE}/youtube/info?videoId=${music.id}`);
      if (infoRes.ok) {
        const videoInfo = await infoRes.json();
        music.channelName = videoInfo.channelName;
        music.publishDate = videoInfo.publishDate;
        music.durationSeconds = videoInfo.duration;
        // 格式化时长显示
        const mins = Math.floor(videoInfo.duration / 60);
        const secs = videoInfo.duration % 60;
        music.duration = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
    } catch (e) {
      console.warn('获取视频详情失败，使用基础信息');
    }
    setTimeout(() => {
      onSelect(music);
      onClose();
      setSearchQuery('');
      setResults([]);
      setSelectedId(null);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') searchMusic();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">🎵 分享音乐</h3>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="搜索歌曲、歌手或 MV..."
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={searchMusic}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50"
                >
                  {isLoading ? '搜索中...' : '搜索'}
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-3">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!isLoading && results.length === 0 && searchQuery && (
                <div className="text-center py-8 text-gray-400">没有找到相关音乐</div>
              )}
              {results.map((music) => (
                <motion.div
                  key={music.id}
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedId === music.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleSelect(music)}
                >
                  <img src={music.coverUrl} alt={music.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 dark:text-white truncate">{music.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{music.artist}</p>
                  </div>
                  {music.duration && <span className="text-xs text-gray-400 flex-shrink-0">{music.duration}</span>}
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center text-xs text-gray-400">
              音乐来自 YouTube，点击即分享到聊天
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MusicSearchModal;