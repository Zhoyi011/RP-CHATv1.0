// @ts-nocheck
// 跳过此文件的 TypeScript 类型检查，因为 Web Audio API 的类型定义有问题

// 格式化时长（秒 -> mm:ss）
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 获取音量级别（0-100）
export const getVolumeLevel = (analyser: AnalyserNode, dataArray: Uint8Array): number => {
  analyser.getByteFrequencyData(dataArray);
  const average = Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length;
  return Math.min(100, Math.floor((average / 255) * 100));
};

// 检测是否在说话（基于音量）
export const isSpeaking = (volumeLevel: number, threshold: number = 15): boolean => {
  return volumeLevel > threshold;
};

// 获取设备列表
export const getAudioDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch (error) {
    console.error('获取音频设备失败:', error);
    return [];
  }
};

// 获取当前使用的麦克风
export const getCurrentMic = async (): Promise<MediaDeviceInfo | null> => {
  const devices = await getAudioDevices();
  return devices[0] || null;
};

// 切换麦克风
export const switchMicrophone = async (
  deviceId: string,
  currentStream: MediaStream | null
): Promise<MediaStream | null> => {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } }
    });
    return newStream;
  } catch (error) {
    console.error('切换麦克风失败:', error);
    return null;
  }
};

// 检查麦克风权限
export const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    return false;
  }
};

// 生成唯一ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

// 语音活动检测配置
export interface VoiceActivityConfig {
  silenceDelay: number;
  voiceThreshold: number;
  minVoiceDuration: number;
}

export const defaultVoiceActivityConfig: VoiceActivityConfig = {
  silenceDelay: 500,
  voiceThreshold: 15,
  minVoiceDuration: 100
};

// 语音活动检测器类
export class VoiceActivityDetector {
  private isSpeakingState: boolean = false;
  private lastVoiceTime: number = 0;
  private speakingStartTime: number = 0;
  private onSpeakingChangeCallback: ((isSpeaking: boolean) => void) | null = null;
  private onVoiceStartCallback: (() => void) | null = null;
  private onVoiceEndCallback: (() => void) | null = null;
  private config: VoiceActivityConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  constructor(config: Partial<VoiceActivityConfig> = {}) {
    this.config = { ...defaultVoiceActivityConfig, ...config };
  }

  init(stream: MediaStream, audioContext: AudioContext) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  start() {
    if (!this.analyser || !this.dataArray) return;
    
    this.intervalId = setInterval(() => {
      this.detect();
    }, 100);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private detect() {
    if (!this.analyser || !this.dataArray) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    const average = Array.from(this.dataArray).reduce((a, b) => a + b, 0) / this.dataArray.length;
    const volumeLevel = (average / 255) * 100;
    const currentlySpeaking = volumeLevel > this.config.voiceThreshold;
    
    const now = Date.now();
    
    if (currentlySpeaking && !this.isSpeakingState) {
      this.isSpeakingState = true;
      this.speakingStartTime = now;
      this.lastVoiceTime = now;
      this.onSpeakingChangeCallback?.(true);
      this.onVoiceStartCallback?.();
    } else if (!currentlySpeaking && this.isSpeakingState) {
      if (now - this.lastVoiceTime > this.config.silenceDelay) {
        const duration = now - this.speakingStartTime;
        if (duration >= this.config.minVoiceDuration) {
          this.isSpeakingState = false;
          this.onSpeakingChangeCallback?.(false);
          this.onVoiceEndCallback?.();
        }
      }
    } else if (currentlySpeaking) {
      this.lastVoiceTime = now;
    }
  }

  onSpeakingChange(callback: (isSpeaking: boolean) => void) {
    this.onSpeakingChangeCallback = callback;
  }

  onVoiceStart(callback: () => void) {
    this.onVoiceStartCallback = callback;
  }

  onVoiceEnd(callback: () => void) {
    this.onVoiceEndCallback = callback;
  }

  getIsSpeaking(): boolean {
    return this.isSpeakingState;
  }

  destroy() {
    this.stop();
    this.analyser = null;
    this.dataArray = null;
  }
}

// 音频可视化数据
export interface AudioVisualData {
  frequency: number[];
  waveform: number[];
  volume: number;
}

export const getAudioVisualData = (
  analyser: AnalyserNode,
  dataArray: Uint8Array,
  waveformArray: Uint8Array
): AudioVisualData => {
  analyser.getByteFrequencyData(dataArray);
  analyser.getByteTimeDomainData(waveformArray);
  
  const frequency = Array.from(dataArray).map(v => v / 255);
  const waveform = Array.from(waveformArray).map(v => (v - 128) / 128);
  const volume = frequency.reduce((a, b) => a + b, 0) / frequency.length;
  
  return { frequency, waveform, volume };
};