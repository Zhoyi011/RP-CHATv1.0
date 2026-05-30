// client/src/components/common/AFKScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAFK } from '../../contexts/AFKContext';
import { useResponsive } from '../../hooks/useResponsive';

interface AFKScreenProps {
  children: React.ReactNode;
}

// ========== 🔥 壁纸配置 ==========
const DESKTOP_WALLPAPERS = [1, 2, 3, 4, 5, 6, 7].map(n => `/wallpapers/desktop/${n}.mp4`);
const MOBILE_WALLPAPERS = [1, 2, 3].map(n => `/wallpapers/mobile/${n}.mp4`);
// =================================

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

// 脉冲光环动画
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
  const [showUnlock, setShowUnlock] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [lockIconRotate, setLockIconRotate] = useState(false);
  
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
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCurrentTimeRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);

  // 监听来自 DraggableAFKStatus 的事件
  useEffect(() => {
    const handleShowUI = () => {
      console.log('📱 显示 AFK UI');
      setShowUI(true);
      setShowPasswordField(false);
      setShowUnlock(false);
      setPassword('');
      setError(false);
      setLockIconRotate(false);
      window.dispatchEvent(new CustomEvent('afkUIShown'));
    };
    const handleHideUI = () => {
      console.log('📱 隐藏 AFK UI');
      setShowUI(false);
      setShowUnlock(false);
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
          setShowUnlock(false);
          setPassword('');
          setError(false);
          setLockIconRotate(false);
          window.dispatchEvent(new CustomEvent('afkUIShown'));
        } else {
          setShowUnlock(false);
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
      setShowUnlock(false);
      setShowPasswordField(false);
      setPassword('');
      setError(false);
      setLockIconRotate(false);
    }
  }, [isAFK]);

  const getVideoByLayer = useCallback((layer: 'A' | 'B') => {
    return layer === 'A' ? videoASrc.current : videoBSrc.current;
  }, []);

  // 🔥 强制播放视频（带重试和稳定性保障）
  const forcePlayVideo = useCallback((video: HTMLVideoElement, retry = 0) => {
    if (!video) return;
    
    // 检查视频是否有效
    if (!video.src || video.src === '' || video.src === window.location.href) {
      if (retry < 5) {
        console.log(`🎬 视频源无效，重试 ${retry + 1}/5`);
        setTimeout(() => forcePlayVideo(video, retry + 1), 300);
      }
      return;
    }
    
    // 确保视频已经准备好
    const tryPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🎬 视频播放成功');
            retryCountRef.current = 0;
          })
          .catch((e: Error) => {
            console.log(`🎬 播放失败 (${retry + 1}/5):`, e.message);
            if (retry < 5) {
              setTimeout(() => {
                // 重新加载视频
                video.load();
                setTimeout(() => forcePlayVideo(video, retry + 1), 200);
              }, 500);
            }
          });
      }
    };
    
    // 如果视频已经 ready，立即播放
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      // 等待视频加载
      const handleCanPlay = () => {
        video.removeEventListener('canplay', handleCanPlay);
        tryPlay();
      };
      video.addEventListener('canplay', handleCanPlay);
      setTimeout(() => {
        video.removeEventListener('canplay', handleCanPlay);
        if (retry < 5) {
          forcePlayVideo(video, retry + 1);
        }
      }, 2000);
    }
  }, []);

  const loadVideoToLayer = useCallback((layer: 'A' | 'B', videoUrl: string, shouldPlay = false) => {
    const video = getVideoByLayer(layer);
    if (!video) return;
    video.pause();
    video.src = videoUrl;
    video.load();
    video.style.opacity = layer === activeLayerRef.current ? '1' : '0';
    if (shouldPlay) {
      const handleCanPlay = () => {
        video.removeEventListener('canplay', handleCanPlay);
        forcePlayVideo(video);
      };
      video.addEventListener('canplay', handleCanPlay);
      setTimeout(() => {
        video.removeEventListener('canplay', handleCanPlay);
        forcePlayVideo(video);
      }, 1000);
    }
  }, [getVideoByLayer, forcePlayVideo]);

  const performSmoothTransition = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const oldLayer = activeLayerRef.current;
    const newLayer = oldLayer === 'A' ? 'B' : 'A';
    const newVideo = getVideoByLayer(newLayer);
    const oldVideo = getVideoByLayer(oldLayer);
    const nextIdx = nextIndex;
    
    if (newVideo && newVideo.readyState >= 2) {
      newVideo.style.opacity = '1';
      forcePlayVideo(newVideo);
      if (oldVideo) {
        oldVideo.style.opacity = '0';
        setTimeout(() => { if (oldVideo) oldVideo.pause(); }, 500);
      }
      activeLayerRef.current = newLayer;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setCurrentIndex(nextIdx);
        const afterNextIdx = (nextIdx + 1) % totalCount;
        setNextIndex(afterNextIdx);
        const backupLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
        loadVideoToLayer(backupLayer, wallpapers[afterNextIdx]);
        setIsTransitioning(false);
      }, 400);
    } else {
      setTimeout(() => performSmoothTransition(), 200);
    }
  }, [currentIndex, nextIndex, totalCount, wallpapers, getVideoByLayer, forcePlayVideo, isTransitioning, loadVideoToLayer]);

  const startProgressCheck = useCallback((video: HTMLVideoElement) => {
    if (progressCheckRef.current) clearInterval(progressCheckRef.current);
    progressCheckRef.current = setInterval(() => {
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (!currentVideo || currentVideo.paused || currentVideo.ended) return;
      const duration = currentVideo.duration;
      const currentTime = currentVideo.currentTime;
      if (!isFinite(duration) || duration <= 0) return;
      const remaining = duration - currentTime;
      if (remaining <= 2 && remaining > 0 && !isTransitioning) {
        preloadNextVideo();
      }
      if (remaining <= 0.1 && remaining > -0.5 && !isTransitioning) {
        performSmoothTransition();
      }
    }, 500);
  }, [getVideoByLayer, isTransitioning, performSmoothTransition]);

  // 🔥 视频健康检查（检测卡住或暂停）
  const startHealthCheck = useCallback(() => {
    if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    healthCheckRef.current = setInterval(() => {
      const currentVideo = getVideoByLayer(activeLayerRef.current);
      if (!currentVideo || !isAFK) return;
      
      // 检查视频是否卡住（currentTime 2秒没变化）
      if (!currentVideo.paused && !currentVideo.ended) {
        if (lastCurrentTimeRef.current === currentVideo.currentTime && currentVideo.currentTime > 0) {
          console.log('⚠️ 视频卡住了，尝试恢复播放');
          forcePlayVideo(currentVideo);
        }
        lastCurrentTimeRef.current = currentVideo.currentTime;
      } else if (currentVideo.paused && !currentVideo.ended && isAFK) {
        // 视频意外暂停，尝试恢复
        console.log('⚠️ 视频意外暂停，尝试恢复播放');
        forcePlayVideo(currentVideo);
      }
    }, 2000);
  }, [getVideoByLayer, forcePlayVideo, isAFK]);

  const stopHealthCheck = useCallback(() => {
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
      healthCheckRef.current = null;
    }
  }, []);

  const stopProgressCheck = useCallback(() => {
    if (progressCheckRef.current) {
      clearInterval(progressCheckRef.current);
      progressCheckRef.current = null;
    }
  }, []);

  const preloadNextVideo = useCallback(() => {
    if (isTransitioning) return;
    const nextIdx = (currentIndex + 1) % totalCount;
    if (nextIdx === nextIndex && nextIdx !== currentIndex) return;
    setNextIndex(nextIdx);
    const backupLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
    loadVideoToLayer(backupLayer, wallpapers[nextIdx]);
  }, [currentIndex, nextIndex, totalCount, wallpapers, loadVideoToLayer, isTransitioning]);

  useEffect(() => {
    const currentLayer = activeLayerRef.current;
    const currentVideo = getVideoByLayer(currentLayer);
    if (!currentVideo || isTransitioning) {
      stopProgressCheck();
      return;
    }
    const handleEnded = () => { if (!isTransitioning) performSmoothTransition(); };
    const handleCanPlay = () => { stopProgressCheck(); startProgressCheck(currentVideo); };
    currentVideo.addEventListener('ended', handleEnded);
    currentVideo.addEventListener('canplay', handleCanPlay);
    if (currentVideo.readyState >= 2) startProgressCheck(currentVideo);
    return () => {
      currentVideo.removeEventListener('ended', handleEnded);
      currentVideo.removeEventListener('canplay', handleCanPlay);
      stopProgressCheck();
    };
  }, [getVideoByLayer, isTransitioning, performSmoothTransition, startProgressCheck, stopProgressCheck]);

  // 启动健康检查
  useEffect(() => {
    if (isAFK && totalCount > 0) {
      startHealthCheck();
    } else {
      stopHealthCheck();
    }
    return () => stopHealthCheck();
  }, [isAFK, totalCount, startHealthCheck, stopHealthCheck]);

  useEffect(() => {
    if (isAFK && totalCount > 0) {
      activeLayerRef.current = 'A';
      setIsTransitioning(false);
      setCurrentIndex(0);
      setNextIndex(1);
      lastCurrentTimeRef.current = 0;
      stopProgressCheck();
      loadVideoToLayer('A', wallpapers[0], true);
      if (totalCount > 1) loadVideoToLayer('B', wallpapers[1]);
    } else {
      stopProgressCheck();
      stopHealthCheck();
    }
  }, [isAFK, totalCount, wallpapers, loadVideoToLayer, stopProgressCheck, stopHealthCheck]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      stopProgressCheck();
      stopHealthCheck();
    };
  }, [stopProgressCheck, stopHealthCheck]);

  // ESC 键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAFK && e.key === 'Escape') {
        if (showUI && afkPasswordEnabled) {
          e.preventDefault();
          setShowUI(false);
          setShowUnlock(false);
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
        setShowUnlock(false);
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
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: 0, zIndex: 0 }}
            />
            
            {/* 视频层 B */}
            <video
              ref={videoBSrc}
              muted
              playsInline
              loop={false}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: 0, zIndex: 0 }}
            />

            {/* 暗色遮罩 - 带渐变 */}
            <motion.div 
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 z-[1]"
            />

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