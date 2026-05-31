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

// ========== 🔥 GitHub Releases 壁纸配置 ==========
const GITHUB_BASE = 'https://github.com/Zhoyi011/RP-CHATv1.0/releases/download/v1.0.0';

// 电脑端壁纸（7个）
const DESKTOP_WALLPAPERS = [
  `${GITHUB_BASE}/desktop_1.mp4`,
  `${GITHUB_BASE}/desktop_2.mp4`,
  `${GITHUB_BASE}/desktop_3.mp4`,
  `${GITHUB_BASE}/desktop_4.mp4`,
  `${GITHUB_BASE}/desktop_5.mp4`,
  `${GITHUB_BASE}/desktop_6.mp4`,
  `${GITHUB_BASE}/desktop_7.mp4`,
];

// 手机端壁纸（2个）
const MOBILE_WALLPAPERS = [
  `${GITHUB_BASE}/mobile_1.mp4`,
  `${GITHUB_BASE}/mobile_2.mp4`,
];
// ================================================

// 动画变体
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const contentVariants: Variants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: { 
    scale: 1, 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300, delay: 0.1 }
  },
  exit: { 
    scale: 0.95, 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.2 }
  }
};

const durationVariants: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { delay: 0.3, duration: 0.3 }
  }
};

const buttonVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { delay: 0.4, duration: 0.3 }
  },
  hover: { 
    scale: 1.02,
    transition: { type: "spring", stiffness: 400 }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

const inputVariants: Variants = {
  hidden: { y: 10, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { delay: 0.35, duration: 0.3 }
  },
  exit: { 
    y: -20, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const titleVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { delay: 0.15, duration: 0.4 }
  }
};

const subtitleVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { delay: 0.2, duration: 0.4 }
  }
};

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const pulseRingVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.6, 0.2, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
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
  
  // 视频控制状态
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  
  // 🔥 使用 ref 避免闭包问题和重复初始化
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

  // 同步暂停状态到 ref
  useEffect(() => {
    isVideoPausedRef.current = isVideoPaused;
  }, [isVideoPaused]);

  // 监听来自 DraggableAFKStatus 的事件
  useEffect(() => {
    const handleShowUI = () => {
      console.log('📱 显示 AFK UI');
      setShowUI(true);
      setShowPasswordField(false);
      setPassword('');
      setError(false);
      setLockIconRotate(false);
      window.dispatchEvent(new CustomEvent('afkUIShown'));
    };
    const handleHideUI = () => {
      console.log('📱 隐藏 AFK UI');
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
        console.log('📱 切换 AFK UI:', newValue);
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
    }
  }, [isAFK]);

  const getVideoByLayer = useCallback((layer: 'A' | 'B') => {
    return layer === 'A' ? videoASrc.current : videoBSrc.current;
  }, []);

  // 强制播放视频（使用 ref 避免闭包问题）
  const forcePlayVideo = useCallback((video: HTMLVideoElement, retry = 0) => {
    if (!video) return;
    
    // 使用 ref 避免闭包问题
    if (isVideoPausedRef.current) {
      console.log('⏸️ 视频处于暂停状态，不自动播放');
      return;
    }
    
    if (!video.src || video.src === '') {
      if (retry < 3) {
        console.log(`🎬 视频源无效，重试 ${retry + 1}/3`);
        setTimeout(() => forcePlayVideo(video, retry + 1), 300);
      }
      return;
    }
    
    const tryPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🎬 视频播放成功');
            retryCountRef.current = 0;
            setVideoLoadError(false);
            videoStartTimeRef.current = Date.now();
          })
          .catch((e: Error) => {
            console.log(`🎬 播放失败 (${retry + 1}/3):`, e.message);
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
        if (retry < 3) {
          forcePlayVideo(video, retry + 1);
        }
      }, 2000);
    }
  }, []);

  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('🎬 视频加载错误:', e);
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
    video.onerror = () => handleVideoError(new Event('error') as any);
    
    if (shouldPlay && !isVideoPaused) {
      const handleCanPlay = () => {
        video.removeEventListener('canplay', handleCanPlay);
        if (!isVideoPaused) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => console.log('播放失败:', e));
          }
        }
      };
      video.addEventListener('canplay', handleCanPlay);
      setTimeout(() => {
        video.removeEventListener('canplay', handleCanPlay);
        if (!isVideoPaused) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => console.log('播放失败:', e));
          }
        }
      }, 1000);
    }
  }, [getVideoByLayer, handleVideoError, isRepeating, isVideoPaused]);

  // 清除所有定时器
  const clearAllTimers = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (forceTransitionTimerRef.current) {
      clearTimeout(forceTransitionTimerRef.current);
      forceTransitionTimerRef.current = null;
    }
    if (progressCheckRef.current) {
      clearInterval(progressCheckRef.current);
      progressCheckRef.current = null;
    }
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
      healthCheckRef.current = null;
    }
    if (mainLoopTimerRef.current) {
      clearInterval(mainLoopTimerRef.current);
      mainLoopTimerRef.current = null;
    }
  }, []);

  // 强制切换视频
  const forceSwitchVideo = useCallback(() => {
    if (isTransitioning) {
      console.log('🔄 切换中，跳过强制切换');
      return;
    }
    if (!isAFK) {
      console.log('🚪 不在 AFK 模式，跳过切换');
      return;
    }
    if (isRepeating) {
      console.log('🔄 循环播放模式，跳过自动切换');
      return;
    }
    if (isVideoPaused) {
      console.log('⏸️ 视频处于暂停状态，跳过切换');
      return;
    }
    
    console.log('⏰ 主循环：强制切换到下一个视频');
    performSmoothTransition();
  }, [isTransitioning, isAFK, isRepeating, isVideoPaused]);

  // 启动主循环
  const startMainLoop = useCallback(() => {
    if (mainLoopTimerRef.current) clearInterval(mainLoopTimerRef.current);
    
    mainLoopTimerRef.current = setInterval(() => {
      forceSwitchVideo();
    }, 180000);
    console.log('🎬 主循环已启动，每 3 分钟强制切换');
  }, [forceSwitchVideo]);

  // 预加载下一个视频
  const preloadNextVideo = useCallback(() => {
    if (isTransitioning) return;
    if (isRepeating) return;
    
    const nextIdx = (currentIndex + 1) % totalCount;
    if (nextIdx === nextIndex) return;
    
    setNextIndex(nextIdx);
    const backupLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
    const nextVideoUrl = wallpapers[nextIdx];
    
    if (nextVideoUrl) {
      console.log(`📥 预加载下一个视频: ${nextIdx + 1}/${totalCount} 到 ${backupLayer} 层`);
      loadVideoToLayer(backupLayer, nextVideoUrl);
    }
  }, [currentIndex, nextIndex, totalCount, wallpapers, loadVideoToLayer, isTransitioning, isRepeating]);

  // 执行平滑切换
  const performSmoothTransition = useCallback(() => {
    if (isTransitioning) {
      console.log('🔄 已有切换进行中，跳过');
      return;
    }
    if (isRepeating) {
      console.log('🔄 循环播放模式，跳过切换');
      return;
    }
    
    setIsTransitioning(true);
    console.log('🔄 开始执行视频切换');
    
    const oldLayer = activeLayerRef.current;
    const newLayer = oldLayer === 'A' ? 'B' : 'A';
    const newVideo = getVideoByLayer(newLayer);
    const oldVideo = getVideoByLayer(oldLayer);
    const nextIdx = nextIndex;
    
    if (!newVideo) {
      console.error('❌ 新视频层不存在');
      setIsTransitioning(false);
      return;
    }
    
    if (newVideo.readyState < 2) {
      console.log('⏳ 新视频未就绪，尝试重新加载');
      const currentVideoUrl = wallpapers[nextIdx];
      if (currentVideoUrl) {
        loadVideoToLayer(newLayer, currentVideoUrl, true);
      }
      setTimeout(() => {
        if (!isTransitioning) {
          performSmoothTransition();
        }
      }, 1000);
      return;
    }
    
    console.log(`🔄 执行切换: ${currentIndex + 1} → ${nextIdx + 1}`);
    
    newVideo.currentTime = 0;
    newVideo.style.opacity = '1';
    
    if (!isVideoPaused) {
      const playPromise = newVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.log('新视频播放失败:', e));
      }
    }
    
    if (oldVideo) {
      oldVideo.style.opacity = '0';
      setTimeout(() => {
        if (oldVideo) oldVideo.pause();
      }, 500);
    }
    
    activeLayerRef.current = newLayer;
    
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setCurrentIndex(nextIdx);
      const afterNextIdx = (nextIdx + 1) % totalCount;
      setNextIndex(afterNextIdx);
      
      const backupLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
      const nextVideoUrl = wallpapers[afterNextIdx];
      if (nextVideoUrl && !isRepeating) {
        loadVideoToLayer(backupLayer, nextVideoUrl);
      }
      
      setIsTransitioning(false);
      console.log('✅ 视频切换完成');
      
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (currentVideo && !currentVideo.paused && isAFK && !isVideoPaused) {
        videoStartTimeRef.current = Date.now();
      }
    }, 500);
  }, [currentIndex, nextIndex, totalCount, wallpapers, getVideoByLayer, loadVideoToLayer, isTransitioning, isAFK, isRepeating, isVideoPaused]);

  // 进度检查
  const startProgressCheck = useCallback((video: HTMLVideoElement) => {
    if (progressCheckRef.current) clearInterval(progressCheckRef.current);
    
    if (forceTransitionTimerRef.current) clearTimeout(forceTransitionTimerRef.current);
    forceTransitionTimerRef.current = setTimeout(() => {
      if (!isTransitioning && isAFK && !isRepeating && !isVideoPaused) {
        console.log('⏰ 超时保底：35秒未切换，强制切换');
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
      
      if (remaining <= 3 && remaining > 0 && !isTransitioning && !isRepeating) {
        preloadNextVideo();
      }
      
      if (remaining <= 0.3 && remaining > -0.5 && !isTransitioning && !isRepeating) {
        console.log(`🎬 进度检测：剩余 ${remaining.toFixed(2)} 秒，准备切换`);
        performSmoothTransition();
      }
    }, 200);
  }, [getVideoByLayer, isTransitioning, isAFK, isRepeating, isVideoPaused, performSmoothTransition, preloadNextVideo]);

  const stopProgressCheck = useCallback(() => {
    if (progressCheckRef.current) {
      clearInterval(progressCheckRef.current);
      progressCheckRef.current = null;
    }
    if (forceTransitionTimerRef.current) {
      clearTimeout(forceTransitionTimerRef.current);
      forceTransitionTimerRef.current = null;
    }
  }, []);

  // 视频健康检查
  const startHealthCheck = useCallback(() => {
    if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    
    healthCheckRef.current = setInterval(() => {
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (!currentVideo || !isAFK || isTransitioning) return;
      if (isVideoPaused) return;
      
      if (!currentVideo.paused && !currentVideo.ended) {
        const currentTime = currentVideo.currentTime;
        if (lastCurrentTimeRef.current === currentTime && currentTime > 0) {
          console.log('⚠️ 健康检查：视频卡住了，尝试恢复');
          const playPromise = currentVideo.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => console.log('恢复播放失败:', e));
          }
        }
        lastCurrentTimeRef.current = currentTime;
      } else if (currentVideo.paused && !currentVideo.ended && currentVideo.readyState >= 2 && !isVideoPaused) {
        console.log('⚠️ 健康检查：视频意外暂停，尝试恢复');
        const playPromise = currentVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.log('恢复播放失败:', e));
        }
      }
    }, 5000);
  }, [getVideoByLayer, isAFK, isTransitioning, isVideoPaused]);

  const stopHealthCheck = useCallback(() => {
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
      healthCheckRef.current = null;
    }
  }, []);

  // 监听视频播放进度
  useEffect(() => {
    const currentLayer = activeLayerRef.current;
    const currentVideo = getVideoByLayer(currentLayer);
    if (!currentVideo || isTransitioning) {
      stopProgressCheck();
      stopHealthCheck();
      return;
    }
    
    const handleEnded = () => { 
      console.log('🎬 ended 事件触发，准备切换');
      if (!isTransitioning && !isRepeating) {
        performSmoothTransition();
      }
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

  // 🔥 初始化 AFK（使用 isInitializedRef 避免重复初始化）
  useEffect(() => {
    if (isAFK && totalCount > 0) {
      // 避免重复初始化
      if (isInitializedRef.current) {
        console.log('🎬 AFK 已初始化，跳过重复初始化');
        return;
      }
      isInitializedRef.current = true;
      
      console.log(`🎬 进入 AFK，共 ${totalCount} 个壁纸，启动主循环`);
      
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
      
      if (totalCount > 1) {
        loadVideoToLayer('B', wallpapers[1]);
      }
      
      startMainLoop();
    } else if (!isAFK) {
      isInitializedRef.current = false;
      clearAllTimers();
    }
  }, [isAFK, totalCount, wallpapers, loadVideoToLayer, startMainLoop, clearAllTimers]);

  // 清理定时器
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // 🔥 视频控制回调函数
  const handlePauseToggle = useCallback((paused: boolean) => {
    console.log('🎮 暂停/播放被调用, paused =', paused);
    setIsVideoPaused(paused);
    const currentVideo = getVideoByLayer(activeLayerRef.current);
    if (currentVideo) {
      if (paused) {
        currentVideo.pause();
        console.log('⏸️ 视频已暂停');
      } else {
        const playPromise = currentVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.log('播放失败:', e));
        }
        console.log('▶️ 视频已恢复');
      }
    }
  }, [getVideoByLayer]);

  const handleRepeatToggle = useCallback((repeating: boolean) => {
    console.log('🔄 循环播放被调用, repeating =', repeating);
    setIsRepeating(repeating);
    const currentVideo = getVideoByLayer(activeLayerRef.current);
    if (currentVideo) {
      currentVideo.loop = repeating;
      console.log(`🔄 循环播放: ${repeating ? '开启' : '关闭'}`);
    }
    if (!repeating) {
      startMainLoop();
    } else {
      if (mainLoopTimerRef.current) {
        clearInterval(mainLoopTimerRef.current);
        mainLoopTimerRef.current = null;
      }
    }
  }, [getVideoByLayer, startMainLoop]);

  const handleSkip = useCallback(() => {
    console.log('⏩ 跳过当前壁纸');
    if (isTransitioning) return;
    if (isRepeating) {
      setIsRepeating(false);
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (currentVideo) currentVideo.loop = false;
    }
    performSmoothTransition();
  }, [isTransitioning, isRepeating, getVideoByLayer, performSmoothTransition]);

  const handleShowUI = useCallback(() => {
    console.log('📱 显示解锁界面');
    setShowUI(true);
    window.dispatchEvent(new CustomEvent('afkUIShown'));
  }, []);

  // ESC 键处理
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
          console.log('ESC: 关闭 AFK 面板');
        } else if (!afkPasswordEnabled && !showUI) {
          console.log('ESC: 无密码，退出 AFK');
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} 分钟 ${secs} 秒`;
    return `${secs} 秒`;
  };

  return (
    <>
      {children}
      
      {/* 可拖拽的功能菜单锁头 */}
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
            className="fixed inset-0 z-[9999]"
          >
            {/* 视频层 A */}
            <video
              ref={videoASrc}
              muted
              playsInline
              loop={false}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: 0, zIndex: 0 }}
              onError={handleVideoError}
            />
            
            {/* 视频层 B */}
            <video
              ref={videoBSrc}
              muted
              playsInline
              loop={false}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: 0, zIndex: 0 }}
              onError={handleVideoError}
            />

            {/* 视频加载失败时的纯色背景 */}
            {videoLoadError && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-[1]" />
            )}

            {/* 暗色遮罩 */}
            {!videoLoadError && (
              <motion.div 
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 z-[1]"
              />
            )}

            {/* UI 内容区域 */}
            <AnimatePresence>
              {showUI && (
                <motion.div
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none"
                >
                  <div className="text-center max-w-md mx-4 pointer-events-auto">
                    {/* 脉冲光环容器 */}
                    <motion.div
                      variants={pulseRingVariants}
                      animate="animate"
                      className="relative mx-auto mb-6 w-24 h-24"
                    >
                      {/* 锁头图标 */}
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

                    {/* 标题 */}
                    <motion.h2 
                      variants={titleVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                    >
                      隐私保护模式
                    </motion.h2>
                    
                    <motion.p 
                      variants={subtitleVariants}
                      initial="hidden"
                      animate="visible"
                      className="text-white/80 text-lg mb-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                    >
                      您的屏幕已被锁定
                    </motion.p>

                    {/* 时长显示 */}
                    <motion.div 
                      variants={durationVariants}
                      initial="hidden"
                      animate="visible"
                      className="bg-black/40 backdrop-blur-md rounded-2xl p-4 mb-8 inline-block mx-auto border border-white/20"
                    >
                      <p className="text-white/90 text-sm">
                        已离开 <span className="text-orange-400 font-bold text-2xl mx-1">{formatDuration(afkDuration)}</span>
                      </p>
                    </motion.div>

                    {/* 密码输入区域 */}
                    <AnimatePresence mode="wait">
                      {afkPasswordEnabled && showPasswordField && (
                        <motion.div 
                          key="password-input"
                          variants={inputVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="space-y-3 mb-4"
                        >
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleUnlockLocal()}
                            placeholder="输入解锁密码"
                            autoFocus
                            className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                          />
                          {error && (
                            <motion.p 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-sm"
                            >
                              密码错误，请重试
                            </motion.p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 按钮区域 */}
                    <motion.div 
                      variants={buttonVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover="hover"
                      whileTap="tap"
                      className="space-y-4"
                    >
                      {!showPasswordField ? (
                        afkPasswordEnabled ? (
                          <button
                            onClick={() => setShowPasswordField(true)}
                            className="w-full px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            输入密码解锁
                          </button>
                        ) : (
                          <button
                            onClick={handleUnlockLocal}
                            className="w-full px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            退出挂机模式
                          </button>
                        )
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowPasswordField(false);
                              setPassword('');
                              setError(false);
                            }}
                            className="flex-1 px-4 py-2.5 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-200"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleUnlockLocal}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
                          >
                            解锁
                          </button>
                        </div>
                      )}
                      
                      <p className="text-xs text-white/50">
                        按 <kbd className="px-2 py-0.5 bg-white/20 rounded-md text-[10px]">ESC</kbd> 关闭面板
                      </p>
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