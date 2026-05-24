// client/src/utils/antiDebug.ts

// 反调试检测
export class AntiDebug {
  private static instance: AntiDebug;
  private devToolsOpen = false;
  private lastTime = 0;
  private alertCount = 0;
  private banned = false;
  private checkInterval: number | null = null;

  static getInstance() {
    if (!AntiDebug.instance) {
      AntiDebug.instance = new AntiDebug();
    }
    return AntiDebug.instance;
  }

  // 检测开发者工具是否打开
  detectDevTools() {
    try {
      // 方法1：检测窗口大小变化
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        this.triggerAlert('DEV_TOOLS_DETECTED', '开发者工具已打开');
        return true;
      }
      
      // 方法2：检测 console 是否被调用（通过 toString）
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: () => {
          this.triggerAlert('DEV_TOOLS_GETTER', '开发者工具通过 getter 检测');
          return 'test';
        }
      });
      
      // 方法3：检测 Firebug
      if (typeof (window as any).console !== 'undefined' && 
          (window as any).console.firebug) {
        this.triggerAlert('FIREBUG_DETECTED', 'Firebug 已打开');
        return true;
      }
    } catch (e) {
      // 静默处理
    }
    return false;
  }

  // 检测 console 是否被篡改
  detectConsoleHijack() {
    try {
      const originalConsole = window.console;
      const methods = ['log', 'info', 'warn', 'error', 'debug'];
      
      for (const method of methods) {
        const original = originalConsole[method as keyof Console] as any;
        if (original && original.toString && !original.toString().includes('native code')) {
          this.triggerAlert('CONSOLE_HIJACK', `Console.${method} 被篡改`);
          return true;
        }
      }
    } catch (e) {
      // 静默处理
    }
    return false;
  }

  // 检测代码执行时间
  detectBreakpoint() {
    try {
      const now = Date.now();
      if (this.lastTime !== 0) {
        const diff = now - this.lastTime;
        if (diff > 500) {
          this.triggerAlert('BREAKPOINT_DETECTED', `执行时间异常: ${diff}ms`);
          return true;
        }
      }
      this.lastTime = now;
    } catch (e) {
      // 静默处理
    }
    return false;
  }

  // 检测是否在 iframe 中
  detectIframe() {
    try {
      if (window.self !== window.top) {
        this.triggerAlert('IFRAME_DETECTED', '页面被嵌入 iframe');
        return true;
      }
    } catch (e) {
      this.triggerAlert('IFRAME_CROSS_ORIGIN', '跨域 iframe 检测');
      return true;
    }
    return false;
  }

  // 阻止快捷键
  blockShortcuts() {
    const blockKeys = (e: KeyboardEvent) => {
      try {
        // 阻止 F12
        if (e.key === 'F12') {
          e.preventDefault();
          this.triggerAlert('KEY_SHORTCUT', '尝试按 F12');
          return false;
        }
        // 阻止 Ctrl+Shift+I / Cmd+Option+I
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
          e.preventDefault();
          this.triggerAlert('KEY_SHORTCUT', '尝试打开开发者工具');
          return false;
        }
        // 阻止 Ctrl+Shift+J
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
          e.preventDefault();
          this.triggerAlert('KEY_SHORTCUT', '尝试打开控制台');
          return false;
        }
        // 阻止 Ctrl+U
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
          e.preventDefault();
          this.triggerAlert('KEY_SHORTCUT', '尝试查看源代码');
          return false;
        }
        // 阻止 Ctrl+S
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          return false;
        }
        // 阻止 Ctrl+Shift+C
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
          e.preventDefault();
          this.triggerAlert('KEY_SHORTCUT', '尝试打开元素选择器');
          return false;
        }
      } catch (err) {
        // 静默处理
      }
      return true;
    };

    // 阻止右键菜单
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      this.triggerAlert('CONTEXT_MENU', '尝试打开右键菜单');
      return false;
    };

    document.addEventListener('keydown', blockKeys);
    document.addEventListener('contextmenu', blockContextMenu);
  }

  // 检测控制台输出
  detectConsoleOutput() {
    try {
      const originalError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        if (typeof message === 'string' && (message.includes('debugger') || message.includes('console'))) {
          this.triggerAlert('CONSOLE_OUTPUT', `异常输出: ${message}`);
        }
        if (originalError) {
          return originalError(message, source, lineno, colno, error);
        }
        return false;
      };
    } catch (e) {
      // 静默处理
    }
  }

  // 触发警报
  triggerAlert(type: string, details: string) {
    this.alertCount++;
    
    const alert = {
      type,
      details,
      time: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      count: this.alertCount
    };
    
    // 存储到 localStorage
    try {
      const alerts = JSON.parse(localStorage.getItem('security_alerts') || '[]');
      alerts.push(alert);
      localStorage.setItem('security_alerts', JSON.stringify(alerts.slice(-50)));
    } catch (e) {}
    
    // 如果多次触发，锁定页面
    if (this.alertCount >= 5 && !this.banned) {
      this.banned = true;
      this.lockPage();
    }
    
    // 发送到后端
    this.sendAlertToServer(alert);
  }

  // 锁定页面
  lockPage() {
    try {
      document.body.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: black; color: red; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 99999; font-family: monospace;">
          <h1>🔒 访问已被锁定</h1>
          <p>检测到异常行为，页面已被锁定。</p>
          <p>请关闭当前页面，重新登录。</p>
          <p style="font-size: 12px; color: gray; margin-top: 50px;">如有疑问，请联系管理员</p>
        </div>
      `;
      
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
  }

  // 发送警报到后端
  async sendAlertToServer(alert: any) {
    try {
      const token = localStorage.getItem('token');
      await fetch('https://rp-chatv1-0.onrender.com/api/security/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify(alert)
      });
    } catch (e) {
      // 静默失败
    }
  }

  // 使用 debugger 检测
  setupDebuggerDetection() {
    try {
      setInterval(() => {
        const start = performance.now();
        // 使用 Function 构造避免被检测
        const check = new Function('debugger;');
        try {
          check();
        } catch (e) {
          // debugger 可能会抛出异常
        }
        const end = performance.now();
        if (end - start > 100) {
          this.triggerAlert('DEBUGGER_DETECTED', `debugger 执行时间: ${end - start}ms`);
        }
      }, 5000);
    } catch (e) {}
  }

  // 启动所有检测
  start() {
    this.blockShortcuts();
    this.detectConsoleOutput();
    this.setupDebuggerDetection();
    
    // 定期检测
    this.checkInterval = window.setInterval(() => {
      this.detectDevTools();
      this.detectConsoleHijack();
      this.detectBreakpoint();
      this.detectIframe();
    }, 1000);
  }

  // 停止检测
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// 初始化
export const initAntiDebug = () => {
  // 只在生产环境启用完整检测，开发环境可以禁用方便调试
  const isDev = import.meta.env.DEV;
  if (!isDev) {
    const antiDebug = AntiDebug.getInstance();
    antiDebug.start();
    return antiDebug;
  }
  return null;
};