// client/src/components/common/AFKScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAFK } from '../../contexts/AFKContext';
import { useResponsive } from '../../hooks/useResponsive';
import { DraggableAFKStatus } from './DraggableAFKStatus';
import MusicSearchModal from '../chat/MusicSearchModal';
import { useMediaSession } from '../../hooks/useMediaSession';
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
}

interface AFKScreenProps {
  children: React.ReactNode;
}

// z-index 常量
const Z_INDEX = {
  WALLPAPER: 9000,
  AFK_UI: 9010,
  MUSIC_PANEL: 10000,
  MUSIC_MODAL: 10050,
};

// 壁纸配置
const GITHUB_BASE = 'https://github.com/Zhoyi011/RP-CHATv1.0/releases/download/v1.0.0';
const DESKTOP_WALLPAPERS = [
  `${GITHUB_BASE}/desktop_1.mp4`,
  `${GITHUB_BASE}/desktop_2.mp4`,
  `${GITHUB_BASE}/desktop_3.mp4`,
  `${GITHUB_BASE}/desktop_4.mp4`,
  `${GITHUB_BASE}/desktop_5.mp4`,
  `${GITHUB_BASE}/desktop_6.mp4`,
  `${GITHUB_BASE}/desktop_7.mp4`,
];
const MOBILE_WALLPAPERS = [
  `${GITHUB_BASE}/mobile_1.mp4`,
  `${GITHUB_BASE}/mobile_2.mp4`,
];

// 动画变体
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const contentVariants: Variants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300, delay: 0.1 } },
  exit: { scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.2 } }
};

const durationVariants: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { delay: 0.3, duration: 0.3 } }
};

const buttonVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { delay: 0.4, duration: 0.3 } },
  hover: { scale: 1.02, transition: { type: "spring", stiffness: 400 } },
  tap: { scale: 0.98, transition: { duration: 0.1 } }
};

const inputVariants: Variants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { delay: 0.35, duration: 0.3 } },
  exit: { y: -20, opacity: 0, transition: { duration: 0.2 } }
};

const titleVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { delay: 0.15, duration: 0.4 } }
};

const subtitleVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { delay: 0.2, duration: 0.4 } }
};

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
};

const pulseRingVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.6, 0.2, 0.6],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

