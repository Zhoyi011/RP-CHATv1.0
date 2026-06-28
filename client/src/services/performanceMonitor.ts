// client/src/services/performanceMonitor.ts
// 性能监控服务

import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // 毫秒
  drawCalls: number;
  triangles: number;
  memoryUsage: number; // MB
  gpuMemory: number; // MB (估算)
  isContextLost: boolean;
  contextLostCount: number;
  lastContextLostTime: number | null;
}

export interface PerformanceThresholds {
  minFPS: number;
  maxFrameTime: number; // 毫秒
  maxMemoryMB: number;
  maxDrawCalls: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'critical' | 'recovery';
  message: string;
  timestamp: number;
  metrics: Partial<PerformanceMetrics>;
}

export type PerformanceCallback = (metrics: PerformanceMetrics, alerts: PerformanceAlert[]) => void;

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsage: 0,
    gpuMemory: 0,
    isContextLost: false,
    contextLostCount: 0,
    lastContextLostTime: null,
  };

  private thresholds: PerformanceThresholds = {
    minFPS: 25, // 集成显卡目标25fps
    maxFrameTime: 40, // 40ms = 25fps
    maxMemoryMB: 256, // 256MB限制
    maxDrawCalls: 100,
  };

  private callbacks: PerformanceCallback[] = [];
  private alerts: PerformanceAlert[] = [];
  
  private frameCount = 0;
  private lastFrameTime = 0;
  private lastUpdateTime = 0;
  private updateInterval = 1000; // 1秒更新一次
  
  private renderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  // 用于内存估算
  private textureMemoryEstimate = 0;
  private bufferMemoryEstimate = 0;

  constructor() {
    this.startMonitoring();
  }

  /**
   * 设置Three.js渲染器用于性能监控
   */
  setRenderer(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement) {
    this.renderer = renderer;
    this.canvas = canvas;
    
    // 监听Context Lost事件
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  /**
   * 设置性能阈值
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * 注册性能回调
   */
  onUpdate(callback: PerformanceCallback) {
    this.callbacks.push(callback);
  }

  /**
   * 移除性能回调
   */
  offUpdate(callback: PerformanceCallback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取性能警报
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * 清除旧警报
   */
  clearOldAlerts(maxAge: number = 60000) {
    const now = Date.now();
    this.alerts = this.alerts.filter(alert => now - alert.timestamp < maxAge);
  }

  /**
   * 估算GPU内存使用
   */
  private estimateGPUMemory(): number {
    if (!this.renderer || !this.canvas) return 0;
    
    let memoryEstimate = 0;
    
    // 估算纹理内存
    memoryEstimate += this.textureMemoryEstimate;
    
    // 估算缓冲区内存
    memoryEstimate += this.bufferMemoryEstimate;
    
    // 转换为MB
    return Math.round(memoryEstimate / (1024 * 1024));
  }

  /**
   * 更新纹理内存估算
   */
  updateTextureMemoryEstimate(bytes: number) {
    this.textureMemoryEstimate += bytes;
  }

  /**
   * 更新缓冲区内存估算
   */
  updateBufferMemoryEstimate(bytes: number) {
    this.bufferMemoryEstimate += bytes;
  }

  /**
   * 处理Context Lost事件
   */
  private handleContextLost = (event: Event) => {
    event.preventDefault();
    
    this.metrics.isContextLost = true;
    this.metrics.contextLostCount += 1;
    this.metrics.lastContextLostTime = Date.now();
    
    const alert: PerformanceAlert = {
      type: 'critical',
      message: 'WebGL Context Lost - 尝试恢复中',
      timestamp: Date.now(),
      metrics: { isContextLost: true, contextLostCount: this.metrics.contextLostCount },
    };
    
    this.alerts.push(alert);
    this.notifyCallbacks();
  };

  /**
   * 处理Context Restored事件
   */
  private handleContextRestored = () => {
    this.metrics.isContextLost = false;
    
    const alert: PerformanceAlert = {
      type: 'recovery',
      message: 'WebGL Context 已恢复',
      timestamp: Date.now(),
      metrics: { isContextLost: false },
    };
    
    this.alerts.push(alert);
    this.notifyCallbacks();
  };

  /**
   * 开始性能监控
   */
  private startMonitoring() {
    this.lastUpdateTime = performance.now();
    
    const update = () => {
      const now = performance.now();
      const deltaTime = now - this.lastUpdateTime;
      
      this.frameCount++;
      
      // 每秒更新一次指标
      if (deltaTime >= this.updateInterval) {
        this.updateMetrics(deltaTime);
        this.checkThresholds();
        this.notifyCallbacks();
        
        this.frameCount = 0;
        this.lastUpdateTime = now;
      }
      
      requestAnimationFrame(update);
    };
    
    requestAnimationFrame(update);
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(deltaTime: number) {
    // 计算FPS
    this.metrics.fps = Math.round((this.frameCount * 1000) / deltaTime);
    
    // 计算平均帧时间
    this.metrics.frameTime = deltaTime / this.frameCount;
    
    // 获取JavaScript内存使用
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / (1024 * 1024));
    }
    
    // 估算GPU内存
    this.metrics.gpuMemory = this.estimateGPUMemory();
    
    // 获取渲染统计（如果支持）
    if (this.renderer && (this.renderer as any).info) {
      const info = (this.renderer as any).info;
      this.metrics.drawCalls = info.render.calls || 0;
      this.metrics.triangles = info.render.triangles || 0;
    }
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds() {
    const alerts: PerformanceAlert[] = [];
    
    // 检查FPS
    if (this.metrics.fps < this.thresholds.minFPS) {
      alerts.push({
        type: 'warning',
        message: `帧率过低: ${this.metrics.fps} FPS (目标: ${this.thresholds.minFPS}+)`,
        timestamp: Date.now(),
        metrics: { fps: this.metrics.fps },
      });
    }
    
    // 检查帧时间
    if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
      alerts.push({
        type: 'warning',
        message: `帧时间过长: ${this.metrics.frameTime.toFixed(1)}ms (限制: ${this.thresholds.maxFrameTime}ms)`,
        timestamp: Date.now(),
        metrics: { frameTime: this.metrics.frameTime },
      });
    }
    
    // 检查内存使用
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryMB) {
      alerts.push({
        type: 'critical',
        message: `内存使用过高: ${this.metrics.memoryUsage}MB (限制: ${this.thresholds.maxMemoryMB}MB)`,
        timestamp: Date.now(),
        metrics: { memoryUsage: this.metrics.memoryUsage },
      });
    }
    
    // 检查GPU内存
    if (this.metrics.gpuMemory > this.thresholds.maxMemoryMB * 0.8) {
      alerts.push({
        type: 'warning',
        message: `GPU内存使用较高: ${this.metrics.gpuMemory}MB`,
        timestamp: Date.now(),
        metrics: { gpuMemory: this.metrics.gpuMemory },
      });
    }
    
    // 检查Draw Calls
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls) {
      alerts.push({
        type: 'warning',
        message: `Draw Calls过多: ${this.metrics.drawCalls} (限制: ${this.thresholds.maxDrawCalls})`,
        timestamp: Date.now(),
        metrics: { drawCalls: this.metrics.drawCalls },
      });
    }
    
    // 添加新警报
    this.alerts.push(...alerts);
    
    // 限制警报数量
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks() {
    const metrics = this.getMetrics();
    const alerts = this.getAlerts();
    
    this.callbacks.forEach(callback => {
      try {
        callback(metrics, alerts);
      } catch (error) {
        console.error('Performance callback error:', error);
      }
    });
  }

  /**
   * 获取性能建议
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.fps < this.thresholds.minFPS) {
      recommendations.push('降低画质设置');
      recommendations.push('减少可见行星数量');
      recommendations.push('关闭轨道显示');
    }
    
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryMB * 0.7) {
      recommendations.push('清理纹理缓存');
      recommendations.push('重启应用释放内存');
    }
    
    if (this.metrics.contextLostCount > 0) {
      recommendations.push('更新显卡驱动程序');
      recommendations.push('尝试使用其他浏览器');
    }
    
    return recommendations;
  }

  /**
   * 重置监控器
   */
  reset() {
    this.metrics = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      memoryUsage: 0,
    gpuMemory: 0,
      isContextLost: false,
      contextLostCount: 0,
      lastContextLostTime: null,
    };
    
    this.alerts = [];
    this.textureMemoryEstimate = 0;
    this.bufferMemoryEstimate = 0;
  }

  /**
   * 销毁监控器
   */
  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    }
    
    this.callbacks = [];
    this.alerts = [];
    this.renderer = null;
    this.canvas = null;
  }
}

