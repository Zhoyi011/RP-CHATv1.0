// 通知服务
class NotificationService {
  private originalTitle: string;
  private interval: ReturnType<typeof setTimeout> | null = null;
  private unreadCount: number = 0;
  private notificationPermission: boolean = false;

  constructor() {
    this.originalTitle = document.title;
    this.initNotification();
  }

  // 初始化通知权限
  async initNotification() {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        this.notificationPermission = true;
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission === "granted";
      }
    }
  }

  // 显示系统通知
  showSystemNotification(title: string, body: string, onClick?: () => void) {
    if (!this.notificationPermission) return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        silent: false,
        requireInteraction: true,
        tag: 'new-message'
      });

      notification.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notification.close();
      };

      // 手机震动
      if (navigator && 'vibrate' in navigator) {
        (navigator as any).vibrate([200, 100, 200]);
      }

    } catch (error) {
      console.error('系统通知失败:', error);
    }
  }

  // 开始标题闪烁
  startTitleFlashing(message: string = '💬 新消息') {
    this.unreadCount++;
    if (this.interval) return;

    let count = 0;
    this.interval = setInterval(() => {
      document.title = count++ % 2 ? message : this.originalTitle;
      
      setTimeout(() => {
        this.stopTitleFlashing();
      }, 5000);
    }, 1000);
  }

  // 停止标题闪烁
  stopTitleFlashing() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      document.title = this.originalTitle;
      this.unreadCount = 0;
    }
  }

  // 新消息通知
  onNewMessage(message: any) {
    const isActive = !document.hidden;

    // 1. 如果页面不在激活状态，闪烁标题
    if (document.hidden) {
      this.startTitleFlashing('💬 新消息');
    }

    // 2. 系统通知（用户允许的情况下）
    if (this.notificationPermission) {
      this.showSystemNotification(
        `来自 ${message.personaId?.name || '用户'} 的消息`,
        message.content,
        () => {
          window.focus();
          this.stopTitleFlashing();
        }
      );
    }
  }
}

export const notificationService = new NotificationService();