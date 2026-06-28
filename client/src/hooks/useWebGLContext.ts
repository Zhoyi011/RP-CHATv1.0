// client/src/hooks/useWebGLContext.ts
// WebGL Context Lost恢复钩子

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface UseWebGLContextOptions {
  onContextLost?: () => void;
  onContextRestored?: () => void;
  maxRecoveryAttempts?: number;
  recoveryTimeout?: number;
}

interface WebGLContextState {
  isContextLost: boolean;
  recoveryAttempts: number;
  lastContextLostTime: number | null;
  gpuMemoryUsage: number; // 估算的GPU内存使用（MB）
}

/**
 * WebGL Context Lost恢复钩子
 * 用于检测和处理WebGL上下文丢失，实现自动恢复
 */
export const useWebGLContext = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  options: UseWebGLContextOptions = {}
) => {
  const {
    onContextLost,
    onContextRestored,
    maxRecoveryAttempts = 3,
    recoveryTimeout = 5000,
  } = options;

  const [state, setState] = useState<WebGLContextState>({
    isContextLost: false,
    recoveryAttempts: 0,
    lastContextLostTime: null,
    gpuMemoryUsage: 0,
  });

  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contextLostTimeRef = useRef<number | null>(null);

  // 估算GPU内存使用
  const estimateGPUMemory = useCallback(() => {
    if (!canvasRef.current) return 0;
    
    const gl = canvasRef.current.getContext('webgl') || 
               canvasRef.current.getContext('experimental-webgl');
    
    if (!gl) return 0;

    let memoryEstimate = 0;
    
    // 估算纹理内存（非常粗略的估算）
    const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    memoryEstimate += maxTextureUnits * 4 * 1024 * 1024; // 假设每个纹理单元4MB
    
    // 估算缓冲区内存
    const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    memoryEstimate += maxRenderBufferSize * 4 / (1024 * 1024); // 转换为MB
    
    return Math.round(memoryEstimate);
  }, [canvasRef]);

  // 处理Context Lost事件
  const handleContextLost = useCallback((event: Event) => {
    event.preventDefault();
    
    const now = Date.now();
    contextLostTimeRef.current = now;
    
    console.warn('🚨 WebGL Context Lost detected');
    console.warn(`Recovery attempt ${state.recoveryAttempts + 1}/${maxRecoveryAttempts}`);
    
    setState(prev => ({
      ...prev,
      isContextLost: true,
      recoveryAttempts: prev.recoveryAttempts + 1,
      lastContextLostTime: now,
    }));

    // 调用用户自定义回调
    onContextLost?.();

    // 清理可能的定时器
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
    }

    // 设置恢复超时
    recoveryTimerRef.current = setTimeout(() => {
      console.warn('⏰ Context recovery timeout reached');
      setState(prev => ({
        ...prev,
        isContextLost: false,
      }));
    }, recoveryTimeout);

  }, [maxRecoveryAttempts, recoveryTimeout, onContextLost, state.recoveryAttempts]);

  // 处理Context Restored事件
  const handleContextRestored = useCallback(() => {
    console.log('✅ WebGL Context Restored');
    
    // 清理定时器
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isContextLost: false,
    }));

    // 更新内存估算
    const memoryUsage = estimateGPUMemory();
    setState(prev => ({
      ...prev,
      gpuMemoryUsage: memoryUsage,
    }));

    // 调用用户自定义回调
    onContextRestored?.();

    // 如果恢复尝试过多，建议降低画质
    if (state.recoveryAttempts >= maxRecoveryAttempts) {
      console.warn(`⚠️ Max recovery attempts (${maxRecoveryAttempts}) reached. Consider lowering graphics quality.`);
    }

  }, [estimateGPUMemory, onContextRestored, state.recoveryAttempts, maxRecoveryAttempts]);

  // 强制释放WebGL资源
  const forceCleanup = useCallback(() => {
    if (!canvasRef.current) return;
    
    const gl = canvasRef.current.getContext('webgl') || 
               canvasRef.current.getContext('experimental-webgl');
    
    if (!gl) return;
    
    console.log('🧹 Forcing WebGL resource cleanup');
    
    // 获取所有纹理并删除
    const numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    for (let i = 0; i < numTextureUnits; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    
    // 强制垃圾回收（如果浏览器支持）
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
    
    // 更新内存估算
    const memoryUsage = estimateGPUMemory();
    setState(prev => ({
      ...prev,
      gpuMemoryUsage: memoryUsage,
    }));
    
  }, [canvasRef, estimateGPUMemory]);

  // 手动触发恢复
  const triggerRecovery = useCallback(() => {
    console.log('🔄 Manually triggering context recovery');
    
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    
    handleContextRestored();
  }, [handleContextRestored]);

  // 重置恢复计数器
  const resetRecoveryCount = useCallback(() => {
    console.log('🔄 Resetting recovery counter');
    setState(prev => ({
      ...prev,
      recoveryAttempts: 0,
    }));
  }, []);

  // 初始化事件监听
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 添加事件监听
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // 初始内存估算
    const initialMemory = estimateGPUMemory();
    setState(prev => ({
      ...prev,
      gpuMemoryUsage: initialMemory,
    }));

    // 定期更新内存估算
    const memoryUpdateInterval = setInterval(() => {
      const memoryUsage = estimateGPUMemory();
      setState(prev => ({
        ...prev,
        gpuMemoryUsage: memoryUsage,
      }));
    }, 10000); // 每10秒更新一次

    return () => {
      // 清理事件监听
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      
      // 清理定时器
      clearInterval(memoryUpdateInterval);
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
      
      // 离开页面时强制清理
      forceCleanup();
    };
  }, [canvasRef, handleContextLost, handleContextRestored, estimateGPUMemory, forceCleanup]);

  // 提供状态和方法
  return {
    ...state,
    forceCleanup,
    triggerRecovery,
    resetRecoveryCount,
    isRecoveryLimitReached: state.recoveryAttempts >= maxRecoveryAttempts,
  };
};

