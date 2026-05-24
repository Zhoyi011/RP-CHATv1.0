// client/src/utils/antiDebug.ts

// 温和反调试系统 - 只有打开控制台才触发
export class AntiDebug {
  private static instance: AntiDebug;
  private devToolsOpened = false;
  private hasAlerted = false;
  private checkInterval: number | null = null;

  static getInstance() {
    if (!AntiDebug.instance) {
      AntiDebug.instance = new AntiDebug();
    }
    return AntiDebug.instance;
  }

  // 检测控制台是否打开（使用多种方法）
  detectDevTools() {
    // 方法1：检测窗口大小变化（开发者工具打开时窗口会变小）
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
      if (!this.devToolsOpened && !this.hasAlerted) {
        this.devToolsOpened = true;
        this.showGentleWarning();
      }
      return true;
    }
    
    // 方法2：检测 console.log 被调用时的堆栈
    const element = new Image();
    let detected = false;
    Object.defineProperty(element, 'id', {
      get: () => {
        if (!this.devToolsOpened && !this.hasAlerted) {
          this.devToolsOpened = true;
          this.showGentleWarning();
        }
        detected = true;
        return 'test';
      }
    });
    
    return detected;
  }

  // 温和警告（只在控制台显示，不打扰用户）
  showGentleWarning() {
    this.hasAlerted = true;
    
    // 只在控制台打印，不弹窗不锁页面
    console.log('%c⚠️ 检测到开发者工具', 'color: #f59e0b; font-size: 14px;');
    console.log('%c安全提醒：请勿进行违规操作，所有行为将被记录', 'color: #6b7280; font-size: 12px;');
    console.log('%cRP Chat 安全系统 - 正常使用不受影响', 'color: #3b82f6; font-size: 12px;');
    
    // 可选：发送温和通知到后端（不封号）
    this.sendGentleAlert();
  }

  // 发送温和警报（仅记录，不封禁）
  async sendGentleAlert() {
    try {
      const token = localStorage.getItem('token');
      await fetch('https://rp-chatv1-0.onrender.com/api/security/gentle-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          type: 'DEV_TOOLS_OPENED',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      // 静默失败
    }
  }

  // 阻止关键快捷键（只阻止真正危险的）
  blockShortcuts() {
    const blockKeys = (e: KeyboardEvent) => {
      // 只阻止 F12（开发者工具）
      if (e.key === 'F12') {
        e.preventDefault();
        // 不弹窗，只是阻止
        return;
      }
      // 阻止 Ctrl+Shift+I（打开开发者工具）
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return;
      }
      // 其他快捷键不阻止，让用户正常使用
    };

    document.addEventListener('keydown', blockKeys);
  }

  // 启动检测（温和模式）
  start() {
    // 阻止快捷键（轻度）
    this.blockShortcuts();
    
    // 定期检测控制台（频率低，不打扰）
    this.checkInterval = window.setInterval(() => {
      this.detectDevTools();
    }, 3000);
  }

  // 停止检测
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// 初始化温和反调试
export const initAntiDebug = () => {
  // 只在生产环境启用
  if (import.meta.env.PROD) {
    const antiDebug = AntiDebug.getInstance();
    antiDebug.start();
    return antiDebug;
  }
  return null;
};