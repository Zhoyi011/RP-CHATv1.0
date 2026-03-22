// ========== 语音消息 ==========
export interface VoiceMessage {
  _id: string;
  userId: string;
  username: string;
  personaName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

// ========== 语音用户 ==========
export interface VoiceUser {
  userId: string;
  personaId: string;
  personaName: string;
  username: string;
  avatar?: string;
  muted: boolean;
  speaking: boolean;
  isCreator: boolean;
}

// ========== 语音房间 ==========
export interface VoiceRoom {
  _id: string;
  name: string;
  description: string;
  category: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  memberCount: number;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== 语音房间分类 ==========
export const VOICE_CATEGORIES = [
  { id: 'chat', name: '闲聊', icon: '💬', color: 'from-blue-500 to-cyan-500' },
  { id: 'music', name: '音乐', icon: '🎵', color: 'from-purple-500 to-pink-500' },
  { id: 'game', name: '游戏', icon: '🎮', color: 'from-green-500 to-emerald-500' },
  { id: 'study', name: '学习', icon: '📚', color: 'from-orange-500 to-red-500' },
  { id: 'rp', name: '角色扮演', icon: '🎭', color: 'from-indigo-500 to-purple-500' },
] as const;

export type VoiceCategory = typeof VOICE_CATEGORIES[number]['id'];

// ========== 辅助函数 ==========
// 获取分类图标
export const getCategoryIcon = (categoryId: string): string => {
  const cat = VOICE_CATEGORIES.find(c => c.id === categoryId);
  return cat?.icon || '🎙️';
};

// 获取分类名称
export const getCategoryName = (categoryId: string): string => {
  const cat = VOICE_CATEGORIES.find(c => c.id === categoryId);
  return cat?.name || '其他';
};

// 获取分类颜色
export const getCategoryColor = (categoryId: string): string => {
  const cat = VOICE_CATEGORIES.find(c => c.id === categoryId);
  return cat?.color || 'from-gray-500 to-gray-600';
};

// 获取分类信息
export const getCategoryInfo = (categoryId: string) => {
  return VOICE_CATEGORIES.find(c => c.id === categoryId) || VOICE_CATEGORIES[0];
};

// ========== 语音房间配置 ==========
export interface VoiceRoomConfig {
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
}

// ========== 语音活动检测配置 ==========
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

// ========== 音频质量配置 ==========
export interface AudioQualityConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export const defaultAudioQuality: AudioQualityConfig = {
  sampleRate: 48000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

// ========== 麦克风设备 ==========
export interface MicrophoneDevice {
  deviceId: string;
  label: string;
  groupId: string;
}