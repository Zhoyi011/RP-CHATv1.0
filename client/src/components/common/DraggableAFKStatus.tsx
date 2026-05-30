// client/src/components/common/DraggableAFKStatus.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useAFK } from '../../contexts/AFKContext';

interface DraggableAFKStatusProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const STORAGE_KEY = 'afk_status_position';

export const DraggableAFKStatus: React.FC<DraggableAFKStatusProps> = ({ size = 'md' }) => {
  const { isAFK, afkDuration, afkPasswordEnabled } = useAFK();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const justDraggedRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 🔥 使用 useMotionValue 来跟踪位置，避免状态更新导致的跳跃
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // 🔥 初始化位置
  const [initialized, setInitialized] = useState(false);
  const buttonSize = size === 'sm' ? 32 : size === 'md' ? 40 : 48;

  // 获取边界
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

  // 保存位置到 localStorage
  const savePosition = (newX: number, newY: number) => {
    const bounds = getBounds();
    const clampedX = Math.min(Math.max(newX, bounds.left), bounds.right);
    const clampedY = Math.min(Math.max(newY, bounds.top), bounds.bottom);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: clampedX, y: clampedY }));
  };

  // 监听位置变化并保存
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

  // 监听窗口大小变化
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

  // 设置自动隐藏 UI 的定时器
  const startHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      console.log('⏰ 30秒无操作，隐藏 AFK UI');
      window.dispatchEvent(new CustomEvent('hideAFKUI'));
    }, 30000);
  };

  const resetHideTimer = () => {
    startHideTimer();
  };

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handlePanelShown = () => startHideTimer();
    const handlePanelHidden = () => clearHideTimer();
    window.addEventListener('afkUIShown', handlePanelShown);
    window.addEventListener('afkUIHidden', handlePanelHidden);
    return () => {
      window.removeEventListener('afkUIShown', handlePanelShown);
      window.removeEventListener('afkUIHidden', handlePanelHidden);
      clearHideTimer();
    };
  }, []);

  // 🔥 拖拽结束时的回调
  const handleDragEnd = () => {
    // 检查是否真的拖拽了（移动距离大于3像素）
    const currentX = x.get();
    const currentY = y.get();
    const savedX = localStorage.getItem(STORAGE_KEY);
    if (savedX) {
      try {
        const saved = JSON.parse(savedX);
        if (Math.abs(currentX - saved.x) > 3 || Math.abs(currentY - saved.y) > 3) {
          justDraggedRef.current = true;
        }
      } catch (e) {
        justDraggedRef.current = true;
      }
    } else {
      justDraggedRef.current = true;
    }
    
    savePosition(currentX, currentY);
    
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  const handleDragStart = () => {
    setIsDragging(true);
    justDraggedRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging || justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    
    console.log('🔒 点击锁头，切换 AFK UI');
    window.dispatchEvent(new CustomEvent('toggleAFKUI'));
    resetHideTimer();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}分${secs > 0 ? `${secs}秒` : ''}`;
    return `${secs}秒`;
  };

  // 监听用户活动
  useEffect(() => {
    if (!isAFK) return;
    
    const handleUserActivity = () => resetHideTimer();
    
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      clearHideTimer();
    };
  }, [isAFK]);

  if (!isAFK || !initialized) return null;

  // 拖拽边界限制
  const dragConstraints = {
    left: 8,
    right: window.innerWidth - buttonSize - 8,
    top: 8,
    bottom: window.innerHeight - buttonSize - 8,
  };

  return (
    <motion.div
      ref={containerRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={dragConstraints}
      style={{
        position: 'fixed',
        x,
        y,
        zIndex: 10000,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={{ scale: showTooltip ? 1.05 : 1 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
    >
      {/* 脉冲光环 */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-orange-500"
        style={{ zIndex: -1 }}
      />
      
      {/* 主按钮 */}
      <div className={`${sizeMap[size]} rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform`}>
        <svg className={`${iconSizeMap[size]} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      
      {/* 提示框 */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-full ml-2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded-md shadow-lg z-50 pointer-events-none"
          >
            <span>🔒 隐私保护模式 ({formatDuration(afkDuration)})</span>
            <span className="text-gray-400 text-[10px] ml-1">| 可拖拽 | 点击显示/隐藏</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DraggableAFKStatus;