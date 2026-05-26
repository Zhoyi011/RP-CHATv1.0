// server/src/middleware/roleMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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