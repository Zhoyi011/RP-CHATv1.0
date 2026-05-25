// server/src/services/verificationCode.js
const crypto = require('crypto');

// 存储验证码（生产环境建议用 Redis）
const codeStore = new Map();

// 生成6位验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送验证码（使用免费邮件服务）
async function sendVerificationCode(email, code) {
  // 方案1：使用 Resend（免费3000封/月）
  // 方案2：使用 Ethereal（测试用）
  // 方案3：使用 Brevo（免费300封/天）
  
  console.log(`📧 验证码 ${code} 发送至 ${email}`);
  
  // TODO: 集成免费邮件服务
  // 暂时返回成功，实际需要发送邮件
  return true;
}

// 存储验证码
function storeCode(email, code, action) {
  codeStore.set(`${email}:${action}`, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5分钟
    attempts: 0
  });
}

// 验证验证码
function verifyCode(email, code, action) {
  const key = `${email}:${action}`;
  const record = codeStore.get(key);
  
  if (!record) {
    return { valid: false, reason: '验证码不存在或已过期' };
  }
  
  if (record.expiresAt < Date.now()) {
    codeStore.delete(key);
    return { valid: false, reason: '验证码已过期' };
  }
  
  record.attempts++;
  if (record.attempts > 3) {
    codeStore.delete(key);
    return { valid: false, reason: '验证码错误次数过多' };
  }
  
  if (record.code !== code) {
    codeStore.set(key, record);
    return { valid: false, reason: '验证码错误' };
  }
  
  codeStore.delete(key);
  return { valid: true, reason: '验证成功' };
}

module.exports = { generateCode, sendVerificationCode, storeCode, verifyCode };