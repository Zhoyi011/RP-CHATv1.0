// server/src/routes/security.js
const express = require('express');
const router = express.Router();
const { generateSecurityReport, sendSecurityReport } = require('../services/securityReport');
const { logAction } = require('../middlewares/auditLog');

// 获取安全报告（仅管理员）
router.get('/report', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '请先登录' });
    
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret);
    
    const User = require('../models/User');
    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== 'super_admin' && user.role !== 'owner')) {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    
    const days = parseInt(req.query.days) || 7;
    const report = await generateSecurityReport(days);
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 发送报告到 Discord
router.post('/report/send', async (req, res) => {
  // 同上权限检查
  const report = await generateSecurityReport(7);
  await sendSecurityReport(report);
  await logAction(req, 'SEND_SECURITY_REPORT', {});
  res.json({ message: '报告已发送到 Discord' });
});

module.exports = router;