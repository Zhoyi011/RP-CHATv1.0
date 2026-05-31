// client/src/services/friendApi.ts
import { request } from './api';
import type { Post, User } from './api';

export interface Friend {
  id: string;
  friend: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    role: string;
  };
  nickname: string | null;
  group: string;
  isStarred: boolean;
  lastInteractionAt: string | null;
  createdAt: string;
  isOnline: boolean;
}

export interface FriendRequest {
  id: string;
  fromUser?: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    role: string;
  };
  toUser?: {
    id: string;
    username: string;
    avatar: string;
  };
  message: string;
  createdAt: string;
  expiresAt?: string;
}

export interface FriendFeedResponse {
  success: boolean;
  data: Post[];
  hasNewPosts: boolean;
  lastFeedView: string;
}

export interface SearchUserResult {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: string;
  isFriend: boolean;
  requestStatus: 'sent' | 'received' | null;
}

export const friendApi = {
  // 获取好友列表
  getFriends: (params?: { group?: string; search?: string }) => {
    let url = '/friend/list';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.group) queryParams.append('group', params.group);
      if (params.search) queryParams.append('search', params.search);
      const queryString = queryParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    return request<{ success: boolean; data: Friend[]; grouped: Record<string, Friend[]>; groups: string[] }>(url);
  },
  
  // 获取好友申请列表
  getRequests: () =>
    request<{ success: boolean; data: { received: FriendRequest[]; sent: FriendRequest[] } }>('/friend/requests'),
  
  // 发送好友申请
  sendRequest: (toUserId: string, message?: string) =>
    request<{ success: boolean; message: string }>('/friend/request', {
      method: 'POST',
      body: JSON.stringify({ toUserId, message }),
    }),
  
  // 处理好友申请
  handleRequest: (requestId: string, action: 'accept' | 'reject') =>
    request<{ success: boolean; message: string; data?: { friendId: string; username: string; avatar: string } }>(
      `/friend/request/${requestId}/handle`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    ),
  
  // 删除好友
  deleteFriend: (friendId: string) =>
    request<{ success: boolean; message: string }>(`/friend/${friendId}`, {
      method: 'DELETE',
    }),
  
  // 更新好友信息
  updateFriend: (friendId: string, data: { nickname?: string; group?: string; isStarred?: boolean }) =>
    request<{ success: boolean; message: string; data: any }>(`/friend/${friendId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // 获取好友动态
  getFriendFeedPosts: (limit?: number) =>
    request<FriendFeedResponse>(`/friend/feed-posts${limit ? `?limit=${limit}` : ''}`),
  
  // 标记Feed已查看
  markFeedViewed: () =>
    request<{ success: boolean }>('/friend/feed-viewed', {
      method: 'POST',
    }),
  
  // 搜索用户
  searchUsers: (q: string) =>
    request<{ success: boolean; data: SearchUserResult[] }>(`/friend/search?q=${encodeURIComponent(q)}`),
};