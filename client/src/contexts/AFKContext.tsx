// client/src/contexts/AFKContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

// 配置
export const AFK_CONFIG = {
  TIMEOUT_MS: 5 * 60 * 1000, // 5 分钟无操作进入 AFK
  ...(import.meta.env.DEV && { TIMEOUT_MS: 3 * 60 * 1000 }), // 开发环境 3 分钟
};

// 全局禁用标志（用于墨香阁等不需要 AFK 的页面）
let globalAFKDisabled = false;

export const setGlobalAFKDisabled = (disabled: boolean) => {
  globalAFKDisabled = disabled;
  console.log(`🚫 [AFK] 全局禁用状态: ${disabled ? '已禁用' : '已启用'}`);
};

interface AFKContextType {
  isAFK: boolean;
  lastActivityTime: Date | null;
  afkDuration: number;
  resetTimer: () => void;
  setCustomTimeout: (seconds: number) => void;
  afkPassword: string;
  setAFKPassword: (password: string) => void;
  afkPasswordEnabled: boolean;
  setAFKPasswordEnabled: (enabled: boolean) => void;
  unlockAFK: (password: string) => boolean;
  enterAFKManually: () => void;
  // 🆕 iOS 播放相关
  requestIOSPlayback: () => void;
  showIOSPlayButton: boolean;
  setShowIOSPlayButton: (show: boolean) => void;
}

const AFKContext = createContext<AFKContextType | undefined>(undefined);

export const useAFK = () => {
  const context = useContext(AFKContext);
  if (!context) {
    throw new Error('useAFK must be used within AFKProvider');
  }
  return context;
};

interface AFKProviderProps {
  children: React.ReactNode;
  timeoutMs?: number;
}

type Timer = ReturnType<typeof setTimeout>;

