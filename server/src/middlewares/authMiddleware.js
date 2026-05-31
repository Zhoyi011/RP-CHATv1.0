// server/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(401).json({ error: '无效的认证令牌' });
  }
};

export default authMiddleware;