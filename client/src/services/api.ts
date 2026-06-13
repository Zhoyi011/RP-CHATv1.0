// client/src/services/api.ts
// API 基础配置
import toast from 'react-hot-toast';

// 可靠的环境检测：根据 hostname 判断
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev ? 'https://rp-chatv1-0.onrender.com/api' : '/api';

console.log('🔧 [API] 环境:', isDev ? '开发环境' : '生产环境', 'API_BASE:', API_BASE);

// ========== 全局变量 ==========
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (reason?: any) => void }> = [];
let isRedirecting = false;
let redirectTimer: ReturnType<typeof setTimeout> | null = null;

// ========== 辅助函数 ==========
const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// 判断是否在登录页或注册页
const isAuthPage = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/' || path === '/login' || path === '/register' || path === '/invite';
};

// 处理队列中的请求
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 刷新 token 的函数
const refreshToken = async (): Promise<string> => {
  const oldToken = localStorage.getItem('token');
  if (!oldToken) {
    throw new Error('No token to refresh');
  }
  
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${oldToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Token refresh failed');
  }
  
  const data = await response.json();
  const newToken = data.token;
  localStorage.setItem('token', newToken);
  return newToken;
};

// ========== 核心请求函数 ==========
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const token = getToken();
  const maxRetries = 2;
  
  // 为 GET 请求添加时间戳参数，彻底防止缓存
  const method = options.method || 'GET';
  let finalEndpoint = endpoint;
  
  if (method === 'GET') {
    const timestamp = Date.now();
    const separator = endpoint.includes('?') ? '&' : '?';
    finalEndpoint = `${endpoint}${separator}_t=${timestamp}`;
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const fullUrl = `${API_BASE}${finalEndpoint}`;
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      mode: 'cors',
    });

    // 处理 401 未授权错误
    if (response.status === 401) {
      console.warn('⚠️ token 无效或已过期', endpoint);
      
      // 如果是刷新 token 接口本身失败，不再重试
      const isRefreshRequest = endpoint.includes('/auth/refresh');
      
      if (!isRefreshRequest && !isRefreshing && retryCount < maxRetries) {
        isRefreshing = true;
        
        try {
          const newToken = await refreshToken();
          processQueue(null, newToken);
          
          // 用新 token 重试原请求
          const newHeaders = {
            ...headers,
            'Authorization': `Bearer ${newToken}`
          };
          
          const retryResponse = await fetch(fullUrl, {
            ...options,
            headers: newHeaders,
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Request failed with status ${retryResponse.status}`);
          }
          
          const retryData = await retryResponse.json();
          isRefreshing = false;
          return retryData as T;
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          isRefreshing = false;
          
          // 刷新失败，清除本地存储并跳转
          localStorage.removeItem('token');
          localStorage.removeItem('lastUsedPersonaId');
          
          if (!isAuthPage() && !isRedirecting) {
            isRedirecting = true;
            toast.error('登录已过期，请重新登录');
            if (redirectTimer) clearTimeout(redirectTimer);
            redirectTimer = setTimeout(() => {
              window.location.href = '/';
              isRedirecting = false;
              redirectTimer = null;
            }, 1500);
          }
          
          throw new Error('登录已过期，请重新登录');
        }
      } else if (isRefreshing) {
        // 正在刷新中，等待队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(async (newToken) => {
          const newHeaders = {
            ...headers,
            'Authorization': `Bearer ${newToken}`
          };
          const retryResponse = await fetch(fullUrl, {
            ...options,
            headers: newHeaders,
          });
          const retryData = await retryResponse.json();
          return retryData as T;
        });
      } else {
        // 刷新失败或已达重试上限
        localStorage.removeItem('token');
        localStorage.removeItem('lastUsedPersonaId');
        
        if (!isAuthPage() && !isRedirecting) {
          isRedirecting = true;
          toast.error('登录已过期，请重新登录');
          if (redirectTimer) clearTimeout(redirectTimer);
          redirectTimer = setTimeout(() => {
            window.location.href = '/';
            isRedirecting = false;
            redirectTimer = null;
          }, 1500);
        }
        
        throw new Error('登录已过期，请重新登录');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data as T;
  } catch (error) {
    console.error('❌ [API] 错误:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      toast.error('网络连接失败，请检查网络');
      throw new Error('网络连接失败');
    }
    throw error;
  }
}

// ========== 上传 API（包含音频） ==========
export const uploadApi = {
  uploadUserAvatar: (file: File): Promise<{ success: boolean; avatar: string; message: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = getToken();
    
    return fetch(`${API_BASE}/upload/user`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      return data;
    });
  },

  deleteUserAvatar: (): Promise<{ success: boolean; message: string }> => {
    const token = getToken();
    return fetch(`${API_BASE}/upload/user`, {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      return data;
    });
  },

  uploadPersonaAvatar: (personaId: string, file: File): Promise<{ success: boolean; avatar: string; message: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = getToken();
    
    return fetch(`${API_BASE}/upload/persona/${personaId}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      return data;
    });
  },

  deletePersonaAvatar: (personaId: string): Promise<{ success: boolean; message: string }> => {
    const token = getToken();
    return fetch(`${API_BASE}/upload/persona/${personaId}`, {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      return data;
    });
  },

  uploadAudio: async (audioBlob: Blob): Promise<{ success: boolean; url: string; message: string }> => {
    const formData = new FormData();
    const fileName = `voice_${Date.now()}.mp3`;
    const file = new File([audioBlob], fileName, { type: 'audio/mpeg' });
    formData.append('audio', file);
    
    const token = getToken();
    
    const response = await fetch(`${API_BASE}/upload/audio`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '音频上传失败');
    }
    
    return data;
  },

  deleteAudio: async (audioUrl: string): Promise<{ success: boolean; message: string }> => {
    const token = getToken();
    const response = await fetch(`${API_BASE}/upload/audio`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ url: audioUrl }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '删除失败');
    }
    return data;
  },
};

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
  paidDiamonds?: number;
  freeDiamonds?: number;
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