export const AFKProvider: React.FC<AFKProviderProps> = ({ children, timeoutMs = AFK_CONFIG.TIMEOUT_MS }) => {
  const [isAFK, setIsAFK] = useState(false);
  const [afkDuration, setAfkDuration] = useState(0);
  const [customTimeout, setCustomTimeout] = useState(timeoutMs);
  const [afkPassword, setAfkPassword] = useState('1234');
  const [afkPasswordEnabled, setAfkPasswordEnabled] = useState(false);
  
  // 🆕 iOS 播放按钮状态
  const [showIOSPlayButton, setShowIOSPlayButton] = useState(false);
  
  // 使用 ref 存储最新值，避免闭包问题
  const isAFKRef = useRef(isAFK);
  const timerRef = useRef<Timer | null>(null);
  const afkStartTimeRef = useRef<number | null>(null);
  
  // 同步 ref
  useEffect(() => {
    isAFKRef.current = isAFK;
  }, [isAFK]);

  // 加载保存的设置（只执行一次）
  useEffect(() => {
    const saved = localStorage.getItem('afkPassword');
    if (saved) {
      setAfkPassword(saved);
    }
    const savedEnabled = localStorage.getItem('afkPasswordEnabled');
    if (savedEnabled !== null) {
      setAfkPasswordEnabled(savedEnabled === 'true');
    }
    const savedTimeout = localStorage.getItem('afkTimeout');
    if (savedTimeout) {
      const timeout = parseInt(savedTimeout, 10);
      setCustomTimeout(timeout * 60 * 1000);
    }
  }, []);

  // 进入 AFK 的函数
  const enterAFK = useCallback(() => {
    // 检查全局禁用标志
    if (globalAFKDisabled) {
      console.log('⏸️ [AFK] 全局禁用中，跳过自动进入');
      return;
    }
    if (isAFKRef.current) return;
    
    console.log('🔴 [AFK] 用户长时间无操作，进入 AFK');
    setIsAFK(true);
    afkStartTimeRef.current = Date.now();
    
    // 清除计时器，避免重复触发
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 手动进入 AFK
  const enterAFKManually = useCallback(() => {
    // 检查全局禁用标志
    if (globalAFKDisabled) {
      console.log('⏸️ [AFK] 全局禁用中，无法手动进入');
      return;
    }
    if (isAFKRef.current) return;
    
    console.log('🔴 [AFK] 用户手动进入 AFK');
    setIsAFK(true);
    afkStartTimeRef.current = Date.now();
    
    // 清除计时器，避免自动进入重复触发
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 🆕 请求 iOS 播放（由外部调用，如手动进入后或点击按钮）
  const requestIOSPlayback = useCallback(() => {
    console.log('📱 [AFK] 请求 iOS 播放视频');
    setShowIOSPlayButton(false);
    // 触发自定义事件，让 AFKScreen 响应
    window.dispatchEvent(new CustomEvent('requestIOSVideoPlay'));
  }, []);

  // 退出 AFK 的函数
  const exitAFK = useCallback(() => {
    if (!isAFKRef.current) return;
    
    console.log('🟢 [AFK] 用户恢复活动，退出 AFK');
    setIsAFK(false);
    afkStartTimeRef.current = null;
    setAfkDuration(0);
    setShowIOSPlayButton(false); // 🆕 退出时隐藏播放按钮
  }, []);

  // 解锁 AFK（需要密码验证）
  const unlockAFK = useCallback((password: string): boolean => {
    if (!afkPasswordEnabled) {
      exitAFK();
      return true;
    }
    if (password === afkPassword) {
      exitAFK();
      return true;
    }
    return false;
  }, [afkPassword, afkPasswordEnabled, exitAFK]);

  // 重置计时器（用户活动时调用）
  const resetTimer = useCallback(() => {
    // 如果在 AFK 模式或全局禁用，不重置计时器
    if (isAFKRef.current) return;
    if (globalAFKDisabled) return;
    
    // 清除旧计时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // 设置新计时器
    timerRef.current = setTimeout(() => {
      enterAFK();
    }, customTimeout);
  }, [customTimeout, enterAFK]);

  // 监听用户活动（只在挂载时执行一次）
  useEffect(() => {
    const events = [
      'mousedown', 'mousemove', 'click', 'scroll',
      'keydown', 'keypress', 'touchstart', 'touchmove',
      'wheel', 'pointerdown'
    ];
    
    const handleActivity = () => {
      resetTimer();
    };
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // 初始启动计时器
    resetTimer();
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在挂载时执行一次

  // 更新 AFK 持续时间
  useEffect(() => {
    if (isAFK && afkStartTimeRef.current) {
      const interval = setInterval(() => {
        if (isAFKRef.current && afkStartTimeRef.current) {
          const duration = Math.floor((Date.now() - afkStartTimeRef.current) / 1000);
          setAfkDuration(duration);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setAfkDuration(0);
    }
  }, [isAFK]);

  // 🆕 进入 AFK 后检查是否需要显示 iOS 播放按钮
  useEffect(() => {
    if (isAFK) {
      // 延迟一点检查视频是否真的在播放
      const checkTimer = setTimeout(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          // 检查是否有视频在播放
          const videos = document.querySelectorAll('video');
          const anyPlaying = Array.from(videos).some(v => !v.paused && v.currentTime > 0);
          if (!anyPlaying) {
            console.log('📱 [AFK] iOS 视频未自动播放，显示播放按钮');
            setShowIOSPlayButton(true);
          }
        }
      }, 1500);
      
      return () => clearTimeout(checkTimer);
    } else {
      setShowIOSPlayButton(false);
    }
  }, [isAFK]);

  // 设置自定义超时时间
  const setCustomTimeoutHandler = useCallback((seconds: number) => {
    const newTimeout = seconds * 1000;
    setCustomTimeout(newTimeout);
    localStorage.setItem('afkTimeout', seconds.toString());
    resetTimer();
  }, [resetTimer]);

  // 设置 AFK 密码
  const setAFKPasswordHandler = useCallback((password: string) => {
    setAfkPassword(password);
    localStorage.setItem('afkPassword', password);
  }, []);

  // 设置 AFK 密码启用状态
  const setAFKPasswordEnabledHandler = useCallback((enabled: boolean) => {
    setAfkPasswordEnabled(enabled);
    localStorage.setItem('afkPasswordEnabled', String(enabled));
  }, []);

  return (
    <AFKContext.Provider value={{
      isAFK,
      lastActivityTime: null,
      afkDuration,
      resetTimer,
      setCustomTimeout: setCustomTimeoutHandler,
      afkPassword,
      setAFKPassword: setAFKPasswordHandler,
      afkPasswordEnabled,
      setAFKPasswordEnabled: setAFKPasswordEnabledHandler,
      unlockAFK,
      enterAFKManually,
      // 🆕 iOS 播放相关
      requestIOSPlayback,
      showIOSPlayButton,
      setShowIOSPlayButton,
    }}>
      {children}
    </AFKContext.Provider>
  );
};