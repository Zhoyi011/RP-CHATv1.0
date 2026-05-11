const fetch = require('node-fetch');
const cheerio = require('cheerio');

// ========== 短链接服务列表 ==========
const SHORTENER_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'ow.ly', 'buff.ly',
  'is.gd', 'soo.gd', 's2r.co', 'clicky.me', 'shorturl.at',
  'rb.gy', 'lnkd.in', 'urlzs.com', 'v.gd', 'shorte.st',
  'bc.vc', 'adf.ly', 'j.mp', 'tiny.cc', 'short.link'
];

// ========== 可疑域名模式 ==========
const SUSPICIOUS_PATTERNS = [
  /\d{5,}/,                          // 长数字序列
  /-(?!\w+\.)/,                      // 异常连字符
  /\.(tk|ml|ga|cf|gq)$/i,           // 免费可疑 TLD
  /(paypal|apple|google|facebook|instagram|twitter)\.(?!com$)/i, // 品牌仿冒
  /\.(xyz|top|club|online|site)$/i,  // 低成本可疑 TLD
  /(login|signin|account|verify|secure|update)\.(?!com$)/i, // 钓鱼关键词
  /\.(ru|cn|su)$/i,                  // 高风险国家 TLD（仅警告）
];

// ========== 本地黑名单（可扩展）==========
const MALICIOUS_DOMAINS = new Set([
  // 这里可以定期从公开黑名单更新
]);

// ========== 缓存系统 ==========
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时

function getCacheKey(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function getFromCache(url) {
  const key = getCacheKey(url);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(url, data) {
  const key = getCacheKey(url);
  cache.set(key, { data, timestamp: Date.now() });
  
  // 限制缓存大小
  if (cache.size > 1000) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

// ========== 短链接展开 ==========
async function expandShortUrl(url, maxRedirects = 5) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'RP-Chat/1.0 (Link Preview Bot)'
      },
      timeout: 5000
    });
    
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (location && maxRedirects > 0) {
        // 处理相对路径
        const expanded = new URL(location, url).href;
        
        // 递归展开
        if (isShortUrl(expanded)) {
          return await expandShortUrl(expanded, maxRedirects - 1);
        }
        return expanded;
      }
    }
    
    return url; // 无法展开，返回原地址
  } catch (error) {
    console.error(`展开短链接失败 (${url}):`, error.message);
    return url;
  }
}

function isShortUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return SHORTENER_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

// ========== 链接安全检测 ==========
function checkUrlSafety(url) {
  const warnings = [];
  let riskLevel = 'safe'; // safe | suspicious | dangerous
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // 检查黑名单
    if (MALICIOUS_DOMAINS.has(hostname)) {
      return { riskLevel: 'dangerous', warnings: ['⚠️ 该网站被标记为恶意网站'] };
    }
    
    // 检查可疑模式
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(hostname)) {
        warnings.push('⚠️ 该链接可能不安全，请谨慎点击');
        riskLevel = 'suspicious';
        break;
      }
    }
    
    // 检查 IP 地址
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      warnings.push('⚠️ 这是 IP 地址链接，可能不安全');
      riskLevel = 'suspicious';
    }
    
    // 检查非标准端口
    if (urlObj.port && !['80', '443'].includes(urlObj.port)) {
      warnings.push(`⚠️ 使用了非标准端口: ${urlObj.port}`);
      riskLevel = 'suspicious';
    }
    
    // 检查 HTTPS
    if (urlObj.protocol === 'http:') {
      warnings.push('🔒 该链接使用未加密的 HTTP 协议');
      if (riskLevel === 'safe') riskLevel = 'suspicious';
    }
    
  } catch (error) {
    return { riskLevel: 'dangerous', warnings: ['⚠️ 无效的链接格式'] };
  }
  
  return { riskLevel, warnings };
}

