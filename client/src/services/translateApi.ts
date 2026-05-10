const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const getToken = () => localStorage.getItem('token');

async function request<T>(endpoint: string, text: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ text })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}

export type TranslateMode = 's2t' | 't2s' | 'smart';

// 简体转繁体
export async function simplifiedToTraditional(text: string): Promise<string> {
  if (!text.trim()) return text;
  const data = await request<{ result: string }>('/translate/s2t', text);
  return data.result;
}

// 繁体转简体
export async function traditionalToSimplified(text: string): Promise<string> {
  if (!text.trim()) return text;
  const data = await request<{ result: string }>('/translate/t2s', text);
  return data.result;
}

// 智能转换
export async function smartConvert(text: string): Promise<string> {
  if (!text.trim()) return text;
  const data = await request<{ result: string }>('/translate/convert', text);
  return data.result;
}

// 获取当前模式对应的转换函数
export const getConverter = (mode: TranslateMode) => {
  switch (mode) {
    case 's2t': return simplifiedToTraditional;
    case 't2s': return traditionalToSimplified;
    default: return smartConvert;
  }
};