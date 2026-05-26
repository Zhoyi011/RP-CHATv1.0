// server/src/middlewares/securityMiddleware.js
const fs = require('fs');
const crypto = require('crypto');
const { sendSecurityAlert } = require('../services/discordAlert');

// ========== 配置 ==========
const CONFIG = {
  BLACKLIST_DURATION: 24 * 60 * 60 * 1000,
  MAX_FAILED_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 60000,
  RATE_LIMIT_MAX: 60,
  SUSPICIOUS_THRESHOLD: 10,
  TOKEN_BLACKLIST_DURATION: 24 * 60 * 60 * 1000,
  DEBUG_CODE_EXPIRY: 5 * 60 * 1000,
  DEBUG_SESSION_DURATION: 30 * 60 * 1000
};

// ========== 存储 ==========
let blacklist = new Map();
let tokenBlacklist = new Map();
let failedAttempts = new Map();
let rateLimitStore = new Map();
let debugSessions = new Map();

// ========== 文件路径 ==========
const DATA_DIR = '/tmp';
const BLACKLIST_FILE = `${DATA_DIR}/blacklist.json`;
const SECURITY_LOG_FILE = `${DATA_DIR}/security_events.log`;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 加载黑名单
try {
  if (fs.existsSync(BLACKLIST_FILE)) {
    const data = fs.readFileSync(BLACKLIST_FILE, 'utf8');
    const parsed = JSON.parse(data);
    blacklist = new Map(Object.entries(parsed));
  }
} catch (e) {}

