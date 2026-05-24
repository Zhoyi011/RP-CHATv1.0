// server/src/middlewares/securityMiddleware.js
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ========== 配置 ==========
const CONFIG = {
  BLACKLIST_DURATION: 24 * 60 * 60 * 1000, // 24小时
  MAX_FAILED_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 60000, // 1分钟
  RATE_LIMIT_MAX: 60,
  SUSPICIOUS_THRESHOLD: 10,
  TOKEN_BLACKLIST_DURATION: 24 * 60 * 60 * 1000, // 24小时
  DEBUG_CODE_EXPIRY: 5 * 60 * 1000, // 5分钟
  DEBUG_SESSION_DURATION: 30 * 60 * 1000 // 30分钟
};

// ========== 存储 ==========
let blacklist = new Map();      // IP -> { bannedAt, reason, attempts }
let tokenBlacklist = new Map(); // token -> expiresAt
let failedAttempts = new Map(); // IP -> { count, firstAttempt, lastAttempt }
let rateLimitStore = new Map(); // IP -> timestamps[]
let debugSessions = new Map();  // sessionToken -> { userId, expiresAt, createdAt }

// ========== 文件路径 ==========
const DATA_DIR = '/tmp';
const BLACKLIST_FILE = `${DATA_DIR}/blacklist.json`;
const SECURITY_LOG_FILE = `${DATA_DIR}/security_events.log`;
const SUSPICIOUS_LOG_FILE = `${DATA_DIR}/suspicious_activities.log`;

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ========== 加载持久化数据 ==========
try {
  if (fs.existsSync(BLACKLIST_FILE)) {
    const data = fs.readFileSync(BLACKLIST_FILE, 'utf8');
    const parsed = JSON.parse(data);
    blacklist = new Map(Object.entries(parsed));
    const now = Date.now();
    for (const [ip, entry] of blacklist) {
      if (entry.bannedAt && now - entry.bannedAt > CONFIG.BLACKLIST_DURATION) {
        blacklist.delete(ip);
      }
    }
    saveBlacklist();
  }
} catch (e) {}

// ========== 邮件配置 ==========
// 创建邮件 transporter（使用你的邮箱配置）
let emailTransporter = null;

function initEmailTransporter() {
  if (!emailTransporter && process.env.DEBUG_EMAIL_HOST) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.DEBUG_EMAIL_HOST,
      port: parseInt(process.env.DEBUG_EMAIL_PORT) || 587,
      secure: process.env.DEBUG_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.DEBUG_EMAIL_USER,
        pass: process.env.DEBUG_EMAIL_PASS
      }
    });
    console.log('📧 邮件服务已初始化');
  }
}

