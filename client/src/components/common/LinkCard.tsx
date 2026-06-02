// client/src/components/common/LinkCard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Maximize2, 
  X, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Music, 
  Film,
  Gamepad2,
  Loader2,
  Globe,
  Share2,
  MessageCircle
} from 'lucide-react';

interface LinkCardProps {
  url: string;
  isSelf?: boolean;
  onClose?: () => void;
}

interface EmbedInfo {
  type: 'youtube' | 'youtube_shorts' | 'tiktok' | 'bilibili' | 'twitch' | 'twitch_clip' | 'spotify' | 'soundcloud' | 'twitter' | 'instagram' | 'reddit' | 'pinterest' | 'vimeo' | 'dailymotion' | 'unknown';
  embedUrl: string | null;
  thumbnail: string | null;
  title: string | null;
  siteName: string;
  videoId?: string;
  duration?: string;
  channelName?: string;
  viewCount?: string;
}

// 平台配置（使用通用图标替代 Twitter/Instagram 专用图标）
const platformConfig: Record<string, {
  name: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}> = {
  youtube: {
    name: 'YouTube',
    icon: <Film className="w-3.5 h-3.5" />,
    color: 'text-red-500',
    gradient: 'from-red-500 to-red-600'
  },
  youtube_shorts: {
    name: 'YouTube Shorts',
    icon: <Film className="w-3.5 h-3.5" />,
    color: 'text-red-500',
    gradient: 'from-red-500 to-red-600'
  },
  tiktok: {
    name: 'TikTok',
    icon: <Music className="w-3.5 h-3.5" />,
    color: 'text-black dark:text-white',
    gradient: 'from-black to-gray-800'
  },
  bilibili: {
    name: 'Bilibili',
    icon: <Film className="w-3.5 h-3.5" />,
    color: 'text-pink-500',
    gradient: 'from-pink-500 to-pink-600'
  },
  twitch: {
    name: 'Twitch',
    icon: <Gamepad2 className="w-3.5 h-3.5" />,
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-purple-600'
  },
  twitch_clip: {
    name: 'Twitch Clip',
    icon: <Gamepad2 className="w-3.5 h-3.5" />,
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-purple-600'
  },
  spotify: {
    name: 'Spotify',
    icon: <Music className="w-3.5 h-3.5" />,
    color: 'text-green-500',
    gradient: 'from-green-500 to-green-600'
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: <Music className="w-3.5 h-3.5" />,
    color: 'text-orange-500',
    gradient: 'from-orange-500 to-orange-600'
  },
  twitter: {
    name: 'Twitter/X',
    icon: <Share2 className="w-3.5 h-3.5" />,
    color: 'text-blue-400',
    gradient: 'from-blue-400 to-blue-500'
  },
  instagram: {
    name: 'Instagram',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    color: 'text-pink-500',
    gradient: 'from-purple-500 to-pink-500'
  },
  reddit: {
    name: 'Reddit',
    icon: <ExternalLink className="w-3.5 h-3.5" />,
    color: 'text-orange-500',
    gradient: 'from-orange-500 to-orange-600'
  },
  pinterest: {
    name: 'Pinterest',
    icon: <ExternalLink className="w-3.5 h-3.5" />,
    color: 'text-red-500',
    gradient: 'from-red-500 to-red-600'
  },
  vimeo: {
    name: 'Vimeo',
    icon: <Film className="w-3.5 h-3.5" />,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-600'
  },
  dailymotion: {
    name: 'Dailymotion',
    icon: <Film className="w-3.5 h-3.5" />,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-600'
  },
  unknown: {
    name: '链接',
    icon: <Globe className="w-3.5 h-3.5" />,
    color: 'text-gray-500',
    gradient: 'from-gray-500 to-gray-600'
  }
};

