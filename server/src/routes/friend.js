// server/src/routes/friend.js
const express = require('express');
const mongoose = require('mongoose');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const Persona = require('../models/Persona');
const User = require('../models/User');
const Post = require('../models/Post');
const { emitToUser } = require('../utils/socketHelper');

const router = express.Router();

// ========== 辅助函数 ==========

// 从 token 获取当前用户和激活的角色
const getCurrentUserAndPersona = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, persona: null };
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);
    if (!user) return { user: null, persona: null };
    
    // 获取当前激活的角色
    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId: user._id }).populate('personaId');
    const persona = active?.personaId || null;
    
    return { user, persona };
  } catch (error) {
    return { user: null, persona: null };
  }
};

// ========== 中间件：获取当前角色 ==========
const requirePersona = async (req, res, next) => {
  const { user, persona } = await getCurrentUserAndPersona(req);
  if (!user || !persona) {
    return res.status(401).json({ success: false, message: '请先登录并选择角色' });
  }
  req.user = user;
  req.persona = persona;
  next();
};

// ========== 获取角色的好友列表 ==========
router.get('/list', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;
    const { group, search } = req.query;

    const filter = { personaId, status: 'accepted' };
    if (group && group !== 'all') {
      filter.group = group;
    }

    let friends = await Friend.find(filter)
      .populate('friendPersonaId', 'name displayName avatar status sameNameNumber')
      .sort({ isStarred: -1, lastInteractionAt: -1, createdAt: -1 });

    if (search) {
      const searchLower = search.toLowerCase();
      friends = friends.filter(f => 
        (f.friendPersonaId.displayName || f.friendPersonaId.name).toLowerCase().includes(searchLower)
      );
    }

    const friendList = friends.map(f => ({
      id: f._id,
      friend: {
        id: f.friendPersonaId._id,
        name: f.friendPersonaId.name,
        displayName: f.friendPersonaId.displayName,
        avatar: f.friendPersonaId.avatar,
        status: f.friendPersonaId.status,
        sameNameNumber: f.friendPersonaId.sameNameNumber
      },
      nickname: f.nickname,
      group: f.group,
      isStarred: f.isStarred,
      intimacy: f.intimacy,
      lastInteractionAt: f.lastInteractionAt,
      createdAt: f.createdAt
    }));

    const grouped = {};
    friendList.forEach(f => {
      if (!grouped[f.group]) grouped[f.group] = [];
      grouped[f.group].push(f);
    });

    res.json({
      success: true,
      data: friendList,
      grouped,
      groups: Object.keys(grouped)
    });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 获取好友申请列表 ==========
router.get('/requests', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;

    const received = await FriendRequest.find({
      toPersonaId: personaId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('fromPersonaId', 'name displayName avatar status sameNameNumber');

    const sent = await FriendRequest.find({
      fromPersonaId: personaId,
      status: 'pending'
    }).populate('toPersonaId', 'name displayName avatar status sameNameNumber');

    res.json({
      success: true,
      data: {
        received: received.map(r => ({
          id: r._id,
          fromPersona: {
            id: r.fromPersonaId._id,
            name: r.fromPersonaId.name,
            displayName: r.fromPersonaId.displayName,
            avatar: r.fromPersonaId.avatar,
            status: r.fromPersonaId.status,
            sameNameNumber: r.fromPersonaId.sameNameNumber
          },
          message: r.message,
          createdAt: r.createdAt,
          expiresAt: r.expiresAt
        })),
        sent: sent.map(s => ({
          id: s._id,
          toPersona: {
            id: s.toPersonaId._id,
            name: s.toPersonaId.name,
            displayName: s.toPersonaId.displayName,
            avatar: s.toPersonaId.avatar
          },
          message: s.message,
          createdAt: s.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('获取好友申请失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 搜索角色（添加好友用） ==========
router.get('/search-personas', requirePersona, async (req, res) => {
  try {
    const { q } = req.query;
    const currentPersonaId = req.persona._id;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // 搜索角色（排除自己的角色，只搜索已批准的角色）
    const personas = await Persona.find({
      _id: { $ne: currentPersonaId },
      status: 'approved',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name displayName avatar status sameNameNumber userId')
    .limit(20)
    .populate('userId', 'username');

    // 获取好友关系状态
    const friendIds = await Friend.getFriendPersonaIds(currentPersonaId);
    const pendingRequests = await FriendRequest.find({
      $or: [
        { fromPersonaId: currentPersonaId, status: 'pending' },
        { toPersonaId: currentPersonaId, status: 'pending' }
      ]
    }).select('fromPersonaId toPersonaId status');

    const result = personas.map(persona => {
      const isFriend = friendIds.some(id => id.toString() === persona._id.toString());
      const pendingRequest = pendingRequests.find(req => 
        (req.fromPersonaId.toString() === persona._id.toString() && req.status === 'pending') ||
        (req.toPersonaId.toString() === persona._id.toString() && req.status === 'pending')
      );
      
      let requestStatus = null;
      if (pendingRequest) {
        if (pendingRequest.fromPersonaId.toString() === currentPersonaId.toString()) {
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
        status: persona.status,
        sameNameNumber: persona.sameNameNumber,
        ownerUsername: persona.userId?.username,
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

// ========== 发送好友申请（角色之间） ==========
router.post('/request', requirePersona, async (req, res) => {
  try {
    const { toPersonaId, message } = req.body;
    const fromPersonaId = req.persona._id;

    if (!toPersonaId) {
      return res.status(400).json({ success: false, message: '缺少目标角色ID' });
    }

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
    const areFriends = await Friend.areFriends(fromPersonaId, toPersonaId);
    if (areFriends) {
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
      if (existingRequest.fromPersonaId.toString() === fromPersonaId.toString()) {
        return res.status(400).json({ success: false, message: '已发送过好友申请，请等待对方处理' });
      } else {
        return res.status(400).json({ success: false, message: '对方已向你发送好友申请，请去处理' });
      }
    }

    const request = new FriendRequest({
      fromPersonaId,
      toPersonaId,
      message: message || '请求添加你为好友'
    });

    await request.save();

    // 获取目标角色的主人用户ID，用于 Socket 通知
    const targetUser = await User.findById(targetPersona.userId);
    if (targetUser) {
      emitToUser(targetUser._id.toString(), 'friend-request-received', {
        id: request._id,
        fromPersona: {
          id: req.persona._id,
          name: req.persona.name,
          displayName: req.persona.displayName,
          avatar: req.persona.avatar
        },
        message: request.message,
        createdAt: request.createdAt
      });
    }

    res.json({
      success: true,
      message: '好友申请已发送',
      data: request
    });
  } catch (error) {
    console.error('发送好友申请失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 处理好友申请 ==========
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

      const fromPersona = await Persona.findById(request.fromPersonaId);
      const fromUser = await User.findById(fromPersona.userId);

      if (fromUser) {
        emitToUser(fromUser._id.toString(), 'friend-request-accepted', {
          personaId: request.toPersonaId,
          personaName: req.persona.displayName || req.persona.name,
          personaAvatar: req.persona.avatar
        });
      }

      res.json({
        success: true,
        message: '已添加好友',
        data: {
          friendPersonaId: request.fromPersonaId,
          name: fromPersona?.displayName || fromPersona?.name
        }
      });
    } else if (action === 'reject') {
      request.status = 'rejected';
      await request.save();
      res.json({ success: true, message: '已拒绝好友申请' });
    } else {
      res.status(400).json({ success: false, message: '无效的操作' });
    }
  } catch (error) {
    console.error('处理好友申请失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 删除好友关系 ==========
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

// ========== 修改好友备注/分组 ==========
router.put('/:friendPersonaId', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;
    const { friendPersonaId } = req.params;
    const { nickname, group, isStarred } = req.body;

    const friendship = await Friend.findOne({ personaId, friendPersonaId });
    if (!friendship) {
      return res.status(404).json({ success: false, message: '好友关系不存在' });
    }

    if (nickname !== undefined) friendship.nickname = nickname || null;
    if (group !== undefined) friendship.group = group;
    if (isStarred !== undefined) friendship.isStarred = isStarred;

    await friendship.save();

    res.json({ success: true, message: '更新成功', data: friendship });
  } catch (error) {
    console.error('更新好友信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 获取好友角色的动态 ==========
router.get('/feed-posts', requirePersona, async (req, res) => {
  try {
    const personaId = req.persona._id;
    const limit = parseInt(req.query.limit) || 10;

    const friendPersonaIds = await Friend.getFriendPersonaIds(personaId);

    if (friendPersonaIds.length === 0) {
      return res.json({ success: true, data: [], hasNewPosts: false });
    }

    const posts = await Post.find({
      personaId: { $in: friendPersonaIds },
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('personaId', 'name displayName avatar sameNameNumber')
    .populate('userId', 'username');

    res.json({ success: true, data: posts, hasNewPosts: false });
  } catch (error) {
    console.error('获取好友动态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;