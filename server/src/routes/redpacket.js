// server/src/routes/redpacket.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Persona = require('../models/Persona');
const Room = require('../models/Room');
const RedPacket = require('../models/RedPacket');
const RedPacketRecord = require('../models/RedPacketRecord');
const DiamondService = require('../services/diamondService');
const { emitToUser, emitToRoom } = require('../utils/socketHelper');
const Message = require('../models/Message');

// 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'token无效' }); }
};

/**
 * 发红包
 * POST /api/redpacket/send
 * Body: { roomId, type, totalAmount, count, message, targetPersonaId }
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { roomId, type, totalAmount, count, message, targetPersonaId } = req.body;
    const userId = req.userId;

    // 获取发送者当前角色
    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId }).populate('personaId');
    if (!active || !active.personaId) {
      return res.status(400).json({ error: '请先选择一个角色' });
    }
    const senderPersona = active.personaId;

    // 验证房间
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    // 验证红包类型
    if (!['random', 'fixed', 'personal'].includes(type)) {
      return res.status(400).json({ error: '无效的红包类型' });
    }

    // 验证金额
    if (totalAmount < 1) {
      return res.status(400).json({ error: '红包金额必须大于0' });
    }

    // 个人红包验证
    if (type === 'personal') {
      if (!targetPersonaId) {
        return res.status(400).json({ error: '请选择领取角色' });
      }
      const targetPersona = await Persona.findById(targetPersonaId);
      if (!targetPersona) {
        return res.status(404).json({ error: '领取角色不存在' });
      }
    }

    // 随机/固定红包验证数量
    if (type !== 'personal') {
      if (!count || count < 1) {
        return res.status(400).json({ error: '红包个数必须大于0' });
      }
      if (count > totalAmount) {
        return res.status(400).json({ error: '红包个数不能超过总金额' });
      }
    }

    // 检查充值钻石是否足够
    const hasEnough = await DiamondService.hasEnoughPaidDiamonds(userId, totalAmount);
    if (!hasEnough) {
      return res.status(400).json({ error: '充值钻石不足，请充值后再发红包' });
    }

    // 扣除钻石
    await DiamondService.deductDiamonds(userId, totalAmount, true, 'redpacket_send', redPacket._id, `发送红包 ${totalAmount} 钻石`);

    // 创建红包
    const redPacket = new RedPacket({
      senderPersonaId: senderPersona._id,
      senderUserId: userId,
      roomId,
      type,
      totalAmount,
      remainingAmount: totalAmount,
      message: message || '恭喜发财，大吉大利',
      diamondType: 'paid',
      count: type !== 'personal' ? count : 1,
      remainingCount: type !== 'personal' ? count : 1,
      targetPersonaId: type === 'personal' ? targetPersonaId : null,
      targetUserId: type === 'personal' ? (await Persona.findById(targetPersonaId)).userId : null,
      status: 'active'
    });

    await redPacket.save();

    // 保存红包消息到聊天记录（刷新后还能显示）
    const redpacketMessageContent = JSON.stringify({
      type: 'redpacket',
      redPacketId: redPacket._id,
      senderName: senderPersona.displayName || senderPersona.name,
      redPacketType: type,
      totalAmount: totalAmount,
      count: type !== 'personal' ? count : 1,
      remainingCount: type !== 'personal' ? count : 1,
      message: message || '恭喜发财，大吉大利',
      targetPersonaId: type === 'personal' ? targetPersonaId : null,
      createdAt: new Date().toISOString(),
      status: 'active',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    const redpacketMessage = new Message({
      roomId: roomId,
      userId: userId,
      personaId: senderPersona._id,
      content: redpacketMessageContent,
      isAction: false,
      createdAt: new Date()
    });
    await redpacketMessage.save();

    // 广播红包消息到房间
    emitToRoom(roomId, 'redpacket-sent', {
      redPacketId: redPacket._id,
      senderPersonaId: senderPersona._id,
      senderPersonaName: senderPersona.displayName || senderPersona.name,
      type: redPacket.type,
      totalAmount: redPacket.totalAmount,
      count: redPacket.count,
      remainingCount: redPacket.remainingCount,
      message: redPacket.message,
      targetPersonaId: redPacket.targetPersonaId,
      createdAt: redPacket.createdAt
    });

    res.json({
      success: true,
      message: '红包已发出',
      redPacketId: redPacket._id,
      data: redPacket
    });

  } catch (error) {
    console.error('发红包失败:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

/**
 * 抢红包
 * POST /api/redpacket/:redPacketId/claim
 */
