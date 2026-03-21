const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const Persona = require('../models/Persona');
const ActivePersona = require('../models/ActivePersona');
const UserReadRecord = require('../models/UserReadRecord');
const jwt = require('jsonwebtoken');

// 验证token中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// 管理员中间件
const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// ========== 聊天室路由 ==========

// 创建聊天室
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: '房间名称至少需要2个字符' });
    }
    
    const room = new Room({
      name,
      description: description || '',
      createdBy: req.userId,
      members: [{
        userId: req.userId,
        role: 'owner',
        joinedAt: new Date()
      }]
    });
    
    await room.save();
    
    res.status(201).json({
      message: '聊天室创建成功',
      room
    });
    
  } catch (error) {
    console.error('创建聊天室失败:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: '聊天室名称已存在' });
    } else {
      res.status(500).json({ error: '服务器错误' });
    }
  }
});

// 获取所有聊天室（用户加入的）
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({
      isActive: true,
      'members.userId': req.userId
    }).sort({ createdAt: -1 });
    
    const roomsWithStats = await Promise.all(rooms.map(async (room) => {
      const messageCount = await Message.countDocuments({ roomId: room._id });
      const lastRead = await UserReadRecord.findOne({
        userId: req.userId,
        roomId: room._id
      });
      const unreadCount = await Message.countDocuments({
        roomId: room._id,
        createdAt: { $gt: lastRead?.lastReadAt || new Date(0) }
      });
      
      return {
        ...room.toObject(),
        messageCount,
        unreadCount,
        memberCount: room.members.length
      };
    }));
    
    res.json(roomsWithStats);
  } catch (error) {
    console.error('获取聊天室失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 具体路由（必须在动态路由之前） ==========

// 获取用户所有房间的未读消息总数
router.get('/unread-total', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({ 'members.userId': req.userId });
    let totalUnread = 0;
    
    for (const room of rooms) {
      const lastRead = await UserReadRecord.findOne({
        userId: req.userId,
        roomId: room._id
      });
      
      const unread = await Message.countDocuments({
        roomId: room._id,
        createdAt: { $gt: lastRead?.lastReadAt || new Date(0) }
      });
      totalUnread += unread;
    }
    
    res.json({ total: totalUnread });
  } catch (error) {
    console.error('获取未读总数失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前使用的皮
router.get('/active-persona', authMiddleware, async (req, res) => {
  try {
    const active = await ActivePersona.findOne({ userId: req.userId })
      .populate('personaId');
    
    if (!active) {
      return res.json({ activePersona: null });
    }
    
    res.json({ activePersona: active });
  } catch (error) {
    console.error('获取活跃皮失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 设置当前使用的皮
router.post('/active-persona', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.body;
    
    if (!personaId) {
      return res.status(400).json({ error: '请选择角色' });
    }
    
    const persona = await Persona.findOne({ 
      _id: personaId, 
      status: 'approved' 
    });
    
    if (!persona) {
      return res.status(404).json({ error: '角色不存在或未审核' });
    }
    
    const active = await ActivePersona.findOneAndUpdate(
      { userId: req.userId },
      { 
        userId: req.userId,
        personaId,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    ).populate('personaId');
    
    res.json({
      message: '切换角色成功',
      activePersona: active
    });
    
  } catch (error) {
    console.error('设置活跃皮失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 动态路由（带参数的放在后面） ==========

// 获取聊天室详情
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('members.userId', 'username email avatar')
      .populate('members.personaId', 'name avatar');
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('获取聊天室详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取聊天室历史消息
router.get('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .populate('personaId', 'name avatar')
      .populate('userId', 'username firebaseUid avatar')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(messages.reverse());
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个房间未读消息数
router.get('/:roomId/unread', authMiddleware, async (req, res) => {
  try {
    const lastRead = await UserReadRecord.findOne({
      userId: req.userId,
      roomId: req.params.roomId
    });
    
    const unreadCount = await Message.countDocuments({
      roomId: req.params.roomId,
      createdAt: { $gt: lastRead?.lastReadAt || new Date(0) }
    });
    
    res.json({ unreadCount });
  } catch (error) {
    console.error('获取未读消息数失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 标记已读
router.post('/:roomId/mark-read', authMiddleware, async (req, res) => {
  try {
    const lastMessage = await Message.findOne({ roomId: req.params.roomId })
      .sort({ createdAt: -1 });
    
    await UserReadRecord.findOneAndUpdate(
      { userId: req.userId, roomId: req.params.roomId },
      { 
        lastReadMessageId: lastMessage?._id, 
        lastReadAt: new Date() 
      },
      { upsert: true }
    );
    
    res.json({ message: '已标记已读' });
  } catch (error) {
    console.error('标记已读失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 申请加入群组
router.post('/:roomId/join-request', authMiddleware, async (req, res) => {
  try {
    const { personaId, message } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    if (!room.isPublic) {
      return res.status(400).json({ error: '该群是私密群' });
    }
    
    if (room.isMember(req.userId)) {
      return res.status(400).json({ error: '你已经是群成员了' });
    }
    
    if (room.pendingMembers.some(m => m.userId.toString() === req.userId)) {
      return res.status(400).json({ error: '已有待审核申请' });
    }
    
    room.pendingMembers.push({
      userId: req.userId,
      personaId,
      message: message || '',
      appliedAt: new Date()
    });
    
    await room.save();
    res.json({ message: '申请已提交，等待审核' });
    
  } catch (error) {
    console.error('申请加入失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 审核加入申请
router.post('/:roomId/approve-request', authMiddleware, async (req, res) => {
  try {
    const { userId, approve, rejectReason } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    if (!room.isAdmin(req.userId)) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    const pending = room.pendingMembers.find(m => m.userId.toString() === userId);
    if (!pending) {
      return res.status(404).json({ error: '申请不存在' });
    }
    
    if (approve) {
      const activePersona = await ActivePersona.findOne({ userId: pending.userId });
      
      room.members.push({
        userId: pending.userId,
        personaId: activePersona?.personaId || pending.personaId,
        role: 'member',
        joinedAt: new Date()
      });
    }
    
    room.pendingMembers = room.pendingMembers.filter(m => m.userId.toString() !== userId);
    await room.save();
    
    res.json({ 
      message: approve ? '已批准加入' : '已拒绝申请',
      approved: approve 
    });
    
  } catch (error) {
    console.error('审核申请失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 设置群管理员
router.post('/:roomId/set-admin', authMiddleware, async (req, res) => {
  try {
    const { userId, isAdmin } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    if (!room.isOwner(req.userId)) {
      return res.status(403).json({ error: '只有群主可以设置管理员' });
    }
    
    const targetMember = room.members.find(m => m.userId.toString() === userId);
    if (!targetMember) {
      return res.status(404).json({ error: '成员不存在' });
    }
    
    targetMember.role = isAdmin ? 'admin' : 'member';
    await room.save();
    
    res.json({ 
      message: isAdmin ? '已设为管理员' : '已取消管理员',
      role: targetMember.role
    });
    
  } catch (error) {
    console.error('设置管理员失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 踢出成员
router.post('/:roomId/kick-member', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    if (!room.isAdmin(req.userId)) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    const targetMember = room.members.find(m => m.userId.toString() === userId);
    if (!targetMember) {
      return res.status(404).json({ error: '成员不存在' });
    }
    
    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: '不能踢出群主' });
    }
    
    if (targetMember.role === 'admin' && !room.isOwner(req.userId)) {
      return res.status(403).json({ error: '只有群主可以踢出管理员' });
    }
    
    room.members = room.members.filter(m => m.userId.toString() !== userId);
    await room.save();
    
    res.json({ message: '已踢出群聊' });
    
  } catch (error) {
    console.error('踢出成员失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ✅ 退出群聊（新增）
router.post('/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    const memberIndex = room.members.findIndex(m => m.userId.toString() === req.userId);
    if (memberIndex === -1) {
      return res.status(400).json({ error: '你不是该群成员' });
    }
    
    // 如果是群主
    if (room.members[memberIndex].role === 'owner') {
      // 检查是否还有其他成员
      if (room.members.length === 1) {
        // 只有群主一个人，直接删除房间
        await Room.findByIdAndDelete(req.params.roomId);
        // 同时删除相关消息
        await Message.deleteMany({ roomId: req.params.roomId });
        return res.json({ message: '群聊已解散' });
      } else {
        return res.status(400).json({ error: '群主不能直接退出，请先转让群主或解散群聊' });
      }
    }
    
    // 移除成员
    room.members.splice(memberIndex, 1);
    await room.save();
    
    res.json({ message: '已退出群聊' });
  } catch (error) {
    console.error('退出群聊失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新群信息
router.put('/:roomId/settings', authMiddleware, async (req, res) => {
  try {
    const { name, description, announcement, isPublic, requireApproval } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    if (!room.isAdmin(req.userId)) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (announcement !== undefined) room.announcement = announcement;
    if (isPublic !== undefined) room.isPublic = isPublic;
    if (requireApproval !== undefined) room.requireApproval = requireApproval;
    
    await room.save();
    res.json({ message: '群信息已更新', room });
    
  } catch (error) {
    console.error('更新群信息失败:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: '聊天室名称已存在' });
    } else {
      res.status(500).json({ error: '服务器错误' });
    }
  }
});

// 设置成员头衔
router.put('/:roomId/set-title', authMiddleware, async (req, res) => {
  try {
    const { userId, title } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    if (!room.isAdmin(req.userId)) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    const targetMember = room.members.find(m => m.userId.toString() === userId);
    if (!targetMember) {
      return res.status(404).json({ error: '成员不存在' });
    }
    
    targetMember.title = title || '';
    await room.save();
    
    res.json({ message: '头衔已更新', title: targetMember.title });
    
  } catch (error) {
    console.error('设置头衔失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取群成员列表（✅ 移除成员限制，任何人都可以查看）
router.get('/:roomId/members', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('members.userId', 'username email avatar')
      .populate('members.personaId', 'name avatar displayName');
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    // ✅ 移除成员检查，任何人都可以查看成员列表（用于群资料弹窗）
    res.json(room.members);
  } catch (error) {
    console.error('获取成员列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取待审核列表
router.get('/:roomId/pending', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('pendingMembers.userId', 'username email avatar')
      .populate('pendingMembers.personaId', 'name avatar');
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    if (!room.isAdmin(req.userId)) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    res.json(room.pendingMembers);
    
  } catch (error) {
    console.error('获取待审核列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员路由 ==========

// 管理员：获取所有房间（包括已禁用的）
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(rooms);
  } catch (error) {
    console.error('获取所有房间失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员：更新房间状态（禁用/启用）
router.put('/admin/:roomId/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const room = await Room.findByIdAndUpdate(
      req.params.roomId,
      { isActive },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    res.json({
      message: `房间已${isActive ? '启用' : '禁用'}`,
      room
    });
  } catch (error) {
    console.error('更新房间状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员：删除房间（谨慎使用）
router.delete('/admin/:roomId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Message.deleteMany({ roomId: req.params.roomId });
    const room = await Room.findByIdAndDelete(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    res.json({ message: '房间已删除' });
  } catch (error) {
    console.error('删除房间失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;