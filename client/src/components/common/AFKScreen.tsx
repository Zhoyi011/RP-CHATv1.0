// client/src/components/common/AFKScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAFK } from '../../contexts/AFKContext';
import { useResponsive } from '../../hooks/useResponsive';
import { DraggableAFKStatus } from './DraggableAFKStatus';

interface AFKScreenProps {
  children: React.ReactNode;
}

// z-index 常量
const Z_INDEX = {
  WALLPAPER: 9000,
  AFK_UI: 9010,
};

// Cloudinary 视频配置（带优化参数）
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dz8luzlsg/video/upload';

// 优化参数：自动质量、自动格式
const OPTIMIZE_PARAMS = 'q_auto,f_auto';

// 桌面壁纸 URL
const DESKTOP_WALLPAPERS = [
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415378/desktop_1_to41sm.mp4`,
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415410/desktop_2_m6o4oh.mp4`,
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415326/desktop_3_bxtphi.mp4`,
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415369/desktop_4_wd0gyq.mp4`,
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415375/desktop_5_mihbb6.mp4`,
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415336/desktop_6_fp0rrb.mp4`,
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415428/desktop_7_yoojnp.mp4`,
];

// 手机壁纸 URL
const MOBILE_WALLPAPERS = [
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415486/mobile_1_iddpmq.mp4`,
  `${CLOUDINARY_BASE}/${OPTIMIZE_PARAMS}/v1781415485/mobile_2_r9blq3.mp4`,
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

const iosPlayButtonVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.3 } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.2 } }
};

export const AFKScreen: React.FC<AFKScreenProps> = ({ children }) => {
  const { isAFK, afkDuration, unlockAFK, afkPasswordEnabled, showIOSPlayButton, requestIOSPlayback } = useAFK();
  const { isMobile, isTablet } = useResponsive();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [lockIconRotate, setLockIconRotate] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  
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

  // ========== 工具函数（必须在 useEffect 之前定义） ==========
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} 分钟 ${secs} 秒`;
    return `${secs} 秒`;
  };

  const getVideoByLayer = useCallback((layer: 'A' | 'B') => {
    return layer === 'A' ? videoASrc.current : videoBSrc.current;
  }, []);

  // ========== useEffect ==========

  useEffect(() => {
    isVideoPausedRef.current = isVideoPaused;
  }, [isVideoPaused]);

  // 监听 iOS 播放请求事件
  useEffect(() => {
    const handleRequestPlay = () => {
      console.log('📱 [AFK] 收到 iOS 播放请求');
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (currentVideo && currentVideo.paused) {
        currentVideo.play().catch(e => console.log('iOS 播放失败:', e));
      }
      const backupVideo = getVideoByLayer(activeLayerRef.current === 'A' ? 'B' : 'A');
      if (backupVideo && backupVideo.paused && backupVideo.src) {
        backupVideo.play().catch(e => console.log('备用层播放失败:', e));
      }
    };
    
    window.addEventListener('requestIOSVideoPlay', handleRequestPlay);
    return () => window.removeEventListener('requestIOSVideoPlay', handleRequestPlay);
  }, [getVideoByLayer]);

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
      
      // 退出 AFK 时释放视频资源
      if (videoASrc.current) {
        videoASrc.current.pause();
        videoASrc.current.src = '';
        videoASrc.current.load();
      }
      if (videoBSrc.current) {
        videoBSrc.current.pause();
        videoBSrc.current.src = '';
        videoBSrc.current.load();
      }
    }
  }, [isAFK]);

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
          .catch((err) => {
            console.log('视频播放失败:', err);
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
        isVideoPaused={isVideoPaused}
        isRepeating={isRepeating}
      />
      
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
            {/* 视频元素 - 添加 playsInline 和 webkit-playsinline 确保 iPhone 兼容 */}
            <video
              ref={videoASrc}
              muted
              playsInline
              autoPlay
              webkit-playsinline="true"
              loop={false}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: 0 }}
              onError={handleVideoError}
            />
            <video
              ref={videoBSrc}
              muted
              playsInline
              autoPlay
              webkit-playsinline="true"
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
                      <p className="text-white/90 text-sm">已离开 <span className="text-orange-400 font-bold text-2xl mx-1">{formatDuration(afkDuration)}</span></p>
                    </motion.div>
                    
                    {/* 🆕 iOS 播放按钮 - 当视频未自动播放时显示 */}
                    <AnimatePresence>
                      {showIOSPlayButton && (
                        <motion.div
                          variants={iosPlayButtonVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="mb-6"
                        >
                          <button
                            onClick={requestIOSPlayback}
                            className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-white font-medium border border-white/30 hover:bg-white/30 transition-all duration-200 flex items-center gap-2 mx-auto"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            点击播放动态壁纸
                          </button>
                          <p className="text-white/40 text-xs mt-2">iOS 设备需要手动点击播放</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
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