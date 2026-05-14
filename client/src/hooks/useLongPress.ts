// ==================== 长按/右键检测 Hook ====================
console.log('🔧 [useLongPress] 加载长按检测Hook');

import { useCallback, useRef } from 'react';

interface LongPressOptions {
  /** 长按触发时间（毫秒），默认500ms */
  duration?: number;
  /** 是否在移动端启用 */
  enableMobile?: boolean;
  /** 是否在PC端启用右键菜单 */
  enableContextMenu?: boolean;
  /** 长按时回调 */
  onLongPress?: (event: React.TouchEvent | React.MouseEvent, position?: { x: number; y: number }) => void;
  /** 点击时回调（短按） */
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void;
}

export const useLongPress = (options: LongPressOptions) => {
  const {
    duration = 500,
    enableMobile = true,
    enableContextMenu = true,
    onLongPress,
    onClick,
  } = options;

  // ✅ 修复：使用 ReturnType<typeof setTimeout> 替代 NodeJS.Timeout
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  console.log(`📱 [useLongPress] 初始化: duration=${duration}ms`);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isLongPressTriggeredRef.current = false;
    touchStartPosRef.current = null;
  }, []);

  const getPosition = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableMobile) return;
    const pos = getPosition(e);
    touchStartPosRef.current = pos;
    timerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      onLongPress?.(e, pos);
    }, duration);
  }, [duration, enableMobile, onLongPress]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isLongPressTriggeredRef.current) {
      onClick?.(e);
    }
    clearTimer();
  }, [clearTimer, onClick]);

  const handleTouchMove = useCallback(() => {
    if (timerRef.current) {
      clearTimer();
    }
  }, [clearTimer]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getPosition(e);
    touchStartPosRef.current = pos;
    timerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      onLongPress?.(e, pos);
    }, duration);
  }, [duration, onLongPress]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isLongPressTriggeredRef.current) {
      onClick?.(e);
    }
    clearTimer();
  }, [clearTimer, onClick]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimer();
    }
  }, [clearTimer]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (enableContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      const pos = getPosition(e);
      onLongPress?.(e, pos);
    }
  }, [enableContextMenu, onLongPress]);

  const isMobile = typeof window !== 'undefined' && 'ontouchstart' in window;

  if (isMobile) {
    return {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
      onTouchCancel: handleTouchEnd,
      onContextMenu: handleContextMenu,
    };
  }

  return {
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onContextMenu: handleContextMenu,
  };
};