// client/src/services/friendApi.ts
import { request } from './api';

// ========== 类型定义 ==========

// 好友角色信息
export interface FriendPersona {
  id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  sameNameNumber?: number;
}

// 好友关系
export interface Friend {
  id: string;
  friend: FriendPersona;
  nickname: string | null;
  group: string;
  isStarred: boolean;
  intimacy: number;
  createdAt: string;
}

// 好友申请中的角色信息
export interface RequestPersona {
  id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  sameNameNumber?: number;
}

// 好友申请
export interface FriendRequest {
  id: string;
  fromPersona?: RequestPersona;
  message: string;
  createdAt: string;
  expiresAt?: string;
}

// 搜索结果中的角色
export interface SearchPersonaResult {
  id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  sameNameNumber?: number;
  ownerUsername?: string;
  isFriend: boolean;
  requestStatus: 'sent' | 'received' | null;
}

// 动态帖子
export interface FeedPost {
  _id: string;
  content: string;
  images?: string[];
  personaId?: {
    _id: string;
    name: string;
    displayName?: string;
    avatar?: string;
  };
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: string;
}

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface FriendListResponse {
  success: boolean;
  data: Friend[];
  grouped?: Record<string, Friend[]>;
  groups?: string[];
}

interface FriendRequestsResponse {
  success: boolean;
  data: {
    received: FriendRequest[];
    sent?: FriendRequest[];
  };
}

interface SendRequestResponse {
  success: boolean;
  message: string;
}

interface HandleRequestResponse {
  success: boolean;
  message: string;
}

interface DeleteFriendResponse {
  success: boolean;
  message: string;
}

interface SearchPersonasResponse {
  success: boolean;
  data: SearchPersonaResult[];
}

interface FeedPostsResponse {
  success: boolean;
  data: FeedPost[];
}

// ========== API 方法 ==========

export const friendApi = {
  /**
   * 获取好友列表
   */
  getFriends: (): Promise<FriendListResponse> =>
    request('/friend/list'),

  /**
   * 获取好友申请列表
   */
  getRequests: (): Promise<FriendRequestsResponse> =>
    request('/friend/requests'),

  /**
   * 发送好友申请
   * @param toPersonaId 目标角色ID
   * @param message 附言（可选）
   */
  sendRequest: (toPersonaId: string, message?: string): Promise<SendRequestResponse> =>
    request('/friend/request', {
      method: 'POST',
      body: JSON.stringify({ toPersonaId, message }),
    }),

  /**
   * 处理好友申请（同意/拒绝）
   * @param requestId 申请ID
   * @param action 动作：'accept' 或 'reject'
   */
  handleRequest: (requestId: string, action: 'accept' | 'reject'): Promise<HandleRequestResponse> =>
    request(`/friend/request/${requestId}/handle`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  /**
   * 删除好友
   * @param friendPersonaId 好友角色ID
   */
  deleteFriend: (friendPersonaId: string): Promise<DeleteFriendResponse> =>
    request(`/friend/${friendPersonaId}`, {
      method: 'DELETE',
    }),

  /**
   * 搜索角色（添加好友用）
   * @param q 搜索关键词
   */
  searchPersonas: (q: string): Promise<SearchPersonasResponse> =>
    request(`/friend/search-personas?q=${encodeURIComponent(q)}`),

  /**
   * 获取好友动态
   * @param limit 数量限制，默认20
   */
  getFriendFeed: (limit: number = 20): Promise<FeedPostsResponse> =>
    request(`/friend/feed-posts?limit=${limit}`),
};

// 默认导出
export default friendApi;