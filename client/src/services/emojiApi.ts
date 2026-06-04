// client/src/services/emojiApi.ts
// 表情包系统 API - 完整修复版

import toast from 'react-hot-toast';

// ========== 环境配置 ==========
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isDev ? 'https://rp-chatv1-0.onrender.com/api' : '/api';

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// 判断是否在登录页
const isAuthPage = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/' || path === '/login' || path === '/register' || path === '/invite';
};

// 全局跳转标志
let isRedirecting = false;
let redirectTimer: ReturnType<typeof setTimeout> | null = null;

// ========== 通用请求函数 ==========
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
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

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('lastUsedPersonaId');
      localStorage.removeItem('userId');
      
      if (!isAuthPage() && !isRedirecting && typeof window !== 'undefined') {
        isRedirecting = true;
        if (redirectTimer) clearTimeout(redirectTimer);
        toast.error('登录已过期，请重新登录');
        redirectTimer = setTimeout(() => {
          window.location.href = '/';
          isRedirecting = false;
          redirectTimer = null;
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
    console.error('❌ [EmojiAPI] 错误:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      toast.error('网络连接失败，请检查网络');
      throw new Error('网络连接失败');
    }
    throw error;
  }
}

// ========== 类型定义 ==========
export interface EmojiType {
  _id: string;
  userId: string;
  url: string;
  publicId: string;
  keywords: string[];
  categoryId: string | null;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
  isGif: boolean;
  useCount: number;
  isFavorite: boolean;
  isBanned: boolean;
  createdAt: string;
}

export interface EmojiCategoryType {
  _id: string;
  userId: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface GetCategoriesResponse {
  categories: EmojiCategoryType[];
  uncategorizedCount: number;
}

export interface GetMyEmojisResponse {
  emojis: EmojiType[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UploadEmojiResponse {
  id: string;
  url: string;
  publicId: string;
  isGif: boolean;
  keywords: string[];
  fileSize?: number;
  width?: number;
  height?: number;
}

// 兼容旧的导出名称
export type Emoji = EmojiType;
export type EmojiCategory = EmojiCategoryType;

// ========== 分组 API ==========
export const getCategories = (): Promise<GetCategoriesResponse> => {
  return request('/emoji/categories');
};

export const createCategory = (name: string): Promise<EmojiCategoryType> => {
  return request('/emoji/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

export const updateCategory = (categoryId: string, name: string): Promise<EmojiCategoryType> => {
  return request(`/emoji/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteCategory = (categoryId: string): Promise<{ message: string }> => {
  return request(`/emoji/categories/${categoryId}`, {
    method: 'DELETE',
  });
};

// ========== 表情上传 API ==========
export const uploadEmoji = async (file: File): Promise<UploadEmojiResponse> => {
  const token = getToken();
  const formData = new FormData();
  formData.append('image', file);
  
  // 1. 上传到 Cloudinary
  const fullUrl = `${API_BASE}/upload/emoji`;
  
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: formData,
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '上传失败');
  }
  
  // 2. 保存到数据库
  const saveResult = await request<UploadEmojiResponse>('/emoji/upload', {
    method: 'POST',
    body: JSON.stringify({
      imageUrl: data.url,
      publicId: data.publicId,
      fileSize: data.fileSize,
      width: data.width,
      height: data.height,
      mimeType: data.mimeType || file.type,
      keywords: [],
    }),
  });
  
  return saveResult;
};

// 🔥 修复：批量上传 - 不再重复调用 batch-upload
export const batchUploadEmojis = async (files: File[]): Promise<{ emojis: UploadEmojiResponse[] }> => {
  if (files.length === 0) {
    return { emojis: [] };
  }
  
  if (files.length > 10) {
    throw new Error('单次最多上传10张表情');
  }
  
  // 直接上传每张图片（uploadEmoji 已经包含上传+保存）
  const uploadPromises = files.map(file => uploadEmoji(file));
  const uploadResults = await Promise.all(uploadPromises);
  
  // 直接返回结果，不再重复调用 batch-upload
  return { emojis: uploadResults };
};

// ========== 表情管理 API ==========
export const getMyEmojis = (params: {
  page?: number;
  limit?: number;
  categoryId?: string | null;
  sortBy?: 'recent' | 'favorite' | 'most-used';
}): Promise<GetMyEmojisResponse> => {
  const { page = 1, limit = 50, categoryId, sortBy = 'recent' } = params;
  let url = `/emoji/my?page=${page}&limit=${limit}&sortBy=${sortBy}`;
  if (categoryId !== undefined) {
    url += `&categoryId=${categoryId === null ? 'null' : categoryId}`;
  }
  return request(url);
};

export const getFrequentEmojis = (): Promise<{ emojis: EmojiType[] }> => {
  return request('/emoji/frequent');
};

export const getFavoriteEmojis = (): Promise<{ emojis: EmojiType[] }> => {
  return request('/emoji/favorites');
};

export const updateEmoji = (
  emojiId: string,
  updates: { categoryId?: string | null; keywords?: string[]; isFavorite?: boolean }
): Promise<EmojiType> => {
  return request(`/emoji/${emojiId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteEmoji = (emojiId: string): Promise<{ message: string }> => {
  return request(`/emoji/${emojiId}`, {
    method: 'DELETE',
  });
};

export const batchDeleteEmojis = (emojiIds: string[]): Promise<{ message: string }> => {
  return request('/emoji/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ emojiIds }),
  });
};

export const searchEmojis = (q: string, limit?: number): Promise<{ emojis: EmojiType[] }> => {
  let url = `/emoji/search?q=${encodeURIComponent(q)}`;
  if (limit) url += `&limit=${limit}`;
  return request(url);
};

export const reportEmoji = (emojiId: string): Promise<{ message: string }> => {
  return request(`/emoji/${emojiId}/report`, {
    method: 'POST',
  });
};

export const incrementEmojiUse = (emojiId: string): Promise<{ success: boolean }> => {
  return request(`/emoji/${emojiId}/use`, {
    method: 'POST',
  });
};