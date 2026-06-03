// client/src/services/audioRecorderService.ts
// 支持 Web 和未来原生 APP 的统一录音服务

export interface AudioRecording {
  blob: Blob;
  duration: number;  // 秒
  url: string;       // 本地预览 URL（用于播放/上传）
}

export interface IAudioRecorder {
  start(): Promise<void>;
  stop(): Promise<AudioRecording>;
  cancel(): void;
  isRecording(): boolean;
  isSupported(): boolean;
  getDuration(): number;
}

// ========== Web 实现（当前）==========
class WebAudioRecorder implements IAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private duration: number = 0;
  private stream: MediaStream | null = null;
  private isRecordingFlag: boolean = false;

  // 兼容性最好的 MIME 类型（M4A/AAC）
  private getMimeType(): string {
    const types = [
      'audio/mp4;codecs=mp4a',  // Chrome/Firefox
      'audio/mp4',               // Safari 降级
      'audio/webm',              // WebM 备选
      'audio/webm;codecs=opus',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`✅ 使用录音格式: ${type}`);
        return type;
      }
    }
    return '';
  }

  async start(): Promise<void> {
    if (this.isRecordingFlag) {
      console.warn('已经在录音中');
      return;
    }

    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = this.getMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];
      this.startTime = Date.now();
      this.isRecordingFlag = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.duration = Math.round((Date.now() - this.startTime) / 1000);
        this.isRecordingFlag = false;
        // 清理音频轨道
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
      };

      this.mediaRecorder.start(100); // 每100ms收集一次数据
      console.log('🎙️ 开始录音');
    } catch (error) {
      console.error('录音失败:', error);
      throw new Error('无法获取麦克风权限');
    }
  }

  stop(): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecordingFlag) {
        reject(new Error('没有进行中的录音'));
        return;
      }

      const onStopHandler = () => {
        if (!this.mediaRecorder) return;
        this.mediaRecorder.removeEventListener('stop', onStopHandler);
        
        if (this.audioChunks.length === 0) {
          reject(new Error('录音数据为空'));
          return;
        }

        const blob = new Blob(this.audioChunks, { type: this.getMimeType() || 'audio/mp4' });
        const url = URL.createObjectURL(blob);
        
        resolve({
          blob,
          duration: this.duration,
          url,
        });
      };

      this.mediaRecorder.addEventListener('stop', onStopHandler);
      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.isRecordingFlag) {
      this.mediaRecorder.onstop = () => {
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
      };
      this.mediaRecorder.stop();
      this.isRecordingFlag = false;
      this.audioChunks = [];
    }
  }

  isRecording(): boolean {
    return this.isRecordingFlag;
  }

  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && MediaRecorder);
  }

  getDuration(): number {
    if (this.isRecordingFlag) {
      return Math.round((Date.now() - this.startTime) / 1000);
    }
    return this.duration;
  }
}

// 工厂函数：根据平台返回对应实现
export function createAudioRecorder(): IAudioRecorder {
  // 未来扩展：检测 Capacitor/Cordova 环境，返回原生实现
  // if (window.Capacitor?.isNativePlatform()) {
  //   return new NativeAudioRecorder();
  // }
  return new WebAudioRecorder();
}

// 导出默认实例
export const audioRecorder = createAudioRecorder();