// @ts-ignore - 忽略 Agora SDK 类型声明问题
import AgoraRTC from 'agora-rtc-sdk-ng';

class AgoraService {
  private client: any = null;
  private localAudioTrack: any = null;
  private remoteUsers: Map<any, any> = new Map();
  private isJoined = false;
  private onUserJoinedCallback: ((uid: any) => void) | null = null;
  private onUserLeftCallback: ((uid: any) => void) | null = null;

  async init(appId: string) {
    AgoraRTC.setLogLevel(0);
    this.client = AgoraRTC.createClient({ 
      mode: 'rtc', 
      codec: 'vp8',
      role: 'host'
    });
    
    this.client.on('user-joined', async (user: any) => {
      console.log('👤 用户加入:', user.uid);
      await this.client?.subscribe(user, 'audio');
      const remoteAudioTrack = user.audioTrack;
      if (remoteAudioTrack) {
        this.remoteUsers.set(user.uid, remoteAudioTrack);
        remoteAudioTrack.play();
        this.onUserJoinedCallback?.(user.uid);
      }
    });
    
    this.client.on('user-left', (user: any) => {
      console.log('👋 用户离开:', user.uid);
      this.remoteUsers.delete(user.uid);
      this.onUserLeftCallback?.(user.uid);
    });
    
    this.client.on('user-published', async (user: any, mediaType: string) => {
      if (mediaType === 'audio') {
        await this.client?.subscribe(user, mediaType);
        const remoteAudioTrack = user.audioTrack;
        if (remoteAudioTrack) {
          this.remoteUsers.set(user.uid, remoteAudioTrack);
          remoteAudioTrack.play();
        }
      }
    });
  }

  async joinChannel(appId: string, channelName: string, token: string | null, uid: string) {
    if (!this.client) return false;
    if (this.isJoined) return true;
    
    try {
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
      });
      
      await this.client.join(appId, channelName, token, uid);
      await this.client.publish(this.localAudioTrack);
      
      this.isJoined = true;
      console.log('✅ 已加入 Agora 语音频道:', channelName);
      return true;
    } catch (error) {
      console.error('加入 Agora 频道失败:', error);
      return false;
    }
  }

  async leaveChannel() {
    if (!this.client) return;
    
    if (this.localAudioTrack) {
      this.localAudioTrack.close();
      this.localAudioTrack = null;
    }
    
    await this.client.leave();
    this.isJoined = false;
    this.remoteUsers.clear();
    console.log('🔌 已离开 Agora 语音频道');
  }

  setMute(muted: boolean) {
    if (this.localAudioTrack) {
      this.localAudioTrack.setEnabled(!muted);
    }
  }

  isMuted(): boolean {
    return this.localAudioTrack ? !this.localAudioTrack.enabled : true;
  }

  getRemoteUserCount(): number {
    return this.remoteUsers.size;
  }

  onUserJoined(callback: (uid: any) => void) {
    this.onUserJoinedCallback = callback;
  }

  onUserLeft(callback: (uid: any) => void) {
    this.onUserLeftCallback = callback;
  }

  destroy() {
    if (this.localAudioTrack) {
      this.localAudioTrack.close();
    }
    if (this.client) {
      this.client.removeAllListeners();
    }
  }
}

export const agoraService = new AgoraService();