router.post('/:redPacketId/claim', authMiddleware, async (req, res) => {
  try {
    const { redPacketId } = req.params;
    const userId = req.userId;

    // 获取当前角色
    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId }).populate('personaId');
    if (!active || !active.personaId) {
      return res.status(400).json({ error: '请先选择一个角色' });
    }
    const persona = active.personaId;

    // 查找红包
    const redPacket = await RedPacket.findById(redPacketId);
    if (!redPacket) {
      return res.status(404).json({ error: '红包不存在或已过期' });
    }

    // 检查红包状态
    if (redPacket.status !== 'active') {
      return res.status(400).json({ error: redPacket.status === 'finished' ? '红包已被抢完' : '红包已过期' });
    }

    // 检查过期
    if (redPacket.isExpired()) {
      redPacket.status = 'expired';
      await redPacket.save();
      return res.status(400).json({ error: '红包已过期' });
    }

    // 个人红包：检查是否是指定的人
    if (redPacket.type === 'personal') {
      if (redPacket.targetPersonaId.toString() !== persona._id.toString() &&
          redPacket.targetUserId.toString() !== userId) {
        return res.status(403).json({ error: '这个红包不是给你的' });
      }
    }

    // 检查是否已领取过（双重检查）
    if (redPacket.hasClaimed(persona._id)) {
      return res.status(400).json({ error: '你已经领过这个红包了' });
    }

    // 数据库级别检查（防止并发）
    const existingRecord = await RedPacketRecord.findOne({
      redPacketId: redPacket._id,
      receiverPersonaId: persona._id
    });

    if (existingRecord) {
      return res.status(400).json({ error: '你已经领过这个红包了' });
    }

    // 计算领取金额
    let claimAmount = 0;
    let isLucky = false;

    if (redPacket.type === 'personal') {
      claimAmount = redPacket.remainingAmount;
      isLucky = true;
    } else if (redPacket.type === 'fixed') {
      claimAmount = redPacket.perAmount;
      if (redPacket.remainingCount === 1) {
        claimAmount = redPacket.remainingAmount;
      }
    } else {
      const max = Math.floor(redPacket.remainingAmount / redPacket.remainingCount * 2);
      claimAmount = Math.floor(Math.random() * Math.min(max, redPacket.remainingAmount)) + 1;
      if (redPacket.remainingCount === 1) {
        claimAmount = redPacket.remainingAmount;
      }
      // 检查是否手气最佳（比较所有历史记录中的最大值）
      const currentMaxAmount = redPacket.records.length > 0 
        ? Math.max(...redPacket.records.map(r => r.amount)) 
        : 0;
      if (claimAmount > currentMaxAmount) {
        isLucky = true;
      }
    }

    // 更新红包
    redPacket.remainingAmount -= claimAmount;
    redPacket.remainingCount -= 1;
    redPacket.records.push({
      personaId: persona._id,
      personaName: persona.displayName || persona.name,
      amount: claimAmount,
      avatar: persona.avatar,
      avatarFrame: persona.equipped?.avatarFrame,
      createdAt: new Date()
    });

    if (redPacket.remainingCount <= 0 || redPacket.remainingAmount <= 0) {
      redPacket.status = 'finished';
    }

    await redPacket.save();

    // 创建领取记录
    const record = new RedPacketRecord({
      redPacketId: redPacket._id,
      receiverPersonaId: persona._id,
      receiverUserId: userId,
      receiverPersonaName: persona.displayName || persona.name,
      amount: claimAmount,
      diamondType: 'paid',
      isLucky,
      avatar: persona.avatar,
      avatarFrame: persona.equipped?.avatarFrame
    });
    await record.save();

    // 添加免费钻石到领取者账户
    await DiamondService.addFreeDiamonds(userId, claimAmount, 'redpacket_receive', redPacket._id, `抢红包获得 ${claimAmount} 钻石`);

    // 更新消息中的红包信息
    try {
      const targetMessage = await Message.findOne({
        roomId: redPacket.roomId,
        'content': { $regex: `"redPacketId":"${redPacketId}"` }
      });
      if (targetMessage) {
        const oldContent = JSON.parse(targetMessage.content);
        oldContent.remainingCount = redPacket.remainingCount;
        oldContent.status = redPacket.status;
        targetMessage.content = JSON.stringify(oldContent);
        await targetMessage.save();
      }
    } catch (msgError) {
      console.error('更新红包消息失败:', msgError);
    }

    // 广播红包被抢
    emitToRoom(redPacket.roomId.toString(), 'redpacket-claimed', {
      redPacketId: redPacket._id,
      claimerPersonaId: persona._id,
      claimerPersonaName: persona.displayName || persona.name,
      amount: claimAmount,
      remainingCount: redPacket.remainingCount,
      remainingAmount: redPacket.remainingAmount,
      isFinished: redPacket.status === 'finished'
    });

    // 如果是红包抢完，通知发送者
    if (redPacket.status === 'finished') {
      emitToUser(redPacket.senderUserId.toString(), 'redpacket-finished', {
        redPacketId: redPacket._id,
        totalAmount: redPacket.totalAmount,
        records: redPacket.records
      });
    }

    res.json({
      success: true,
      message: `恭喜抢到 ${claimAmount} 钻石！`,
      amount: claimAmount,
      isLucky,
      remainingCount: redPacket.remainingCount,
      isFinished: redPacket.status === 'finished'
    });

  } catch (error) {
    console.error('抢红包失败:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
});

