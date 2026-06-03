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
  createdAt: string;
}

// 好友申请中的角色
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
  fromPersona: RequestPersona;
  message: string;
  createdAt: string;
}

// 搜索结果中的角色
export interface SearchPersonaResult {
  id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  sameNameNumber?: number;
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
    sameNameNumber?: number;
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

// ========== API 方法 ==========

export const friendApi = {
  /**
   * 获取好友列表
   */
  getFriends: (): Promise<ApiResponse<Friend[]>> =>
    request('/friend/list'),

  /**
   * 获取好友申请列表
   */
  getRequests: (): Promise<ApiResponse<FriendRequest[]>> =>
    request('/friend/requests'),

  /**
   * 发送好友申请
   */
  sendRequest: (toPersonaId: string, message?: string): Promise<ApiResponse<null>> =>
    request('/friend/request', {
      method: 'POST',
      body: JSON.stringify({ toPersonaId, message }),
    }),

  /**
   * 处理好友申请（同意/拒绝）
   */
  handleRequest: (requestId: string, action: 'accept' | 'reject'): Promise<ApiResponse<null>> =>
    request(`/friend/request/${requestId}/handle`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  /**
   * 删除好友
   */
  deleteFriend: (friendPersonaId: string): Promise<ApiResponse<null>> =>
    request(`/friend/${friendPersonaId}`, {
      method: 'DELETE',
    }),

  /**
   * 搜索角色
   */
  searchPersonas: (q: string): Promise<ApiResponse<SearchPersonaResult[]>> =>
    request(`/friend/search?q=${encodeURIComponent(q)}`),

  /**
   * 获取好友动态
   */
  getFriendFeed: (limit: number = 20): Promise<ApiResponse<FeedPost[]>> =>
    request(`/friend/feed?limit=${limit}`),
};

export default friendApi;