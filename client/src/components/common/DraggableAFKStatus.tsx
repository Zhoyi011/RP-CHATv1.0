// client/src/components/common/DraggableAFKStatus.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAFK } from '../../contexts/AFKContext';

interface DraggableAFKStatusProps {
  size?: 'sm' | 'md' | 'lg';
  onPauseToggle?: (paused: boolean) => void;
  onRepeatToggle?: (repeating: boolean) => void;
  onSkip?: () => void;
  onShowUI?: () => void;
  isVideoPaused?: boolean;
  isRepeating?: boolean;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-10 h-10',
};

const iconSizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-4.5 h-4.5',
};

const STORAGE_KEY = 'afk_status_position';

// 🔥 菜单面板动画变体
const menuVariants: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.85,
    y: 5,
    transition: { duration: 0.15, ease: "easeOut" }
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      type: "spring",
      damping: 18,
      stiffness: 400,
      staggerChildren: 0.03,
      delayChildren: 0.05
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.85,
    y: 5,
    transition: { duration: 0.12, ease: "easeIn" }
  }
};

const menuItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", damping: 20, stiffness: 400 }
  },
  tap: { scale: 0.96 }
};

export const DraggableAFKStatus: React.FC<DraggableAFKStatusProps> = ({ 
  size = 'md',
  onPauseToggle,
  onRepeatToggle,
  onSkip,
  onShowUI,
  isVideoPaused = false,
  isRepeating = false
}) => {
  const { isAFK, afkDuration } = useAFK();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const justDraggedRef = useRef(false);
  const menuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [initialized, setInitialized] = useState(false);
  
  const buttonSize = size === 'sm' ? 32 : size === 'md' ? 36 : 40;

  const getBounds = () => {
    return {
      left: 8,
      right: window.innerWidth - buttonSize - 8,
      top: 8,
      bottom: window.innerHeight - buttonSize - 8,
    };
  };

  // 加载保存的位置
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let startX = window.innerWidth - buttonSize - 16;
    let startY = 100;
    
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        const bounds = getBounds();
        startX = Math.min(Math.max(pos.x, bounds.left), bounds.right);
        startY = Math.min(Math.max(pos.y, bounds.top), bounds.bottom);
      } catch (e) {}
    }
    
    x.set(startX);
    y.set(startY);
    setInitialized(true);
  }, [buttonSize, x, y]);

  const savePosition = (newX: number, newY: number) => {
    const bounds = getBounds();
    const clampedX = Math.min(Math.max(newX, bounds.left), bounds.right);
    const clampedY = Math.min(Math.max(newY, bounds.top), bounds.bottom);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: clampedX, y: clampedY }));
  };

  useEffect(() => {
    if (!initialized) return;
    
    const unsubscribeX = x.on('change', (latestX) => {
      const bounds = getBounds();
      const clampedX = Math.min(Math.max(latestX, bounds.left), bounds.right);
      if (clampedX !== latestX) x.set(clampedX);
    });
    
    const unsubscribeY = y.on('change', (latestY) => {
      const bounds = getBounds();
      const clampedY = Math.min(Math.max(latestY, bounds.top), bounds.bottom);
      if (clampedY !== latestY) y.set(clampedY);
    });
    
    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [initialized, x, y]);

  useEffect(() => {
    const handleResize = () => {
      const bounds = getBounds();
      const currentX = x.get();
      const currentY = y.get();
      x.set(Math.min(Math.max(currentX, bounds.left), bounds.right));
      y.set(Math.min(Math.max(currentY, bounds.top), bounds.bottom));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [buttonSize, x, y]);

  const handleDragEnd = () => {
    const currentX = x.get();
    const currentY = y.get();
    savePosition(currentX, currentY);
    
    if (Math.abs(currentX - (JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"x":0,"y":0}').x)) > 3 ||
        Math.abs(currentY - (JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"x":0,"y":0}').y)) > 3) {
      justDraggedRef.current = true;
    }
    
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  const handleDragStart = () => {
    setIsDragging(true);
    justDraggedRef.current = false;
    if (showMenu) setShowMenu(false);
  };

  const startMenuHideTimer = () => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    menuTimeoutRef.current = setTimeout(() => {
      setShowMenu(false);
    }, 5000);
  };

  const cancelMenuHideTimer = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging || justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    
    setShowMenu(prev => {
      const newValue = !prev;
      if (newValue) {
        startMenuHideTimer();
      } else {
        cancelMenuHideTimer();
      }
      return newValue;
    });
  };

  // 🔥 菜单选项（仅壁纸控制，移除音乐按钮）
  const menuItems = [
    { 
      id: 'pause', 
      label: isVideoPaused ? '播放壁纸' : '暂停壁纸', 
      icon: isVideoPaused ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => onPauseToggle?.(!isVideoPaused)
    },
    { 
      id: 'repeat', 
      label: isRepeating ? '取消循环' : '循环播放', 
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      action: () => onRepeatToggle?.(!isRepeating)
    },
    { 
      id: 'skip', 
      label: '跳过壁纸', 
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      ),
      action: () => onSkip?.()
    },
    { 
      id: 'showUI', 
      label: '解锁界面', 
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      ),
      action: () => {
        onShowUI?.();
        setShowMenu(false);
      }
    },
  ];

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}分${secs > 0 ? `${secs}秒` : ''}`;
    return `${secs}秒`;
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.draggable-afk-container')) {
        if (showMenu) {
          setShowMenu(false);
          cancelMenuHideTimer();
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  if (!isAFK || !initialized) return null;

  const dragConstraints = {
    left: 8,
    right: window.innerWidth - buttonSize - 8,
    top: 8,
    bottom: window.innerHeight - buttonSize - 8,
  };

  return (
    <div 
      className="draggable-afk-container" 
      style={{ 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        right: 0, 
        bottom: 0, 
        pointerEvents: 'none', 
        zIndex: 99998
      }}
    >
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={dragConstraints}
        style={{
          position: 'fixed',
          x,
          y,
          zIndex: 99999,
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: 'none',
          pointerEvents: 'auto',
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ scale: showTooltip || showMenu ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={handleClick}
      >
        {/* 🔥 脉冲光环 */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-orange-400/40 backdrop-blur-sm"
          style={{ zIndex: -1 }}
        />
        
        {/* 🔥 主按钮 */}
        <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-orange-400/90 to-red-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg ring-1 ring-white/30 cursor-pointer hover:scale-105 transition-all duration-200`}>
          <svg className={`${iconSizeMap[size]} text-white drop-shadow-sm`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        {/* 🔥 提示框 */}
        <AnimatePresence>
          {showTooltip && !showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full ml-2 whitespace-nowrap bg-black/50 backdrop-blur-md text-white text-[11px] px-2.5 py-1.5 rounded-full shadow-lg border border-white/20 pointer-events-none"
            >
              <span>🔒 {formatDuration(afkDuration)}</span>
              <span className="text-white/50 text-[10px] ml-1">| 点击菜单</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🔥 功能菜单面板 */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-black/40 backdrop-blur-xl rounded-xl overflow-hidden shadow-xl border border-white/20 z-[100000] pointer-events-auto"
              onMouseEnter={cancelMenuHideTimer}
              onMouseLeave={startMenuHideTimer}
            >
              <div className="py-1.5">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    variants={menuItemVariants}
                    whileTap="tap"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.action();
                      if (item.id !== 'showUI') {
                        setTimeout(() => setShowMenu(false), 300);
                      }
                      cancelMenuHideTimer();
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2.5 text-[12px] text-white/90 hover:bg-white/10 transition-all duration-150 group"
                  >
                    <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                  </motion.button>
                ))}
              </div>
              
              <div className="border-t border-white/10 px-3 py-1.5">
                <p className="text-[9px] text-white/30 text-center">
                  菜单 5秒后关闭
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DraggableAFKStatus;