// 创建单例实例
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

/**
 * 性能监控React钩子
 */
export const usePerformanceMonitor = () => {
  return {
    getMetrics: () => performanceMonitor.getMetrics(),
    getAlerts: () => performanceMonitor.getAlerts(),
    getRecommendations: () => performanceMonitor.getRecommendations(),
    setThresholds: (thresholds: Partial<PerformanceThresholds>) => 
      performanceMonitor.setThresholds(thresholds),
    onUpdate: (callback: PerformanceCallback) => 
      performanceMonitor.onUpdate(callback),
    offUpdate: (callback: PerformanceCallback) => 
      performanceMonitor.offUpdate(callback),
  };
};

/**
 * 自动降级管理器
 */
export class AutoDegradationManager {
  private qualityLevel: 'low' | 'medium' | 'high' = 'medium';
  private degradationSteps = ['high', 'medium', 'low'] as const;
  private currentStepIndex = 1; // 从medium开始
  
  private fpsThresholds = {
    high: 40,
    medium: 25,
    low: 15,
  };
  
  private memoryThresholds = {
    high: 128, // MB
    medium: 192,
    low: 256,
  };

  constructor() {
    // 检测设备能力
    this.detectDeviceCapability();
  }

  private detectDeviceCapability() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // 检查是否集成显卡
    const isIntegratedGPU = /intel|hd graphics|uhd graphics|iris/i.test(userAgent);
    
