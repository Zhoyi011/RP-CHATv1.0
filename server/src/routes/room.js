const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const Persona = require('../models/Persona');
const PersonaRoom = require('../models/PersonaRoom');
const UserReadRecord = require('../models/UserReadRecord');
const jwt = require('jsonwebtoken');

// ===== 中间件 =====
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
};

// ===== 辅助函数 =====
// 获取用户激活的 Persona
async function getActivePersona(userId) {
  const ActivePersona = require('../models/ActivePersona');
  const active = await ActivePersona.findOne({ userId }).populate('personaId');
  return active?.personaId || null;
}

// ✅ 权限检查
async function checkRoomPermission(userId, roomId) {
  const room = await Room.findById(roomId);
  if (!room) return { hasPermission: false, role: null, persona: null };

  const persona = await getActivePersona(userId);
  if (!persona) return { hasPermission: false, role: null, persona: null };

  const pr = await PersonaRoom.findOne({ personaId: persona._id, roomId });
  if (pr && (pr.role === 'owner' || pr.role === 'admin')) {
    return { hasPermission: true, role: pr.role, persona };
  }

  if (room.createdBy?.toString() === persona._id.toString()) {
    return { hasPermission: true, role: 'owner', persona };
  }

  return { hasPermission: false, role: null, persona };
}

