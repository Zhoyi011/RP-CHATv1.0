// ==================== 角色权限中间件 ====================
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * 获取当前用户信息（从 token）
 */
const getCurrentUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    return user;
  } catch (error) {
    return null;
  }
};

/**
 * 检查是否为 super_admin 或 owner
 */
const requireSuperAdminOrOwner = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const allowedRoles = ['super_admin', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: '权限不足，需要超级管理员或所有者权限' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('权限检查错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 检查是否为 admin、super_admin 或 owner
 */
const requireAdminOrOwner = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    const allowedRoles = ['admin', 'super_admin', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: '权限不足，需要管理员权限' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('权限检查错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 检查特定角色（灵活版本）
 * @param {string[]} allowedRoles - 允许的角色列表
 */
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = await getCurrentUser(req);
      
      if (!user) {
        return res.status(401).json({ error: '请先登录' });
      }
      
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: `权限不足，需要以下角色之一: ${allowedRoles.join(', ')}` });
      }
      
      req.user = user;
      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  };
};

module.exports = {
  getCurrentUser,
  requireSuperAdminOrOwner,
  requireAdminOrOwner,
  requireRole
};