function saveBlacklist() {
  try {
    const obj = Object.fromEntries(blacklist);
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {}
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

function logSecurityEvent(type, req, details = {}) {
  const event = {
    type,
    timestamp: new Date().toISOString(),
    ip: getClientIp(req),
    userId: req.userId || 'anonymous',
    url: req.url,
    method: req.method,
    ...details
  };
  try {
    fs.appendFileSync(SECURITY_LOG_FILE, JSON.stringify(event) + '\n');
  } catch (e) {}
  return event;
}

// ========== 核心告警函数（修复版）==========
async function triggerAlert(type, req, details = {}) {
  const ip = getClientIp(req);
  const userId = req.userId || '未登录';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  let message = '';
  let alertType = 'warning';
  
  switch (type) {
    case 'RATE_LIMIT_EXCEEDED':
      message = `**🚫 频率限制超限**\nIP: ${ip}\n用户: ${userId}\n限制: ${CONFIG.RATE_LIMIT_MAX}/分钟`;
      alertType = 'warning';
      break;
    case 'INJECTION_ATTEMPT':
      message = `**💉 SQL注入/XSS攻击**\nIP: ${ip}\n用户: ${userId}\n参数: ${details.parameter || '未知'}\n值: ${details.value || '未知'}`;
      alertType = 'critical';
      break;
    case 'MALICIOUS_UA':
      message = `**🤖 恶意User-Agent**\nIP: ${ip}\n用户: ${userId}\nUA: ${userAgent.substring(0, 100)}`;
      alertType = 'warning';
      break;
    case 'AUTO_BANNED':
      message = `**🔒 IP已被自动封禁**\nIP: ${ip}\n原因: ${details.reason}\n尝试次数: ${details.attempts || 0}`;
      alertType = 'critical';
      break;
    case 'FAILED_LOGIN':
      message = `**❌ 登录失败**\nIP: ${ip}\n用户名: ${details.username || '未知'}`;
      alertType = 'warning';
      break;
    case 'SUCCESS_LOGIN':
      message = `**✅ 登录成功**\nIP: ${ip}\n用户: ${userId}\n设备: ${userAgent.substring(0, 80)}`;
      alertType = 'info';
      break;
    case 'PASSWORD_CHANGE':
      message = `**🔑 密码修改**\n用户: ${userId}\nIP: ${ip}`;
      alertType = 'info';
      break;
    case 'ACCOUNT_DELETE':
      message = `**🗑️ 账户删除**\n用户: ${userId}\nIP: ${ip}`;
      alertType = 'critical';
      break;
    case 'INVITE_CREATE':
      message = `**🎫 邀请码创建**\n用户: ${userId}\nIP: ${ip}\n类型: ${details.type || 'user'}`;
      alertType = 'info';
      break;
    case 'BLACKLISTED_ACCESS':
      message = `**🚫 黑名单IP访问**\nIP: ${ip}\n用户: ${userId}\nURL: ${req.url}`;
      alertType = 'warning';
      break;
    case 'PATH_TRAVERSAL':
      message = `**📁 路径遍历攻击**\nIP: ${ip}\n用户: ${userId}\n路径: ${details.path}`;
      alertType = 'critical';
      break;
    case 'DEBUG_ACCESS':
      message = `**🔧 调试模式访问**\n用户: ${userId}\nIP: ${ip}`;
      alertType = 'info';
      break;
    default:
      message = `**⚠️ 未知安全事件**\n类型: ${type}\nIP: ${ip}\n用户: ${userId}`;
  }
  
  logSecurityEvent(type, req, details);
  
  // 发送到 Discord 安全频道
  try {
    await sendSecurityAlert(message, alertType);
  } catch (error) {
    console.error('发送安全告警失败:', error);
  }
}

// ========== 中间件 ==========
// 检查 IP 是否属于 Google Cloud 网段（允许其通过）
function isGoogleCloudIp(ip) {
  const ipToNumber = (ip) => {
    const parts = ip.split('.');
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + +parts[3];
  };
  const num = ipToNumber(ip);
  const min = ipToNumber('34.16.0.0');
  const max = ipToNumber('34.19.255.255');
  return num >= min && num <= max;
}

function isDeveloper(req) {
  const ip = getClientIp(req);
  if (isGoogleCloudIp(ip)) {
    return true;
  }
  const devIps = (process.env.DEV_IPS || '127.0.0.1,::1,localhost').split(',');
  return devIps.includes(ip);
}

async function ipBlacklistMiddleware(req, res, next) {
  if (isDeveloper(req)) return next();
  
  const ip = getClientIp(req);
  const record = blacklist.get(ip);
  
  if (record && record.bannedAt) {
    if (Date.now() - record.bannedAt > CONFIG.BLACKLIST_DURATION) {
      blacklist.delete(ip);
      saveBlacklist();
      return next();
    }
    
    await triggerAlert('BLACKLISTED_ACCESS', req, { reason: record.reason });
    return res.status(403).json({
      error: '您的 IP 已被限制访问，请联系管理员',
      code: 'IP_BANNED'
    });
  }
  
  next();
}

function rateLimitMiddleware(limit = CONFIG.RATE_LIMIT_MAX, windowMs = CONFIG.RATE_LIMIT_WINDOW) {
  return async (req, res, next) => {
    if (isDeveloper(req)) return next();
    
    const ip = getClientIp(req);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    let timestamps = rateLimitStore.get(ip) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    if (timestamps.length >= limit) {
      const failRecord = failedAttempts.get(ip) || { count: 0, firstAttempt: now };
      failRecord.count++;
      failRecord.lastAttempt = now;
      failedAttempts.set(ip, failRecord);
      
      await triggerAlert('RATE_LIMIT_EXCEEDED', req, { attempts: failRecord.count });
      
      if (failRecord.count >= CONFIG.SUSPICIOUS_THRESHOLD) {
        blacklist.set(ip, {
          bannedAt: now,
          reason: 'RATE_LIMIT_ABUSE',
          attempts: failRecord.count
        });
        saveBlacklist();
        await triggerAlert('AUTO_BANNED', req, { reason: 'RATE_LIMIT_ABUSE', attempts: failRecord.count });
      }
      
      return res.status(429).json({
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((timestamps[0] + windowMs - now) / 1000)
      });
    }
    
    timestamps.push(now);
    rateLimitStore.set(ip, timestamps);
    next();
  };
}

const MALICIOUS_PATTERNS = [
  /curl/i, /wget/i, /python/i, /java/i, /perl/i, /ruby/i,
  /go-http-client/i, /php/i, /scrapy/i, /sqlmap/i, /nmap/i,
  /nikto/i, /dirbuster/i, /gobuster/i, /hydra/i, /masscan/i,
  /zmap/i, /burp/i, /postman/i, /insomnia/i
];

async function detectMaliciousUA(req, res, next) {
  if (isDeveloper(req)) return next();
  
  const ua = req.headers['user-agent'] || '';
  
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(ua)) {
      await triggerAlert('MALICIOUS_UA', req, { ua: ua.substring(0, 100) });
      return res.status(403).json({ error: '访问被拒绝', code: 'UA_BLOCKED' });
    }
  }
  
  next();
}

