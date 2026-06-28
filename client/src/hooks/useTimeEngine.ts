// client/src/hooks/useTimeEngine.ts
import { useState, useCallback, useRef, useEffect } from 'react';

export interface TimeEngineOptions {
  initialSpeed?: number;
  minSpeed?: number;
  maxSpeed?: number;
  initialDate?: Date;
  onTimeChange?: (date: Date, speed: number) => void;
}

export interface TimeEngineState {
  currentDate: Date;
  speed: number;
  isPlaying: boolean;
  isReversed: boolean;
}

export const useTimeEngine = (options: TimeEngineOptions = {}) => {
  const {
    initialSpeed = 1,
    minSpeed = 0.01,
    maxSpeed = 1000,
    initialDate = new Date(),
    onTimeChange
  } = options;

  const [state, setState] = useState<TimeEngineState>({
    currentDate: initialDate,
    speed: initialSpeed,
    isPlaying: true,
    isReversed: false
  });

  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // 计算行星位置的基础函数（简化版，后续可接入真实轨道数据）
  const calculatePlanetPosition = useCallback((
    planetDistance: number,
    planetSpeed: number,
    currentTime: number
  ): { x: number; z: number } => {
    // 简化计算：行星在圆形轨道上运动
    const angle = (currentTime * planetSpeed * state.speed * (state.isReversed ? -1 : 1)) % (2 * Math.PI);
    const x = Math.cos(angle) * planetDistance;
    const z = Math.sin(angle) * planetDistance;
    return { x, z };
  }, [state.speed, state.isReversed]);

  // 时间更新循环
  const updateTime = useCallback(() => {
    if (!state.isPlaying) return;

    const now = Date.now();
    const deltaTime = (now - lastUpdateTimeRef.current) / 1000; // 转换为秒
    
    if (deltaTime > 0) {
      const timeMultiplier = state.speed * (state.isReversed ? -1 : 1);
      const timeIncrement = deltaTime * timeMultiplier * 86400; // 每天86400秒
      
      const newDate = new Date(state.currentDate.getTime() + timeIncrement * 1000);
      
      setState(prev => ({
        ...prev,
        currentDate: newDate
      }));

      if (onTimeChange) {
        onTimeChange(newDate, state.speed);
      }
    }

    lastUpdateTimeRef.current = now;
    animationFrameRef.current = requestAnimationFrame(updateTime);
  }, [state.isPlaying, state.speed, state.isReversed, state.currentDate, onTimeChange]);

  // 控制函数
  const play = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    const clampedSpeed = Math.max(minSpeed, Math.min(maxSpeed, speed));
    setState(prev => ({ ...prev, speed: clampedSpeed }));
  }, [minSpeed, maxSpeed]);

  const increaseSpeed = useCallback(() => {
    setState(prev => {
      const newSpeed = prev.speed * 2;
      return { ...prev, speed: Math.min(maxSpeed, newSpeed) };
    });
  }, [maxSpeed]);

  const decreaseSpeed = useCallback(() => {
    setState(prev => {
      const newSpeed = prev.speed / 2;
      return { ...prev, speed: Math.max(minSpeed, newSpeed) };
    });
  }, [minSpeed]);

  const toggleDirection = useCallback(() => {
    setState(prev => ({ ...prev, isReversed: !prev.isReversed }));
  }, []);

  const jumpToDate = useCallback((date: Date) => {
    setState(prev => ({ ...prev, currentDate: date }));
    if (onTimeChange) {
      onTimeChange(date, state.speed);
    }
  }, [state.speed, onTimeChange]);

  const reset = useCallback(() => {
    setState({
      currentDate: initialDate,
      speed: initialSpeed,
      isPlaying: true,
      isReversed: false
    });
    if (onTimeChange) {
      onTimeChange(initialDate, initialSpeed);
    }
  }, [initialDate, initialSpeed, onTimeChange]);

  // 格式化日期显示
  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  // 格式化速度显示
  const formatSpeed = useCallback((speed: number): string => {
    if (speed < 1) {
      return `${(speed * 24).toFixed(1)} 小时/秒`;
    } else if (speed < 365) {
      return `${speed.toFixed(1)} 天/秒`;
    } else {
      return `${(speed / 365).toFixed(1)} 年/秒`;
    }
  }, []);

  // 启动/停止时间循环
  useEffect(() => {
    if (state.isPlaying) {
      lastUpdateTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, updateTime]);

  return {
    state,
    calculatePlanetPosition,
    controls: {
      play,
      pause,
      setSpeed,
      increaseSpeed,
      decreaseSpeed,
      toggleDirection,
      jumpToDate,
      reset
    },
    formatDate,
    formatSpeed
  };
};