/**
 * 创建Three.js渲染器的安全配置
 * 针对集成显卡优化
 */
export const createSafeRendererConfig = (quality: 'low' | 'medium' | 'high') => {
  const config: any = {
    powerPreference: 'low-power' as WebGLPowerPreference,
    antialias: quality === 'high',
    alpha: false,
    stencil: false,
    depth: true,
    preserveDrawingBuffer: false,
    premultipliedAlpha: false,
    failIfMajorPerformanceCaveat: true,
  };

  // 根据画质调整配置
  switch (quality) {
    case 'low':
      config.precision = 'lowp';
      config.antialias = false;
      break;
    case 'medium':
      config.precision = 'mediump';
      config.antialias = false;
      break;
    case 'high':
      config.precision = 'highp';
      config.antialias = true;
      break;
  }

  return config;
};

/**
 * 检查设备是否可能遇到Context Lost问题
 */
export const checkDeviceVulnerability = (): {
  isVulnerable: boolean;
  reasons: string[];
  recommendations: string[];
} => {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  
  // 检查用户代理
  const userAgent = navigator.userAgent.toLowerCase();
  
  // 检查是否集成显卡
  const isIntegratedGPU = /intel|hd graphics|uhd graphics|iris/i.test(userAgent);
  if (isIntegratedGPU) {
    reasons.push('使用集成显卡（Intel UHD/HD Graphics）');
    recommendations.push('建议使用低画质模式');
  }
  
  // 检查内存
  const memory = (performance as any).memory;
  if (memory) {
    const totalMemoryMB = memory.jsHeapSizeLimit / (1024 * 1024);
    if (totalMemoryMB < 2048) { // 小于2GB
      reasons.push(`可用内存较低（${Math.round(totalMemoryMB)}MB）`);
      recommendations.push('建议关闭其他标签页');
    }
  }
  
  // 检查操作系统
  const isWindows = /windows/.test(userAgent);
  if (isWindows) {
    reasons.push('Windows系统（驱动兼容性问题）');
    recommendations.push('确保显卡驱动为最新版本');
  }
  
  // 检查浏览器
  const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);
  
  if (isChrome) {
    recommendations.push('Chrome浏览器：尝试禁用硬件加速');
  } else if (isFirefox) {
    recommendations.push('Firefox浏览器：更新到最新版本');
  }
  
  return {
    isVulnerable: reasons.length > 0,
    reasons,
    recommendations,
  };
};