export const AFKScreen: React.FC<AFKScreenProps> = ({ children }) => {
  const { isAFK, afkDuration, unlockAFK, afkPasswordEnabled } = useAFK();
  const { isMobile, isTablet } = useResponsive();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [lockIconRotate, setLockIconRotate] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);

  // 🎵 音乐播放器状态
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<MusicResult | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [musicCurrentTime, setMusicCurrentTime] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  
  const { 
    setMetadata, 
    setPlaybackState, 
    setPositionState, 
    setupHandlers, 
    clearHandlers,
    isSupported: mediaSessionSupported 
  } = useMediaSession();
  
  const isVideoPausedRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  const wallpapers = (isMobile && !isTablet) ? MOBILE_WALLPAPERS : DESKTOP_WALLPAPERS;
  const totalCount = wallpapers.length;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const videoASrc = useRef<HTMLVideoElement>(null);
  const videoBSrc = useRef<HTMLVideoElement>(null);
  const activeLayerRef = useRef<'A' | 'B'>('A');
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const forceTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mainLoopTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef<number>(0);
  const lastCurrentTimeRef = useRef<number>(0);
  const videoStartTimeRef = useRef<number>(0);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationStr = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} 分钟 ${secs} 秒`;
    return `${secs} 秒`;
  };

  // ========== 🔥 检测页面中正在播放的音频/视频 ==========
  const detectPlayingMedia = useCallback(() => {
    // 1. 检查我们自己的 audioElement（通过搜索选择的音乐）
    if (audioElement && !audioElement.paused && audioElement.currentTime > 0) {
      return {
        element: audioElement,
        title: currentMusic?.title || '正在播放',
        artist: currentMusic?.artist || '未知',
        duration: audioElement.duration,
        currentTime: audioElement.currentTime,
      };
    }
    
    // 2. 检查页面中所有的 audio 和 video 元素
    const medias = document.querySelectorAll('audio, video');
    for (const media of medias) {
      const element = media as HTMLAudioElement | HTMLVideoElement;
      if (!element.paused && element.currentTime > 0 && element.duration > 0) {
        let title = (element as any).dataset?.title;
        let artist = (element as any).dataset?.artist;
        
        if (!title) {
          const parent = element.closest('[data-title]');
          if (parent) {
            title = parent.getAttribute('data-title') || '';
            artist = parent.getAttribute('data-artist') || '';
          }
        }
        
        return {
          element,
          title: title || '正在播放',
          artist: artist || '未知',
          duration: element.duration,
          currentTime: element.currentTime,
        };
      }
    }
    
    return null;
  }, [audioElement, currentMusic]);

  // ========== 🔥 监听页面中的媒体播放 ==========
  useEffect(() => {
    if (!isAFK) return;
    
    let timeUpdateHandler: ((e: Event) => void) | null = null;
    
    const interval = setInterval(() => {
      const playing = detectPlayingMedia();
      
      if (playing && !currentMusic) {
        console.log('🎵 检测到播放:', playing.title);
        
        setCurrentMusic({
          id: 'detected',
          title: playing.title,
          artist: playing.artist,
          coverUrl: '',
          videoUrl: '',
          platform: 'youtube',
        });
        
        if (!audioElement) {
          setAudioElement(playing.element);
          setIsMusicPlaying(true);
          setMusicCurrentTime(playing.currentTime);
          setMusicDuration(playing.duration);
          
          timeUpdateHandler = () => {
            setMusicCurrentTime(playing.element.currentTime);
          };
          playing.element.addEventListener('timeupdate', timeUpdateHandler);
          playing.element.addEventListener('ended', () => setIsMusicPlaying(false));
        }
      } else if (!playing && currentMusic && currentMusic.id === 'detected') {
        console.log('🎵 检测到播放停止');
        if (timeUpdateHandler && audioElement) {
          audioElement.removeEventListener('timeupdate', timeUpdateHandler);
        }
        setCurrentMusic(null);
        setAudioElement(null);
        setIsMusicPlaying(false);
        setMusicCurrentTime(0);
        setMusicDuration(0);
      }
    }, 2000);
    
    return () => {
      clearInterval(interval);
      if (timeUpdateHandler && audioElement) {
        audioElement.removeEventListener('timeupdate', timeUpdateHandler);
      }
    };
  }, [isAFK, currentMusic, audioElement, detectPlayingMedia]);

  // 同步暂停状态到 ref
  useEffect(() => {
    isVideoPausedRef.current = isVideoPaused;
  }, [isVideoPaused]);

  // 监听来自 DraggableAFKStatus 的事件
  useEffect(() => {
    const handleShowUI = () => {
      setShowUI(true);
      setShowPasswordField(false);
      setPassword('');
      setError(false);
      setLockIconRotate(false);
      window.dispatchEvent(new CustomEvent('afkUIShown'));
    };
    const handleHideUI = () => {
      setShowUI(false);
      setShowPasswordField(false);
      setPassword('');
      setError(false);
      setLockIconRotate(false);
      window.dispatchEvent(new CustomEvent('afkUIHidden'));
    };
    const handleToggleUI = () => {
      setShowUI(prev => {
        const newValue = !prev;
        if (newValue) {
          setShowPasswordField(false);
          setPassword('');
          setError(false);
          setLockIconRotate(false);
          window.dispatchEvent(new CustomEvent('afkUIShown'));
        } else {
          setShowPasswordField(false);
          setPassword('');
          setError(false);
          setLockIconRotate(false);
          window.dispatchEvent(new CustomEvent('afkUIHidden'));
        }
        return newValue;
      });
    };
    
    window.addEventListener('showAFKUI', handleShowUI);
    window.addEventListener('hideAFKUI', handleHideUI);
    window.addEventListener('toggleAFKUI', handleToggleUI);
    
    return () => {
      window.removeEventListener('showAFKUI', handleShowUI);
      window.removeEventListener('hideAFKUI', handleHideUI);
      window.removeEventListener('toggleAFKUI', handleToggleUI);
    };
  }, []);

  // 退出 AFK 时重置状态
  useEffect(() => {
    if (!isAFK) {
      setShowUI(false);
      setShowPasswordField(false);
      setPassword('');
      setError(false);
      setLockIconRotate(false);
      setIsVideoPaused(false);
      setIsRepeating(false);
      retryCountRef.current = 0;
      setVideoLoadError(false);
      isInitializedRef.current = false;
      // 退出 AFK 时不清空音乐面板，让面板隐藏
    }
  }, [isAFK]);

  const getVideoByLayer = useCallback((layer: 'A' | 'B') => {
    return layer === 'A' ? videoASrc.current : videoBSrc.current;
  }, []);

  const forcePlayVideo = useCallback((video: HTMLVideoElement, retry = 0) => {
    if (!video) return;
    if (isVideoPausedRef.current) return;
    if (!video.src || video.src === '') {
      if (retry < 3) {
        setTimeout(() => forcePlayVideo(video, retry + 1), 300);
      }
      return;
    }
    
    const tryPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            retryCountRef.current = 0;
            setVideoLoadError(false);
            videoStartTimeRef.current = Date.now();
          })
          .catch(() => {
            if (retry < 3) {
              setTimeout(() => {
                video.load();
                setTimeout(() => forcePlayVideo(video, retry + 1), 200);
              }, 500);
            } else {
              setVideoLoadError(true);
            }
          });
      }
    };
    
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      const handleCanPlay = () => {
        video.removeEventListener('canplay', handleCanPlay);
        tryPlay();
      };
      video.addEventListener('canplay', handleCanPlay);
      setTimeout(() => {
        video.removeEventListener('canplay', handleCanPlay);
        if (retry < 3) forcePlayVideo(video, retry + 1);
      }, 2000);
    }
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoLoadError(true);
  }, []);

  const loadVideoToLayer = useCallback((layer: 'A' | 'B', videoUrl: string, shouldPlay = false) => {
    const video = getVideoByLayer(layer);
    if (!video) return;
    
    video.pause();
    video.src = videoUrl;
    video.load();
    video.loop = isRepeating;
    video.style.opacity = layer === activeLayerRef.current ? '1' : '0';
    video.onerror = () => handleVideoError();
    
    if (shouldPlay && !isVideoPaused) {
      const handleCanPlay = () => {
        video.removeEventListener('canplay', handleCanPlay);
        if (!isVideoPaused) {
          video.play().catch(e => console.log('播放失败:', e));
        }
      };
      video.addEventListener('canplay', handleCanPlay);
      setTimeout(() => {
        video.removeEventListener('canplay', handleCanPlay);
        if (!isVideoPaused) {
          video.play().catch(e => console.log('播放失败:', e));
        }
      }, 1000);
    }
  }, [getVideoByLayer, handleVideoError, isRepeating, isVideoPaused]);

  const clearAllTimers = useCallback(() => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (forceTransitionTimerRef.current) clearTimeout(forceTransitionTimerRef.current);
    if (progressCheckRef.current) clearInterval(progressCheckRef.current);
    if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    if (mainLoopTimerRef.current) clearInterval(mainLoopTimerRef.current);
  }, []);

  const forceSwitchVideo = useCallback(() => {
    if (isTransitioning || !isAFK || isRepeating || isVideoPaused) return;
    performSmoothTransition();
  }, [isTransitioning, isAFK, isRepeating, isVideoPaused]);

  const startMainLoop = useCallback(() => {
    if (mainLoopTimerRef.current) clearInterval(mainLoopTimerRef.current);
    mainLoopTimerRef.current = setInterval(() => forceSwitchVideo(), 180000);
  }, [forceSwitchVideo]);

  const preloadNextVideo = useCallback(() => {
    if (isTransitioning || isRepeating) return;
    const nextIdx = (currentIndex + 1) % totalCount;
    if (nextIdx === nextIndex) return;
    setNextIndex(nextIdx);
    const backupLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
    const nextVideoUrl = wallpapers[nextIdx];
    if (nextVideoUrl) loadVideoToLayer(backupLayer, nextVideoUrl);
  }, [currentIndex, nextIndex, totalCount, wallpapers, loadVideoToLayer, isTransitioning, isRepeating]);

  const performSmoothTransition = useCallback(() => {
    if (isTransitioning || isRepeating) return;
    setIsTransitioning(true);
    
    const oldLayer = activeLayerRef.current;
    const newLayer = oldLayer === 'A' ? 'B' : 'A';
    const newVideo = getVideoByLayer(newLayer);
    const oldVideo = getVideoByLayer(oldLayer);
    const nextIdx = nextIndex;
    
    if (!newVideo) {
      setIsTransitioning(false);
      return;
    }
    
    if (newVideo.readyState < 2) {
      const currentVideoUrl = wallpapers[nextIdx];
      if (currentVideoUrl) loadVideoToLayer(newLayer, currentVideoUrl, true);
      setTimeout(() => {
        if (!isTransitioning) performSmoothTransition();
      }, 1000);
      return;
    }
    
    newVideo.currentTime = 0;
    newVideo.style.opacity = '1';
    if (!isVideoPaused) newVideo.play().catch(e => console.log('播放失败:', e));
    if (oldVideo) {
      oldVideo.style.opacity = '0';
      setTimeout(() => oldVideo.pause(), 500);
    }
    
    activeLayerRef.current = newLayer;
    
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setCurrentIndex(nextIdx);
      const afterNextIdx = (nextIdx + 1) % totalCount;
      setNextIndex(afterNextIdx);
      const backupLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
      const nextVideoUrl = wallpapers[afterNextIdx];
      if (nextVideoUrl && !isRepeating) loadVideoToLayer(backupLayer, nextVideoUrl);
      setIsTransitioning(false);
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (currentVideo && !currentVideo.paused && isAFK && !isVideoPaused) {
        videoStartTimeRef.current = Date.now();
      }
    }, 500);
  }, [currentIndex, nextIndex, totalCount, wallpapers, getVideoByLayer, loadVideoToLayer, isTransitioning, isAFK, isRepeating, isVideoPaused]);

  const startProgressCheck = useCallback((video: HTMLVideoElement) => {
    if (progressCheckRef.current) clearInterval(progressCheckRef.current);
    if (forceTransitionTimerRef.current) clearTimeout(forceTransitionTimerRef.current);
    forceTransitionTimerRef.current = setTimeout(() => {
      if (!isTransitioning && isAFK && !isRepeating && !isVideoPaused) {
        performSmoothTransition();
      }
    }, 35000);
    
    progressCheckRef.current = setInterval(() => {
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (!currentVideo || currentVideo.paused || currentVideo.ended) return;
      const duration = currentVideo.duration;
      const currentTime = currentVideo.currentTime;
      if (!isFinite(duration) || duration <= 0) return;
      const remaining = duration - currentTime;
      if (remaining <= 3 && remaining > 0 && !isTransitioning && !isRepeating) preloadNextVideo();
      if (remaining <= 0.3 && remaining > -0.5 && !isTransitioning && !isRepeating) performSmoothTransition();
    }, 200);
  }, [getVideoByLayer, isTransitioning, isAFK, isRepeating, isVideoPaused, performSmoothTransition, preloadNextVideo]);

  const stopProgressCheck = useCallback(() => {
    if (progressCheckRef.current) clearInterval(progressCheckRef.current);
    if (forceTransitionTimerRef.current) clearTimeout(forceTransitionTimerRef.current);
  }, []);

  const startHealthCheck = useCallback(() => {
    if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    healthCheckRef.current = setInterval(() => {
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (!currentVideo || !isAFK || isTransitioning || isVideoPaused) return;
      if (!currentVideo.paused && !currentVideo.ended) {
        if (lastCurrentTimeRef.current === currentVideo.currentTime && currentVideo.currentTime > 0) {
          currentVideo.play().catch(e => console.log('恢复播放失败:', e));
        }
        lastCurrentTimeRef.current = currentVideo.currentTime;
      } else if (currentVideo.paused && !currentVideo.ended && currentVideo.readyState >= 2 && !isVideoPaused) {
        currentVideo.play().catch(e => console.log('恢复播放失败:', e));
      }
    }, 5000);
  }, [getVideoByLayer, isAFK, isTransitioning, isVideoPaused]);

  const stopHealthCheck = useCallback(() => {
    if (healthCheckRef.current) clearInterval(healthCheckRef.current);
  }, []);

  useEffect(() => {
    const currentLayer = activeLayerRef.current;
    const currentVideo = getVideoByLayer(currentLayer);
    if (!currentVideo || isTransitioning) {
      stopProgressCheck();
      stopHealthCheck();
      return;
    }
    
    const handleEnded = () => {
      if (!isTransitioning && !isRepeating) performSmoothTransition();
    };
    const handleCanPlay = () => {
      stopProgressCheck();
      stopHealthCheck();
      startProgressCheck(currentVideo);
      startHealthCheck();
    };
    
    currentVideo.addEventListener('ended', handleEnded);
    currentVideo.addEventListener('canplay', handleCanPlay);
    if (currentVideo.readyState >= 2) {
      startProgressCheck(currentVideo);
      startHealthCheck();
    }
    
    return () => {
      currentVideo.removeEventListener('ended', handleEnded);
      currentVideo.removeEventListener('canplay', handleCanPlay);
      stopProgressCheck();
      stopHealthCheck();
    };
  }, [getVideoByLayer, isTransitioning, isRepeating, performSmoothTransition, startProgressCheck, startHealthCheck, stopProgressCheck, stopHealthCheck]);

  useEffect(() => {
    if (isAFK && totalCount > 0) {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;
      
      activeLayerRef.current = 'A';
      setIsTransitioning(false);
      setCurrentIndex(0);
      setNextIndex(1);
      lastCurrentTimeRef.current = 0;
      retryCountRef.current = 0;
      setVideoLoadError(false);
      setIsVideoPaused(false);
      setIsRepeating(false);
      clearAllTimers();
      loadVideoToLayer('A', wallpapers[0], true);
      if (totalCount > 1) loadVideoToLayer('B', wallpapers[1]);
      startMainLoop();
    } else if (!isAFK) {
      isInitializedRef.current = false;
      clearAllTimers();
    }
  }, [isAFK, totalCount, wallpapers, loadVideoToLayer, startMainLoop, clearAllTimers]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const handlePauseToggle = useCallback((paused: boolean) => {
    setIsVideoPaused(paused);
    const currentVideo = getVideoByLayer(activeLayerRef.current);
    if (currentVideo) {
      if (paused) currentVideo.pause();
      else currentVideo.play().catch(e => console.log('播放失败:', e));
    }
  }, [getVideoByLayer]);

  const handleRepeatToggle = useCallback((repeating: boolean) => {
    setIsRepeating(repeating);
    const currentVideo = getVideoByLayer(activeLayerRef.current);
    if (currentVideo) currentVideo.loop = repeating;
    if (!repeating) startMainLoop();
    else if (mainLoopTimerRef.current) clearInterval(mainLoopTimerRef.current);
  }, [getVideoByLayer, startMainLoop]);

  const handleSkip = useCallback(() => {
    if (isTransitioning) return;
    if (isRepeating) {
      setIsRepeating(false);
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (currentVideo) currentVideo.loop = false;
    }
    performSmoothTransition();
  }, [isTransitioning, isRepeating, getVideoByLayer, performSmoothTransition]);

  const handleShowUI = useCallback(() => {
    setShowUI(true);
    window.dispatchEvent(new CustomEvent('afkUIShown'));
  }, []);

  // ========== 🎵 音乐播放器回调函数 ==========
  const handleOpenMusicPlayer = useCallback(() => {
    setShowMusicPlayer(true);
  }, []);

  const handleCloseMusicPlayer = useCallback(() => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    if (mediaSessionSupported) {
      clearHandlers();
      setPlaybackState(false);
    }
    setAudioElement(null);
    setCurrentMusic(null);
    setIsMusicPlaying(false);
    setMusicCurrentTime(0);
    setMusicDuration(0);
  }, [audioElement, mediaSessionSupported, clearHandlers, setPlaybackState]);

  // 🔥 从 YouTube URL 获取音频流（需要后端代理）
  const getYouTubeAudioUrl = (videoUrl: string): string => {
    const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    if (!videoId) return '';
    // 使用后端代理接口
    return `/api/youtube/audio?videoId=${videoId}`;
  };

  const handleSelectMusic = useCallback((music: MusicResult) => {
    console.log('🎵 选择音乐:', music.title);
    
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    if (mediaSessionSupported) {
      clearHandlers();
    }
    
    // 🔥 获取真实的 YouTube 音频 URL
    const audioUrl = getYouTubeAudioUrl(music.videoUrl);
    
    if (!audioUrl) {
      toast.error('无法获取音频链接');
      return;
    }
    
    const audio = new Audio();
    audio.src = audioUrl;
    audio.volume = musicVolume;
    
    setCurrentMusic(music);
    setAudioElement(audio);
    
    audio.play().catch(err => {
      console.error('播放失败:', err);
      toast.error('播放失败，请重试');
    });
    
    audio.addEventListener('play', () => {
      setIsMusicPlaying(true);
      if (mediaSessionSupported) setPlaybackState(true);
    });
    audio.addEventListener('pause', () => {
      setIsMusicPlaying(false);
      if (mediaSessionSupported) setPlaybackState(false);
    });
    audio.addEventListener('ended', () => {
      setIsMusicPlaying(false);
      if (mediaSessionSupported) setPlaybackState(false);
    });
    audio.addEventListener('timeupdate', () => {
      setMusicCurrentTime(audio.currentTime);
      if (mediaSessionSupported) setPositionState(audio.currentTime, audio.duration);
    });
    audio.addEventListener('durationchange', () => {
      setMusicDuration(audio.duration);
    });
    
    if (mediaSessionSupported) {
      setMetadata({
        title: music.title,
        artist: music.artist,
        album: 'AFK 音乐',
        artwork: music.coverUrl ? [{ src: music.coverUrl, sizes: '96x96', type: 'image/jpeg' }] : [],
      });
      setupHandlers({
        onPlay: () => { audio.play().catch(console.error); setPlaybackState(true); },
        onPause: () => { audio.pause(); setPlaybackState(false); },
        onSeek: (time: number) => { audio.currentTime = time; setPositionState(time, audio.duration); },
        onStop: () => { handleCloseMusicPlayer(); },
      });
    }
    
    setShowMusicPlayer(false);
  }, [audioElement, musicVolume, mediaSessionSupported, setMetadata, setPlaybackState, setPositionState, setupHandlers, clearHandlers, handleCloseMusicPlayer]);

  const handleMusicPlayPause = useCallback(() => {
    if (audioElement) {
      if (isMusicPlaying) {
        audioElement.pause();
        if (mediaSessionSupported) setPlaybackState(false);
      } else {
        audioElement.play().catch(err => console.error('播放失败:', err));
        if (mediaSessionSupported) setPlaybackState(true);
      }
    }
  }, [audioElement, isMusicPlaying, mediaSessionSupported, setPlaybackState]);

  const handleMusicVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMusicVolume(newVolume);
    if (audioElement) audioElement.volume = newVolume;
  }, [audioElement]);

  const handleMusicSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioElement) {
      audioElement.currentTime = newTime;
      setMusicCurrentTime(newTime);
      if (mediaSessionSupported) setPositionState(newTime, audioElement.duration);
    }
  }, [audioElement, mediaSessionSupported, setPositionState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAFK && e.key === 'Escape') {
        if (showUI && afkPasswordEnabled) {
          e.preventDefault();
          setShowUI(false);
          setShowPasswordField(false);
          setPassword('');
          setError(false);
          setLockIconRotate(false);
          window.dispatchEvent(new CustomEvent('afkUIHidden'));
        } else if (!afkPasswordEnabled && !showUI) {
          unlockAFK('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAFK, showUI, afkPasswordEnabled, unlockAFK]);

  const handleUnlockLocal = () => {
    if (afkPasswordEnabled) {
      if (unlockAFK(password)) {
        setPassword('');
        setError(false);
        setShowPasswordField(false);
        setShowUI(false);
        setLockIconRotate(false);
      } else {
        setError(true);
        setLockIconRotate(true);
        setTimeout(() => setLockIconRotate(false), 500);
        setTimeout(() => setError(false), 2000);
      }
    } else {
      unlockAFK('');
      setShowUI(false);
    }
  };

  return (
    <>
      {children}
      
      <DraggableAFKStatus 
        size="md"
        onPauseToggle={handlePauseToggle}
        onRepeatToggle={handleRepeatToggle}
        onSkip={handleSkip}
        onShowUI={handleShowUI}
        onOpenMusicPlayer={handleOpenMusicPlayer}
        isVideoPaused={isVideoPaused}
        isRepeating={isRepeating}
      />
      
      {/* 🎵 音乐面板 - 只在 AFK 模式下显示 */}
      {isAFK && (
        <div style={{ zIndex: Z_INDEX.MUSIC_PANEL, position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', width: '320px' }}>
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {currentMusic ? (
              <>
                <div className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium truncate">{currentMusic.title}</h4>
                    <p className="text-white/60 text-xs truncate">{currentMusic.artist}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleMusicPlayPause}
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                    >
                      {isMusicPlaying ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={handleCloseMusicPlayer}
                      className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                {isMusicPlaying && musicDuration > 0 && (
                  <div className="px-3 pb-3 space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={musicDuration}
                      step="0.1"
                      value={musicCurrentTime}
                      onChange={handleMusicSeek}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-1 text-[10px] text-white/50">
                      <span>{formatTime(musicCurrentTime)}</span>
                      <span>{formatTime(musicDuration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newVolume = musicVolume === 0 ? 0.7 : 0;
                          setMusicVolume(newVolume);
                          if (audioElement) audioElement.volume = newVolume;
                        }}
                        className="text-white/70 hover:text-white"
                      >
                        {musicVolume === 0 ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 0 1 0 7.072m2.828-9.9a9 9 0 0 1 0 12.728M5.586 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={musicVolume}
                        onChange={handleMusicVolumeChange}
                        className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={handleOpenMusicPlayer}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-white text-sm font-medium">播放音乐</h4>
                  <p className="text-white/50 text-xs">点击搜索歌曲</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ zIndex: Z_INDEX.MUSIC_MODAL, position: 'relative' }}>
        <MusicSearchModal
          isOpen={showMusicPlayer}
          onClose={() => setShowMusicPlayer(false)}
          onSelect={handleSelectMusic}
        />
      </div>
      
      <AnimatePresence>
        {isAFK && wallpapers.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0"
            style={{ zIndex: Z_INDEX.WALLPAPER }}
          >
            <video
              ref={videoASrc}
              muted
              playsInline
              loop={false}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: 0 }}
              onError={handleVideoError}
            />
            <video
              ref={videoBSrc}
              muted
              playsInline
              loop={false}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: 0 }}
              onError={handleVideoError}
            />
            {videoLoadError && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
            )}
            {!videoLoadError && (
              <motion.div variants={overlayVariants} initial="hidden" animate="visible" className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
            )}
            
            <AnimatePresence>
              {showUI && (
                <motion.div
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative flex items-center justify-center w-full h-full pointer-events-none"
                  style={{ zIndex: Z_INDEX.AFK_UI }}
                >
                  <div className="text-center max-w-md mx-4 pointer-events-auto">
                    <motion.div variants={pulseRingVariants} animate="animate" className="relative mx-auto mb-6 w-24 h-24">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={lockIconRotate ? { rotate: [0, -10, 10, -5, 5, 0] } : { rotate: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 400 }}
                        className="w-full h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-2xl"
                      >
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </motion.div>
                    </motion.div>
                    <motion.h2 variants={titleVariants} initial="hidden" animate="visible" className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                      隐私保护模式
                    </motion.h2>
                    <motion.p variants={subtitleVariants} initial="hidden" animate="visible" className="text-white/80 text-lg mb-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                      您的屏幕已被锁定
                    </motion.p>
                    <motion.div variants={durationVariants} initial="hidden" animate="visible" className="bg-black/40 backdrop-blur-md rounded-2xl p-4 mb-8 inline-block mx-auto border border-white/20">
                      <p className="text-white/90 text-sm">已离开 <span className="text-orange-400 font-bold text-2xl mx-1">{formatDurationStr(afkDuration)}</span></p>
                    </motion.div>
                    <AnimatePresence mode="wait">
                      {afkPasswordEnabled && showPasswordField && (
                        <motion.div key="password-input" variants={inputVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3 mb-4">
                          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleUnlockLocal()} placeholder="输入解锁密码" autoFocus className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                          {error && <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm">密码错误，请重试</motion.p>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.div variants={buttonVariants} initial="hidden" animate="visible" whileHover="hover" whileTap="tap" className="space-y-4">
                      {!showPasswordField ? (
                        afkPasswordEnabled ? (
                          <button onClick={() => setShowPasswordField(true)} className="w-full px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl">输入密码解锁</button>
                        ) : (
                          <button onClick={handleUnlockLocal} className="w-full px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl">退出挂机模式</button>
                        )
                      ) : (
                        <div className="flex gap-3">
                          <button onClick={() => { setShowPasswordField(false); setPassword(''); setError(false); }} className="flex-1 px-4 py-2.5 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-200">取消</button>
                          <button onClick={handleUnlockLocal} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg">解锁</button>
                        </div>
                      )}
                      <p className="text-xs text-white/50">按 <kbd className="px-2 py-0.5 bg-white/20 rounded-md text-[10px]">ESC</kbd> 关闭面板</p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AFKScreen;