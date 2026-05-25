const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Message = require('../models/Message');
const Persona = require('../models/Persona');
const PersonaRoom = require('../models/PersonaRoom');
const UserReadRecord = require('../models/UserReadRecord');
const jwt = require('jsonwebtoken');
const { logAction } = require('../middlewares/auditLog');
const { processMentions, sendMentionNotifications, sendMentionDiscordAlert } = require('../middlewares/mentionHandler');

console.log('🔧 [room.js] 加载路由模块');

// 生成消息ID
function generateMessageId() {
  return new mongoose.Types.ObjectId().toString();
}

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
async function getActivePersona(userId) {
  const ActivePersona = require('../models/ActivePersona');
  const active = await ActivePersona.findOne({ userId }).populate('personaId');
  return active?.personaId || null;
}

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
      creatorUserId: req.userId,
      creatorName: persona.displayName || persona.name
    });
    
    await room.save();
    
    await PersonaRoom.create({
      personaId: persona._id,
      roomId: room._id,
      userId: req.userId,
      role: 'owner',
      joinedAt: new Date()
    });
    
    await logAction(req, 'CREATE_ROOM', { roomId: room._id, roomName: room.name });
    
    console.log(`✅ 房间创建: ${room.name}，群主: ${persona.displayName}`);
    
    res.status(201).json({
      message: '聊天室创建成功',
      room: {
        _id: room._id,
        name: room.name,
        description: room.description,
        creatorName: persona.displayName || persona.name
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
    const personas = await Persona.find({ userId: req.userId, status: 'approved' });
    const personaIds = personas.map(p => p._id);
    
    const personaRooms = await PersonaRoom.find({ personaId: { $in: personaIds } })
      .populate({
        path: 'roomId',
        match: { isActive: true }
      });
    
    const validRooms = personaRooms.filter(pr => pr.roomId).map(pr => pr.roomId);
    
    const uniqueRooms = [];
    const seen = new Set();
    for (const room of validRooms) {
      if (!seen.has(room._id.toString())) {
        seen.add(room._id.toString());
        uniqueRooms.push(room);
      }
    }
    
    const roomsWithStats = await Promise.all(uniqueRooms.map(async (room) => {
      const lastMessage = await Message.findOne({ roomId: room._id })
        .sort({ createdAt: -1 })
        .populate('personaId', 'name displayName avatar sameNameNumber')
        .lean();
      
      const messageCount = await Message.countDocuments({ roomId: room._id });
      const lastRead = await UserReadRecord.findOne({ userId: req.userId, roomId: room._id });
      const unreadCount = await Message.countDocuments({
        roomId: room._id,
        createdAt: { $gt: lastRead?.lastReadAt || new Date(0) }
      });
      const memberCount = await PersonaRoom.countDocuments({ roomId: room._id });
      
      let creatorName = '?';
      if (room.creatorName) {
        creatorName = room.creatorName;
      } else if (room.createdBy) {
        const creatorPersona = await Persona.findById(room.createdBy);
        if (creatorPersona) {
          creatorName = creatorPersona.displayName || creatorPersona.name;
        }
      }
      
      let formattedLastMessage = null;
      if (lastMessage) {
        formattedLastMessage = {
          content: lastMessage.isRecalled ? '消息已被撤回' : lastMessage.content,
          senderName: lastMessage.personaId?.displayName || lastMessage.personaId?.name || '未知',
          createdAt: lastMessage.createdAt,
          isAction: lastMessage.isAction || false,
          isRecalled: lastMessage.isRecalled || false
        };
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
        creatorName,
        createdAt: room.createdAt,
        lastMessage: formattedLastMessage
      };
    }));
    
    roomsWithStats.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.createdAt;
      const timeB = b.lastMessage?.createdAt || b.createdAt;
      return new Date(timeB) - new Date(timeA);
    });
    
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
    if (room.creatorName) {
      creatorName = room.creatorName;
    } else if (room.createdBy) {
      const creator = await Persona.findById(room.createdBy);
      creatorName = creator ? (creator.displayName || creator.name) : '?';
    } else if (room.creatorUserId) {
      const defaultPersona = await Persona.findOne({ userId: room.creatorUserId, status: 'approved' });
      creatorName = defaultPersona ? (defaultPersona.displayName || defaultPersona.name) : '?';
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

// ========== 获取消息（支持回复和软删除过滤）==========
router.get('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const before = req.query.before;
    
    let query = Message.find({ roomId })
      .populate({
        path: 'personaId',
        populate: {
          path: 'equipped.avatarFrame',
          model: 'ShopItem',
          select: 'image name'
        }
      })
      .populate('replyTo', 'content isRecalled isDeleted')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    if (before) {
      const beforeDate = new Date(before);
      query = Message.find({ roomId, createdAt: { $lt: beforeDate } })
        .populate({
          path: 'personaId',
          populate: {
            path: 'equipped.avatarFrame',
            model: 'ShopItem',
            select: 'image name'
          }
        })
        .populate('replyTo', 'content isRecalled isDeleted')
        .sort({ createdAt: -1 })
        .limit(limit);
    }
    
    let messages = await query.exec();
    messages = messages.reverse();
    
    const filteredMessages = messages.filter(msg => {
      if (msg.isDeleted && msg.deletedBy === req.userId) {
        return false;
      }
      return true;
    });
    
    const safeMessages = filteredMessages.map(msg => {
      let replyToData = null;
      if (msg.replyTo) {
        const replyIsHidden = msg.replyTo.isDeleted || msg.replyTo.isRecalled;
        replyToData = {
          _id: msg.replyTo._id,
          content: replyIsHidden ? '[消息已不可见]' : msg.replyTo.content,
          isRecalled: msg.replyTo.isRecalled || false,
          isDeleted: msg.replyTo.isDeleted || false
        };
      }
      
      const persona = msg.personaId;
      const senderName = persona ? (persona.displayName || persona.name) : '用户';
      
      let avatarFrameUrl = null;
      if (persona && persona.equipped && persona.equipped.avatarFrame) {
        avatarFrameUrl = persona.equipped.avatarFrame.image;
      }
      
      return {
        _id: msg._id,
        content: msg.isRecalled ? `${senderName} 撤回了一条消息` : msg.content,
        isAction: msg.isAction,
        createdAt: msg.createdAt,
        roomId: msg.roomId,
        isRecalled: msg.isRecalled || false,
        replyTo: replyToData,
        personaId: persona ? {
          _id: persona._id,
          name: persona.name,
          displayName: persona.displayName,
          avatar: persona.avatar,
          sameNameNumber: persona.sameNameNumber,
          avatarFrame: avatarFrameUrl,
          equipped: persona.equipped ? {
            avatarFrame: avatarFrameUrl
          } : null
        } : null,
        userId: { _id: req.userId }
      };
    });
    
    res.json(safeMessages);
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 发送消息（支持回复和@提及）==========
router.post('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, personaId, replyToId } = req.body;
    
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: '房间不存在' });
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId, status: 'approved' })
      .populate('equipped.avatarFrame', 'image name');
    if (!persona) return res.status(400).json({ error: '角色不存在' });
    
    let replyToMessage = null;
    if (replyToId) {
      replyToMessage = await Message.findById(replyToId);
      if (!replyToMessage) {
        return res.status(400).json({ error: '引用的消息不存在' });
      }
    }
    
    const message = new Message({
      roomId,
      userId: req.userId,
      personaId: persona._id,
      content,
      isAction: content.startsWith('/me ') || content.startsWith('/action '),
      replyTo: replyToId || null
    });
    
    await message.save();
    
    // ✅ 处理@提及
    const io = req.app.get('io');
    const mentionedUsers = await processMentions(content, roomId, persona._id, persona);
    
    if (mentionedUsers.length > 0) {
      sendMentionNotifications(io, mentionedUsers, message, persona, roomId, room.name);
      await sendMentionDiscordAlert(mentionedUsers, persona, room.name);
    }
    
    let populatedMessage = await Message.findById(message._id)
      .populate({
        path: 'personaId',
        populate: {
          path: 'equipped.avatarFrame',
          model: 'ShopItem',
          select: 'image name'
        }
      })
      .populate('replyTo', 'content isRecalled isDeleted');
    
    let replyToData = null;
    if (populatedMessage.replyTo) {
      const replyIsHidden = populatedMessage.replyTo.isDeleted || populatedMessage.replyTo.isRecalled;
      replyToData = {
        _id: populatedMessage.replyTo._id,
        content: replyIsHidden ? '[消息已不可见]' : populatedMessage.replyTo.content,
        isRecalled: populatedMessage.replyTo.isRecalled || false,
        isDeleted: populatedMessage.replyTo.isDeleted || false
      };
    }
    
    const personaData = populatedMessage.personaId;
    let avatarFrameUrl = null;
    if (personaData && personaData.equipped && personaData.equipped.avatarFrame) {
      avatarFrameUrl = personaData.equipped.avatarFrame.image;
    }
    
    if (io) {
      io.to(roomId).emit('new-message', {
        _id: message._id,
        content: message.content,
        isAction: message.isAction,
        createdAt: message.createdAt,
        roomId: message.roomId,
        replyTo: replyToData,
        isRecalled: false,
        personaId: {
          _id: persona._id,
          name: persona.name,
          displayName: persona.displayName,
          avatar: persona.avatar,
          sameNameNumber: persona.sameNameNumber,
          avatarFrame: avatarFrameUrl,
          equipped: { avatarFrame: avatarFrameUrl }
        },
        userId: { _id: req.userId }
      });
    }
    
    res.status(201).json({ success: true, message: { _id: message._id, content: message.content } });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 未读消息数 ==========
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
    const { personaId, message: joinMessage } = req.body;
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
    room.pendingMembers.push({ userId: req.userId, personaId, message: joinMessage || '', appliedAt: new Date() });
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
    const { roomId } = req.params;
    
    // 验证房间是否存在
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    // 获取所有 PersonaRoom 记录
    const personaRooms = await PersonaRoom.find({ roomId });
    
    // 收集所有 personaId
    const personaIds = personaRooms.map(pr => pr.personaId).filter(id => id);
    
    // 批量查询 Persona 信息
    const personas = await Persona.find({ _id: { $in: personaIds } });
    
    // 创建映射以便快速查找
    const personaMap = new Map();
    personas.forEach(p => {
      personaMap.set(p._id.toString(), p);
    });
    
    // 构建成员列表
    const members = personaRooms
      .filter(pr => pr.personaId && personaMap.has(pr.personaId.toString()))
      .map(pr => {
        const persona = personaMap.get(pr.personaId.toString());
        return {
          _id: pr._id,
          personaId: {
            _id: persona._id,
            name: persona.name,
            displayName: persona.displayName || persona.name,
            avatar: persona.avatar,
            sameNameNumber: persona.sameNameNumber,
            globalNumber: persona.globalNumber
          },
          role: pr.role,
          title: pr.title || '',
          joinedAt: pr.joinedAt
        };
      });
    
    console.log(`✅ 成功获取房间 ${roomId} 的成员列表，共 ${members.length} 人`);
    res.json(members);
  } catch (error) {
    console.error('获取成员列表失败:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// ========== 待审核 ==========
router.get('/:roomId/pending', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate('pendingMembers.personaId', 'name displayName avatar sameNameNumber');
    
    if (!room) return res.status(404).json({ error: '聊天室不存在' });
    
    const { hasPermission } = await checkRoomPermission(req.userId, req.params.roomId);
    if (!hasPermission) return res.status(403).json({ error: '没有权限' });
    
    const pending = (room.pendingMembers || []).filter(p => p.personaId);
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 批准/拒绝入群申请 ==========
router.post('/:roomId/approve-request', authMiddleware, async (req, res) => {
  try {
    const { personaId, approve } = req.body;
    const { roomId } = req.params;
    
    console.log(`📋 [API] 处理申请: roomId=${roomId}, personaId=${personaId}, approve=${approve}`);
    
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: '聊天室不存在' });
    
    const { hasPermission } = await checkRoomPermission(req.userId, roomId);
    if (!hasPermission) {
      return res.status(403).json({ error: '没有权限' });
    }
    
    if (!room.pendingMembers || room.pendingMembers.length === 0) {
      return res.status(404).json({ error: '没有待审核申请' });
    }
    
    const pendingIndex = room.pendingMembers.findIndex(p => p.personaId?.toString() === personaId);
    if (pendingIndex === -1) {
      return res.status(404).json({ error: '申请不存在' });
    }
    
    const pending = room.pendingMembers[pendingIndex];
    
    if (approve) {
      const existing = await PersonaRoom.findOne({ personaId: pending.personaId, roomId });
      if (!existing) {
        await PersonaRoom.create({
          personaId: pending.personaId,
          roomId,
          userId: pending.userId,
          role: 'member',
          joinedAt: new Date()
        });
        console.log(`✅ [API] 角色已加入群`);
      }
    }
    
    room.pendingMembers.splice(pendingIndex, 1);
    await room.save();
    
    res.json({ message: approve ? '已批准加入' : '已拒绝申请' });
  } catch (error) {
    console.error('❌ [API] 处理申请失败:', error);
    res.status(500).json({ error: error.message || '处理失败' });
  }
});

// ========== 设置管理员 ==========
router.post('/:roomId/set-admin', authMiddleware, async (req, res) => {
  try {
    const { personaId, isAdmin } = req.body;
    const { hasPermission, role } = await checkRoomPermission(req.userId, req.params.roomId);
    
    if (!hasPermission) return res.status(403).json({ error: '没有权限' });
    if (role !== 'owner') return res.status(403).json({ error: '只有群主可以设置管理员' });
    
    await PersonaRoom.findOneAndUpdate(
      { personaId, roomId: req.params.roomId },
      { role: isAdmin ? 'admin' : 'member' }
    );
    
    await logAction(req, isAdmin ? 'SET_ADMIN' : 'REMOVE_ADMIN', { 
      roomId: req.params.roomId, 
      targetPersonaId: personaId 
    });
    
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
    
    await logAction(req, 'KICK_MEMBER', { 
      roomId: req.params.roomId, 
      targetPersonaId: personaId,
      targetRole: targetRole.role
    });
    
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
    
    await logAction(req, 'SET_TITLE', { 
      roomId: req.params.roomId, 
      targetPersonaId: personaId,
      title 
    });
    
    res.json({ message: '头衔已更新' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 获取用户在群里可用的 Persona ==========
router.get('/:roomId/my-personas', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`📋 [API] 获取用户在群 ${roomId} 中的角色`);
    
    const allPersonas = await Persona.find({ userId: req.userId, status: 'approved' });
    const personaIds = allPersonas.map(p => p._id);
    
    const personaRooms = await PersonaRoom.find({ 
      roomId,
      personaId: { $in: personaIds }
    });
    
    const joinedPersonaIds = new Set(personaRooms.map(pr => pr.personaId.toString()));
    const joinedPersonas = allPersonas.filter(p => joinedPersonaIds.has(p._id.toString()));
    
    console.log(`✅ [API] 用户在群中有 ${joinedPersonas.length} 个角色`);
    
    res.json(joinedPersonas.map(p => ({
      _id: p._id,
      name: p.name,
      displayName: p.displayName,
      avatar: p.avatar,
      sameNameNumber: p.sameNameNumber,
      status: p.status
    })));
  } catch (error) {
    console.error('获取群内角色失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 直接添加角色到群聊 ==========
router.post('/:roomId/add-persona', authMiddleware, async (req, res) => {
  try {
    const { personaId } = req.body;
    const { roomId } = req.params;
    
    console.log(`➕ [API] 添加角色到群: roomId=${roomId}, personaId=${personaId}`);
    
    if (!personaId) {
      return res.status(400).json({ error: '请指定角色' });
    }
    
    const { hasPermission, role } = await checkRoomPermission(req.userId, roomId);
    if (!hasPermission || (role !== 'owner' && role !== 'admin')) {
      return res.status(403).json({ error: '只有群主或管理员可以添加角色' });
    }
    
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId, status: 'approved' });
    if (!persona) {
      return res.status(404).json({ error: '角色不存在或未审核' });
    }
    
    const existing = await PersonaRoom.findOne({ personaId, roomId });
    if (existing) {
      return res.status(400).json({ error: '该角色已在群中' });
    }
    
    await PersonaRoom.create({
      personaId,
      roomId,
      userId: req.userId,
      role: 'member',
      joinedAt: new Date()
    });
    
    console.log(`✅ [API] 角色 ${persona.displayName} 已添加到群`);
    
    res.json({ success: true, message: '角色已加入群聊' });
  } catch (error) {
    console.error('❌ [API] 添加角色失败:', error);
    res.status(500).json({ error: error.message || '操作失败' });
  }
});

// ========== 撤回消息 ==========
router.post('/message/recall', authMiddleware, async (req, res) => {
  const { messageId } = req.body;
  console.log(`⏪ [API] 撤回消息请求: messageId=${messageId}`);
  
  try {
    if (!messageId) {
      return res.status(400).json({ error: '消息ID不能为空' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }
    
    const currentPersona = await getActivePersona(req.userId);
    if (!currentPersona) {
      return res.status(403).json({ error: '请先选择一个角色' });
    }
    
    if (message.userId.toString() !== currentPersona._id.toString() && 
        message.personaId?.toString() !== currentPersona._id.toString()) {
      return res.status(403).json({ error: '只能撤回自己的消息' });
    }
    
    const diffSeconds = (Date.now() - new Date(message.createdAt).getTime()) / 1000;
    if (diffSeconds > 5 * 60) {
      return res.status(400).json({ error: '只能撤回5分钟内的消息' });
    }
    
    if (message.isRecalled) {
      return res.status(400).json({ error: '消息已被撤回' });
    }
    
    message.isRecalled = true;
    message.recalledAt = new Date();
    await message.save();
    
    await logAction(req, 'RECALL_MESSAGE', { 
      messageId: message._id,
      roomId: message.roomId
    });
    
    const persona = await Persona.findById(message.personaId);
    const senderName = persona ? (persona.displayName || persona.name) : '用户';
    
    console.log(`✅ [API] 消息撤回成功`);
    
    const io = req.app.get('io');
    if (io) {
      io.to(message.roomId).emit('message-recalled', {
        messageId: message._id,
        recalledBy: req.userId,
        recalledByName: senderName,
        recalledAt: message.recalledAt
      });
    }
    
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('❌ [API] 撤回失败:', error);
    res.status(500).json({ error: error.message || '撤回失败' });
  }
});

// ========== 删除消息（软删除 - 仅自己不可见）==========
router.post('/message/delete', authMiddleware, async (req, res) => {
  const { messageId } = req.body;
  console.log(`🗑️ [API] 删除消息请求: messageId=${messageId}`);
  
  try {
    if (!messageId) {
      return res.status(400).json({ error: '消息ID不能为空' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }
    
    const currentPersona = await getActivePersona(req.userId);
    if (!currentPersona) {
      return res.status(403).json({ error: '请先选择一个角色' });
    }
    
    if (message.userId.toString() !== currentPersona._id.toString() && 
        message.personaId?.toString() !== currentPersona._id.toString()) {
      return res.status(403).json({ error: '只能删除自己的消息' });
    }
    
    if (message.isDeleted) {
      return res.status(400).json({ error: '消息已被删除' });
    }
    
    message.isDeleted = true;
    message.deletedBy = req.userId;
    message.deletedAt = new Date();
    await message.save();
    
    console.log(`✅ [API] 消息删除成功（软删除）`);
    
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.userId}`).emit('message-deleted', {
        messageId: message._id,
        deletedAt: message.deletedAt
      });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('❌ [API] 删除失败:', error);
    res.status(500).json({ error: error.message || '删除失败' });
  }
});

// ========== 转让群主 ==========
router.post('/:roomId/transfer-owner', authMiddleware, async (req, res) => {
  try {
    const { newOwnerId } = req.body;
    const { roomId } = req.params;
    
    console.log(`👑 [API] 转让群主请求: roomId=${roomId}, newOwnerId=${newOwnerId}`);
    
    if (!newOwnerId) {
      return res.status(400).json({ error: '请指定新群主' });
    }
    
    const currentPersona = await getActivePersona(req.userId);
    if (!currentPersona) {
      return res.status(403).json({ error: '请先选择一个角色' });
    }
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: '聊天室不存在' });
    }
    
    const currentPersonaRoom = await PersonaRoom.findOne({
      personaId: currentPersona._id,
      roomId
    });
    
    if (!currentPersonaRoom || currentPersonaRoom.role !== 'owner') {
      return res.status(403).json({ error: '只有群主可以转让群主' });
    }
    
    const newOwnerPersonaRoom = await PersonaRoom.findOne({
      personaId: newOwnerId,
      roomId
    });
    
    if (!newOwnerPersonaRoom) {
      return res.status(404).json({ error: '新群主不在群聊中' });
    }
    
    const newOwnerPersona = await Persona.findById(newOwnerId);
    
    await PersonaRoom.findOneAndUpdate(
      { personaId: currentPersona._id, roomId },
      { role: 'admin' }
    );
    
    await PersonaRoom.findOneAndUpdate(
      { personaId: newOwnerId, roomId },
      { role: 'owner' }
    );
    
    room.createdBy = newOwnerId;
    room.creatorName = newOwnerPersona?.displayName || newOwnerPersona?.name || '?';
    await room.save();
    
    await logAction(req, 'TRANSFER_OWNER', { 
      roomId, 
      newOwnerId,
      oldOwnerId: currentPersona._id
    });
    
    console.log(`✅ [API] 群主转让成功`);
    
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('owner-transferred', {
        oldOwnerId: currentPersona._id,
        newOwnerId
      });
    }
    
    res.json({ success: true, message: '群主转让成功', newOwnerId });
  } catch (error) {
    console.error('❌ [API] 转让群主失败:', error);
    res.status(500).json({ error: error.message || '转让失败' });
  }
});

// ========== 获取可提及的成员列表 ==========
router.get('/:roomId/mentionable', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const currentPersona = await getActivePersona(req.userId);
    if (!currentPersona) {
      return res.status(403).json({ error: '请先选择一个角色' });
    }
    
    const personaRooms = await PersonaRoom.find({ roomId })
      .populate('personaId', 'name displayName avatar');
    
    const members = personaRooms
      .filter(pr => pr.personaId && pr.personaId._id.toString() !== currentPersona._id.toString())
      .map(pr => ({
        _id: pr.personaId._id,
        displayName: pr.personaId.displayName || pr.personaId.name,
        avatar: pr.personaId.avatar,
        title: pr.title || null,
        role: pr.role
      }));
    
    // 添加 @所有人 选项
    members.unshift({
      _id: '@all',
      displayName: '所有人',
      avatar: null,
      title: null,
      role: 'all'
    });
    
    res.json(members);
  } catch (error) {
    console.error('获取可提及成员失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

console.log('✅ [room.js] 路由模块加载完成');

module.exports = router;