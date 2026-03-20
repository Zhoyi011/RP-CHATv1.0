// 检测文本中的链接
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// 检查是否是有效的 URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// 获取域名
export const getDomain = (url: string): string => {
  try {
    const { hostname } = new URL(url);
    return hostname.replace('www.', '');
  } catch {
    return '';
  }
};