function addToTokenBlacklist(token) {
  if (token && typeof token === 'string') {
    tokenBlacklist.set(token, Date.now() + CONFIG.TOKEN_BLACKLIST_DURATION);
  }
}

function tokenBlacklistMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (token && tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token 已失效，请重新登录', code: 'TOKEN_REVOKED' });
  }
  
  next();
}

const INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript)/i,
  /(<\s*script|<\/script>)/i,
  /(onload|onerror|onclick|onmouseover)/i,
  /(eval\(|document\.|window\.|alert\()/i
];

async function detectInjection(req, res, next) {
  const checkValue = (value) => {
    if (typeof value !== 'string') return false;
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(value)) return true;
    }
    return false;
  };
  
  for (const key in req.query) {
    if (checkValue(req.query[key])) {
      await triggerAlert('INJECTION_ATTEMPT', req, { parameter: key, value: req.query[key] });
      return res.status(400).json({ error: '无效的请求参数', code: 'INVALID_INPUT' });
    }
  }
  
  if (req.body) {
    for (const key in req.body) {
      const value = req.body[key];
      if (typeof value === 'string' && checkValue(value)) {
        await triggerAlert('INJECTION_ATTEMPT', req, { parameter: key, value });
        return res.status(400).json({ error: '无效的请求参数', code: 'INVALID_INPUT' });
      }
    }
  }
  
  next();
}

async function preventPathTraversal(req, res, next) {
  const url = req.url;
  if (url && (url.includes('../') || url.includes('..\\') || url.includes('/etc/') || url.includes('passwd'))) {
    await triggerAlert('PATH_TRAVERSAL', req, { path: url });
    return res.status(403).json({ error: '访问被拒绝', code: 'PATH_DENIED' });
  }
  next();
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

function getSecurityReport() {
  let report = '========== 安全报告 ==========\n\n';
  report += `报告时间: ${new Date().toLocaleString()}\n\n`;
  
  report += '【IP 黑名单】\n';
  for (const [ip, entry] of blacklist) {
    if (entry.bannedAt) {
      report += `IP: ${ip}\n`;
      report += `  封禁时间: ${new Date(entry.bannedAt).toLocaleString()}\n`;
      report += `  原因: ${entry.reason}\n`;
      report += `  尝试次数: ${entry.attempts || 1}\n\n`;
    }
  }
  if (blacklist.size === 0) report += '暂无封禁 IP\n\n';
  
  return report;
}

// ========== 导出 ==========
module.exports = {
  ipBlacklistMiddleware,
  rateLimitMiddleware,
  detectMaliciousUA,
  tokenBlacklistMiddleware,
  detectInjection,
  preventPathTraversal,
  securityHeaders,
  addToTokenBlacklist,
  logSecurityEvent,
  getSecurityReport,
  getClientIp,
  isDeveloper,
  triggerAlert,
  CONFIG
};