export interface ReplyToInfo {
  _id: string;
  content: string;
  isRecalled: boolean;
  isDeleted: boolean;
}

export interface Message {
  _id: string;
  content: string;
  isAction: boolean;
  isPat?: boolean;
  isAudio?: boolean;
  audioUrl?: string;
  audioDuration?: number;
  isEmoji?: boolean;
  emojiId?: string;
  emojiUrl?: string;
  createdAt: string;
  roomId: string | { _id: string; name: string };
  personaId: {
    _id: string;
    name: string;
    displayName: string;
    avatar?: string;
    sameNameNumber?: number;
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
  avatarFrame?: string | null;
  // 🆕 作者相关字段
  isAuthor?: boolean;
  authorApprovedAt?: string;
  novelSlots?: number;
  createdNovelCount?: number;
  followersCount?: number;
  totalDonationIncome?: number;
}

export interface ActivePersonaResponse {
  activePersona: {
    _id: string;
    userId: string;
    personaId: Persona;
  } | null;
}

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

export interface Post {
  _id: string;
  content: string;
  images?: string[];
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  personaId?: {
    _id: string;
    name: string;
    displayName?: string;
    avatar?: string;
  };
  likes: string[];
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
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
    
  refreshToken: () =>
    request<{ success: boolean; token: string; user: User }>('/auth/refresh', {
      method: 'POST',
    }),
};

// ========== 角色 API ==========
export const personaApi = {
  getMyPersonas: () => request<Persona[]>('/persona/my'),
  
  createRequest: (data: { name: string; description: string; tags: string[]; avatar: string }) =>
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
    request<{ messages: Message[]; hasMore: boolean }>(`/room/${roomId}/messages?limit=${limit}${before ? `&before=${before}` : ''}`),
    
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
  create: (data: CreateRedeemCodeRequest): Promise<CreateRedeemCodeResponse> =>
    request('/redeem/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  batchCreate: (data: BatchCreateRedeemCodeRequest): Promise<BatchCreateRedeemCodeResponse> =>
    request('/redeem/batch-create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getList: (page = 1, limit = 20, filters?: { isUsed?: boolean; isExpired?: boolean }): Promise<RedeemCodeListResponse> => {
    let url = `/redeem/list?page=${page}&limit=${limit}`;
    if (filters?.isUsed !== undefined) url += `&isUsed=${filters.isUsed}`;
    if (filters?.isExpired !== undefined) url += `&isExpired=${filters.isExpired}`;
    return request(url);
  },

  delete: (codeId: string): Promise<{ success: boolean; message: string }> =>
    request(`/redeem/${codeId}`, {
      method: 'DELETE',
    }),

  use: (code: string): Promise<UseRedeemCodeResponse> =>
    request('/redeem/use', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getHistory: (limit = 20): Promise<RedemptionHistoryResponse> =>
    request(`/redeem/history?limit=${limit}`),

  getStats: (): Promise<RedeemStatsResponse> =>
    request('/redeem/stats'),

  check: (code: string): Promise<CheckRedeemCodeResponse> =>
    request(`/redeem/check/${encodeURIComponent(code)}`),
};

// ========== 翻译 API ==========
export const translateApi = {
  s2t: (text: string): Promise<{ result: string }> =>
    request('/translate/s2t', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  t2s: (text: string): Promise<{ result: string }> =>
    request('/translate/t2s', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  convert: (text: string): Promise<{ result: string }> =>
    request('/translate/convert', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  lang: (text: string, targetLang: string): Promise<{ result: string; original: string; targetLang: string }> =>
    request('/translate/lang', {
      method: 'POST',
      body: JSON.stringify({ text, targetLang }),
    }),
};

// ========== AI 建议 API ==========
export interface AISuggestRequest {
  roomId?: string;
  messages?: Array<{
    role: 'user' | 'ai' | 'other';
    content: string;
    personaName?: string;
  }>;
  context?: Record<string, any>;
}

export interface AISuggestResponse {
  success: boolean;
  suggestion: string;
  messageCount: number;
}

export interface AIStatusResponse {
  provider: string;
  models: {
    primary: string;
    fallbacks: string[];
  };
  limits: Record<string, { rpm: number; tpm: number }>;
  status: 'ready' | 'missing_api_key';
  message: string;
}

export const aiApi = {
  getSuggest: (roomId?: string, messages?: AISuggestRequest['messages'], context?: Record<string, any>) =>
    request<AISuggestResponse>('/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ roomId, messages, context }),
    }),
    
  getAIStatus: () =>
    request<AIStatusResponse>('/ai/status'),
};

// ========== 小说 API ==========
import type { Novel, Chapter, Comment, Favorite, FollowAuthor, AuthorApplication } from '../types/novel';

export interface NovelListResponse {
  novels: Novel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface NovelDetailResponse {
  novel: Novel;
  chapters: Pick<Chapter, '_id' | 'chapterNumber' | 'title' | 'wordCount' | 'createdAt'>[];
  stats: {
    favoriteCount: number;
    followCount: number;
    commentCount: number;
    donationTotal: number;
  };
}

export interface ChapterContentResponse {
  chapter: Chapter;
  prev: Pick<Chapter, '_id' | 'chapterNumber' | 'title'> | null;
  next: Pick<Chapter, '_id' | 'chapterNumber' | 'title'> | null;
}

export const novelApi = {
  // ========== 公开接口 ==========
  getNovels: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    search?: string;
    sort?: string;
    authorId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.category && params.category !== '全部') queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.authorId) queryParams.append('authorId', params.authorId);
    const queryString = queryParams.toString();
    const endpoint = `/novel${queryString ? `?${queryString}` : ''}`;
    return request<NovelListResponse>(endpoint);
  },
  
  getNovelDetail: (novelId: string) => request<NovelDetailResponse>(`/novel/${novelId}`),
  
  getChapter: (novelId: string, chapterId: string) => request<ChapterContentResponse>(`/novel/${novelId}/chapter/${chapterId}`),
  
  getComments: (novelId: string, page?: number, limit?: number) => {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', String(page));
    if (limit) queryParams.append('limit', String(limit));
    const queryString = queryParams.toString();
    const endpoint = `/novel/${novelId}/comments${queryString ? `?${queryString}` : ''}`;
    return request<{ comments: Comment[]; pagination: any }>(endpoint);
  },
  
  // ========== 需要登录 ==========
  applyAuthor: (personaId: string) =>
    request<{ success: boolean; message: string; application: AuthorApplication }>('/novel/apply-author', {
      method: 'POST',
      body: JSON.stringify({ personaId }),
    }),
  
  getMyApplication: (personaId: string) =>
    request<{ application: AuthorApplication | null }>(`/novel/my-application?personaId=${personaId}`),
  
  toggleFavorite: (novelId: string, personaId: string) =>
    request<{ success: boolean; action: 'added' | 'removed'; message: string }>(`/novel/favorite/${novelId}`, {
      method: 'POST',
      body: JSON.stringify({ personaId }),
    }),
  
  getMyFavorites: (personaId: string) =>
    request<{ favorites: Favorite[] }>(`/novel/my/favorites?personaId=${personaId}`),
  
  toggleFollow: (authorPersonaId: string, personaId: string) =>
    request<{ success: boolean; action: 'followed' | 'unfollowed'; message: string }>(`/novel/follow/${authorPersonaId}`, {
      method: 'POST',
      body: JSON.stringify({ personaId }),
    }),
  
  getMyFollows: (personaId: string) =>
    request<{ follows: FollowAuthor[] }>(`/novel/my/follows?personaId=${personaId}`),
  
  addComment: (novelId: string, content: string, chapterId?: string, parentCommentId?: string) =>
    request<{ success: boolean; comment: Comment }>(`/novel/comment/${novelId}`, {
      method: 'POST',
      body: JSON.stringify({ content, chapterId, parentCommentId }),
    }),
  
  likeComment: (commentId: string) =>
    request<{ success: boolean; likes: number; hasLiked: boolean }>(`/novel/comment/${commentId}/like`, {
      method: 'POST',
    }),
  
  donate: (novelId: string, diamondAmount: number, message?: string) =>
    request<{ success: boolean; message: string; newBalance: number }>(`/novel/donate/${novelId}`, {
      method: 'POST',
      body: JSON.stringify({ diamondAmount, message }),
    }),
  
  // ========== 作者接口 ==========
  getMyNovels: (personaId: string) =>
    request<{ novels: Novel[]; novelSlots: number; createdNovelCount: number; remainingSlots: number }>(
      `/novel/author/my-novels?personaId=${personaId}`
    ),
  
  createNovel: (data: { personaId: string; title: string; description: string; category: string; tags?: string[]; cover?: string }) =>
    request<{ success: boolean; message: string; novel: Novel }>('/novel/author/novel', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateNovel: (novelId: string, data: Partial<{ title: string; description: string; category: string; tags: string[]; cover: string; status: string }>) =>
    request<{ success: boolean; message: string; novel: Novel }>(`/novel/author/novel/${novelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteNovel: (novelId: string) =>
    request<{ success: boolean; message: string }>(`/novel/author/novel/${novelId}`, {
      method: 'DELETE',
    }),
  
  expandNovelSlot: (personaId: string) =>
    request<{ success: boolean; message: string; novelSlots: number; createdNovelCount: number; remainingSlots: number }>(
      '/novel/author/expand-slot',
      { method: 'POST', body: JSON.stringify({ personaId }) }
    ),
  
  getAuthorChapters: (novelId: string) =>
    request<{ chapters: Chapter[] }>(`/novel/author/novel/${novelId}/chapters`),
  
  createChapter: (novelId: string, data: { title: string; content: string; isPublished?: boolean }) =>
    request<{ success: boolean; message: string; chapter: Chapter; chapterNumber: number }>(
      `/novel/author/novel/${novelId}/chapter`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  
  updateChapter: (chapterId: string, data: { title?: string; content?: string; isPublished?: boolean }) =>
    request<{ success: boolean; message: string; chapter: Chapter }>(`/novel/author/chapter/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteChapter: (chapterId: string) =>
    request<{ success: boolean; message: string }>(`/novel/author/chapter/${chapterId}`, {
      method: 'DELETE',
    }),
  
  getChapterForEdit: (chapterId: string) =>
    request<{ chapter: Chapter }>(`/novel/author/chapter/${chapterId}`),
  
  // ========== 管理员接口 ==========
  getPendingApplications: () =>
    request<{ applications: AuthorApplication[] }>('/novel/admin/applications'),
  
  reviewApplication: (applicationId: string, status: 'approved' | 'rejected', reviewComment?: string) =>
    request<{ success: boolean; message: string }>(`/novel/admin/applications/${applicationId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, reviewComment }),
    }),
};

// 导出 request 函数供其他模块使用
export { request };