// 发送调试码邮件
async function sendDebugCodeEmail(email, code, username) {
  initEmailTransporter();
  
  if (!emailTransporter) {
    console.log(`⚠️ 邮件服务未配置，调试码: ${code} (未发送)`);
    return false;
  }
  
  try {
    const info = await emailTransporter.sendMail({
      from: `"RP Chat 安全系统" <${process.env.DEBUG_EMAIL_USER}>`,
      to: email,
      subject: '【RP Chat】调试验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #06b6d4); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">RP Chat</h1>
            <p style="color: #e0f2fe; margin: 5px 0 0;">调试验证码</p>
          </div>
          <div style="background: #f8fafc; padding: 30px;">
            <p style="color: #334155;">尊敬的 <strong>${username}</strong>：</p>
            <p style="color: #334155;">您正在申请 RP Chat 调试模式授权，验证码如下：</p>
            <div style="background: #e2e8f0; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
            </div>
            <p style="color: #334155;">此验证码 <strong>5 分钟</strong>内有效，请勿泄露给他人。</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">如果这不是您本人的操作，请立即联系管理员。</p>
          </div>
          <div style="background: #1e293b; padding: 15px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">© RP Chat 安全系统</p>
          </div>
        </div>
      `,
      text: `您的调试验证码是：${code}，5分钟内有效。`
    });
    console.log(`✅ 调试码已发送至 ${email}`);
    return true;
  } catch (error) {
    console.error('发送邮件失败:', error);
    return false;
  }
}

// ========== 辅助函数 ==========
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

function saveBlacklist() {
  try {
    const obj = Object.fromEntries(blacklist);
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {}
}

function logSecurityEvent(type, req, details = {}) {
  const ip = getClientIp(req);
  const userId = req.userId || 'anonymous';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  const event = {
    type,
    timestamp: new Date().toISOString(),
    ip,
    userId,
    userAgent,
    method: req.method,
    url: req.url,
    ...details
  };
  
  try {
    fs.appendFileSync(SECURITY_LOG_FILE, JSON.stringify(event) + '\n');
    if (type.includes('SUSPICIOUS') || type.includes('FAILED') || type.includes('DEBUG')) {
      fs.appendFileSync(SUSPICIOUS_LOG_FILE, JSON.stringify(event) + '\n');
    }
  } catch (e) {}
  
  return event;
}

// ========== 开发者白名单 ==========
function isDeveloper(req) {
  const ip = getClientIp(req);
  const devIps = (process.env.DEV_IPS || '127.0.0.1,::1,localhost').split(',');
  
  if (devIps.includes(ip)) return true;
  
  const devToken = req.headers['x-dev-token'];
  if (devToken && devToken === process.env.DEV_TOKEN) return true;
  
  return false;
}

// ========== 调试授权中间件 ==========
async function debugAuthMiddleware(req, res, next) {
  const isDebugRequest = req.headers['x-debug-request'] === 'true' || 
                         req.query._debug === 'true';
  
  if (!isDebugRequest) {
    return next();
  }
  
  const debugToken = req.headers['x-debug-token'];
  const debugCode = req.headers['x-debug-code'];
  
  // 检查是否有活跃会话
  if (debugToken && debugSessions.has(debugToken)) {
    const session = debugSessions.get(debugToken);
    if (session.expiresAt > Date.now()) {
      logSecurityEvent('DEBUG_REQUEST', req, { sessionToken: debugToken.substring(0, 10) });
      return next();
    } else {
      debugSessions.delete(debugToken);
    }
  }
  
  // 需要验证码
  if (debugCode) {
    const DebugAuth = require('../models/DebugAuth');
    const auth = await DebugAuth.findOne({ 
      code: debugCode,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (auth) {
      auth.isUsed = true;
      auth.usedAt = new Date();
      await auth.save();
      
      const sessionToken = crypto.randomBytes(32).toString('hex');
      debugSessions.set(sessionToken, {
        userId: auth.userId,
        expiresAt: Date.now() + CONFIG.DEBUG_SESSION_DURATION,
        createdAt: Date.now()
      });
      
      logSecurityEvent('DEBUG_AUTHORIZED', req, { userId: auth.userId });
      
      return res.json({
        success: true,
        debugToken: sessionToken,
        expiresIn: CONFIG.DEBUG_SESSION_DURATION / 1000,
        expiresAt: new Date(Date.now() + CONFIG.DEBUG_SESSION_DURATION).toISOString()
      });
    }
    
    logSecurityEvent('DEBUG_AUTH_FAILED', req, { code: debugCode });
    return res.status(403).json({ error: '验证码无效或已过期' });
  }
  
  return res.status(401).json({
    error: '调试模式需要授权',
    code: 'DEBUG_AUTH_REQUIRED'
  });
}

// ========== 1. IP 黑名单中间件 ==========
function ipBlacklistMiddleware(req, res, next) {
  if (isDeveloper(req)) {
    return next();
  }
  
  const ip = getClientIp(req);
  const record = blacklist.get(ip);
  
  if (record && record.bannedAt) {
    if (Date.now() - record.bannedAt > CONFIG.BLACKLIST_DURATION) {
      blacklist.delete(ip);
      saveBlacklist();
      return next();
    }
    
    logSecurityEvent('BLACKLISTED_ACCESS', req, { reason: record.reason });
    return res.status(403).json({
      error: '您的 IP 已被限制访问，请联系管理员',
      code: 'IP_BANNED'
    });
  }
  
  next();
}

// ========== 2. 频率限制中间件 ==========
function rateLimitMiddleware(limit = CONFIG.RATE_LIMIT_MAX, windowMs = CONFIG.RATE_LIMIT_WINDOW) {
  return (req, res, next) => {
    if (isDeveloper(req)) {
      return next();
    }
    
    const ip = getClientIp(req);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    let timestamps = rateLimitStore.get(ip) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    if (timestamps.length >= limit) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', req, { limit, windowMs });
      
      const failRecord = failedAttempts.get(ip) || { count: 0 };
      failRecord.count++;
      failRecord.lastAttempt = now;
      failedAttempts.set(ip, failRecord);
      
      if (failRecord.count >= CONFIG.SUSPICIOUS_THRESHOLD) {
        blacklist.set(ip, {
          bannedAt: now,
          reason: 'RATE_LIMIT_ABUSE',
          attempts: failRecord.count
        });
        saveBlacklist();
        logSecurityEvent('AUTO_BANNED', req, { reason: 'RATE_LIMIT_ABUSE' });
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

// ========== 3. 恶意 User-Agent 检测 ==========
const MALICIOUS_PATTERNS = [
  /curl/i, /wget/i, /python/i, /java/i, /perl/i, /ruby/i,
  /go-http-client/i, /php/i, /scrapy/i, /sqlmap/i, /nmap/i,
  /nikto/i, /dirbuster/i, /gobuster/i, /hydra/i, /masscan/i,
  /zmap/i, /burp/i, /postman/i, /insomnia/i
];

function detectMaliciousUA(req, res, next) {
  if (isDeveloper(req)) {
    return next();
  }
  
  const ua = req.headers['user-agent'] || '';
  
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(ua)) {
      logSecurityEvent('MALICIOUS_UA_DETECTED', req, { userAgent: ua });
      return res.status(403).json({ error: '访问被拒绝', code: 'UA_BLOCKED' });
    }
  }
  
  next();
}

// ========== 4. Token 黑名单 ==========
function addToTokenBlacklist(token) {
  if (token && typeof token === 'string') {
    tokenBlacklist.set(token, Date.now() + CONFIG.TOKEN_BLACKLIST_DURATION);
    const now = Date.now();
    for (const [t, expires] of tokenBlacklist) {
      if (expires < now) tokenBlacklist.delete(t);
    }
  }
}

function tokenBlacklistMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (token && tokenBlacklist.has(token)) {
    logSecurityEvent('REVOKED_TOKEN_USED', req);
    return res.status(401).json({ error: 'Token 已失效，请重新登录', code: 'TOKEN_REVOKED' });
  }
  
  next();
}

// ========== 5. SQL注入/XSS检测 ==========
const INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript)/i,
  /(<\s*script|<\/script>)/i,
  /(onload|onerror|onclick|onmouseover)/i,
  /(eval\(|document\.|window\.|alert\()/i
];

function detectInjection(req, res, next) {
  const checkValue = (value) => {
    if (typeof value !== 'string') return false;
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(value)) return true;
    }
    return false;
  };
  
  for (const key in req.query) {
    if (checkValue(req.query[key])) {
      logSecurityEvent('INJECTION_ATTEMPT', req, { parameter: key });
      return res.status(400).json({ error: '无效的请求参数', code: 'INVALID_INPUT' });
    }
  }
  
  if (req.body) {
    for (const key in req.body) {
      const value = req.body[key];
      if (typeof value === 'string' && checkValue(value)) {
        logSecurityEvent('INJECTION_ATTEMPT', req, { parameter: key });
        return res.status(400).json({ error: '无效的请求参数', code: 'INVALID_INPUT' });
      }
    }
  }
  
  next();
}

// ========== 6. 路径遍历防护 ==========
function preventPathTraversal(req, res, next) {
  const url = req.url;
  if (url && (url.includes('../') || url.includes('..\\') || url.includes('/etc/') || url.includes('passwd'))) {
    logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', req, { path: url });
    return res.status(403).json({ error: '访问被拒绝', code: 'PATH_DENIED' });
  }
  next();
}

// ========== 7. 安全响应头 ==========
function securityHeaders(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

// ========== 8. 获取安全报告 ==========
function getSecurityReport() {
  let report = '';
  
  report += '='.repeat(60) + '\n';
  report += 'RP Chat 安全报告\n';
  report += '='.repeat(60) + '\n\n';
  
  report += '【IP 黑名单】\n';
  report += '-'.repeat(40) + '\n';
  for (const [ip, entry] of blacklist) {
    if (entry.bannedAt) {
      report += `IP: ${ip}\n`;
      report += `  封禁时间: ${new Date(entry.bannedAt).toLocaleString()}\n`;
      report += `  原因: ${entry.reason}\n`;
      report += `  尝试次数: ${entry.attempts || 1}\n\n`;
    }
  }
  if (blacklist.size === 0) report += '暂无封禁 IP\n\n';
  
  report += '【活跃调试会话】\n';
  report += '-'.repeat(40) + '\n';
  for (const [token, session] of debugSessions) {
    report += `会话: ${token.substring(0, 10)}...\n`;
    report += `  用户ID: ${session.userId}\n`;
    report += `  创建时间: ${new Date(session.createdAt).toLocaleString()}\n`;
    report += `  过期时间: ${new Date(session.expiresAt).toLocaleString()}\n\n`;
  }
  if (debugSessions.size === 0) report += '暂无活跃调试会话\n\n';
  
  report += '='.repeat(60) + '\n';
  report += `报告生成时间: ${new Date().toLocaleString()}\n`;
  
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
  debugAuthMiddleware,
  addToTokenBlacklist,
  logSecurityEvent,
  getSecurityReport,
  getClientIp,
  isDeveloper,
  sendDebugCodeEmail,
  debugSessions,
  CONFIG
};