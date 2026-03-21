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
  private isInitializing = false;

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

  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    if (this.isInitializing) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.localStream) {
            clearInterval(check);
            resolve(this.localStream);
          }
        }, 100);
      });
    }
    
    this.isInitializing = true;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      this.startSpeakingDetection();
      return this.localStream;
    } catch (error) {
      console.error('获取麦克风失败:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  closeLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.stopSpeakingDetection();
  }

  setMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  isMuted(): boolean {
    if (!this.localStream) return true;
    const track = this.localStream.getAudioTracks()[0];
    return track ? !track.enabled : true;
  }

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
      const values = Array.from(dataArray);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
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

  setOnSpeakingChange(callback: (userId: string, isSpeaking: boolean) => void) {
    this.onSpeakingChange = callback;
  }

  createPeerConnection(userId: string, onTrack: (stream: MediaStream) => void): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.configuration);
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    
    pc.ontrack = (event) => {
      console.log('收到远程流:', userId);
      onTrack(event.streams[0]);
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate?.(userId, event.candidate);
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`连接状态变化 [${userId}]:`, pc.connectionState);
    };
    
    this.peerConnections.set(userId, pc);
    return pc;
  }

  onIceCandidate: ((userId: string, candidate: RTCIceCandidate) => void) | null = null;

  getPeerConnection(userId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(userId);
  }

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

  closeAllConnections() {
    this.peerConnections.forEach((pc) => {
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
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkSpeaking = () => {
      analyser.getByteFrequencyData(dataArray);
      const values = Array.from(dataArray);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
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

  setVolume(userId: string, volume: number) {
    const audioEl = this.audioElements.get(userId);
    if (audioEl) {
      audioEl.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getConnectedUsers(): string[] {
    return Array.from(this.peerConnections.keys());
  }
}

export const webRTCService = new WebRTCService();