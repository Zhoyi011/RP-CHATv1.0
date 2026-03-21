export interface PeerConnection {
  userId: string;
  pc: RTCPeerConnection;
  stream: MediaStream;
}

class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private speakingDetection: Map<string, ReturnType<typeof setInterval>> = new Map();
  private onSpeakingChange: ((userId: string, isSpeaking: boolean) => void) | null = null;

  // 配置
  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  // 获取本地麦克风流
  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      
      // 开始检测说话状态
      this.startSpeakingDetection();
      
      return this.localStream;
    } catch (error) {
      console.error('获取麦克风失败:', error);
      throw error;
    }
  }

  // 关闭本地麦克风
  closeLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.stopSpeakingDetection();
  }

  // 静音/取消静音本地麦克风
  setMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  // 获取静音状态
  isMuted(): boolean {
    if (!this.localStream) return true;
    const track = this.localStream.getAudioTracks()[0];
    return track ? !track.enabled : true;
  }

  // 检测说话状态
  private startSpeakingDetection() {
    if (!this.localStream) return;
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(this.localStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkSpeaking = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const isSpeaking = average > 20;
      
      if (this.onSpeakingChange) {
        this.onSpeakingChange('local', isSpeaking);
      }
    };
    
    const interval = setInterval(checkSpeaking, 100);
    this.speakingDetection.set('local', interval);
  }

  private stopSpeakingDetection() {
    this.speakingDetection.forEach((interval) => clearInterval(interval));
    this.speakingDetection.clear();
  }

  // 设置说话状态回调
  setOnSpeakingChange(callback: (userId: string, isSpeaking: boolean) => void) {
    this.onSpeakingChange = callback;
  }

  // 创建 PeerConnection
  createPeerConnection(userId: string, onTrack: (stream: MediaStream) => void): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.configuration);
    
    // 添加本地流
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    
    // 处理远程流
    pc.ontrack = (event) => {
      console.log('收到远程流:', userId);
      onTrack(event.streams[0]);
    };
    
    // ICE 候选
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate?.(userId, event.candidate);
      }
    };
    
    // 连接状态变化
    pc.onconnectionstatechange = () => {
      console.log(`连接状态变化 [${userId}]:`, pc.connectionState);
    };
    
    this.peerConnections.set(userId, pc);
    return pc;
  }

  // ICE 候选回调
  onIceCandidate: ((userId: string, candidate: RTCIceCandidate) => void) | null = null;

  // 获取 PeerConnection
  getPeerConnection(userId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(userId);
  }

  // 关闭 PeerConnection
  closePeerConnection(userId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    
    const audioEl = this.audioElements.get(userId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      this.audioElements.delete(userId);
    }
  }

  // 关闭所有连接
  closeAllConnections() {
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
    });
    this.peerConnections.clear();
    
    this.audioElements.forEach((audioEl) => {
      audioEl.pause();
      audioEl.srcObject = null;
    });
    this.audioElements.clear();
    
    this.closeLocalStream();
  }

  // 创建音频元素播放远程流
  createAudioElement(userId: string, stream: MediaStream): HTMLAudioElement {
    let audioEl = this.audioElements.get(userId);
    if (audioEl) {
      audioEl.srcObject = stream;
      audioEl.play();
      return audioEl;
    }
    
    audioEl = new Audio();
    audioEl.srcObject = stream;
    audioEl.autoplay = true;
    audioEl.volume = 1.0;
    
    // 检测远程用户的说话状态
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkSpeaking = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const isSpeaking = average > 15;
      
      if (this.onSpeakingChange) {
        this.onSpeakingChange(userId, isSpeaking);
      }
    };
    
    const interval = setInterval(checkSpeaking, 100);
    this.speakingDetection.set(userId, interval);
    
    this.audioElements.set(userId, audioEl);
    audioEl.play();
    
    return audioEl;
  }

  // 设置音量
  setVolume(userId: string, volume: number) {
    const audioEl = this.audioElements.get(userId);
    if (audioEl) {
      audioEl.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // 获取所有连接的用户ID
  getConnectedUsers(): string[] {
    return Array.from(this.peerConnections.keys());
  }
}

export const webRTCService = new WebRTCService();