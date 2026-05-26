// API 基础配置
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// 全局跳转标志，防止重复跳转
let isRedirecting = false;

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

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // 处理 401 未授权错误
    if (response.status === 401) {
      console.warn('⚠️ token 无效或已过期，正在跳转登录页...');
      
      localStorage.removeItem('token');
      localStorage.removeItem('lastUsedPersonaId');
      
      if (!isRedirecting && typeof window !== 'undefined') {
        isRedirecting = true;
        toast.error('登录已过期，请重新登录');
        setTimeout(() => {
          window.location.href = '/';
          isRedirecting = false;
        }, 1500);
      }
      
      throw new Error('登录已过期，请重新登录');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data as T;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('网络错误，请检查网络连接');
      toast.error('网络连接失败，请检查网络');
      throw new Error('网络连接失败');
    }
    throw error;
  }
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
  role: 'owner' | 'super_admin' | 'admin' | 'user';
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
  birthday?: string | null;
  zodiac?: string;
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

// ========== 消息类型 ==========
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
    // ✅ 头像框字段
    avatarFrame?: string | null;
    equipped?: {
      avatarFrame?: string | null;
    };
  };
  userId: {
    _id: string;
    firebaseUid?: string;
  };
  isRecalled?: boolean;
  isDeleted?: boolean;
  replyTo?: ReplyToInfo | null;
}

// ========== Persona 类型 ==========
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
    avatarFrameUrl?: string;
    avatarFrameId?: string;
  };
  // ✅ 头像框快捷字段
  avatarFrame?: string | null;
}

export interface ActivePersonaResponse {
  activePersona: {
    _id: string;
    userId: string;
    personaId: Persona;
  } | null;
}

// ========== 邀请码类型 ==========
export interface InviteCode {
  _id: string;
  code: string;
  type: 'user' | 'admin' | 'super_admin';
  createdBy: { username: string; role: string };
  usedBy?: { username: string; email: string };
  usedAt?: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  maxUses: number;
  usesCount: number;
}

export interface CreateInviteResponse {
  message: string;
  code: string;
  type: 'user' | 'admin' | 'super_admin';
  expiresAt: string;
  maxUses?: number;
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
    
  getMessagesWithLimit: (roomId: string, limit = 50, before?: string) =>
    request<Message[]>(`/room/${roomId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`),
    
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
    
  recallMessage: (messageId: string) =>
    request<{ success: boolean }>('/room/message/recall', {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    }),
    
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
  
  updateUserRole: (userId: string, role: 'user' | 'admin' | 'super_admin') =>
    request<{ message: string; user: User }>(`/auth/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  
  getInviteCodes: () => request<InviteCode[]>('/auth/admin/invite-codes'),
  
  generateInviteCode: (customCode?: string, type?: 'user' | 'admin' | 'super_admin', maxUses?: number, expiresInDays?: number) =>
    request<CreateInviteResponse>('/auth/admin/create-invite', {
      method: 'POST',
      body: JSON.stringify({ customCode, type: type || 'user', maxUses, expiresInDays }),
    }),
    
  deleteInviteCode: (codeId: string) =>
    request<{ message: string }>(`/auth/admin/invite-codes/${codeId}`, {
      method: 'DELETE',
    }),
};

// ========== 充值码 API ==========
export interface RedeemCode {
  _id: string;
  code: string;
  diamondAmount: number;
  createdBy: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  usedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  isUsed: boolean;
  usedAt?: string;
  expiresAt: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  isExpired?: boolean;
  isAvailable?: boolean;
}

export interface RedeemCodeListResponse {
  success: boolean;
  data: {
    codes: RedeemCode[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface CreateRedeemCodeRequest {
  diamondAmount: number;
  customCode?: string;
  note?: string;
  presetAmount?: number;
}

export interface CreateRedeemCodeResponse {
  success: boolean;
  message: string;
  data: {
    code: string;
    diamondAmount: number;
    expiresAt: string;
    note: string;
    createdAt: string;
  };
}

export interface BatchCreateRedeemCodeRequest {
  diamondAmount: number;
  count: number;
  note?: string;
}

export interface BatchCreateRedeemCodeResponse {
  success: boolean;
  message: string;
  data: {
    created: number;
    failed: number;
    codes: Array<{
      code: string;
      diamondAmount: number;
      expiresAt: string;
    }>;
    errors?: Array<{ index: number; error: string }>;
  };
}

export interface UseRedeemCodeResponse {
  success: boolean;
  message: string;
  data: {
    diamondAmount: number;
    newBalance: number;
  };
}

export interface RedemptionRecord {
  _id: string;
  userId: string;
  redeemCodeId: {
    _id: string;
    code: string;
    diamondAmount: number;
    createdBy: string;
    note: string;
  };
  code: string;
  diamondAmount: number;
  previousBalance: number;
  newBalance: number;
  usedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RedemptionHistoryResponse {
  success: boolean;
  data: {
    records: RedemptionRecord[];
    totalDiamondsReceived: number;
  };
}

export interface RedeemStatsResponse {
  success: boolean;
  data: {
    totalCodes: number;
    usedCodes: number;
    unusedCodes: number;
    expiredCodes: number;
    totalDiamondsGiven: number;
    usedDiamondsGiven: number;
  };
}

export interface CheckRedeemCodeResponse {
  valid: boolean;
  error?: string;
  data?: {
    diamondAmount: number;
    expiresAt: string;
  };
}

export const redeemApi = {
  /**
   * 创建充值码（仅 super_admin/owner）
   */
  create: (data: CreateRedeemCodeRequest): Promise<CreateRedeemCodeResponse> =>
    request('/redeem/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 批量创建充值码（仅 super_admin/owner）
   */
  batchCreate: (data: BatchCreateRedeemCodeRequest): Promise<BatchCreateRedeemCodeResponse> =>
    request('/redeem/batch-create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 获取充值码列表（仅 super_admin/owner）
   * @param page 页码
   * @param limit 每页数量
   * @param filters 筛选条件 { isUsed?: boolean, isExpired?: boolean }
   */
  getList: (page = 1, limit = 20, filters?: { isUsed?: boolean; isExpired?: boolean }): Promise<RedeemCodeListResponse> => {
    let url = `/redeem/list?page=${page}&limit=${limit}`;
    if (filters?.isUsed !== undefined) url += `&isUsed=${filters.isUsed}`;
    if (filters?.isExpired !== undefined) url += `&isExpired=${filters.isExpired}`;
    return request(url);
  },

  /**
   * 删除充值码（仅 super_admin/owner）
   */
  delete: (codeId: string): Promise<{ success: boolean; message: string }> =>
    request(`/redeem/${codeId}`, {
      method: 'DELETE',
    }),

  /**
   * 使用充值码（普通用户）
   */
  use: (code: string): Promise<UseRedeemCodeResponse> =>
    request('/redeem/use', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  /**
   * 获取当前用户的充值记录
   */
  getHistory: (limit = 20): Promise<RedemptionHistoryResponse> =>
    request(`/redeem/history?limit=${limit}`),

  /**
   * 获取充值统计（仅 super_admin/owner）
   */
  getStats: (): Promise<RedeemStatsResponse> =>
    request('/redeem/stats'),

  /**
   * 检查充值码有效性（不消耗）
   */
  check: (code: string): Promise<CheckRedeemCodeResponse> =>
    request(`/redeem/check/${encodeURIComponent(code)}`),
};