/**
 * 获取红包详情
 * GET /api/redpacket/:redPacketId
 */
router.get('/:redPacketId', authMiddleware, async (req, res) => {
  try {
    const { redPacketId } = req.params;

    const redPacket = await RedPacket.findById(redPacketId)
      .populate('senderPersonaId', 'name displayName avatar')
      .populate('targetPersonaId', 'name displayName avatar');

    if (!redPacket) {
      return res.status(404).json({ error: '红包不存在' });
    }

    const records = await RedPacketRecord.find({ redPacketId })
      .sort({ amount: -1, createdAt: 1 });

    const ActivePersona = require('../models/ActivePersona');
    const active = await ActivePersona.findOne({ userId: req.userId });
    const hasClaimed = active ? redPacket.hasClaimed(active.personaId) : false;

    res.json({
      redPacket: {
        _id: redPacket._id,
        type: redPacket.type,
        totalAmount: redPacket.totalAmount,
        remainingAmount: redPacket.remainingAmount,
        count: redPacket.count,
        remainingCount: redPacket.remainingCount,
        message: redPacket.message,
        status: redPacket.status,
        sender: redPacket.senderPersonaId,
        targetPersona: redPacket.targetPersonaId,
        createdAt: redPacket.createdAt,
        expiresAt: redPacket.expiresAt
      },
      records: records.map(r => ({
        personaId: r.receiverPersonaId,
        personaName: r.receiverPersonaName,
        amount: r.amount,
        createdAt: r.createdAt,
        isLucky: r.isLucky,
        avatar: r.avatar,
        avatarFrame: r.avatarFrame
      })),
      hasClaimed,
      isExpired: redPacket.isExpired()
    });

  } catch (error) {
    console.error('获取红包详情失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取房间红包列表
 * GET /api/redpacket/room/:roomId
 */
router.get('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const redPackets = await RedPacket.find({ roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('senderPersonaId', 'name displayName avatar');

    const total = await RedPacket.countDocuments({ roomId });

    res.json({
      redPackets,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('获取红包列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;