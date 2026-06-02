// server/src/routes/friend.js
const express = require('express');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const Persona = require('../models/Persona');
const { emitToUser } = require('../utils/socketHelper');

const router = express.Router();

// ========== 辅助函数 ==========

// 从 token 获取当前用户和激活的角色
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
    console.error('获取当前角色失败:', error);
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
    
    const friends = await Friend.find({ 
      personaId, 
      status: 'accepted' 
    })
    .populate('friendPersonaId', 'name displayName avatar sameNameNumber')
    .sort({ isStarred: -1, intimacy: -1, createdAt: -1 });

    const friendList = friends.map(f => ({
      id: f._id,
      friend: {
        id: f.friendPersonaId._id,
        name: f.friendPersonaId.name,
        displayName: f.friendPersonaId.displayName,
        avatar: f.friendPersonaId.avatar,
        sameNameNumber: f.friendPersonaId.sameNameNumber
      },
      nickname: f.nickname,
      group: f.group,
      isStarred: f.isStarred,
      intimacy: f.intimacy,
      createdAt: f.createdAt
    }));

    res.json({ success: true, data: friendList });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 2. 获取好友申请列表 ==========
router.get('/requests', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;

    const received = await FriendRequest.find({
      toPersonaId: personaId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('fromPersonaId', 'name displayName avatar sameNameNumber');

    const formatted = received.map(r => ({
      id: r._id,
      fromPersona: {
        id: r.fromPersonaId._id,
        name: r.fromPersonaId.name,
        displayName: r.fromPersonaId.displayName,
        avatar: r.fromPersonaId.avatar,
        sameNameNumber: r.fromPersonaId.sameNameNumber
      },
      message: r.message,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('获取好友申请失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 3. 搜索角色（添加好友用） ==========
router.get('/search', requirePersona, async (req, res) => {
  try {
    const { q } = req.query;
    const currentPersonaId = req.persona._id;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // 搜索角色（只显示已批准的角色，排除自己）
    const personas = await Persona.find({
      _id: { $ne: currentPersonaId },
      status: 'approved',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name displayName avatar sameNameNumber')
    .limit(20);

    // 获取好友关系
    const friendIds = await Friend.find({ 
      personaId: currentPersonaId, 
      status: 'accepted' 
    }).select('friendPersonaId');
    const friendIdSet = new Set(friendIds.map(f => f.friendPersonaId.toString()));

    // 获取待处理申请
    const pendingRequests = await FriendRequest.find({
      $or: [
        { fromPersonaId: currentPersonaId, status: 'pending' },
        { toPersonaId: currentPersonaId, status: 'pending' }
      ]
    });

    const result = personas.map(persona => {
      const isFriend = friendIdSet.has(persona._id.toString());
      const pending = pendingRequests.find(req => 
        req.fromPersonaId.toString() === persona._id.toString() ||
        req.toPersonaId.toString() === persona._id.toString()
      );
      
      let requestStatus = null;
      if (pending) {
        if (pending.fromPersonaId.toString() === currentPersonaId.toString()) {
          requestStatus = 'sent';
        } else {
          requestStatus = 'received';
        }
      }

      return {
        id: persona._id,
        name: persona.name,
        displayName: persona.displayName,
        avatar: persona.avatar,
        sameNameNumber: persona.sameNameNumber,
        isFriend,
        requestStatus
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('搜索角色失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 4. 发送好友申请（带冷却限制） ==========
router.post('/request', requirePersona, async (req, res) => {
  try {
    const { toPersonaId, message } = req.body;
    const fromPersonaId = req.persona._id;

    if (!toPersonaId) {
      return res.status(400).json({ success: false, message: '缺少目标角色ID' });
    }

    // 允许同账户的不同角色加好友，只禁止加自己
    if (fromPersonaId.toString() === toPersonaId) {
      return res.status(400).json({ success: false, message: '不能添加自己为好友' });
    }

    const targetPersona = await Persona.findById(toPersonaId);
    if (!targetPersona) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }

    if (targetPersona.status !== 'approved') {
      return res.status(400).json({ success: false, message: '该角色尚未通过审核' });
    }

    // 检查是否已经是好友
    const existingFriend = await Friend.findOne({
      personaId: fromPersonaId,
      friendPersonaId: toPersonaId,
      status: 'accepted'
    });
    if (existingFriend) {
      return res.status(400).json({ success: false, message: '已经是好友了' });
    }

    // 检查是否有待处理的申请
    const existingPendingRequest = await FriendRequest.findOne({
      fromPersonaId,
      toPersonaId,
      status: 'pending'
    });
    if (existingPendingRequest) {
      return res.status(400).json({ success: false, message: '已发送过好友申请，请等待对方处理' });
    }

    // 检查是否有被拒绝的申请（30分钟冷却）
    const rejectedRequest = await FriendRequest.findOne({
      fromPersonaId,
      toPersonaId,
      status: 'rejected'
    }).sort({ updatedAt: -1 });

    if (rejectedRequest) {
      const now = new Date();
      const lastRejectedTime = new Date(rejectedRequest.updatedAt);
      const minutesSinceRejection = (now - lastRejectedTime) / (1000 * 60);
      
      if (minutesSinceRejection < 30) {
        const remainingMinutes = Math.ceil(30 - minutesSinceRejection);
        return res.status(429).json({ 
          success: false, 
          message: `对方拒绝了你的好友申请，请 ${remainingMinutes} 分钟后再次尝试` 
        });
      }
    }

    // 检查是否有被取消/过期的申请（30分钟冷却）
    const canceledRequest = await FriendRequest.findOne({
      fromPersonaId,
      toPersonaId,
      status: { $in: ['canceled'] }
    }).sort({ updatedAt: -1 });

    if (canceledRequest) {
      const now = new Date();
      const lastCancelTime = new Date(canceledRequest.updatedAt);
      const minutesSinceCancel = (now - lastCancelTime) / (1000 * 60);
      
      if (minutesSinceCancel < 30) {
        const remainingMinutes = Math.ceil(30 - minutesSinceCancel);
        return res.status(429).json({ 
          success: false, 
          message: `申请已过期，请 ${remainingMinutes} 分钟后再次尝试` 
        });
      }
    }

    const request = new FriendRequest({
      fromPersonaId,
      toPersonaId,
      message: message || '请求添加你为好友'
    });

    await request.save();

    // 通知目标角色的主人
    const targetUser = await Persona.findById(toPersonaId).populate('userId');
    if (targetUser && targetUser.userId) {
      emitToUser(targetUser.userId._id.toString(), 'friend-request-received', {
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
    }

    res.json({ success: true, message: '好友申请已发送', data: request });
  } catch (error) {
    console.error('发送好友申请失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 5. 处理好友申请（同意/拒绝） ==========
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
      return res.status(403).json({ success: false, message: '无权处理此申请' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: '申请已处理' });
    }

    if (request.expiresAt < new Date()) {
      request.status = 'canceled';
      await request.save();
      return res.status(400).json({ success: false, message: '申请已过期' });
    }

    if (action === 'accept') {
      // 创建双向好友关系
      const friend1 = new Friend({
        personaId: request.fromPersonaId,
        friendPersonaId: request.toPersonaId,
        status: 'accepted'
      });
      const friend2 = new Friend({
        personaId: request.toPersonaId,
        friendPersonaId: request.fromPersonaId,
        status: 'accepted'
      });

      await Promise.all([friend1.save(), friend2.save()]);

      request.status = 'accepted';
      await request.save();

      // 通知申请者
      const fromPersona = await Persona.findById(request.fromPersonaId);
      const fromUser = await Persona.findById(request.fromPersonaId).populate('userId');
      if (fromUser && fromUser.userId) {
        emitToUser(fromUser.userId._id.toString(), 'friend-request-accepted', {
          personaId: request.toPersonaId,
          personaName: req.persona.displayName || req.persona.name,
          personaAvatar: req.persona.avatar
        });
      }

      res.json({ success: true, message: '已添加好友' });
    } else if (action === 'reject') {
      request.status = 'rejected';
      await request.save();  // 会自动更新 updatedAt
      res.json({ success: true, message: '已拒绝好友申请' });
    } else {
      res.status(400).json({ success: false, message: '无效的操作' });
    }
  } catch (error) {
    console.error('处理好友申请失败:', error);
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

    await FriendRequest.deleteMany({
      $or: [
        { fromPersonaId: personaId, toPersonaId: friendPersonaId },
        { fromPersonaId: friendPersonaId, toPersonaId: personaId }
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

    const friends = await Friend.find({ 
      personaId, 
      status: 'accepted' 
    }).select('friendPersonaId');
    
    const friendIds = friends.map(f => f.friendPersonaId);

    if (friendIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const Post = require('../models/Post');
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