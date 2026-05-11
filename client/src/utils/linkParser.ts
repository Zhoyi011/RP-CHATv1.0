// 增强版链接检测

// 完整 URL 正则（支持 http/https/ftp）
const FULL_URL_REGEX = /(https?:\/\/|ftp:\/\/)[^\s<>"{}|\\^`[\]]+/gi;

// 无协议域名正则
const DOMAIN_REGEX = /\b([a-zA-Z0-9][-a-zA-Z0-9]*\.)+(com|org|net|edu|gov|io|co|app|dev|me|info|biz|blog|shop|tech|ai|wiki|xyz|online|site|fun|space|world|life|live|cloud|digital|email|website|ooo|top|one|monster|pro|today|tv|cc|gg|us|uk|cn|jp|kr|de|fr|br|in|ru|it|es|nl|se|no|dk|fi|pl|ch|at|be|mx|ar|cl|pe|co\.\w{2}|ac\.\w{2}|gov\.\w{2}|org\.\w{2}|net\.\w{2})\b/gi;

// 提取所有链接
export const extractUrls = (text: string): string[] => {
  const urls: string[] = [];
  
  // 1. 匹配带协议的完整 URL
  const fullMatches: string[] = text.match(FULL_URL_REGEX) || [];
  urls.push(...fullMatches);
  
  // 2. 匹配不带协议的域名
  const domainMatches: string[] = text.match(DOMAIN_REGEX) || [];
  
  // 过滤掉已经是完整 URL 一部分的域名
  for (const domain of domainMatches) {
    const isPartOfFullUrl = fullMatches.some((url: string) => url.includes(domain));
    if (!isPartOfFullUrl) {
      urls.push(`https://${domain}`);
    }
  }
  
  // 3. 清理末尾标点并去重
  return urls
    .map((url: string) => url.replace(/[.,;:!?)\]}]+$/, ''))
    .filter((url: string, index: number, self: string[]) => self.indexOf(url) === index);
};

// 检查是否是有效 URL
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
    return hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
};

// 判断图片链接
export const isImageUrl = (url: string): boolean =>
  /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url) ||
  /(imgur\.com|ibb\.co|gyazo\.com|prnt\.sc)/i.test(url);

// 判断视频链接
export const isVideoUrl = (url: string): boolean =>
  /(youtube\.com|youtu\.be|bilibili\.com|vimeo\.com|tiktok\.com|douyin\.com)/i.test(url);

// 判断社交媒体链接
export const isSocialUrl = (url: string): boolean =>
  /(twitter\.com|x\.com|facebook\.com|instagram\.com|t\.me|discord\.com|reddit\.com)/i.test(url);

// 判断 GitHub 链接
export const isGithubUrl = (url: string): boolean =>
  /github\.com/i.test(url);

// 获取链接类型
export const getLinkType = (url: string): 'image' | 'video' | 'social' | 'github' | 'website' => {
  if (isImageUrl(url)) return 'image';
  if (isVideoUrl(url)) return 'video';
  if (isSocialUrl(url)) return 'social';
  if (isGithubUrl(url)) return 'github';
  return 'website';
};