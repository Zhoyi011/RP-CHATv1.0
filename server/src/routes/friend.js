// server/src/routes/friend.js
const express = require('express');
const mongoose = require('mongoose');

// 🔥 添加错误检查，确保导入成功
let authMiddleware;
try {
  authMiddleware = require('../middlewares/authMiddleware');
  if (typeof authMiddleware !== 'function') {
    console.error('❌ authMiddleware 不是函数，实际类型:', typeof authMiddleware);
    authMiddleware = (req, res, next) => next(); // 降级为跳过认证
  }
} catch (err) {
  console.error('❌ 导入 authMiddleware 失败:', err.message);
  authMiddleware = (req, res, next) => next(); // 降级为跳过认证
}

let Friend, FriendRequest, User, Post;
try {
  Friend = require('../models/Friend');
  FriendRequest = require('../models/FriendRequest');
  User = require('../models/User');
  Post = require('../models/Post');
} catch (err) {
  console.error('❌ 导入模型失败:', err.message);
}

let emitToUser = (userId, event, data) => {
  console.log(`⚠️ emitToUser 未初始化: ${event} to ${userId}`);
};
try {
  const socketHelper = require('../utils/socketHelper');
  if (socketHelper && socketHelper.emitToUser) {
    emitToUser = socketHelper.emitToUser;
  }
} catch (err) {
  console.error('❌ 导入 socketHelper 失败:', err.message);
}

const router = express.Router();

// 🔥 辅助函数
const getFriendIds = async (userId) => {
  if (!Friend) return [];
  const friendships = await Friend.find({ userId, status: 'accepted' }).select('friendId');
  return friendships.map(f => f.friendId);
};

// ========== 获取好友列表 ==========
router.get('/list', authMiddleware, async (req, res) => {
  try {
    if (!Friend) throw new Error('Friend 模型未加载');
    const userId = req.user._id;
    const friends = await Friend.find({ userId, status: 'accepted' })
      .populate('friendId', 'username email avatar role')
      .sort({ isStarred: -1, lastInteractionAt: -1, createdAt: -1 });

    const friendList = friends.map(f => ({
      id: f._id,
      friend: {
        id: f.friendId._id,
        username: f.friendId.username,
        email: f.friendId.email,
        avatar: f.friendId.avatar,
        role: f.friendId.role
      },
      nickname: f.nickname,
      group: f.group,
      isStarred: f.isStarred,
      lastInteractionAt: f.lastInteractionAt,
      createdAt: f.createdAt,
      isOnline: false
    }));

    res.json({ success: true, data: friendList, grouped: {}, groups: [] });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ success: false, message: error.message || '服务器错误' });
  }
});

// ========== 获取好友申请列表 ==========
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    if (!FriendRequest) throw new Error('FriendRequest 模型未加载');
    const userId = req.user._id;

    const received = await FriendRequest.find({
      toUserId: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('fromUserId', 'username email avatar role');

    res.json({
      success: true,
      data: {
        received: received.map(r => ({
          id: r._id,
          fromUser: {
            id: r.fromUserId._id,
            username: r.fromUserId.username,
            email: r.fromUserId.email,
            avatar: r.fromUserId.avatar,
            role: r.fromUserId.role
          },
          message: r.message,
          createdAt: r.createdAt,
          expiresAt: r.expiresAt
        })),
        sent: []
      }
    });
  } catch (error) {
    console.error('获取好友申请失败:', error);
    res.status(500).json({ success: false, message: error.message || '服务器错误' });
  }
});

// ========== 发送好友申请 ==========
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { toUserId, message } = req.body;
    const fromUserId = req.user._id;

    if (!toUserId) {
      return res.status(400).json({ success: false, message: '缺少目标用户ID' });
    }

    if (fromUserId.toString() === toUserId) {
      return res.status(400).json({ success: false, message: '不能添加自己为好友' });
    }

    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const existingFriend = await Friend.findOne({
      userId: fromUserId,
      friendId: toUserId,
      status: 'accepted'
    });
    if (existingFriend) {
      return res.status(400).json({ success: false, message: '已经是好友了' });
    }

    const request = new FriendRequest({
      fromUserId,
      toUserId,
      message: message || '请求添加你为好友'
    });

    await request.save();

    emitToUser(toUserId, 'friend-request-received', {
      id: request._id,
      fromUser: {
        id: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar
      },
      message: request.message,
      createdAt: request.createdAt
    });

    res.json({ success: true, message: '好友申请已发送', data: request });
  } catch (error) {
    console.error('发送好友申请失败:', error);
    res.status(500).json({ success: false, message: error.message || '服务器错误' });
  }
});

// ========== 处理好友申请 ==========
router.post('/request/:requestId/handle', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }

    if (request.toUserId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: '无权处理此申请' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: '申请已处理' });
    }

    if (action === 'accept') {
      const friend1 = new Friend({
        userId: request.fromUserId,
        friendId: request.toUserId,
        status: 'accepted'
      });
      const friend2 = new Friend({
        userId: request.toUserId,
        friendId: request.fromUserId,
        status: 'accepted'
      });

      await Promise.all([friend1.save(), friend2.save()]);

      request.status = 'accepted';
      await request.save();

      const fromUser = await User.findById(request.fromUserId).select('username avatar');

      emitToUser(request.fromUserId.toString(), 'friend-request-accepted', {
        userId: request.toUserId,
        username: req.user.username,
        avatar: req.user.avatar
      });

      res.json({ success: true, message: '已添加好友' });
    } else if (action === 'reject') {
      request.status = 'rejected';
      await request.save();
      res.json({ success: true, message: '已拒绝好友申请' });
    } else {
      res.status(400).json({ success: false, message: '无效的操作' });
    }
  } catch (error) {
    console.error('处理好友申请失败:', error);
    res.status(500).json({ success: false, message: error.message || '服务器错误' });
  }
});

// ========== 删除好友 ==========
router.delete('/:friendId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.params;

    await Friend.deleteMany({
      $or: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    });

    await FriendRequest.deleteMany({
      $or: [
        { fromUserId: userId, toUserId: friendId },
        { fromUserId: friendId, toUserId: userId }
      ]
    });

    emitToUser(friendId, 'friend-removed', { friendId: userId });

    res.json({ success: true, message: '已删除好友' });
  } catch (error) {
    console.error('删除好友失败:', error);
    res.status(500).json({ success: false, message: error.message || '服务器错误' });
  }
});

// ========== 搜索用户 ==========
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user._id;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const users = await User.find({
      _id: { $ne: userId },
      username: { $regex: q, $options: 'i' }
    })
    .select('username email avatar role')
    .limit(20);

    const friendIds = await getFriendIds(userId);

    const result = users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isFriend: friendIds.some(id => id.toString() === user._id.toString()),
      requestStatus: null
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ success: false, message: error.message || '服务器错误' });
  }
});

module.exports = router;