// 根据环境变量设置 API 地址
const API_BASE = 'https://rp-chat-backend.onrender.com/api';

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
    role: 'user' | 'admin';
  };
}

export interface RegisterData {
  username: string;
  password: string;
  inviteCode: string;
}

export const authApi = {
  // 注册
  register: (data: RegisterData) => 
    request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 登录
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Firebase 登录后绑定（新功能）
  bindFirebaseUser: (firebaseUid: string, email: string, displayName: string) =>
    request<LoginResponse>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ firebaseUid, email, displayName }),
    }),
};

// ========== 角色相关 ==========
export interface Persona {
  _id: string;
  name: string;
  description: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: {
    _id: string;
    username: string;
  };
  reviewComment?: string;
}

export const personaApi = {
  // 获取我的角色
  getMyPersonas: () => 
    request<Persona[]>('/persona/my'),

  // 创建角色申请
  createRequest: (data: { name: string; description: string; tags: string[] }) =>
    request<{ message: string; persona: Persona }>('/persona/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 管理员：获取待审核角色
  getPending: () => 
    request<Persona[]>('/persona/pending'),

  // 管理员：审核角色
  reviewPersona: (id: string, status: 'approved' | 'rejected', comment?: string) =>
    request<{ message: string; persona: Persona }>(`/persona/review/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status, comment }),
    }),
};

// ========== 聊天室相关 ==========
export interface Room {
  _id: string;
  name: string;
  description?: string;
  messageCount: number;
  createdAt: string;
}

export interface Message {
  _id: string;
  content: string;
  isAction: boolean;
  createdAt: string;
  personaId: {
    _id: string;
    name: string;
  };
  userId: {
    _id: string;
    username: string;
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
  // 获取聊天室列表
  getRooms: () => 
    request<Room[]>('/room/list'),

  // 创建聊天室
  createRoom: (name: string, description?: string) =>
    request<{ message: string; room: Room }>('/room/create', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  // 获取历史消息
  getMessages: (roomId: string) =>
    request<Message[]>(`/room/messages/${roomId}`),

  // 设置当前角色
  setActivePersona: (personaId: string) =>
    request<{ message: string; activePersona: any }>('/room/active-persona', {
      method: 'POST',
      body: JSON.stringify({ personaId }),
    }),

  // 获取当前角色
  getActivePersona: () =>
    request<ActivePersonaResponse>('/room/active-persona'),
};

// ========== 管理员相关 ==========
export interface User {
  _id: string;
  username: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned' | 'muted';
  createdAt: string;
}

export interface InviteCode {
  _id: string;
  code: string;
  createdBy: string;
  usedBy?: string;
  expiresAt: string;
  isActive: boolean;
}

export const adminApi = {
  // 获取所有用户
  getUsers: () => 
    request<User[]>('/admin/users'),

  // 封号/解封
  updateUserStatus: (userId: string, status: 'active' | 'banned' | 'muted') =>
    request<{ message: string }>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // 获取邀请码列表
  getInviteCodes: () =>
    request<InviteCode[]>('/admin/invite-codes'),

  // 生成邀请码
  generateInviteCode: () =>
    request<{ code: string }>('/admin/invite-codes', {
      method: 'POST',
    }),
};
