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
    console.log('📊 查询维护模式:', maintenanceMode);
    console.log('📊 查询维护消息:', maintenanceMessage);
    console.log('📊 查询维护结束时间:', maintenanceEndTime);

    res.json({
      maintenanceMode: maintenanceMode?.value || false,
      message: maintenanceMessage?.value || '服务器正在维护中，请稍后再试。',
      endTime: maintenanceEndTime?.value || null
    });
  } catch (error) {
    console.error('查询维护模式失败:', error); 
    res.json({ maintenanceMode: false, message: '' });
  }
});

// 开启/关闭维护模式（仅超级管理员）
router.post('/maintenance/toggle', superAdminMiddleware, async (req, res) => {
  try {
    const { enabled, message, endTime } = req.body;
    
    console.log('🔧 切换维护模式:', { enabled, message, endTime });  // 调试日志
    
    // 使用 updateOne 更可靠
    await SystemSettings.updateOne(
      { key: 'maintenance_mode' },
      { 
        $set: { 
          value: enabled, 
          updatedBy: req.userId, 
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );
    
    if (message !== undefined) {
      await SystemSettings.updateOne(
        { key: 'maintenance_message' },
        { 
          $set: { 
            value: message, 
            updatedBy: req.userId, 
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );
    }
    
    if (endTime !== undefined) {
      await SystemSettings.updateOne(
        { key: 'maintenance_end_time' },
        { 
          $set: { 
            value: endTime, 
            updatedBy: req.userId, 
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );
    }
    
    // 验证是否写入成功
    const verify = await SystemSettings.findOne({ key: 'maintenance_mode' });
    console.log('✅ 验证写入结果:', verify);
    
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
    res.status(500).json({ error: '操作失败: ' + error.message });
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

// ========== 维护计划管理 ==========
const MaintenanceSchedule = require('../models/MaintenanceSchedule');

// 获取所有维护计划
router.get('/maintenance/schedules', superAdminMiddleware, async (req, res) => {
  try {
    const schedules = await MaintenanceSchedule.find()
      .sort({ startTime: 1 })
      .populate('createdBy', 'username');
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('获取维护计划失败:', error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 创建维护计划
router.post('/maintenance/schedules', superAdminMiddleware, async (req, res) => {
  try {
    const { name, startTime, endTime, message, repeatWeekly, repeatDays, note } = req.body;
    
    const schedule = new MaintenanceSchedule({
      name: name || '维护计划',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      message: message || '服务器正在维护中，请稍后再试。',
      repeatWeekly: repeatWeekly || false,
      repeatDays: repeatDays || [],
      note: note || '',
      createdBy: req.userId
    });
    
    await schedule.save();
    
    res.json({ success: true, message: '维护计划已创建', data: schedule });
  } catch (error) {
    console.error('创建维护计划失败:', error);
    res.status(500).json({ error: '创建失败' });
  }
});

// 更新维护计划
router.put('/maintenance/schedules/:id', superAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, message, isActive, repeatWeekly, repeatDays, note } = req.body;
    
    const schedule = await MaintenanceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: '计划不存在' });
    }
    
    if (name) schedule.name = name;
    if (startTime) schedule.startTime = new Date(startTime);
    if (endTime) schedule.endTime = new Date(endTime);
    if (message) schedule.message = message;
    if (isActive !== undefined) schedule.isActive = isActive;
    if (repeatWeekly !== undefined) schedule.repeatWeekly = repeatWeekly;
    if (repeatDays) schedule.repeatDays = repeatDays;
    if (note !== undefined) schedule.note = note;
    
    await schedule.save();
    
    res.json({ success: true, message: '维护计划已更新', data: schedule });
  } catch (error) {
    console.error('更新维护计划失败:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除维护计划
router.delete('/maintenance/schedules/:id', superAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await MaintenanceSchedule.findByIdAndDelete(id);
    res.json({ success: true, message: '维护计划已删除' });
  } catch (error) {
    console.error('删除维护计划失败:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

// 检查并执行维护计划
router.post('/maintenance/check-schedules', async (req, res) => {
  try {
    const now = new Date();
    
    // 查找需要开始的维护计划
    const toStart = await MaintenanceSchedule.find({
      isActive: true,
      isExecuted: false,
      startTime: { $lte: now },
      endTime: { $gt: now }
    });
    
    for (const schedule of toStart) {
      // 开启维护模式
      await SystemSettings.findOneAndUpdate(
        { key: 'maintenance_mode' },
        { value: true, updatedAt: new Date() },
        { upsert: true }
      );
      await SystemSettings.findOneAndUpdate(
        { key: 'maintenance_message' },
        { value: schedule.message, updatedAt: new Date() },
        { upsert: true }
      );
      await SystemSettings.findOneAndUpdate(
        { key: 'maintenance_end_time' },
        { value: schedule.endTime.toISOString(), updatedAt: new Date() },
        { upsert: true }
      );
      
      schedule.isExecuted = true;
      await schedule.save();
      
      console.log(`✅ 维护计划已执行: ${schedule.name}`);
    }
    
    // ⚠️ 重要：只有当维护模式是由定时计划开启的，才自动关闭
    // 检查是否有手动开启的维护模式（没有关联的活跃计划）
    const hasActiveSchedule = await MaintenanceSchedule.findOne({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gt: now }
    });
    
    // 只有当存在活跃计划且计划已结束时，才关闭维护模式
    // 否则不自动关闭（保留手动开启的维护模式）
    if (hasActiveSchedule && now > hasActiveSchedule.endTime) {
      // 检查是否还有其他活跃计划
      const otherActive = await MaintenanceSchedule.findOne({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gt: now },
        _id: { $ne: hasActiveSchedule._id }
      });
      
      if (!otherActive) {
        await SystemSettings.findOneAndUpdate(
          { key: 'maintenance_mode' },
          { value: false, updatedAt: new Date() },
          { upsert: true }
        );
        console.log(`✅ 维护计划已结束，维护模式已关闭: ${hasActiveSchedule.name}`);
      }
    }
    
    res.json({ success: true, started: toStart.length });
  } catch (error) {
    console.error('检查维护计划失败:', error);
    res.status(500).json({ error: '检查失败' });
  }
});

// 获取维护模式豁免设置
router.get('/maintenance/exempt-admin', async (req, res) => {
  try {
    const exemptAdmin = await SystemSettings.findOne({ key: 'maintenance_exempt_admin' });
    res.json({ exemptAdmin: exemptAdmin?.value === true });
  } catch (error) {
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 设置维护模式豁免
router.post('/maintenance/exempt-admin', superAdminMiddleware, async (req, res) => {
  try {
    const { exemptAdmin } = req.body;
    await SystemSettings.findOneAndUpdate(
      { key: 'maintenance_exempt_admin' },
      { value: exemptAdmin === true, updatedBy: req.userId, updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ success: true, exemptAdmin: exemptAdmin === true });
  } catch (error) {
    res.status(500).json({ error: '设置失败' });
  }
});

module.exports = router;