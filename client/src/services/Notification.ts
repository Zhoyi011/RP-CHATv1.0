// client/src/services/Notification.ts

// 消息类型定义（扩展）
interface Message {
  _id: string;
  content: string;
  isAction: boolean;
  createdAt?: string | Date;  // ✅ 添加 createdAt 字段
  personaId?: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
  };
  roomId?: string | { _id: string; name: string };
}

// 通知配置
interface NotificationConfig {
  soundEnabled: boolean;
  desktopEnabled: boolean;
  flashTitleEnabled: boolean;
  vibrationEnabled: boolean;
  groupByRoom: boolean;
  autoCloseDelay: number;
}

// 未读消息分组
interface UnreadGroup {
  roomId: string;
  roomName: string;
  messages: Message[];
  lastSender: string;
  lastTime: Date;
  count: number;
}

class NotificationService {
  private originalTitle: string;
  private interval: ReturnType<typeof setTimeout> | null = null;
  private unreadCount: number = 0;
  private notificationPermission: boolean = false;
  private audioContext: AudioContext | null = null;
  private config: NotificationConfig = {
    soundEnabled: true,
    desktopEnabled: true,
    flashTitleEnabled: true,
    vibrationEnabled: true,
    groupByRoom: true,
    autoCloseDelay: 5000
  };
  
  // 未读消息存储
  private unreadMessages: Map<string, Message[]> = new Map();
  private lastNotifiedTime: Map<string, number> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  
  // 声音文件（可自定义）
  private sounds = {
    message: '/sounds/message.mp3',
    mention: '/sounds/mention.mp3',
    notification: '/sounds/notification.mp3'
  };

  constructor() {
    this.originalTitle = document.title;
    this.initNotification();
    this.loadConfig();
    this.preloadSounds();
    this.initVisibilityListener();
  }

  // 加载用户配置
  private loadConfig() {
    try {
      const saved = localStorage.getItem('notification_config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (e) {}
  }

  // 保存配置
  saveConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
    localStorage.setItem('notification_config', JSON.stringify(this.config));
  }

  // 获取配置
  getConfig() {
    return { ...this.config };
  }

  // 预加载声音
  private preloadSounds() {
    Object.values(this.sounds).forEach(url => {
      const audio = new Audio(url);
      audio.load();
    });
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

  // 播放声音
  private playSound(type: 'message' | 'mention' | 'notification') {
    if (!this.config.soundEnabled) return;
    
    try {
      const audio = new Audio(this.sounds[type]);
      audio.volume = 0.5;
      audio.play().catch(e => console.log('播放声音失败:', e));
    } catch (error) {
      console.log('声音播放失败:', error);
    }
  }

  // 播放备选音效（网页音频合成）
  private playBeep() {
    if (!this.config.soundEnabled) return;
    
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      oscillator.frequency.value = 880;
      gain.gain.value = 0.1;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.5);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('合成音效失败:', e);
    }
  }

  // 振动
  private vibrate(pattern: number | number[]) {
    if (!this.config.vibrationEnabled) return;
    if (navigator && 'vibrate' in navigator) {
      try {
        (navigator as any).vibrate(pattern);
      } catch (e) {}
    }
  }

