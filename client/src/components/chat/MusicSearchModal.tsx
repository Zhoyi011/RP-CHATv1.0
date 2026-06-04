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
  platform: 'youtube' | 'bilibili';
  duration?: string;
  channelName?: string;
  publishDate?: string;
  playCount?: number;
  danmakuCount?: number;
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
  const [activePlatform, setActivePlatform] = useState<'youtube' | 'bilibili'>('youtube');

  // 搜索音乐
  const searchMusic = async () => {
    if (!searchQuery.trim()) {
      toast.error('请输入搜索内容');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/music/search?q=${encodeURIComponent(searchQuery)}&platform=${activePlatform}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || '搜索失败');
      
      // 过滤出当前平台的结果
      const filteredResults = (data.items || []).filter((item: MusicResult) => item.platform === activePlatform);
      setResults(filteredResults);
      
      if (filteredResults.length === 0) {
        toast.error(`未找到相关音乐 (${activePlatform === 'youtube' ? 'YouTube' : 'Bilibili'})`);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      toast.error('搜索失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取视频详细信息
  const handleSelect = async (music: MusicResult) => {
    setSelectedId(music.id);
    
    try {
      let videoInfo = null;
      
      if (music.platform === 'youtube') {
        const infoRes = await fetch(`${API_BASE}/youtube/info?videoId=${music.id}`);
        if (infoRes.ok) {
          videoInfo = await infoRes.json();
          music.channelName = videoInfo.channelName;
          music.publishDate = videoInfo.publishDate;
          music.duration = videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}:${String(videoInfo.duration % 60).padStart(2, '0')}` : music.duration;
        }
      } else if (music.platform === 'bilibili') {
        const infoRes = await fetch(`${API_BASE}/music/bilibili/info?videoId=${music.id}`);
        if (infoRes.ok) {
          videoInfo = await infoRes.json();
          music.channelName = videoInfo.channelName;
          music.publishDate = videoInfo.publishDate;
          music.duration = videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}:${String(videoInfo.duration % 60).padStart(2, '0')}` : music.duration;
          music.playCount = videoInfo.playCount;
          music.danmakuCount = videoInfo.danmakuCount;
        }
      }
    } catch (error) {
      console.warn('获取视频详情失败:', error);
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
    if (e.key === 'Enter') {
      searchMusic();
    }
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
            {/* 头部 */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                🎵 分享音乐
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 平台切换按钮 */}
            <div className="flex border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={() => {
                  setActivePlatform('youtube');
                  setResults([]);
                  setSearchQuery('');
                }}
                className={`flex-1 py-3 text-sm font-medium transition-all relative ${
                  activePlatform === 'youtube'
                    ? 'text-red-600'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                    <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  YouTube
                </span>
                {activePlatform === 'youtube' && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-red-500 rounded-full" />
                )}
              </button>
              
              <button
                onClick={() => {
                  setActivePlatform('bilibili');
                  setResults([]);
                  setSearchQuery('');
                }}
                className={`flex-1 py-3 text-sm font-medium transition-all relative ${
                  activePlatform === 'bilibili'
                    ? 'text-blue-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.223 3.086a1.5 1.5 0 0 1 2.12 2.12l-2.88 2.88h2.88a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5v-8.5a1.5 1.5 0 0 1 1.5-1.5h2.88l-2.88-2.88a1.5 1.5 0 1 1 2.12-2.12L12 5.086l3.223-3.223a1.5 1.5 0 1 1 2.12 2.12L14.12 7.086h2.88l2.88-2.88z" />
                  </svg>
                  Bilibili
                </span>
                {activePlatform === 'bilibili' && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-500 rounded-full" />
                )}
              </button>
            </div>

            {/* 搜索框 */}
            <div className="p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`搜索 ${activePlatform === 'youtube' ? 'YouTube' : 'Bilibili'} 音乐...`}
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={searchMusic}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-xl text-white font-medium hover:shadow-lg transition disabled:opacity-50 ${
                    activePlatform === 'youtube'
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  }`}
                >
                  {isLoading ? '搜索中...' : '搜索'}
                </button>
              </div>
            </div>

            {/* 搜索结果 */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-3">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              
              {!isLoading && results.length === 0 && searchQuery && (
                <div className="text-center py-8 text-gray-400">
                  没有找到相关音乐
                </div>
              )}

              {results.map((music) => (
                <motion.div
                  key={music.id}
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedId === music.id
                      ? activePlatform === 'youtube'
                        ? 'bg-red-50 dark:bg-red-900/30 ring-2 ring-red-500'
                        : 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleSelect(music)}
                >
                  <img
                    src={music.coverUrl}
                    alt={music.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 dark:text-white truncate">
                      {music.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {music.artist}
                    </p>
                    {music.playCount && (
                      <p className="text-xs text-gray-400">
                        📺 {formatNumber(music.playCount)} 播放
                      </p>
                    )}
                  </div>
                  {music.duration && (
                    <span className="text-xs text-gray-400 flex-shrink-0">{music.duration}</span>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activePlatform === 'youtube'
                      ? 'bg-red-500/10'
                      : 'bg-blue-500/10'
                  }`}>
                    <svg className={`w-4 h-4 ${
                      activePlatform === 'youtube' ? 'text-red-500' : 'text-blue-500'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 提示 */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center text-xs text-gray-400">
              {activePlatform === 'youtube' ? '🎵 音乐来自 YouTube' : '📺 视频来自 Bilibili'}，点击即分享到聊天
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// 辅助函数：格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

export default MusicSearchModal;