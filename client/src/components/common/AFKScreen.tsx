// client/src/components/common/AFKScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAFK } from '../../contexts/AFKContext';
import { useResponsive } from '../../hooks/useResponsive';

interface AFKScreenProps {
  children: React.ReactNode;
}

// ========== 🔥 壁纸配置 ==========
// 电脑端壁纸（按顺序）
const DESKTOP_WALLPAPERS = [1, 2, 3, 4, 5, 6, 7].map(n => `/wallpapers/desktop/${n}.mp4`);
// 手机端壁纸
const MOBILE_WALLPAPERS = [1, 2, 3].map(n => `/wallpapers/mobile/${n}.mp4`);
// =================================

export const AFKScreen: React.FC<AFKScreenProps> = ({ children }) => {
  const { isAFK, afkDuration, unlockAFK, afkPasswordEnabled } = useAFK();
  const { isMobile, isTablet } = useResponsive();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  
  // 获取当前设备的壁纸列表（平板使用电脑端）
  const wallpapers = (isMobile && !isTablet) ? MOBILE_WALLPAPERS : DESKTOP_WALLPAPERS;
  const totalCount = wallpapers.length;
  
  // 当前播放的索引
  const [currentIndex, setCurrentIndex] = useState(0);
  // 下一个要播放的索引
  const [nextIndex, setNextIndex] = useState(1);
  // 是否正在切换中
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 两个视频引用
  const videoASrc = useRef<HTMLVideoElement>(null);  // 主视频层
  const videoBSrc = useRef<HTMLVideoElement>(null);  // 备用视频层
  const activeLayerRef = useRef<'A' | 'B'>('A');     // 当前活动的层
  const preloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 获取视频元素（根据层）
  const getVideoByLayer = useCallback((layer: 'A' | 'B') => {
    return layer === 'A' ? videoASrc.current : videoBSrc.current;
  }, []);

  // 强制播放视频
  const forcePlayVideo = useCallback((video: HTMLVideoElement, retry = 0) => {
    if (!video) return;
    video.play().catch(e => {
      if (retry < 2) {
        setTimeout(() => forcePlayVideo(video, retry + 1), 500);
      }
    });
  }, []);

  // 加载视频到指定层
  const loadVideoToLayer = useCallback((layer: 'A' | 'B', videoUrl: string, shouldPlay = false) => {
    const video = getVideoByLayer(layer);
    if (!video) return;
    
    video.src = videoUrl;
    video.load();
    video.style.opacity = layer === activeLayerRef.current ? '1' : '0';
    
    if (shouldPlay) {
      setTimeout(() => forcePlayVideo(video), 50);
    }
  }, [getVideoByLayer, forcePlayVideo]);

  // 执行无缝切换
  const performSmoothTransition = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    const oldLayer = activeLayerRef.current;
    const newLayer = oldLayer === 'A' ? 'B' : 'A';
    const newVideo = getVideoByLayer(newLayer);
    const oldVideo = getVideoByLayer(oldLayer);
    const nextIdx = nextIndex;
    
    console.log(`🔄 执行切换: ${currentIndex + 1} → ${nextIdx + 1}`);
    
    // 确保新视频准备好
    if (newVideo && newVideo.readyState >= 3) {
      // 新视频淡入
      newVideo.style.opacity = '1';
      forcePlayVideo(newVideo);
      
      // 旧视频淡出
      if (oldVideo) {
        oldVideo.style.opacity = '0';
      }
      
      // 更新激活层
      activeLayerRef.current = newLayer;
      
      // 延迟后清理并准备下一个
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        // 更新索引
        setCurrentIndex(nextIdx);
        // 计算下一个索引
        const afterNextIdx = (nextIdx + 1) % totalCount;
        setNextIndex(afterNextIdx);
        
        // 在备用层预加载下一个视频
        const backupLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
        loadVideoToLayer(backupLayer, wallpapers[afterNextIdx]);
        
        setIsTransitioning(false);
      }, 300);
    } else {
      // 如果新视频还没准备好，等待一下
      console.log('⏳ 等待视频准备...');
      setTimeout(() => performSmoothTransition(), 100);
    }
  }, [currentIndex, nextIndex, totalCount, wallpapers, getVideoByLayer, forcePlayVideo, isTransitioning]);

  // 预加载下一个视频
  const preloadNextVideo = useCallback(() => {
    const nextIdx = (currentIndex + 1) % totalCount;
    if (nextIdx === nextIndex && nextIdx === currentIndex + 1) return;
    
    setNextIndex(nextIdx);
    const backupLayer = activeLayerRef.current === 'A' ? 'B' : 'A';
    console.log(`📥 预加载下一个视频: ${nextIdx + 1}/${totalCount} 到 ${backupLayer} 层`);
    loadVideoToLayer(backupLayer, wallpapers[nextIdx]);
  }, [currentIndex, nextIndex, totalCount, wallpapers, loadVideoToLayer]);

  // 监听当前视频播放进度
  useEffect(() => {
    const currentLayer = activeLayerRef.current;
    const currentVideo = getVideoByLayer(currentLayer);
    if (!currentVideo || isTransitioning) return;
    
    const handleTimeUpdate = () => {
      const duration = currentVideo.duration;
      const currentTime = currentVideo.currentTime;
      
      // 当剩余时间小于 3 秒时，预加载下一个
      if (duration - currentTime <= 3 && duration - currentTime > 0) {
        preloadNextVideo();
      }
    };
    
    const handleEnded = () => {
      console.log('🎬 视频结束，准备切换');
      performSmoothTransition();
    };
    
    currentVideo.addEventListener('timeupdate', handleTimeUpdate);
    currentVideo.addEventListener('ended', handleEnded);
    
    return () => {
      currentVideo.removeEventListener('timeupdate', handleTimeUpdate);
      currentVideo.removeEventListener('ended', handleEnded);
    };
  }, [getVideoByLayer, isTransitioning, preloadNextVideo, performSmoothTransition]);

  // 初始化 AFK
  useEffect(() => {
    if (isAFK && totalCount > 0) {
      console.log(`🎬 进入 AFK，共 ${totalCount} 个壁纸`);
      
      // 重置状态
      activeLayerRef.current = 'A';
      setIsTransitioning(false);
      setCurrentIndex(0);
      setNextIndex(1);
      
      // 加载主层视频
      loadVideoToLayer('A', wallpapers[0], true);
      // 预加载备用层视频
      if (totalCount > 1) {
        loadVideoToLayer('B', wallpapers[1]);
      }
    }
  }, [isAFK, totalCount, wallpapers, loadVideoToLayer]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (preloadTimerRef.current) clearTimeout(preloadTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // 处理解锁
  const handleUnlock = () => {
    if (afkPasswordEnabled) {
      if (unlockAFK(password)) {
        setPassword('');
        setError(false);
        setShowUnlock(false);
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } else {
      unlockAFK('');
    }
  };

  // ESC 键退出
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAFK && e.key === 'Escape') {
        if (afkPasswordEnabled && !showUnlock) {
          setShowUnlock(true);
        } else if (!afkPasswordEnabled) {
          unlockAFK('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAFK, showUnlock, afkPasswordEnabled, unlockAFK]);

  const showUnlockScreen = useCallback(() => {
    if (afkPasswordEnabled) setShowUnlock(true);
  }, [afkPasswordEnabled]);

  useEffect(() => {
    if (isAFK && afkPasswordEnabled) {
      const events = ['mousemove', 'click', 'keydown', 'touchstart'];
      const handleActivity = () => showUnlockScreen();
      events.forEach(event => window.addEventListener(event, handleActivity));
      return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
      };
    }
  }, [isAFK, afkPasswordEnabled, showUnlockScreen]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} 分钟 ${secs} 秒`;
    }
    return `${secs} 秒`;
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {isAFK && wallpapers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999]"
          >
            {/* 视频层 A */}
            <video
              ref={videoASrc}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: 0, zIndex: 0 }}
            />
            
            {/* 视频层 B */}
            <video
              ref={videoBSrc}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: 0, zIndex: 0 }}
            />

            {/* 暗色遮罩 */}
            <div className="absolute inset-0 bg-black/20 z-[1]" />

            {/* 内容区域 */}
            <div className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="text-center max-w-md mx-4 pointer-events-auto"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                  隐私保护模式
                </h2>
                <p className="text-white/90 text-lg mb-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  您的屏幕已被锁定
                </p>

                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-black/40 backdrop-blur-md rounded-2xl p-4 mb-8 inline-block mx-auto border border-white/10"
                >
                  <p className="text-white/90 text-sm">
                    已离开 <span className="text-orange-400 font-bold text-xl mx-1">{formatDuration(afkDuration)}</span>
                  </p>
                </motion.div>

                {!showUnlock ? (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    {afkPasswordEnabled ? (
                      <button
                        onClick={() => setShowUnlock(true)}
                        className="w-full px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        点击解锁屏幕
                      </button>
                    ) : (
                      <button
                        onClick={handleUnlock}
                        className="w-full px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        退出挂机模式
                      </button>
                    )}
                    <p className="text-xs text-white/60">
                      按 <kbd className="px-2 py-0.5 bg-white/20 rounded-md text-xs">ESC</kbd> 退出
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-3"
                  >
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                      placeholder="输入解锁密码"
                      autoFocus
                      className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowUnlock(false)}
                        className="flex-1 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleUnlock}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition"
                      >
                        解锁
                      </button>
                    </div>
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
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AFKScreen;