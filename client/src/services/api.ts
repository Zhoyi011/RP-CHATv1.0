// API 基础配置
const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // 允许携带 cookie
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data as T;
}

// ========== 类型定义 ==========
export interface LoginResponse {
  message: string;
  token: string;
  user: User;
  needsInvite?: boolean;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'user';
  status: 'active' | 'banned' | 'muted' | 'online' | 'away';
  hasAccess: boolean;
  coins: number;
  diamonds: number;
  theme: string;
  notifications: boolean;
  soundEnabled: boolean;
  defaultTranslate: string;
  createdAt: string;
  lastLogin?: string;
  loginStreak?: number;
  dailyDiamondStreak?: number;
  equippedItems?: {
    avatarFrame?: string;
    ring?: string;
    relationshipCard?: string;
  };
  stats?: {
    totalMessages: number;
    totalRooms: number;
    totalPersonas: number;
  };
  birthday?: string | null;
  zodiac?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  soundEnabled: boolean;
  defaultTranslate: 'off' | 'simplified' | 'traditional';
}

export interface Room {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  announcement?: string;
  createdBy?: string;
  creatorUserId?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt?: string;
  isPublic?: boolean;
  requireApproval?: boolean;
  isActive?: boolean;
  messageCount?: number;
  unreadCount?: number;
  memberCount?: number;
  onlineCount?: number;
  inviteCode?: string;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
    isAction: boolean;
    isRecalled: boolean;
  };
}

// ========== 回复消息类型 ==========
export interface ReplyToInfo {
  _id: string;
  content: string;
  isRecalled: boolean;
  isDeleted: boolean;
}

// ========== 消息类型（完整版）==========
export interface Message {
  _id: string;
  content: string;
  isAction: boolean;
  createdAt: string;
  roomId: string | { _id: string; name: string };
  personaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
    sameNameNumber?: number;
  };
  userId: {
    _id: string;
    firebaseUid?: string;
  };
  isRecalled?: boolean;
  isDeleted?: boolean;
  replyTo?: ReplyToInfo | null;
}

export interface Persona {
  _id: string;
  name: string;
  displayName?: string;
  description: string;
  avatar?: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  globalNumber?: number;
  sameNameNumber?: number;
  userId?: string;
  usageCount?: number;
  viewCount?: number;
  likeCount?: number;
  postsCount?: number;
  createdBy: {
    _id: string;
    username: string;
  };
  createdAt: string;
  homepage?: {
    background?: string;
    intro?: string;
    social?: {
      wechat?: string;
      discord?: string;
    };
  };
  guardians?: Array<{
    userId: { _id: string; username: string; avatar?: string };
    amount: number;
    createdAt: string;
  }>;
  totalGuardianAmount?: number;
  relationships?: Array<{
    targetPersonaId: Persona;
    type: 'friend' | 'couple' | 'soulmate' | 'master' | 'apprentice';
    cardId?: string;
    createdAt: string;
  }>;
  equipped?: {
    avatarFrame?: string;
    ring?: string;
    relationshipCard?: string;
  };
}

export interface ActivePersonaResponse {
  activePersona: {
    _id: string;
    userId: string;
    personaId: Persona;
  } | null;
}

