const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const getToken = () => localStorage.getItem('token');

export interface LinkPreview {
  originalUrl: string;
  expandedUrl?: string;
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
  type: string;
  linkType: 'image' | 'video' | 'social' | 'github' | 'website';
  domain: string;
  riskLevel: 'safe' | 'suspicious' | 'dangerous';
  warnings: string[];
  isShortUrl: boolean;
  error?: boolean;
}

export const linkPreviewApi = {
  // 批量获取链接预览
  getBatchPreviews: async (urls: string[]): Promise<LinkPreview[]> => {
    const response = await fetch(`${API_BASE}/link-preview/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ urls })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败');
    return data.previews;
  },
  
  // 获取单个链接预览
  getSinglePreview: async (url: string): Promise<LinkPreview> => {
    const response = await fetch(`${API_BASE}/link-preview/single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败');
    return data.preview;
  },
  
  // 展开短链接
  expandUrl: async (url: string): Promise<{ originalUrl: string; expandedUrl?: string; isShortUrl: boolean }> => {
    const response = await fetch(`${API_BASE}/link-preview/expand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败');
    return data;
  }
};