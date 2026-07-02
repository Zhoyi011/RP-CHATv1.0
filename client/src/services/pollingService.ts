// client/src/services/pollingService.ts

type PollingTask = {
  id: string;
  fn: () => Promise<any>;
  onSuccess: (data: any) => void;
  onError?: (error: Error) => void;
  interval: number;
  enabled: boolean;
  lastRun: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  isRunning: boolean;
};

type PollingConfig = {
  [key: string]: {
    interval: number;      // 轮询间隔（毫秒）
    enabled: boolean;      // 是否启用
  };
};

class PollingService {
  private tasks: Map<string, PollingTask> = new Map();
  private isPageVisible: boolean = true;
  private globalInterval: number = 3000; // 全局基础间隔

  // ========== 默认配置 ==========
  private defaultConfig: PollingConfig = {
    // 高频（重要数据，变化频繁）
    rooms: { interval: 3000, enabled: true },
    unreadCount: { interval: 5000, enabled: true },
    
    // 中频（变化中等）
    friends: { interval: 5000, enabled: true },
    friendRequests: { interval: 5000, enabled: true },
    
    // 低频（变化较少）
    novels: { interval: 10000, enabled: true },
    notifications: { interval: 10000, enabled: true },
    
    // 极低频（几乎不变）
    userInfo: { interval: 30000, enabled: true },
    changelog: { interval: 60000, enabled: false },
  };

  constructor() {
    // 监听页面可见性变化
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    const wasVisible = this.isPageVisible;
    this.isPageVisible = !document.hidden;

    // 🔥 页面从隐藏变可见时，立即刷新所有任务
    if (!wasVisible && this.isPageVisible) {
      console.log('👁️ 页面重新可见，刷新所有数据');
      this.runAllTasks();
    }

    // 如果页面隐藏，暂停所有轮询
    if (!this.isPageVisible) {
      console.log('💤 页面隐藏，暂停轮询');
      this.pauseAll();
    } else {
      console.log('▶️ 页面可见，恢复轮询');
      this.resumeAll();
    }
  };

  // ========== 注册任务 ==========
  register(
    id: string,
    fn: () => Promise<any>,
    onSuccess: (data: any) => void,
    onError?: (error: Error) => void,
    customInterval?: number
  ): void {
    const config = this.defaultConfig[id];
    const interval = customInterval || config?.interval || 5000;

    if (this.tasks.has(id)) {
      // 如果已存在，更新配置
      const existing = this.tasks.get(id)!;
      existing.fn = fn;
      existing.onSuccess = onSuccess;
      existing.onError = onError;
      return;
    }

    const task: PollingTask = {
      id,
      fn,
      onSuccess,
      onError,
      interval,
      enabled: config?.enabled ?? true,
      lastRun: 0,
      timeoutId: null,
      isRunning: false,
    };

    this.tasks.set(id, task);
    this.startTask(id);
  }

  // ========== 注销任务 ==========
  unregister(id: string): void {
    const task = this.tasks.get(id);
    if (task && task.timeoutId) {
      clearTimeout(task.timeoutId);
    }
    this.tasks.delete(id);
  }

  // ========== 运行单个任务 ==========
  private async runTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || !task.enabled || !this.isPageVisible) return;
    if (task.isRunning) return; // 防止重叠执行

    task.isRunning = true;

    try {
      const data = await task.fn();
      task.onSuccess(data);
    } catch (error) {
      if (task.onError) {
        task.onError(error as Error);
      }
      // 静默失败，不中断轮询
    } finally {
      task.isRunning = false;
      task.lastRun = Date.now();
      this.scheduleTask(id);
    }
  }

  // ========== 调度任务 ==========
  private scheduleTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task || !task.enabled || !this.isPageVisible) return;

    // 动态调整间隔：根据数据变化频率
    // 如果最近有数据变化，缩短间隔；否则保持默认
    const interval = this.calculateDynamicInterval(task);

    task.timeoutId = setTimeout(() => {
      this.runTask(id);
    }, interval);
  }

  // ========== 动态调整间隔 ==========
  private calculateDynamicInterval(task: PollingTask): number {
    // 基础间隔
    let interval = task.interval;

    // 如果页面不可见，延迟加倍
    if (!this.isPageVisible) {
      interval = Math.min(interval * 3, 60000);
    }

    // 如果长时间没有变化，可以适当延长（可选的优化）
    return interval;
  }

  // ========== 启动任务 ==========
  private startTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;

    // 立即执行一次
    this.runTask(id);
  }

  // ========== 运行所有任务 ==========
  private runAllTasks(): void {
    for (const id of this.tasks.keys()) {
      this.runTask(id);
    }
  }

  // ========== 暂停所有 ==========
  pauseAll(): void {
    for (const [id, task] of this.tasks) {
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
        task.timeoutId = null;
      }
    }
  }

  // ========== 恢复所有 ==========
  resumeAll(): void {
    for (const [id, task] of this.tasks) {
      if (task.enabled && !task.timeoutId) {
        this.scheduleTask(id);
      }
    }
  }

  // ========== 手动刷新指定任务 ==========
  refresh(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    
    // 清除当前定时器
    if (task.timeoutId) {
      clearTimeout(task.timeoutId);
      task.timeoutId = null;
    }
    
    // 立即执行
    this.runTask(id);
  }

  // ========== 获取任务状态 ==========
  getStatus(id: string): { lastRun: number; isRunning: boolean } | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    return {
      lastRun: task.lastRun,
      isRunning: task.isRunning,
    };
  }

  // ========== 销毁 ==========
  destroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.pauseAll();
    this.tasks.clear();
  }
}

// 单例导出
export const pollingService = new PollingService();