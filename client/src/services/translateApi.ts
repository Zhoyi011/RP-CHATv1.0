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

// ========== 简体转繁体 ==========
export async function simplifiedToTraditional(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  try {
    const data = await request<{ result: string }>('/translate/s2t', text);
    return data.result;
  } catch (error) {
    console.error('简转繁失败:', error);
    return text;
  }
}

// ========== 繁体转简体 ==========
export async function traditionalToSimplified(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  try {
    const data = await request<{ result: string }>('/translate/t2s', text);
    return data.result;
  } catch (error) {
    console.error('繁转简失败:', error);
    return text;
  }
}

// ========== 智能转换（自动检测） ==========
export async function smartConvert(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  
  // 检测是否包含繁体字
  const hasTraditional = /[愛國學會書龍對發開關體頭點電飛個過後時間門馬鳥魚貝車長東樂為萬與麼]/.test(text);
  
  if (hasTraditional) {
    return traditionalToSimplified(text);
  } else {
    return simplifiedToTraditional(text);
  }
}

// ========== 检测文本类型 ==========
export function detectLanguage(text: string): 'simplified' | 'traditional' | 'unknown' {
  if (!text) return 'unknown';
  
  const traditionalChars = /[愛國學會書龍對發開關體頭點電飛個過後時間門馬鳥魚貝車長東樂為萬與麼]/;
  const simplifiedChars = /[爱国学书龙对发开关体头点电飞个过后时间门马鸟鱼贝车长东乐为万与么]/;
  
  if (traditionalChars.test(text)) return 'traditional';
  if (simplifiedChars.test(text)) return 'simplified';
  return 'unknown';
}

// ========== 获取转换后的文本（用于消息翻译） ==========
export async function translateMessage(content: string): Promise<string> {
  return smartConvert(content);
}