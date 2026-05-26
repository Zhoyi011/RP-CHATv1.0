// server/src/routes/admin.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');
const { logAction } = require('../middlewares/auditLog');
const { triggerAlert } = require('../middlewares/securityMiddleware');

// 超级管理员中间件
const superAdminMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== 'super_admin' && user.role !== 'owner')) {
      return res.status(403).json({ error: '需要超级管理员权限' });
    }
    req.userId = decoded.userId;
    req.userRole = user.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// 获取维护模式状态（公开接口）
router.get('/maintenance/status', async (req, res) => {
  try {
    const maintenanceMode = await SystemSettings.findOne({ key: 'maintenance_mode' });
    const maintenanceMessage = await SystemSettings.findOne({ key: 'maintenance_message' });
    const maintenanceEndTime = await SystemSettings.findOne({ key: 'maintenance_end_time' });
    
    res.json({
      maintenanceMode: maintenanceMode?.value || false,
      message: maintenanceMessage?.value || '服务器正在维护中，请稍后再试。',
      endTime: maintenanceEndTime?.value || null
    });
  } catch (error) {
    res.json({ maintenanceMode: false, message: '' });
  }
});

// 开启/关闭维护模式（仅超级管理员）
router.post('/maintenance/toggle', superAdminMiddleware, async (req, res) => {
  try {
    const { enabled, message, endTime } = req.body;
    
    await SystemSettings.findOneAndUpdate(
      { key: 'maintenance_mode' },
      { value: enabled, updatedBy: req.userId, updatedAt: new Date() }
    );
    
    if (message !== undefined) {
      await SystemSettings.findOneAndUpdate(
        { key: 'maintenance_message' },
        { value: message, updatedBy: req.userId, updatedAt: new Date() }
      );
    }
    
    if (endTime !== undefined) {
      await SystemSettings.findOneAndUpdate(
        { key: 'maintenance_end_time' },
        { value: endTime, updatedBy: req.userId, updatedAt: new Date() }
      );
    }
    
    await logAction(req, enabled ? 'MAINTENANCE_MODE_ON' : 'MAINTENANCE_MODE_OFF', {
      message,
      endTime
    });
    
    await triggerAlert(enabled ? '🔧 维护模式已开启' : '✅ 维护模式已关闭', req, {
      action: enabled ? 'MAINTENANCE_ON' : 'MAINTENANCE_OFF'
    });
    
    res.json({ 
      success: true, 
      message: enabled ? '维护模式已开启' : '维护模式已关闭',
      maintenanceMode: enabled
    });
  } catch (error) {
    console.error('切换维护模式失败:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// 更新维护模式设置（仅超级管理员）
router.put('/maintenance/settings', superAdminMiddleware, async (req, res) => {
  try {
    const { message, endTime } = req.body;
    
    if (message !== undefined) {
      await SystemSettings.findOneAndUpdate(
        { key: 'maintenance_message' },
        { value: message, updatedBy: req.userId, updatedAt: new Date() }
      );
    }
    
    if (endTime !== undefined) {
      await SystemSettings.findOneAndUpdate(
        { key: 'maintenance_end_time' },
        { value: endTime, updatedBy: req.userId, updatedAt: new Date() }
      );
    }
    
    res.json({ success: true, message: '设置已更新' });
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
});

module.exports = router;