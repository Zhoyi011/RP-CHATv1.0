const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

const getToken = () => localStorage.getItem('token');

// ✅ 修复：text 应该是 body 中的参数，不是函数参数
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
  
  // ✅ 增强繁体检测 - 更多常用繁体字
  const hasTraditional = /[愛國學會書龍對發開關體頭點電飛個過後時間門馬鳥魚貝車長東樂為萬與麼體國區萬實寶寶學習開關東西南北廣場電腦機會為於對愛書寫時間來去關閉開發網站]/.test(text);
  
  if (hasTraditional) {
    return traditionalToSimplified(text);
  } else {
    return simplifiedToTraditional(text);
  }
}

// ========== 检测文本类型 ==========
export function isTraditional(text: string): boolean {
  if (!text) return false;
  
  // 更多常用繁体字集合
  const traditionalChars = /[愛國學會書龍對發開關體頭點電飛個過後時間門馬鳥魚貝車長東樂為萬與麼體國區萬實寶寶學習開關東西南北廣場電腦機會為於對愛書寫時間來去關閉開發網站]/;
  const simplifiedChars = /[爱国学书龙对发开关体头点电飞个过后时间门马鸟鱼贝车长东乐为万与么体国区万实宝学习开关东西南北广场电脑机会为于对爱书写时间来去关闭开发网站]/;
  
  const traditionalMatch = text.match(traditionalChars)?.length || 0;
  const simplifiedMatch = text.match(simplifiedChars)?.length || 0;
  
  if (traditionalMatch === 0 && simplifiedMatch === 0) return false;
  
  // 如果繁体匹配数大于简体匹配数，认为是繁体
  return traditionalMatch > simplifiedMatch;
}

// 检测文本类型（保留原有功能）
export function detectLanguage(text: string): 'simplified' | 'traditional' | 'unknown' {
  if (!text) return 'unknown';
  
  if (isTraditional(text)) return 'traditional';
  
  const simplifiedChars = /[爱国学书龙对发开关体头点电飞个过后时间门马鸟鱼贝车长东乐为万与么]/;
  if (simplifiedChars.test(text)) return 'simplified';
  
  return 'unknown';
}

// ========== 获取转换后的文本（用于消息翻译） ==========
export async function translateMessage(content: string): Promise<string> {
  return smartConvert(content);
}