// ========== 认证 API ==========
export const authApi = {
  register: (username: string, password: string, inviteCode: string) => 
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, inviteCode }),
    }),
    
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
    
  bindFirebaseUser: (firebaseUid: string, email: string, displayName: string) =>
    request<LoginResponse>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ firebaseUid, email, displayName }),
    }),
    
  verifyInvite: (inviteCode: string, firebaseUid: string) =>
    request<LoginResponse>('/auth/verify-invite', {
      method: 'POST',
      body: JSON.stringify({ inviteCode, firebaseUid }),
    }),
    
  getCurrentUser: () =>
    request<User>('/auth/me'),
    
  getSettings: () =>
    request<UserSettings>('/auth/settings'),
    
  updateSettings: (settings: Partial<UserSettings>) =>
    request<{ message: string; user: User }>('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};

// ========== 角色 API ==========
export const personaApi = {
  getMyPersonas: () => request<Persona[]>('/persona/my'),
  
  createRequest: (data: { name: string; description: string; tags: string[] }) =>
    request<{ message: string; persona: Persona }>('/persona/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  getPending: () => request<Persona[]>('/persona/pending'),
  
  reviewPersona: (id: string, status: 'approved' | 'rejected', comment?: string) =>
    request<{ message: string; persona: Persona }>(`/persona/review/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status, comment }),
    }),
    
  searchPersonas: (q: string, page = 1, limit = 20) =>
    request<{ personas: Persona[]; total: number; page: number; totalPages: number }>(
      `/persona/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`
    ),
    
  getPersonaDetail: (personaId: string) =>
    request<Persona>(`/persona/${personaId}`),
    
  usePersona: (personaId: string) =>
    request<{ message: string; persona: Persona }>(`/persona/${personaId}/use`, {
      method: 'POST',
    }),
    
  addGuardian: (personaId: string, amount: number) =>
    request<{ message: string; totalGuardianAmount: number }>(`/persona/${personaId}/guardian`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
    
  addPost: (personaId: string, content: string, images?: string[]) =>
    request<{ message: string; posts: any[] }>(`/persona/${personaId}/post`, {
      method: 'POST',
      body: JSON.stringify({ content, images }),
    }),
    
  getPosts: (personaId: string, page = 1, limit = 20) =>
    request<{ posts: any[]; total: number; page: number; totalPages: number }>(
      `/persona/${personaId}/posts?page=${page}&limit=${limit}`
    ),
  likePost: (personaId: string, postId: string) =>
  request<{ message: string; isLiked: boolean; likeCount: number }>(`/persona/${personaId}/posts/${postId}/like`, {
    method: 'POST',
  }),
};

// ========== 聊天室 API ==========
export const roomApi = {
  getRooms: () => request<Room[]>('/room/list'),
  
  createRoom: (name: string, description?: string) =>
    request<{ message: string; room: Room }>('/room/create', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
    
  getMessages: (roomId: string) =>
    request<Message[]>(`/room/${roomId}/messages`),
    
  // 获取消息（支持分页）
  getMessagesWithLimit: (roomId: string, limit = 50, before?: string) =>
    request<Message[]>(`/room/${roomId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`),
    
  // 发送消息（支持回复）
  sendMessageWithReply: (roomId: string, content: string, personaId: string, replyToId?: string) =>
    request<{ success: boolean; message: any }>(`/room/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, personaId, replyToId }),
    }),
    
  setActivePersona: (personaId: string) =>
    request<{ message: string; activePersona: any }>('/room/active-persona', {
      method: 'POST',
      body: JSON.stringify({ personaId }),
    }),
    
  getActivePersona: () =>
    request<ActivePersonaResponse>('/room/active-persona'),
    
  getUnreadCount: (roomId: string) =>
    request<{ unreadCount: number }>(`/room/${roomId}/unread`),
    
  markRead: (roomId: string) =>
    request<{ message: string }>(`/room/${roomId}/mark-read`, {
      method: 'POST',
    }),
    
  // 撤回消息
  recallMessage: (messageId: string) =>
    request<{ success: boolean }>('/room/message/recall', {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    }),
    
  // 删除消息（软删除，仅自己不可见）
  deleteMessage: (messageId: string) =>
    request<{ success: boolean }>('/room/message/delete', {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    }),
};

// ========== 管理员 API ==========
export const adminApi = {
  getUsers: () => request<User[]>('/auth/admin/users'),
  
  updateUserStatus: (userId: string, status: 'active' | 'banned' | 'muted') =>
    request<{ message: string; user: User }>(`/auth/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
    
  getInviteCodes: () => request<any[]>('/auth/admin/invite-codes'),
  
  generateInviteCode: (customCode?: string, type?: 'user' | 'admin') =>
  request<{ message: string; code: string; type: string; expiresAt: string }>('/auth/admin/create-invite', {
    method: 'POST',
    body: JSON.stringify({ customCode, type: type || 'user' }),
  }),
    
  deleteInviteCode: (codeId: string) =>
    request<{ message: string }>(`/auth/admin/invite-codes/${codeId}`, {
      method: 'DELETE',
    }),
};