  // 显示系统通知（修复 NotificationOptions）
  showSystemNotification(title: string, body: string, onClick?: () => void, options?: {
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
  }) {
    if (!this.config.desktopEnabled) return;
    if (!this.notificationPermission) return;

    try {
      // ✅ 修复：符合 Notification API 的类型
      const notificationOptions: NotificationOptions = {
        body,
        icon: options?.icon || '/favicon.svg',
        badge: '/favicon.svg',
        silent: false,
        requireInteraction: options?.requireInteraction || false,
        tag: options?.tag || 'new-message'
      };
      
      // ✅ 振动单独处理（不在 NotificationOptions 中）
      if (this.config.vibrationEnabled && navigator && 'vibrate' in navigator) {
        setTimeout(() => {
          (navigator as any).vibrate([200, 100, 200]);
        }, 100);
      }
      
      const notification = new Notification(title, notificationOptions);

      notification.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notification.close();
      };

      // 自动关闭
      setTimeout(() => notification.close(), this.config.autoCloseDelay);

    } catch (error) {
      console.error('系统通知失败:', error);
    }
  }

  // 开始标题闪烁（增强版）
  startTitleFlashing(message: string = '💬 新消息', count: number = this.unreadCount) {
    if (!this.config.flashTitleEnabled) return;
    
    this.unreadCount = count;
    if (this.interval) return;

    let flashCount = 0;
    const maxFlashes = 20; // 最多闪烁20次
    
    this.interval = setInterval(() => {
      if (flashCount >= maxFlashes) {
        this.stopTitleFlashing();
        return;
      }
      
      if (flashCount % 2 === 0) {
        document.title = `(${this.unreadCount}) ${message}`;
      } else {
        document.title = this.originalTitle;
      }
      flashCount++;
    }, 800);
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

  // 更新未读消息数
  updateUnreadCount(count: number) {
    if (count > 0 && document.hidden) {
      this.startTitleFlashing('💬 新消息', count);
    } else {
      this.stopTitleFlashing();
    }
  }

  // 获取未读消息分组
  getUnreadGroups(): UnreadGroup[] {
    const groups: Map<string, UnreadGroup> = new Map();
    
    for (const [roomId, messages] of this.unreadMessages) {
      const lastMsg = messages[messages.length - 1];
      groups.set(roomId, {
        roomId,
        roomName: typeof lastMsg.roomId === 'object' && lastMsg.roomId ? lastMsg.roomId.name : '未知',
        messages,
        lastSender: lastMsg.personaId?.displayName || lastMsg.personaId?.name || '用户',
        lastTime: new Date(lastMsg.createdAt || Date.now()),
        count: messages.length
      });
    }
    
    return Array.from(groups.values()).sort((a, b) => b.lastTime.getTime() - a.lastTime.getTime());
  }

  // 清除房间未读
  clearRoomUnread(roomId: string) {
    this.unreadMessages.delete(roomId);
    this.lastNotifiedTime.delete(roomId);
    if (this.debounceTimers.has(roomId)) {
      clearTimeout(this.debounceTimers.get(roomId));
      this.debounceTimers.delete(roomId);
    }
  }

  // 清除所有未读
  clearAllUnread() {
    this.unreadMessages.clear();
    this.stopTitleFlashing();
  }

  // 检查是否提及用户
  private isMentioned(message: Message, username: string): boolean {
    if (!username) return false;
    const content = message.content.toLowerCase();
    const patterns = [
      `@${username.toLowerCase()}`,
      `@${username.toLowerCase()} `,
      `@${username.toLowerCase()},`,
      `@所有人`,
      `@everyone`,
      `@all`
    ];
    return patterns.some(p => content.includes(p));
  }

  // 新消息通知（增强版）
  onNewMessage(message: Message, currentUserId?: string, currentPersonaId?: string, username?: string) {
    const isActive = !document.hidden;
    const isSelf = message.personaId?._id === currentPersonaId;
    
    // 自己的消息不通知
    if (isSelf) return;

    // 存储未读
    const roomId = typeof message.roomId === 'string' ? message.roomId : message.roomId?._id;
    if (roomId) {
      if (!this.unreadMessages.has(roomId)) {
        this.unreadMessages.set(roomId, []);
      }
      this.unreadMessages.get(roomId)!.push(message);
      
      // 限制每个房间最多保留 50 条未读
      if (this.unreadMessages.get(roomId)!.length > 50) {
        this.unreadMessages.set(roomId, this.unreadMessages.get(roomId)!.slice(-50));
      }
    }

    // 检查是否被提及
    const isMentioned = username ? this.isMentioned(message, username) : false;
    
    // 防抖：同一房间短时间内只通知一次
    const now = Date.now();
    const lastTime = this.lastNotifiedTime.get(roomId) || 0;
    const DEBOUNCE_MS = 3000;
    
    if (now - lastTime < DEBOUNCE_MS) {
      if (this.debounceTimers.has(roomId)) {
        clearTimeout(this.debounceTimers.get(roomId));
      }
      const timer = setTimeout(() => {
        this.sendNotification(message, isActive, isMentioned);
      }, DEBOUNCE_MS);
      this.debounceTimers.set(roomId, timer);
      return;
    }
    
    this.lastNotifiedTime.set(roomId, now);
    this.sendNotification(message, isActive, isMentioned);
  }

  private sendNotification(message: Message, isActive: boolean, isMentioned: boolean) {
    const senderName = message.personaId?.displayName || message.personaId?.name || '用户';
    const roomName = typeof message.roomId === 'object' && message.roomId ? message.roomId.name : '聊天室';
    const content = message.isAction ? `* ${message.content} *` : message.content;
    const maxLength = 50;
    const trimmedContent = content.length > maxLength ? content.substring(0, maxLength) + '...' : content;

    // 1. 播放声音（被提及时有特殊声音）
    if (isMentioned) {
      this.playSound('mention');
      this.playBeep();
      this.vibrate([300, 100, 300]);
    } else {
      this.playSound('message');
      this.playBeep();
      this.vibrate([100, 50, 100]);
    }

    // 2. 标题闪烁
    if (document.hidden && this.config.flashTitleEnabled) {
      const mentionSuffix = isMentioned ? ' 🔔' : '';
      this.startTitleFlashing(`💬 来自 ${senderName}${mentionSuffix}`);
    }

    // 3. 系统通知
    if (this.config.desktopEnabled) {
      const title = isMentioned 
        ? `🔔 ${senderName} 提到了你`
        : `💬 ${senderName}`;
      
      const body = isMentioned
        ? `在 ${roomName} 中提到了你: ${trimmedContent}`
        : `${trimmedContent}`;
      
      this.showSystemNotification(title, body, () => {
        window.dispatchEvent(new CustomEvent('notification-click', {
          detail: { roomId: message.roomId }
        }));
      }, {
        tag: `message_${message.roomId}`,
        requireInteraction: isMentioned
      });
    }
  }

  // 页面可见性监听
  private initVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.stopTitleFlashing();
      }
    });
  }

  // 获取总未读数量
  getTotalUnreadCount(): number {
    let total = 0;
    for (const messages of this.unreadMessages.values()) {
      total += messages.length;
    }
    return total;
  }

  // 请求通知权限（用户主动触发）
  async requestPermission(): Promise<boolean> {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission === "granted";
      if (this.notificationPermission) {
        this.showSystemNotification(
          '通知已开启',
          '你将会收到新消息通知',
          undefined,
          { requireInteraction: false }
        );
      }
      return this.notificationPermission;
    }
    return false;
  }

  // 播放测试声音
  testSound() {
    this.playSound('notification');
    this.playBeep();
  }

  // 测试振动
  testVibration() {
    this.vibrate([200, 100, 200, 100, 200]);
  }
}

// 导出单例
export const notificationService = new NotificationService();