    // 检查内存
    const memory = (performance as any).memory;
    const hasLowMemory = memory && (memory.jsHeapSizeLimit < 2 * 1024 * 1024 * 1024); // < 2GB
    
    if (isIntegratedGPU || hasLowMemory) {
      this.qualityLevel = 'low';
      this.currentStepIndex = 2;
      console.log('🔧 Auto-detected low-end device, setting quality to low');
    }
  }

  /**
   * 根据性能指标调整画质
   */
  adjustQuality(metrics: PerformanceMetrics): 'low' | 'medium' | 'high' {
    const { fps, memoryUsage } = metrics;
    
    // 检查是否需要降级
    if (fps < this.fpsThresholds[this.qualityLevel] || 
        memoryUsage > this.memoryThresholds[this.qualityLevel]) {
      
      if (this.currentStepIndex < this.degradationSteps.length - 1) {
        this.currentStepIndex++;
        this.qualityLevel = this.degradationSteps[this.currentStepIndex];
        console.log(`🔽 Degraded quality to ${this.qualityLevel} due to poor performance`);
      }
    }
    
    // 检查是否可以升级
    else if (this.currentStepIndex > 0) {
      const nextLevel = this.degradationSteps[this.currentStepIndex - 1];
      const nextFpsThreshold = this.fpsThresholds[nextLevel];
      const nextMemoryThreshold = this.memoryThresholds[nextLevel];
      
      if (fps > nextFpsThreshold * 1.2 && memoryUsage < nextMemoryThreshold * 0.8) {
        this.currentStepIndex--;
        this.qualityLevel = this.degradationSteps[this.currentStepIndex];
        console.log(`🔼 Upgraded quality to ${this.qualityLevel} due to good performance`);
      }
    }
    
    return this.qualityLevel;
  }

  /**
   * 获取当前画质级别
   */
  getCurrentQuality(): 'low' | 'medium' | 'high' {
    return this.qualityLevel;
  }

  /**
   * 手动设置画质级别
   */
  setQuality(quality: 'low' | 'medium' | 'high') {
    this.qualityLevel = quality;
    this.currentStepIndex = this.degradationSteps.indexOf(quality);
  }

  /**
   * 获取画质配置
   */
  getQualityConfig(quality: 'low' | 'medium' | 'high') {
    const configs = {
      low: {
        textureSize: 128,
        sphereSegments: 16,
        starCount: 300,
        shadowEnabled: false,
        antialias: false,
        postProcessing: false,
      },
      medium: {
        textureSize: 256,
        sphereSegments: 24,
        starCount: 800,
        shadowEnabled: false,
        antialias: false,
        postProcessing: false,
      },
      high: {
        textureSize: 512,
        sphereSegments: 32,
        starCount: 1500,
        shadowEnabled: true,
        antialias: true,
        postProcessing: true,
      },
    };
    
    return configs[quality];
  }
}