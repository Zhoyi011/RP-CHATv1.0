// API 基础配置 - 统一使用你的后端地址
const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// 获取存储的 token
const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// 通用请求函数
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
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data as T;
}

// ========== 认证相关 ==========
export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: 'owner' | 'admin' | 'user';
    hasAccess: boolean;
    coins?: number;
  };
  needsInvite?: boolean;
}

export interface RegisterData {
  username: string;
  password: string;
  inviteCode: string;
}

export interface InviteCodeResponse {
  message: string;
  code: string;
  expiresAt: string;
}

// ========== 用户相关 ==========
export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'user';
  status: 'active' | 'banned' | 'muted' | 'online' | 'away';
  hasAccess: boolean;
  coins: number;
  avatar?: string;
  displayName?: string;
  createdAt: string;
  lastLogin?: string;
  loginStreak?: number;
  equippedItems?: {
    avatarFrame?: string;
    ring?: string;
    relationshipCard?: string;
  };
}

export interface UserStats {
  totalMessages: number;
  totalRooms: number;
  totalPersonas: number;
  joinDays: number;
  loginStreak: number;
  coins: number;
}

export interface InventoryItem {
  _id: string;
  itemId: string;
  itemType: 'avatar_frame' | 'ring' | 'relationship_card' | 'other';
  name: string;
  description?: string;
  quantity: number;
  equipped: boolean;
  acquiredAt: string;
}

export interface Achievement {
  _id: string;
  name: string;
  description: string;
  progress: number;
  total: number;
  completed: boolean;
  completedAt?: string;
}

export const authApi = {
  register: (data: RegisterData) => 
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
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
  getUserStats: () =>
    request<UserStats>('/user/stats'),
  getInventory: () =>
    request<InventoryItem[]>('/user/inventory'),
  getAchievements: () =>
    request<Achievement[]>('/user/achievements'),
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
  generateInviteCode: (customCode?: string) =>
    request<{ code: string }>('/auth/admin/create-invite', {
      method: 'POST',
      body: JSON.stringify({ customCode }),
    }),
  deleteInviteCode: (codeId: string) =>
    request<{ message: string }>(`/auth/admin/invite-codes/${codeId}`, {
      method: 'DELETE',
    }),
};

// ========== 角色相关 ==========
export interface Persona {
  _id: string;
  name: string;
  displayName?: string;
  description: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: {
    _id: string;
    username: string;
  };
  reviewComment?: string;
  globalNumber?: number;
  usageCount?: number;
  viewCount?: number;
  likeCount?: number;
  postsCount?: number;
  avatar?: string;
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
    request<{ message: string }>(`/persona/${personaId}/posts/${postId}/like`, {
      method: 'POST',
    }),
};

// ========== 聊天室相关 ==========
export interface Room {
  _id: string;
  name: string;
  description?: string;
  messageCount: number;
  onlineCount?: number;
  unreadCount?: number;
  createdAt: string;
}

export interface Message {
  _id: string;
  content: string;
  isAction: boolean;
  createdAt: string;
  roomId: string | { _id: string; name: string };
  personaId: {
    _id: string;
    name: string;
    avatar?: string;
  };
  userId: {
    _id: string;
    username: string;
    email?: string;
    firebaseUid?: string;
    avatar?: string;
  };
}

export interface ActivePersonaResponse {
  activePersona: {
    _id: string;
    userId: string;
    personaId: Persona;
  } | null;
}

export const roomApi = {
  getRooms: () => request<Room[]>('/room/list'),
  createRoom: (name: string, description?: string) =>
    request<{ message: string; room: Room }>('/room/create', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  getMessages: (roomId: string) =>
    request<Message[]>(`/room/${roomId}/messages`),
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
};