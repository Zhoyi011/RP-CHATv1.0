// server/src/middlewares/auditLog.js
const AuditLog = require('../models/AuditLog');

async function logAction(req, action, details = {}, status = 'success') {
  try {
    const userId = req.userId;
    let username = 'unknown';
    
    if (userId) {
      const User = require('../models/User');
      const user = await User.findById(userId);
      username = user?.username || 'unknown';
    }
    
    const log = new AuditLog({
      userId,
      username,
      action,
      details,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      status
    });
    
    await log.save();
  } catch (error) {
    console.error('记录审计日志失败:', error);
  }
}

module.exports = { logAction };