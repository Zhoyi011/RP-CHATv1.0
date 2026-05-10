const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const Persona = require('../models/Persona');
const PersonaRoom = require('../models/PersonaRoom');
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

// ========== 辅助函数 ==========
// 获取用户当前激活的角色
async function getCurrentPersona(userId) {
  const active = await ActivePersona.findOne({ userId }).populate('personaId');
  return active?.personaId || null;
}

// 检查角色在房间中的权限
async function getPersonaRoomRole(personaId, roomId) {
  const pr = await PersonaRoom.findOne({ personaId, roomId });
  return pr?.role || null;
}

// ========== 聊天室路由 ==========

// 创建聊天室
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: '房间名称至少需要2个字符' });
    }
    
    const persona = await getCurrentPersona(req.userId);
    if (!persona) {
      return res.status(400).json({ error: '请先选择一个角色' });
    }
    
    const room = new Room({
      name: name.trim(),
      description: description || '',
      createdBy: req.userId,
      members: [{
        userId: req.userId,
        personaId: persona._id,
        role: 'owner',
        joinedAt: new Date()
      }]
    });
    
    await room.save();
    
    await PersonaRoom.create({
      personaId: persona._id,
      roomId: room._id,
      role: 'owner',
      joinedAt: new Date()
    });
    
    console.log(`✅ 房间创建成功: ${room.name}, 群主角色: ${persona.name}`);
    
    res.status(201).json({
      message: '聊天室创建成功',
      room: {
        _id: room._id,
        name: room.name,
        description: room.description
      }
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

// 获取当前角色加入的房间列表
router.get('/my-rooms', authMiddleware, async (req, res) => {
  try {
    const persona = await getCurrentPersona(req.userId);
    if (!persona) {
      return res.json({ rooms: [], currentPersona: null });
    }
    
    const personaRooms = await PersonaRoom.find({ personaId: persona._id }).populate('roomId');
    const rooms = personaRooms.map(pr => pr.roomId).filter(Boolean);
    
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
      const memberCount = await PersonaRoom.countDocuments({ roomId: room._id });
      
      return {
        _id: room._id,
        name: room.name,
        description: room.description,
        announcement: room.announcement,
        messageCount,
        unreadCount,
        memberCount,
        onlineCount: 0,
        createdAt: room.createdAt
      };
    }));
    
    res.json({ 
      rooms: roomsWithStats, 
      currentPersona: {
        _id: persona._id,
        name: persona.name,
        avatar: persona.avatar
      }
    });
  } catch (error) {
    console.error('获取房间列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户所有房间的未读消息总数
router.get('/unread-total', authMiddleware, async (req, res) => {
  try {
    const persona = await getCurrentPersona(req.userId);
    if (!persona) {
      return res.json({ total: 0 });
    }
    
    const personaRooms = await PersonaRoom.find({ personaId: persona._id });
    let totalUnread = 0;
    
    for (const pr of personaRooms) {
      const lastRead = await UserReadRecord.findOne({
        userId: req.userId,
        roomId: pr.roomId
      });
      
      const unread = await Message.countDocuments({
        roomId: pr.roomId,
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
    const active = await ActivePersona.findOne({ userId: req.userId }).populate('personaId');
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
    
    const persona = await Persona.findOne({ _id: personaId, status: 'approved' });
    if (!persona) {
      return res.status(404).json({ error: '角色不存在或未审核' });
    }
    
    const active = await ActivePersona.findOneAndUpdate(
      { userId: req.userId },
      { userId: req.userId, personaId, updatedAt: new Date() },
      { upsert: true, new: true }
    ).populate('personaId');
    
    res.json({ message: '切换角色成功', activePersona: active });
  } catch (error) {
    console.error('设置活跃皮失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 动态路由 ==========

// 获取聊天室详情
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    const memberCount = await PersonaRoom.countDocuments({ roomId: room._id });
    const messageCount = await Message.countDocuments({ roomId: room._id });
    
    res.json({
      ...room.toObject(),
      memberCount,
      messageCount
    });
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
    const lastMessage = await Message.findOne({ roomId: req.params.roomId }).sort({ createdAt: -1 });
    
    await UserReadRecord.findOneAndUpdate(
      { userId: req.userId, roomId: req.params.roomId },
      { lastReadMessageId: lastMessage?._id, lastReadAt: new Date() },
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
    
    // 检查是否已经是成员
    const existing = await PersonaRoom.findOne({ personaId, roomId: room._id });
    if (existing) {
      return res.status(400).json({ error: '该角色已在群中' });
    }
    
    // 检查是否有待审核申请
    const pendingExists = room.pendingMembers.some(p => p.personaId?.toString() === personaId);
    if (pendingExists) {
      return res.status(400).json({ error: '已有待审核申请' });
    }
    
    // 获取角色信息用于日志
    const persona = await Persona.findById(personaId);
    
    room.pendingMembers.push({
      userId: req.userId,
      personaId,
      message: message || '',
      appliedAt: new Date()
    });
    
    await room.save();
    
    console.log(`📋 新入群申请: 角色 ${persona?.name || personaId} 申请加入房间 ${room.name}`);
    
    res.json({ message: '申请已提交，等待审核' });
  } catch (error) {
    console.error('申请加入失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取待审核列表 ✅ 修复权限检查
router.get('/:roomId/pending', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('pendingMembers.personaId', 'name avatar displayName')
      .populate('pendingMembers.userId', 'username email');
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    // ✅ 获取当前使用的角色
    const persona = await getCurrentPersona(req.userId);
    if (!persona) {
      return res.status(403).json({ error: '请先选择角色' });
    }
    
    // ✅ 检查当前角色是否是群主或管理员
    const personaRoom = await PersonaRoom.findOne({
      personaId: persona._id,
      roomId: room._id
    });
    
    const isAdmin = personaRoom && (personaRoom.role === 'owner' || personaRoom.role === 'admin');
    
    // 兼容旧数据
    const isLegacyAdmin = room.members.some(m => 
      m.userId?.toString() === req.userId && (m.role === 'owner' || m.role === 'admin')
    );
    
    if (!isAdmin && !isLegacyAdmin) {
      console.log(`⚠️ 权限不足: 用户 ${req.userId}, 角色 ${persona.name}, 房间 ${room.name}`);
      return res.status(403).json({ error: '没有权限' });
    }
    
    res.json(room.pendingMembers);
  } catch (error) {
    console.error('获取待审核列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 审核加入申请 ✅ 修复权限检查
router.post('/:roomId/approve-request', authMiddleware, async (req, res) => {
  try {
    const { userId, approve } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    // ✅ 获取当前使用的角色
    const persona = await getCurrentPersona(req.userId);
    if (!persona) {
      return res.status(403).json({ error: '请先选择角色' });
    }
    
    // ✅ 检查当前角色是否是群主或管理员
    const personaRoom = await PersonaRoom.findOne({
      personaId: persona._id,
      roomId: room._id
    });
    
    const isAdmin = personaRoom && (personaRoom.role === 'owner' || personaRoom.role === 'admin');
    
    // 兼容旧数据
    const isLegacyAdmin = room.members.some(m => 
      m.userId?.toString() === req.userId && (m.role === 'owner' || m.role === 'admin')
    );
    
    if (!isAdmin && !isLegacyAdmin) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    const pendingIndex = room.pendingMembers.findIndex(p => p.userId?.toString() === userId);
    if (pendingIndex === -1) {
      return res.status(404).json({ error: '申请不存在' });
    }
    
    const pending = room.pendingMembers[pendingIndex];
    
    if (approve) {
      // 添加到 PersonaRoom
      await PersonaRoom.create({
        personaId: pending.personaId,
        roomId: room._id,
        role: 'member',
        joinedAt: new Date()
      });
      
      // 同时添加到旧 members 数组（兼容）
      room.members.push({
        userId: pending.userId,
        personaId: pending.personaId,
        role: 'member',
        joinedAt: new Date()
      });
      
      console.log(`✅ 批准入群: 角色 ${pending.personaId} 加入房间 ${room.name}`);
    } else {
      console.log(`❌ 拒绝入群: 角色 ${pending.personaId} 申请加入房间 ${room.name}`);
    }
    
    room.pendingMembers.splice(pendingIndex, 1);
    await room.save();
    
    res.json({ message: approve ? '已批准加入' : '已拒绝申请' });
  } catch (error) {
    console.error('审核失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ✅ 获取群成员列表（完整修复版）
router.get('/:roomId/members', authMiddleware, async (req, res) => {
  try {
    // 获取所有皮与群的关联
    const personaRooms = await PersonaRoom.find({ roomId: req.params.roomId })
      .populate('personaId');
    
    // 格式化成员数据
    const members = await Promise.all(personaRooms.map(async (pr) => {
      const persona = pr.personaId;
      let userInfo = null;
      if (persona && persona.userId) {
        const User = require('../models/User');
        userInfo = await User.findById(persona.userId).select('username email avatar');
      }
      
      return {
        _id: pr._id,
        personaId: persona ? {
          _id: persona._id,
          name: persona.name,
          avatar: persona.avatar,
          displayName: persona.displayName || persona.name
        } : null,
        userId: userInfo,
        role: pr.role,
        title: pr.title,
        nickname: pr.nickname,
        joinedAt: pr.joinedAt
      };
    }));
    
    // 兼容旧数据中的成员
    const room = await Room.findById(req.params.roomId);
    if (room && room.members && room.members.length > 0) {
      for (const oldMember of room.members) {
        if (oldMember.personaId && !members.find(m => m.personaId?._id?.toString() === oldMember.personaId.toString())) {
          const persona = await Persona.findById(oldMember.personaId);
          if (persona) {
            members.push({
              _id: oldMember._id,
              personaId: {
                _id: persona._id,
                name: persona.name,
                avatar: persona.avatar,
                displayName: persona.displayName || persona.name
              },
              userId: oldMember.userId ? { _id: oldMember.userId, username: '未知用户' } : null,
              role: oldMember.role,
              title: oldMember.title,
              joinedAt: oldMember.joinedAt
            });
          }
        }
      }
    }
    
    res.json(members);
  } catch (error) {
    console.error('获取成员列表失败:', error);
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
    
    // 获取当前角色的权限
    const currentPersona = await getCurrentPersona(req.userId);
    if (!currentPersona) {
      return res.status(403).json({ error: '请先选择角色' });
    }
    
    const currentRole = await getPersonaRoomRole(currentPersona._id, room._id);
    if (currentRole !== 'owner') {
      return res.status(403).json({ error: '只有群主可以设置管理员' });
    }
    
    const targetMember = room.members.find(m => m.userId?.toString() === userId);
    if (!targetMember) {
      return res.status(404).json({ error: '成员不存在' });
    }
    
    targetMember.role = isAdmin ? 'admin' : 'member';
    await room.save();
    
    if (targetMember.personaId) {
      await PersonaRoom.findOneAndUpdate(
        { personaId: targetMember.personaId, roomId: room._id },
        { role: targetMember.role }
      );
    }
    
    res.json({ message: isAdmin ? '已设为管理员' : '已取消管理员' });
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
    
    // 获取当前角色的权限
    const currentPersona = await getCurrentPersona(req.userId);
    if (!currentPersona) {
      return res.status(403).json({ error: '请先选择角色' });
    }
    
    const currentRole = await getPersonaRoomRole(currentPersona._id, room._id);
    const isAdmin = currentRole === 'owner' || currentRole === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    const targetMember = room.members.find(m => m.userId?.toString() === userId);
    if (!targetMember) {
      return res.status(404).json({ error: '成员不存在' });
    }
    
    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: '不能踢出群主' });
    }
    
    if (targetMember.role === 'admin' && currentRole !== 'owner') {
      return res.status(403).json({ error: '只有群主可以踢出管理员' });
    }
    
    if (targetMember.personaId) {
      await PersonaRoom.deleteOne({ personaId: targetMember.personaId, roomId: room._id });
    }
    
    room.members = room.members.filter(m => m.userId?.toString() !== userId);
    await room.save();
    
    res.json({ message: '已踢出群聊' });
  } catch (error) {
    console.error('踢出成员失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 退出群聊
router.post('/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    const persona = await getCurrentPersona(req.userId);
    if (!persona) {
      return res.status(400).json({ error: '请先选择角色' });
    }
    
    const memberIndex = room.members.findIndex(m => m.userId?.toString() === req.userId);
    if (memberIndex === -1) {
      return res.status(400).json({ error: '你不是该群成员' });
    }
    
    if (room.members[memberIndex].role === 'owner') {
      if (room.members.length === 1) {
        await Room.findByIdAndDelete(req.params.roomId);
        await Message.deleteMany({ roomId: req.params.roomId });
        await PersonaRoom.deleteMany({ roomId: req.params.roomId });
        return res.json({ message: '群聊已解散' });
      } else {
        return res.status(400).json({ error: '群主不能直接退出，请先转让群主或解散群聊' });
      }
    }
    
    await PersonaRoom.deleteOne({ personaId: persona._id, roomId: room._id });
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
    
    // 获取当前角色的权限
    const currentPersona = await getCurrentPersona(req.userId);
    if (!currentPersona) {
      return res.status(403).json({ error: '请先选择角色' });
    }
    
    const currentRole = await getPersonaRoomRole(currentPersona._id, room._id);
    const isAdmin = currentRole === 'owner' || currentRole === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (announcement !== undefined) room.announcement = announcement;
    if (isPublic !== undefined) room.isPublic = isPublic;
    if (requireApproval !== undefined) room.requireApproval = requireApproval;
    room.updatedAt = new Date();
    
    await room.save();
    res.json({ message: '群信息已更新', room });
  } catch (error) {
    console.error('更新群信息失败:', error);
    res.status(500).json({ error: '服务器错误' });
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
    
    // 获取当前角色的权限
    const currentPersona = await getCurrentPersona(req.userId);
    if (!currentPersona) {
      return res.status(403).json({ error: '请先选择角色' });
    }
    
    const currentRole = await getPersonaRoomRole(currentPersona._id, room._id);
    const isAdmin = currentRole === 'owner' || currentRole === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    const targetMember = room.members.find(m => m.userId?.toString() === userId);
    if (!targetMember) {
      return res.status(404).json({ error: '成员不存在' });
    }
    
    targetMember.title = title || '';
    await room.save();
    
    if (targetMember.personaId) {
      await PersonaRoom.findOneAndUpdate(
        { personaId: targetMember.personaId, roomId: room._id },
        { title: targetMember.title }
      );
    }
    
    res.json({ message: '头衔已更新', title: targetMember.title });
  } catch (error) {
    console.error('设置头衔失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 管理员路由 ==========

router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find().populate('createdBy', 'username email').sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    console.error('获取所有房间失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/admin/:roomId/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isActive } = req.body;
    const room = await Room.findByIdAndUpdate(req.params.roomId, { isActive }, { new: true });
    if (!room) return res.status(404).json({ error: '房间不存在' });
    res.json({ message: `房间已${isActive ? '启用' : '禁用'}`, room });
  } catch (error) {
    console.error('更新房间状态失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.delete('/admin/:roomId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Message.deleteMany({ roomId: req.params.roomId });
    await PersonaRoom.deleteMany({ roomId: req.params.roomId });
    const room = await Room.findByIdAndDelete(req.params.roomId);
    if (!room) return res.status(404).json({ error: '房间不存在' });
    res.json({ message: '房间已删除' });
  } catch (error) {
    console.error('删除房间失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;