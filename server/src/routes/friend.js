// server/src/routes/friend.js
const express = require('express');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const Persona = require('../models/Persona');
const User = require('../models/User');
const Post = require('../models/Post');

const router = express.Router();

// ========== 辅助函数 ==========

// 从 token 获取当前角色
const getCurrentPersona = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret);
    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId: decoded.userId }).populate('personaId');
    return active?.personaId || null;
  } catch (error) {
    console.error('获取角色失败:', error);
    return null;
  }
};

// 中间件：需要角色
const requirePersona = async (req, res, next) => {
  const persona = await getCurrentPersona(req);
  if (!persona) {
    return res.status(401).json({ success: false, message: '请先选择一个角色' });
  }
  req.persona = persona;
  next();
};

// ========== 1. 获取好友列表 ==========
router.get('/list', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;
    
    const friends = await Friend.find({ personaId })
      .populate('friendPersonaId', 'name displayName avatar sameNameNumber');
    
    const list = friends.map(f => ({
      id: f._id,
      friend: {
        id: f.friendPersonaId._id,
        name: f.friendPersonaId.name,
        displayName: f.friendPersonaId.displayName,
        avatar: f.friendPersonaId.avatar,
        sameNameNumber: f.friendPersonaId.sameNameNumber
      },
      createdAt: f.createdAt
    }));
    
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 2. 获取好友申请列表 ==========
router.get('/requests', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;
    
    const requests = await FriendRequest.find({ 
      toPersonaId: personaId, 
      status: 'pending' 
    }).populate('fromPersonaId', 'name displayName avatar sameNameNumber');
    
    const list = requests.map(r => ({
      id: r._id,
      fromPersona: {
        id: r.fromPersonaId._id,
        name: r.fromPersonaId.name,
        displayName: r.fromPersonaId.displayName,
        avatar: r.fromPersonaId.avatar,
        sameNameNumber: r.fromPersonaId.sameNameNumber
      },
      message: r.message,
      createdAt: r.createdAt
    }));
    
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('获取申请列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 3. 搜索角色 ==========
router.get('/search', requirePersona, async (req, res) => {
  try {
    const { q } = req.query;
    const currentPersonaId = req.persona._id;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }
    
    // 搜索角色
    const personas = await Persona.find({
      _id: { $ne: currentPersonaId },
      status: 'approved',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ]
    }).limit(20);
    
    // 获取好友关系
    const friends = await Friend.find({ personaId: currentPersonaId }).select('friendPersonaId');
    const friendIds = new Set(friends.map(f => f.friendPersonaId.toString()));
    
    // 获取待处理申请
    const pendingRequests = await FriendRequest.find({
      $or: [
        { fromPersonaId: currentPersonaId, status: 'pending' },
        { toPersonaId: currentPersonaId, status: 'pending' }
      ]
    });
    
    const result = personas.map(p => {
      const isFriend = friendIds.has(p._id.toString());
      const pendingFromMe = pendingRequests.some(r => 
        r.fromPersonaId.toString() === currentPersonaId.toString() && 
        r.toPersonaId.toString() === p._id.toString()
      );
      const pendingToMe = pendingRequests.some(r => 
        r.fromPersonaId.toString() === p._id.toString() && 
        r.toPersonaId.toString() === currentPersonaId.toString()
      );
      
      let requestStatus = null;
      if (pendingFromMe) requestStatus = 'sent';
      if (pendingToMe) requestStatus = 'received';
      
      return {
        id: p._id,
        name: p.name,
        displayName: p.displayName,
        avatar: p.avatar,
        sameNameNumber: p.sameNameNumber,
        isFriend,
        requestStatus
      };
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 4. 发送好友申请 ==========
router.post('/request', requirePersona, async (req, res) => {
  try {
    const { toPersonaId, message } = req.body;
    const fromPersonaId = req.persona._id;
    
    console.log('📝 发送申请:', { fromPersonaId, toPersonaId });
    
    // 验证
    if (!toPersonaId) {
      return res.status(400).json({ success: false, message: '缺少目标角色' });
    }
    
    if (fromPersonaId.toString() === toPersonaId) {
      return res.status(400).json({ success: false, message: '不能添加自己' });
    }
    
    // 检查目标角色是否存在
    const targetPersona = await Persona.findById(toPersonaId);
    if (!targetPersona) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    
    // 检查是否已经是好友
    const existingFriend = await Friend.findOne({
      $or: [
        { personaId: fromPersonaId, friendPersonaId: toPersonaId },
        { personaId: toPersonaId, friendPersonaId: fromPersonaId }
      ]
    });
    if (existingFriend) {
      return res.status(400).json({ success: false, message: '已经是好友了' });
    }
    
    // 检查是否有待处理的申请
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { fromPersonaId, toPersonaId, status: 'pending' },
        { fromPersonaId: toPersonaId, toPersonaId: fromPersonaId, status: 'pending' }
      ]
    });
    
    if (existingRequest) {
      return res.status(400).json({ success: false, message: '已有待处理的好友申请' });
    }
    
    // 创建申请
    const request = new FriendRequest({
      fromPersonaId,
      toPersonaId,
      message: message || '想和你成为好友'
    });
    
    await request.save();
    
    // 通知目标用户
    const targetUser = await User.findById(targetPersona.userId);
    const io = req.app.get('io');
    
    if (targetUser && io) {
      io.to(`user:${targetUser._id}`).emit('friend-request-received', {
        id: request._id,
        fromPersona: {
          id: req.persona._id,
          name: req.persona.name,
          displayName: req.persona.displayName,
          avatar: req.persona.avatar,
          sameNameNumber: req.persona.sameNameNumber
        },
        message: request.message,
        createdAt: request.createdAt
      });
      console.log('✅ 通知已发送到用户:', targetUser._id);
    }
    
    res.json({ success: true, message: '好友申请已发送' });
  } catch (error) {
    console.error('发送申请失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 5. 处理好友申请 ==========
router.post('/request/:requestId/handle', requirePersona, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    const personaId = req.persona._id;
    
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }
    
    if (request.toPersonaId.toString() !== personaId.toString()) {
      return res.status(403).json({ success: false, message: '无权处理' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: '申请已处理' });
    }
    
    if (action === 'accept') {
      // 创建双向好友关系
      await Friend.create([
        { personaId: request.fromPersonaId, friendPersonaId: request.toPersonaId },
        { personaId: request.toPersonaId, friendPersonaId: request.fromPersonaId }
      ]);
      
      request.status = 'accepted';
      await request.save();
      
      // 通知申请者
      const fromPersona = await Persona.findById(request.fromPersonaId);
      const fromUser = await User.findById(fromPersona.userId);
      const io = req.app.get('io');
      
      if (fromUser && io) {
        io.to(`user:${fromUser._id}`).emit('friend-request-accepted', {
          personaId: request.toPersonaId,
          personaName: req.persona.displayName || req.persona.name
        });
      }
      
      res.json({ success: true, message: '已添加好友' });
    } else if (action === 'reject') {
      request.status = 'rejected';
      await request.save();
      res.json({ success: true, message: '已拒绝申请' });
    } else {
      res.status(400).json({ success: false, message: '无效操作' });
    }
  } catch (error) {
    console.error('处理申请失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 6. 删除好友 ==========
router.delete('/:friendPersonaId', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;
    const { friendPersonaId } = req.params;
    
    await Friend.deleteMany({
      $or: [
        { personaId, friendPersonaId },
        { personaId: friendPersonaId, friendPersonaId: personaId }
      ]
    });
    
    res.json({ success: true, message: '已删除好友' });
  } catch (error) {
    console.error('删除好友失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 7. 获取好友动态 ==========
router.get('/feed', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;
    const limit = parseInt(req.query.limit) || 20;
    
    // 获取好友列表
    const friends = await Friend.find({ personaId }).select('friendPersonaId');
    const friendIds = friends.map(f => f.friendPersonaId);
    
    if (friendIds.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // 获取好友的动态
    const posts = await Post.find({
      personaId: { $in: friendIds },
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('personaId', 'name displayName avatar sameNameNumber');
    
    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('获取好友动态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;