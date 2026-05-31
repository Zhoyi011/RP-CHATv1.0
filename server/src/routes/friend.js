// server/src/routes/friend.js
const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middlewares/authMiddleware');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Post = require('../models/Post');
const { emitToUser } = require('../utils/socketHelper');

const router = express.Router();

// ========== 获取好友列表 ==========
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { group, search } = req.query;
    const userId = req.user.id;

    const filter = { userId, status: 'accepted' };
    if (group && group !== 'all') {
      filter.group = group;
    }

    let friends = await Friend.find(filter)
      .populate('friendId', 'username email avatar role')
      .sort({ isStarred: -1, lastInteractionAt: -1, createdAt: -1 });

    if (search) {
      const searchLower = search.toLowerCase();
      friends = friends.filter(f => 
        f.friendId.username.toLowerCase().includes(searchLower)
      );
    }

    // 获取在线状态（需要从 app.js 获取 onlineUsers，暂时返回 false）
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
      isOnline: false // 暂时返回 false，后续可从全局 Map 获取
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
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const received = await FriendRequest.find({
      toUserId: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('fromUserId', 'username email avatar role');

    const sent = await FriendRequest.find({
      fromUserId: userId,
      status: 'pending'
    }).populate('toUserId', 'username email avatar role');

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
        sent: sent.map(s => ({
          id: s._id,
          toUser: {
            id: s.toUserId._id,
            username: s.toUserId.username,
            avatar: s.toUserId.avatar
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

// ========== 发送好友申请 ==========
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { toUserId, message } = req.body;
    const fromUserId = req.user.id;

    if (!toUserId) {
      return res.status(400).json({ success: false, message: '缺少目标用户ID' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ success: false, message: '不能添加自己为好友' });
    }

    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 检查是否已经是好友
    const existingFriend = await Friend.findOne({
      userId: fromUserId,
      friendId: toUserId,
      status: 'accepted'
    });
    if (existingFriend) {
      return res.status(400).json({ success: false, message: '已经是好友了' });
    }

    // 检查是否有待处理的申请
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { fromUserId, toUserId, status: 'pending' },
        { fromUserId: toUserId, toUserId: fromUserId, status: 'pending' }
      ]
    });

    if (existingRequest) {
      if (existingRequest.fromUserId.toString() === fromUserId) {
        return res.status(400).json({ success: false, message: '已发送过好友申请，请等待对方处理' });
      } else {
        return res.status(400).json({ success: false, message: '对方已向你发送好友申请，请去处理' });
      }
    }

    const request = new FriendRequest({
      fromUserId,
      toUserId,
      message: message || '请求添加你为好友'
    });

    await request.save();

    // 通过 Socket 通知对方
    const io = req.app.get('io');
    if (io) {
      emitToUser(toUserId, 'friend-request-received', {
        id: request._id,
        fromUser: {
          id: req.user.id,
          username: req.user.username,
          avatar: req.user.avatar
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

// ========== 处理好友申请（同意/拒绝） ==========
router.post('/request/:requestId/handle', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    const userId = req.user.id;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }

    if (request.toUserId.toString() !== userId) {
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

      // 通过 Socket 通知对方
      emitToUser(request.fromUserId.toString(), 'friend-request-accepted', {
        userId: request.toUserId,
        username: req.user.username,
        avatar: req.user.avatar
      });

      res.json({
        success: true,
        message: '已添加好友',
        data: {
          friendId: request.fromUserId,
          username: fromUser.username,
          avatar: fromUser.avatar
        }
      });
    } else if (action === 'reject') {
      request.status = 'rejected';
      await request.save();

      res.json({
        success: true,
        message: '已拒绝好友申请'
      });
    } else {
      res.status(400).json({ success: false, message: '无效的操作' });
    }
  } catch (error) {
    console.error('处理好友申请失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 删除好友 ==========
router.delete('/:friendId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
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

    emitToUser(friendId, 'friend-removed', {
      friendId: userId
    });

    res.json({
      success: true,
      message: '已删除好友'
    });
  } catch (error) {
    console.error('删除好友失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 修改好友备注/分组 ==========
router.put('/:friendId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;
    const { nickname, group, isStarred } = req.body;

    const friendship = await Friend.findOne({ userId, friendId });
    if (!friendship) {
      return res.status(404).json({ success: false, message: '好友关系不存在' });
    }

    if (nickname !== undefined) friendship.nickname = nickname || null;
    if (group !== undefined) friendship.group = group;
    if (isStarred !== undefined) friendship.isStarred = isStarred;

    await friendship.save();

    res.json({
      success: true,
      message: '更新成功',
      data: friendship
    });
  } catch (error) {
    console.error('更新好友信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 获取好友动态 ==========
router.get('/feed-posts', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const friendships = await Friend.find({ userId, status: 'accepted' }).select('friendId');
    const friendIds = friendships.map(f => f.friendId);

    if (friendIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        hasNewPosts: false
      });
    }

    const posts = await Post.find({
      userId: { $in: friendIds },
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar')
    .populate('personaId', 'name displayName avatar');

    const lastFeedView = req.user.lastFeedViewAt || new Date(0);
    const hasNewPosts = posts.some(post => post.createdAt > lastFeedView);

    res.json({
      success: true,
      data: posts,
      hasNewPosts,
      lastFeedView
    });
  } catch (error) {
    console.error('获取好友动态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 标记 Feed 已查看 ==========
router.post('/feed-viewed', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      lastFeedViewAt: new Date()
    });
    res.json({ success: true });
  } catch (error) {
    console.error('更新Feed查看时间失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 搜索用户 ==========
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const users = await User.find({
      _id: { $ne: userId },
      username: { $regex: q, $options: 'i' }
    })
    .select('username email avatar role')
    .limit(20);

    const friendships = await Friend.find({ userId, status: 'accepted' }).select('friendId');
    const friendIds = friendships.map(f => f.friendId.toString());

    const pendingRequests = await FriendRequest.find({
      $or: [
        { fromUserId: userId, status: 'pending' },
        { toUserId: userId, status: 'pending' }
      ]
    }).select('fromUserId toUserId status');

    const result = users.map(user => {
      const isFriend = friendIds.includes(user._id.toString());
      const pendingRequest = pendingRequests.find(req => 
        (req.fromUserId.toString() === user._id.toString() && req.status === 'pending') ||
        (req.toUserId.toString() === user._id.toString() && req.status === 'pending')
      );
      
      let requestStatus = null;
      if (pendingRequest) {
        if (pendingRequest.fromUserId.toString() === userId) {
          requestStatus = 'sent';
        } else {
          requestStatus = 'received';
        }
      }

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isFriend,
        requestStatus
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;