// ========== 获取网页元数据 ==========
async function fetchPageMetadata(url) {
  const cached = getFromCache(url);
  if (cached) return cached;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RP-Chat/1.0; LinkPreview)',
        'Accept': 'text/html, application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      signal: controller.signal,
      timeout: 8000
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return getBasicMetadata(url);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // 如果不是 HTML，返回基本信息
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return getBasicMetadata(url);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // 提取元数据
    const metadata = {
      url: url,
      title: '',
      description: '',
      image: '',
      favicon: '',
      siteName: '',
      type: 'website',
      domain: new URL(url).hostname.replace('www.', '')
    };
    
    // Open Graph 标签（优先）
    metadata.title = $('meta[property="og:title"]').attr('content') || 
                     $('title').text() || 
                     $('meta[name="twitter:title"]').attr('content') || '';
    
    metadata.description = $('meta[property="og:description"]').attr('content') || 
                           $('meta[name="description"]').attr('content') || 
                           $('meta[name="twitter:description"]').attr('content') || '';
    
    metadata.image = $('meta[property="og:image"]').attr('content') || 
                     $('meta[name="twitter:image"]').attr('content') || 
                     $('meta[property="og:image:secure_url"]').attr('content') || '';
    
    metadata.siteName = $('meta[property="og:site_name"]').attr('content') || '';
    metadata.type = $('meta[property="og:type"]').attr('content') || 'website';
    
    // Favicon
    metadata.favicon = $('link[rel="icon"]').attr('href') || 
                       $('link[rel="shortcut icon"]').attr('href') || 
                       $('link[rel="apple-touch-icon"]').attr('href') || '';
    
    // 处理相对路径
    if (metadata.favicon && !metadata.favicon.startsWith('http')) {
      metadata.favicon = new URL(metadata.favicon, url).href;
    }
    
    if (metadata.image && !metadata.image.startsWith('http')) {
      metadata.image = new URL(metadata.image, url).href;
    }
    
    // 清理标题和描述
    metadata.title = (metadata.title || '').trim().substring(0, 200);
    metadata.description = (metadata.description || '').trim().substring(0, 300);
    
    // 如果没有 favicon，使用默认路径
    if (!metadata.favicon) {
      metadata.favicon = new URL('/favicon.ico', url).href;
    }
    
    setCache(url, metadata);
    return metadata;
    
  } catch (error) {
    console.error(`获取页面元数据失败 (${url}):`, error.message);
    const basic = getBasicMetadata(url);
    setCache(url, basic);
    return basic;
  }
}

function getBasicMetadata(url) {
  try {
    const urlObj = new URL(url);
    return {
      url: url,
      title: urlObj.hostname,
      description: '',
      image: '',
      favicon: `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`,
      siteName: urlObj.hostname,
      type: 'website',
      domain: urlObj.hostname.replace('www.', '')
    };
  } catch {
    return {
      url: url,
      title: '链接',
      description: '',
      image: '',
      favicon: '',
      siteName: '',
      type: 'website',
      domain: ''
    };
  }
}

// ========== 链接类型识别 ==========
function identifyLinkType(url, metadata = {}) {
  const urlLower = url.toLowerCase();
  
  // 图片
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i.test(urlLower) ||
      urlLower.includes('image') || 
      metadata.image === url) {
    return 'image';
  }
  
  // 视频
  if (/(youtube\.com|youtu\.be|bilibili\.com|vimeo\.com|tiktok\.com|douyin\.com)/i.test(urlLower)) {
    return 'video';
  }
  
  // 社交媒体
  if (/(twitter\.com|x\.com|facebook\.com|instagram\.com|t\.me|discord\.com|reddit\.com)/i.test(urlLower)) {
    return 'social';
  }
  
  // GitHub
  if (/github\.com/i.test(urlLower)) {
    return 'github';
  }
  
  return 'website';
}

// ========== 主入口 ==========
async function analyzeUrl(rawUrl) {
  try {
    // 1. 展开短链接
    let url = rawUrl;
    if (isShortUrl(rawUrl)) {
      url = await expandShortUrl(rawUrl);
    }
    
    // 2. 安全检查
    const safety = checkUrlSafety(url);
    
    // 3. 获取元数据
    const metadata = await fetchPageMetadata(url);
    
    // 4. 识别类型
    const linkType = identifyLinkType(url, metadata);
    
    return {
      originalUrl: rawUrl,
      expandedUrl: url !== rawUrl ? url : undefined,
      ...metadata,
      linkType,
      riskLevel: safety.riskLevel,
      warnings: safety.warnings,
      isShortUrl: isShortUrl(rawUrl)
    };
    
  } catch (error) {
    console.error('分析链接失败:', error);
    return {
      originalUrl: rawUrl,
      url: rawUrl,
      title: '无法加载预览',
      description: '',
      image: '',
      favicon: '',
      siteName: '',
      type: 'website',
      linkType: 'website',
      riskLevel: 'safe',
      warnings: [],
      isShortUrl: false
    };
  }
}

module.exports = {
  analyzeUrl,
  expandShortUrl,
  checkUrlSafety,
  fetchPageMetadata,
  identifyLinkType,
  isShortUrl
};