const LinkCard: React.FC<LinkCardProps> = ({ url, isSelf = false, onClose }) => {
  const [embedInfo, setEmbedInfo] = useState<EmbedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  // ✅ 修复：添加 undefined 初始值
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 解析 URL 获取嵌入信息
  useEffect(() => {
    parseUrl(url);
    
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [url]);

  const parseUrl = async (inputUrl: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // ========== YouTube ==========
      const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]t=(\d+))?/;
      const youtubeMatch = inputUrl.match(youtubeRegex);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        setEmbedInfo({
          type: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          title: null,
          siteName: 'YouTube',
          videoId
        });
        setLoading(false);
        return;
      }

      // YouTube Shorts
      const shortsRegex = /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/;
      const shortsMatch = inputUrl.match(shortsRegex);
      if (shortsMatch) {
        const videoId = shortsMatch[1];
        setEmbedInfo({
          type: 'youtube_shorts',
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          title: null,
          siteName: 'YouTube Shorts',
          videoId
        });
        setLoading(false);
        return;
      }

      // ========== TikTok ==========
      const tiktokRegex = /(?:tiktok\.com\/@[\w.-]+\/video\/)(\d+)/;
      const tiktokMatch = inputUrl.match(tiktokRegex);
      if (tiktokMatch) {
        const videoId = tiktokMatch[1];
        setEmbedInfo({
          type: 'tiktok',
          embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
          thumbnail: null,
          title: null,
          siteName: 'TikTok',
          videoId
        });
        setLoading(false);
        return;
      }

      // ========== Bilibili ==========
      const bilibiliRegex = /(?:bilibili\.com\/video\/)(BV[a-zA-Z0-9]+)(?:\?p=(\d+))?/;
      const bilibiliMatch = inputUrl.match(bilibiliRegex);
      if (bilibiliMatch) {
        const videoId = bilibiliMatch[1];
        setEmbedInfo({
          type: 'bilibili',
          embedUrl: `//player.bilibili.com/player.html?bvid=${videoId}&page=1&autoplay=0&high_quality=1`,
          thumbnail: null,
          title: null,
          siteName: 'Bilibili',
          videoId
        });
        setLoading(false);
        return;
      }

      // ========== Twitch ==========
      const twitchVideoRegex = /(?:twitch\.tv\/videos\/)(\d+)/;
      const twitchVideoMatch = inputUrl.match(twitchVideoRegex);
      if (twitchVideoMatch) {
        const videoId = twitchVideoMatch[1];
        setEmbedInfo({
          type: 'twitch',
          embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}&autoplay=false`,
          thumbnail: null,
          title: null,
          siteName: 'Twitch',
          videoId
        });
        setLoading(false);
        return;
      }

      // Twitch Clip
      const twitchClipRegex = /(?:twitch\.tv\/([\w]+)\/clip\/([\w-]+))/;
      const twitchClipMatch = inputUrl.match(twitchClipRegex);
      if (twitchClipMatch) {
        const clipId = twitchClipMatch[2];
        setEmbedInfo({
          type: 'twitch_clip',
          embedUrl: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${window.location.hostname}`,
          thumbnail: null,
          title: null,
          siteName: 'Twitch Clip',
          videoId: clipId
        });
        setLoading(false);
        return;
      }

      // ========== Spotify ==========
      const spotifyRegex = /(?:open\.spotify\.com\/(track|album|playlist|artist)\/)([a-zA-Z0-9]+)/;
      const spotifyMatch = inputUrl.match(spotifyRegex);
      if (spotifyMatch) {
        const type = spotifyMatch[1];
        const id = spotifyMatch[2];
        setEmbedInfo({
          type: 'spotify',
          embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
          thumbnail: null,
          title: null,
          siteName: 'Spotify',
          videoId: id
        });
        setLoading(false);
        return;
      }

      // ========== SoundCloud ==========
      const soundcloudRegex = /(?:soundcloud\.com\/[\w-]+\/[\w-]+)/;
      if (soundcloudRegex.test(inputUrl)) {
        setEmbedInfo({
          type: 'soundcloud',
          embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(inputUrl)}&auto_play=false`,
          thumbnail: null,
          title: null,
          siteName: 'SoundCloud'
        });
        setLoading(false);
        return;
      }

      // ========== Twitter/X ==========
      const twitterRegex = /(?:twitter\.com|x\.com)\/([\w]+)\/status\/(\d+)/;
      const twitterMatch = inputUrl.match(twitterRegex);
      if (twitterMatch) {
        const tweetId = twitterMatch[2];
        setEmbedInfo({
          type: 'twitter',
          embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&dnt=true&theme=dark`,
          thumbnail: null,
          title: null,
          siteName: 'Twitter/X',
          videoId: tweetId
        });
        setLoading(false);
        return;
      }

      // ========== Instagram ==========
      const instagramRegex = /(?:instagram\.com\/p\/)([a-zA-Z0-9_-]+)/;
      const instagramMatch = inputUrl.match(instagramRegex);
      if (instagramMatch) {
        const postId = instagramMatch[1];
        setEmbedInfo({
          type: 'instagram',
          embedUrl: `https://www.instagram.com/p/${postId}/embed`,
          thumbnail: null,
          title: null,
          siteName: 'Instagram',
          videoId: postId
        });
        setLoading(false);
        return;
      }

      // ========== Reddit ==========
      const redditRegex = /(?:reddit\.com\/r\/[\w]+\/comments\/[\w]+\/[\w]+)/;
      if (redditRegex.test(inputUrl)) {
        setEmbedInfo({
          type: 'reddit',
          embedUrl: `https://www.redditmedia.com/${inputUrl.split('reddit.com')[1]}?ref_source=embed`,
          thumbnail: null,
          title: null,
          siteName: 'Reddit'
        });
        setLoading(false);
        return;
      }

      // ========== Vimeo ==========
      const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
      const vimeoMatch = inputUrl.match(vimeoRegex);
      if (vimeoMatch) {
        const videoId = vimeoMatch[1];
        setEmbedInfo({
          type: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=0`,
          thumbnail: null,
          title: null,
          siteName: 'Vimeo',
          videoId
        });
        setLoading(false);
        return;
      }

      // ========== Dailymotion ==========
      const dailymotionRegex = /(?:dailymotion\.com\/video\/)([a-zA-Z0-9]+)/;
      const dailymotionMatch = inputUrl.match(dailymotionRegex);
      if (dailymotionMatch) {
        const videoId = dailymotionMatch[1];
        setEmbedInfo({
          type: 'dailymotion',
          embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`,
          thumbnail: null,
          title: null,
          siteName: 'Dailymotion',
          videoId
        });
        setLoading(false);
        return;
      }

      // 未知链接
      setEmbedInfo({
        type: 'unknown',
        embedUrl: null,
        thumbnail: null,
        title: null,
        siteName: '链接'
      });
      setLoading(false);
    } catch (err) {
      console.error('解析链接失败:', err);
      setError('无法解析该链接');
      setLoading(false);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleFullscreen = () => {
    setIsExpanded(true);
  };

  const handleCloseFullscreen = () => {
    setIsExpanded(false);
  };

  const handleOpenOriginal = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getConfig = () => {
    return platformConfig[embedInfo?.type || 'unknown'] || platformConfig.unknown;
  };

  const config = getConfig();

  if (loading) {
    return (
      <div className={`mt-2 p-3 rounded-xl ${isSelf ? 'bg-blue-600/20' : 'bg-gray-100 dark:bg-gray-800'} animate-pulse`}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          <div className="h-3 bg-gray-400 rounded w-24" />
        </div>
      </div>
    );
  }

  if (error || !embedInfo || embedInfo.type === 'unknown') {
    return (
      <motion.a
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        href={url}
        target="_blank"
        rel="noopener,noreferrer"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
          isSelf ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300'
        }`}
      >
        <ExternalLink className="w-3 h-3" />
        <span className="truncate max-w-[200px]">{embedInfo?.siteName || '链接'}</span>
      </motion.a>
    );
  }

  // 非视频平台
  if (['spotify', 'soundcloud', 'twitter', 'instagram', 'reddit'].includes(embedInfo.type)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-2 rounded-xl overflow-hidden ${isSelf ? 'bg-blue-600/20' : 'bg-gray-100 dark:bg-gray-800'} shadow-sm`}
      >
        <div className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r ${config.gradient} bg-opacity-10`}>
          <div className="flex items-center gap-2">
            <div className={config.color}>{config.icon}</div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{config.name}</span>
          </div>
          <button
            onClick={handleOpenOriginal}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="在新窗口打开"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="p-2">
          <iframe
            src={embedInfo.embedUrl || undefined}
            className="w-full"
            height={embedInfo.type === 'spotify' ? 80 : embedInfo.type === 'twitter' ? 400 : 300}
            allow="encrypted-media"
            frameBorder="0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </motion.div>
    );
  }

  // 视频平台
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-2 rounded-xl overflow-hidden ${isSelf ? 'bg-blue-600/20' : 'bg-gray-100 dark:bg-gray-800'} shadow-sm`}
      >
        <div className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r ${config.gradient} bg-opacity-10`}>
          <div className="flex items-center gap-2">
            <div className={config.color}>{config.icon}</div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{config.name}</span>
            {embedInfo.duration && (
              <span className="text-[10px] text-gray-400">{embedInfo.duration}</span>
            )}
          </div>
          <button
            onClick={handleOpenOriginal}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="在新窗口打开"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div 
          className="relative bg-black"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setShowControls(false)}
        >
          {!isPlaying ? (
            <div 
              className="relative cursor-pointer group"
              onClick={handlePlay}
            >
              {embedInfo.thumbnail && (
                <img 
                  src={embedInfo.thumbnail} 
                  alt="视频封面"
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/640x360?text=Video+Preview';
                  }}
                />
              )}
              {!embedInfo.thumbnail && (
                <div className="w-full h-40 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <Film className="w-12 h-12 text-gray-500" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-all">
                <motion.div 
                  className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="w-7 h-7 text-gray-800 ml-0.5" />
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <iframe
                src={`${embedInfo.embedUrl}${embedInfo.type === 'youtube' ? '&autoplay=1' : ''}${isMuted && embedInfo.type === 'youtube' ? '&mute=1' : ''}`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
                title={embedInfo.title || config.name}
              />
              
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-center justify-between"
                  >
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleFullscreen}
                        className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        title="全屏"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* 全屏播放器 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={handleCloseFullscreen}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); handleCloseFullscreen(); }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              className="absolute bottom-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <iframe
              src={`${embedInfo.embedUrl}${embedInfo.type === 'youtube' ? '&autoplay=1' : ''}${isMuted && embedInfo.type === 'youtube' ? '&mute=1' : ''}`}
              className="w-full max-w-5xl aspect-video rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              title={embedInfo.title || config.name}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LinkCard;