// ========== 创建聊天室 ==========
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, description, personaId } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: '房间名称至少需要2个字符' });
    }

    let persona;
    if (personaId) {
      persona = await Persona.findOne({ _id: personaId, userId: req.userId, status: 'approved' });
    } else {
      persona = await getActivePersona(req.userId);
    }
    
    if (!persona) {
      return res.status(400).json({ error: '请先选择一个角色' });
    }
    
    const room = new Room({
      name: name.trim(),
      description: description || '',
      createdBy: persona._id,
      creatorUserId: req.userId
    });
    
    await room.save();
    
    // ✅ 创建群主 PersonaRoom
    await PersonaRoom.create({
      personaId: persona._id,
      roomId: room._id,
      userId: req.userId,
      role: 'owner',
      joinedAt: new Date()
    });
    
    console.log(`✅ 房间创建: ${room.name}，群主: ${persona.displayName} (${persona.name} #${persona.sameNameNumber})`);
    
    res.status(201).json({
      message: '聊天室创建成功',
      room: {
        _id: room._id,
        name: room.name,
        description: room.description,
        creatorName: persona.displayName
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

// ========== 我的房间列表 ==========
router.get('/my-rooms', authMiddleware, async (req, res) => {
  try {
    // 获取用户所有 Persona
    const personas = await Persona.find({ userId: req.userId, status: 'approved' });
    const personaIds = personas.map(p => p._id);
    
    // 获取这些 Persona 加入的所有房间
    const personaRooms = await PersonaRoom.find({ personaId: { $in: personaIds } })
      .populate({
        path: 'roomId',
        match: { isActive: true }
      });
    
    const validRooms = personaRooms.filter(pr => pr.roomId).map(pr => pr.roomId);
    
    // 去重
    const uniqueRooms = [];
    const seen = new Set();
    for (const room of validRooms) {
      if (!seen.has(room._id.toString())) {
        seen.add(room._id.toString());
        uniqueRooms.push(room);
      }
    }
    
    const roomsWithStats = await Promise.all(uniqueRooms.map(async (room) => {
      const messageCount = await Message.countDocuments({ roomId: room._id });
      const lastRead = await UserReadRecord.findOne({ userId: req.userId, roomId: room._id });
      const unreadCount = await Message.countDocuments({
        roomId: room._id,
        createdAt: { $gt: lastRead?.lastReadAt || new Date(0) }
      });
      const memberCount = await PersonaRoom.countDocuments({ roomId: room._id });
      
      // ✅ 获取创建者 Persona 名称
      let creatorName = '?';
      if (room.createdBy) {
        const creatorPersona = await Persona.findById(room.createdBy);
        creatorName = creatorPersona ? creatorPersona.displayName : '?';
      }
      
      return {
        _id: room._id,
        name: room.name,
        description: room.description,
        announcement: room.announcement,
        messageCount,
        unreadCount,
        memberCount,
        onlineCount: 0,
        creatorName, // ✅ Persona 名称
        createdAt: room.createdAt
      };
    }));
    
    // ✅ 当前激活 Persona
    const activePersona = await getActivePersona(req.userId);
    
    res.json({ 
      rooms: roomsWithStats, 
      currentPersona: activePersona ? {
        _id: activePersona._id,
        name: activePersona.name,
        displayName: activePersona.displayName,
        avatar: activePersona.avatar
      } : null
    });
  } catch (error) {
    console.error('获取房间列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 未读总数 ==========
router.get('/unread-total', authMiddleware, async (req, res) => {
  try {
    const personas = await Persona.find({ userId: req.userId, status: 'approved' });
    const personaIds = personas.map(p => p._id);
    const personaRooms = await PersonaRoom.find({ personaId: { $in: personaIds } });
    
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
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 获取/设置激活 Persona ==========
router.get('/active-persona', authMiddleware, async (req, res) => {
  try {
    const active = await getActivePersona(req.userId);
    res.json({ 
      activePersona: active ? {
        _id: active._id,
        name: active.name,
        displayName: active.displayName,
        avatar: active.avatar
      } : null 
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/active-persona', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.body;
    if (!personaId) return res.status(400).json({ error: '请选择角色' });
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId, status: 'approved' });
    if (!persona) return res.status(404).json({ error: '角色不存在或未审核' });
    
    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOneAndUpdate(
      { userId: req.userId },
      { userId: req.userId, personaId, updatedAt: new Date() },
      { upsert: true, new: true }
    ).populate('personaId');
    
    res.json({ message: `已切换到 ${persona.displayName}`, activePersona: active });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 群详情 ==========
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: '聊天室不存在' });
    
    const memberCount = await PersonaRoom.countDocuments({ roomId: room._id });
    const messageCount = await Message.countDocuments({ roomId: room._id });
    
    let creatorName = '?';
    if (room.createdBy) {
      const creator = await Persona.findById(room.createdBy);
      creatorName = creator ? creator.displayName : '?';
    }
    
    res.json({
      ...room.toObject(),
      memberCount,
      messageCount,
      creatorName
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 消息 ==========
router.get('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .populate('personaId', 'name displayName avatar sameNameNumber')
      .sort({ createdAt: -1 })
      .limit(100);
    
    // ✅ 不返回 userId 敏感信息
    const safeMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      content: msg.content,
      isAction: msg.isAction,
      createdAt: msg.createdAt,
      roomId: msg.roomId,
      personaId: msg.personaId ? {
        _id: msg.personaId._id,
        name: msg.personaId.name,
        displayName: msg.personaId.displayName,
        avatar: msg.personaId.avatar,
        sameNameNumber: msg.personaId.sameNameNumber
      } : null,
      userId: msg.userId ? { _id: msg.userId._id, firebaseUid: msg.userId._id.toString() } : null
    }));
    
    res.json(safeMessages);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:roomId/unread', authMiddleware, async (req, res) => {
  try {
    const lastRead = await UserReadRecord.findOne({ userId: req.userId, roomId: req.params.roomId });
    const unreadCount = await Message.countDocuments({
      roomId: req.params.roomId,
      createdAt: { $gt: lastRead?.lastReadAt || new Date(0) }
    });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

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
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 加入群组 ==========
router.post('/:roomId/join-request', authMiddleware, async (req, res) => {
  try {
    const { personaId, message } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) return res.status(404).json({ error: '聊天室不存在' });
    if (!room.isPublic) return res.status(400).json({ error: '该群是私密群' });
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId, status: 'approved' });
    if (!persona) return res.status(400).json({ error: '角色不存在' });
    
    const existing = await PersonaRoom.findOne({ personaId, roomId: room._id });
    if (existing) return res.status(400).json({ error: '该角色已在群中' });
    
    const pendingExists = room.pendingMembers?.some(p => p.personaId?.toString() === personaId);
    if (pendingExists) return res.status(400).json({ error: '已有待审核申请' });
    
    if (!room.pendingMembers) room.pendingMembers = [];
    room.pendingMembers.push({ userId: req.userId, personaId, message: message || '', appliedAt: new Date() });
    await room.save();
    
    console.log(`📋 ${persona.displayName} 申请加入 ${room.name}`);
    res.json({ message: '申请已提交，等待审核' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 群成员列表 ==========
router.get('/:roomId/members', authMiddleware, async (req, res) => {
  try {
    const personaRooms = await PersonaRoom.find({ roomId: req.params.roomId })
      .populate('personaId', 'name displayName avatar sameNameNumber globalNumber');
    
    // ✅ 只返回 Persona 信息，不返回用户信息
    const members = personaRooms.map(pr => ({
      _id: pr._id,
      personaId: pr.personaId ? {
        _id: pr.personaId._id,
        name: pr.personaId.name,
        displayName: pr.personaId.displayName,
        avatar: pr.personaId.avatar,
        sameNameNumber: pr.personaId.sameNameNumber,
        globalNumber: pr.personaId.globalNumber
      } : null,
      role: pr.role,
      title: pr.title,
      joinedAt: pr.joinedAt
    }));
    
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 待审核 ==========
router.get('/:roomId/pending', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('pendingMembers.personaId', 'name displayName avatar sameNameNumber');
    
    if (!room) return res.status(404).json({ error: '聊天室不存在' });
    
    // ✅ 使用统一权限检查
    const { hasPermission } = await checkRoomPermission(req.userId, req.params.roomId);
    if (!hasPermission) return res.status(403).json({ error: '没有权限' });
    
    // 过滤掉 null 的 personaId
    const pending = (room.pendingMembers || []).filter(p => p.personaId);
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:roomId/approve-request', authMiddleware, async (req, res) => {
  try {
    const { personaId, approve } = req.body;
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: '聊天室不存在' });
    
    const { hasPermission } = await checkRoomPermission(req.userId, req.params.roomId);
    if (!hasPermission) return res.status(403).json({ error: '没有权限' });
    
    if (!room.pendingMembers?.length) return res.status(404).json({ error: '没有待审核申请' });
    
    const pendingIndex = room.pendingMembers.findIndex(p => p.personaId?.toString() === personaId);
    if (pendingIndex === -1) return res.status(404).json({ error: '申请不存在' });
    
    const pending = room.pendingMembers[pendingIndex];
    
    if (approve) {
      const existing = await PersonaRoom.findOne({ personaId: pending.personaId, roomId: room._id });
      if (!existing) {
        await PersonaRoom.create({
          personaId: pending.personaId,
          roomId: room._id,
          userId: pending.userId,
          role: 'member',
          joinedAt: new Date()
        });
      }
    }
    
    room.pendingMembers.splice(pendingIndex, 1);
    await room.save();
    
    res.json({ message: approve ? '已批准加入' : '已拒绝申请' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 设置管理员（仅群主）==========
router.post('/:roomId/set-admin', authMiddleware, async (req, res) => {
  try {
    const { personaId, isAdmin } = req.body;
    const { hasPermission, role, persona } = await checkRoomPermission(req.userId, req.params.roomId);
    
    if (!hasPermission) return res.status(403).json({ error: '没有权限' });
    if (role !== 'owner') return res.status(403).json({ error: '只有群主可以设置管理员' });
    
    await PersonaRoom.findOneAndUpdate(
      { personaId, roomId: req.params.roomId },
      { role: isAdmin ? 'admin' : 'member' }
    );
    
    res.json({ message: isAdmin ? '已设为管理员' : '已取消管理员' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 踢出成员 ==========
router.post('/:roomId/kick-member', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.body;
    const { hasPermission, role: currentRole } = await checkRoomPermission(req.userId, req.params.roomId);
    
    if (!hasPermission) return res.status(403).json({ error: '没有权限' });
    
    const targetRole = await PersonaRoom.findOne({ personaId, roomId: req.params.roomId });
    if (!targetRole) return res.status(404).json({ error: '成员不存在' });
    if (targetRole.role === 'owner') return res.status(403).json({ error: '不能踢出群主' });
    if (targetRole.role === 'admin' && currentRole !== 'owner') return res.status(403).json({ error: '只有群主可以踢出管理员' });
    
    await PersonaRoom.deleteOne({ personaId, roomId: req.params.roomId });
    
    res.json({ message: '已踢出群聊' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 退出群聊 ==========
router.post('/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: '聊天室不存在' });
    
    const persona = await getActivePersona(req.userId);
    if (!persona) return res.status(400).json({ error: '请先选择角色' });
    
    const pr = await PersonaRoom.findOne({ personaId: persona._id, roomId: room._id });
    if (!pr) return res.status(400).json({ error: '你不是该群成员' });
    
    if (pr.role === 'owner') {
      const memberCount = await PersonaRoom.countDocuments({ roomId: room._id });
      if (memberCount <= 1) {
        await Room.findByIdAndDelete(req.params.roomId);
        await Message.deleteMany({ roomId: req.params.roomId });
        await PersonaRoom.deleteMany({ roomId: req.params.roomId });
        return res.json({ message: '群聊已解散' });
      }
      return res.status(400).json({ error: '群主不能直接退出，请先转让群主或解散群聊' });
    }
    
    await PersonaRoom.deleteOne({ personaId: persona._id, roomId: room._id });
    res.json({ message: '已退出群聊' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 更新群设置 ==========
router.put('/:roomId/settings', authMiddleware, async (req, res) => {
  try {
    const { name, description, announcement, isPublic, requireApproval } = req.body;
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: '聊天室不存在' });
    
    const { hasPermission } = await checkRoomPermission(req.userId, req.params.roomId);
    if (!hasPermission) return res.status(403).json({ error: '没有权限' });
    
    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (announcement !== undefined) room.announcement = announcement;
    if (isPublic !== undefined) room.isPublic = isPublic;
    if (requireApproval !== undefined) room.requireApproval = requireApproval;
    room.updatedAt = new Date();
    
    await room.save();
    res.json({ message: '群信息已更新', room });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 设置头衔 ==========
router.put('/:roomId/set-title', authMiddleware, async (req, res) => {
  try {
    const { personaId, title } = req.body;
    const { hasPermission } = await checkRoomPermission(req.userId, req.params.roomId);
    if (!hasPermission) return res.status(403).json({ error: '没有权限' });
    
    await PersonaRoom.findOneAndUpdate(
      { personaId, roomId: req.params.roomId },
      { title: title || '' }
    );
    
    res.json({ message: '头衔已更新' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 获取用户在群里可用的 Persona ==========
router.get('/:roomId/my-personas', authMiddleware, async (req, res) => {
  try {
    const personas = await Persona.getPersonasInRoom(req.userId, req.params.roomId);
    res.json(personas.map(p => ({
      _id: p._id,
      name: p.name,
      displayName: p.displayName,
      avatar: p.avatar,
      sameNameNumber: p.sameNameNumber
    })));
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;