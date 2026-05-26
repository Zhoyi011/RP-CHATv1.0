// ==================== 充值码路由 ====================
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const RedeemCode = require('../models/RedeemCode');
const RedemptionRecord = require('../models/RedemptionRecord');
const User = require('../models/User');
const { requireSuperAdminOrOwner, getCurrentUser } = require('../middleware/roleMiddleware');

// ========== 工具函数 ==========

/**
 * 生成随机充值码
 * 格式: RP-XXXX-XXXX (如: RP-AB12-3456)
 */
const generateRandomCode = () => {
  // 生成4位字母（大写）
  const letters = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  // 生成4位数字
  const numbers = Math.floor(1000 + Math.random() * 9000).toString();
  return `RP-${letters}-${numbers}`;
};

/**
 * 检查充值码是否唯一
 */
const isCodeUnique = async (code) => {
  const existing = await RedeemCode.findOne({ code });
  return !existing;
};

/**
 * 生成唯一充值码（带重试）
 */
const generateUniqueCode = async (maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateRandomCode();
    if (await isCodeUnique(code)) return code;
  }
  // 如果随机生成都重复，使用时间戳
  return `RP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// ========== 管理员接口 ==========

/**
 * POST /api/redeem/create
 * 创建充值码（仅 super_admin 和 owner）
 * 
 * Body:
 *   - diamondAmount: 钻石数量（必填，≥1）
 *   - customCode: 自定义充值码（可选，格式: RP-XXXX-XXXX）
 *   - note: 备注（可选）
 *   - presetAmount: 预设金额（可选，如果提供会覆盖 diamondAmount）
 */
router.post('/create', requireSuperAdminOrOwner, async (req, res) => {
  try {
    const { diamondAmount, customCode, note, presetAmount } = req.body;
    
    // 确定钻石数量（优先使用 presetAmount）
    let finalAmount = presetAmount || diamondAmount;
    
    if (!finalAmount || finalAmount < 1) {
      return res.status(400).json({ error: '钻石数量必须大于0' });
    }
    
    // 限制最大数量（防止异常，100万应该够了）
    if (finalAmount > 1000000) {
      return res.status(400).json({ error: '单次充值码钻石数量不能超过100万' });
    }
    
    // 处理充值码
    let code = customCode;
    if (code) {
      // 验证自定义格式: RP-XXXX-XXXX（字母-数字）
      const codeRegex = /^RP-[A-Z0-9]{4}-[0-9]{4}$/i;
      if (!codeRegex.test(code)) {
        return res.status(400).json({ error: '充值码格式错误，应为 RP-XXXX-XXXX（如: RP-AB12-3456）' });
      }
      code = code.toUpperCase();
      
      // 检查是否已存在
      const existing = await RedeemCode.findOne({ code });
      if (existing) {
        return res.status(400).json({ error: '充值码已存在，请使用其他码' });
      }
    } else {
      // 自动生成
      code = await generateUniqueCode();
    }
    
    // 计算过期时间（14天后）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    
    // 创建充值码
    const redeemCode = new RedeemCode({
      code,
      diamondAmount: finalAmount,
      createdBy: req.user._id,
      expiresAt,
      note: note || ''
    });
    
    await redeemCode.save();
    
    res.status(201).json({
      success: true,
      message: '充值码创建成功',
      data: {
        code: redeemCode.code,
        diamondAmount: redeemCode.diamondAmount,
        expiresAt: redeemCode.expiresAt,
        note: redeemCode.note,
        createdAt: redeemCode.createdAt
      }
    });
  } catch (error) {
    console.error('创建充值码失败:', error);
    res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
});

/**
 * POST /api/redeem/batch-create
 * 批量创建充值码（仅 super_admin 和 owner）
 * 
 * Body:
 *   - diamondAmount: 钻石数量
 *   - count: 数量（最多100个）
 *   - note: 备注（可选）
 */
router.post('/batch-create', requireSuperAdminOrOwner, async (req, res) => {
  try {
    const { diamondAmount, count, note } = req.body;
    
    if (!diamondAmount || diamondAmount < 1) {
      return res.status(400).json({ error: '钻石数量必须大于0' });
    }
    
    let batchCount = parseInt(count);
    if (isNaN(batchCount) || batchCount < 1 || batchCount > 100) {
      return res.status(400).json({ error: '批量数量必须在1-100之间' });
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    
    const codes = [];
    const errors = [];
    
    for (let i = 0; i < batchCount; i++) {
      try {
        const code = await generateUniqueCode();
        const redeemCode = new RedeemCode({
          code,
          diamondAmount,
          createdBy: req.user._id,
          expiresAt,
          note: note || ''
        });
        await redeemCode.save();
        codes.push({
          code: redeemCode.code,
          diamondAmount: redeemCode.diamondAmount,
          expiresAt: redeemCode.expiresAt
        });
      } catch (err) {
        errors.push({ index: i + 1, error: err.message });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `成功创建 ${codes.length} 个充值码`,
      data: {
        created: codes.length,
        failed: errors.length,
        codes,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('批量创建充值码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * GET /api/redeem/list
 * 获取充值码列表（仅 super_admin 和 owner）
 * 
 * Query:
 *   - page: 页码（默认1）
 *   - limit: 每页数量（默认20，最大100）
 *   - isUsed: 筛选是否已使用（true/false）
 *   - isExpired: 筛选是否已过期（true/false）
 */
router.get('/list', requireSuperAdminOrOwner, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    limit = Math.min(limit, 100);
    const skip = (page - 1) * limit;
    
    const filter = {};
    
    // 筛选是否已使用
    if (req.query.isUsed === 'true') filter.isUsed = true;
    else if (req.query.isUsed === 'false') filter.isUsed = false;
    
    // 筛选是否已过期（注意：过期判断需要比较当前时间）
    if (req.query.isExpired === 'true') {
      filter.expiresAt = { $lt: new Date() };
    } else if (req.query.isExpired === 'false') {
      filter.expiresAt = { $gte: new Date() };
    }
    
    const [codes, total] = await Promise.all([
      RedeemCode.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username email role')
        .populate('usedBy', 'username email')
        .lean(),
      RedeemCode.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: {
        codes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取充值码列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * DELETE /api/redeem/:codeId
 * 删除充值码（仅 super_admin 和 owner）
 */
router.delete('/:codeId', requireSuperAdminOrOwner, async (req, res) => {
  try {
    const { codeId } = req.params;
    
    const redeemCode = await RedeemCode.findById(codeId);
    if (!redeemCode) {
      return res.status(404).json({ error: '充值码不存在' });
    }
    
    if (redeemCode.isUsed) {
      return res.status(400).json({ error: '充值码已被使用，无法删除' });
    }
    
    await RedeemCode.deleteOne({ _id: codeId });
    
    res.json({
      success: true,
      message: '充值码删除成功'
    });
  } catch (error) {
    console.error('删除充值码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ========== 用户接口 ==========

/**
 * POST /api/redeem/use
 * 使用充值码（普通用户）
 * 
 * Body:
 *   - code: 充值码
 */
router.post('/use', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: '请提供充值码' });
    }
    
    // 获取当前用户
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    // 格式化充值码
    const formattedCode = code.trim().toUpperCase();
    
    // 查找充值码
    const redeemCode = await RedeemCode.findOne({ code: formattedCode });
    if (!redeemCode) {
      return res.status(404).json({ error: '充值码不存在' });
    }
    
    // 检查是否已使用
    if (redeemCode.isUsed) {
      return res.status(400).json({ error: '充值码已被使用' });
    }
    
    // 检查是否过期
    if (new Date() > redeemCode.expiresAt) {
      return res.status(400).json({ error: '充值码已过期' });
    }
    
    // 记录使用前余额
    const previousBalance = user.diamonds || 0;
    
    // 增加钻石
    user.diamonds = (user.diamonds || 0) + redeemCode.diamondAmount;
    await user.save();
    
    // 更新充值码状态
    redeemCode.isUsed = true;
    redeemCode.usedBy = user._id;
    redeemCode.usedAt = new Date();
    await redeemCode.save();
    
    // 创建使用记录
    const record = new RedemptionRecord({
      userId: user._id,
      redeemCodeId: redeemCode._id,
      code: redeemCode.code,
      diamondAmount: redeemCode.diamondAmount,
      previousBalance,
      newBalance: user.diamonds
    });
    await record.save();
    
    res.json({
      success: true,
      message: `充值成功！获得 ${redeemCode.diamondAmount} 💎`,
      data: {
        diamondAmount: redeemCode.diamondAmount,
        newBalance: user.diamonds
      }
    });
  } catch (error) {
    console.error('使用充值码失败:', error);
    res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
});

/**
 * GET /api/redeem/history
 * 获取当前用户的充值记录
 * 
 * Query:
 *   - limit: 返回数量（默认20，最大100）
 */
router.get('/history', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: '请先登录' });
    }
    
    let limit = parseInt(req.query.limit) || 20;
    limit = Math.min(limit, 100);
    
    const records = await RedemptionRecord.findByUser(user._id, limit);
    
    res.json({
      success: true,
      data: {
        records,
        totalDiamondsReceived: records.reduce((sum, r) => sum + r.diamondAmount, 0)
      }
    });
  } catch (error) {
    console.error('获取充值记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * GET /api/redeem/stats
 * 获取充值码统计（仅管理员）
 */
router.get('/stats', requireSuperAdminOrOwner, async (req, res) => {
  try {
    const now = new Date();
    
    const [
      totalCodes,
      usedCodes,
      unusedCodes,
      expiredCodes,
      totalDiamondsGiven,
      usedDiamondsGiven
    ] = await Promise.all([
      RedeemCode.countDocuments(),
      RedeemCode.countDocuments({ isUsed: true }),
      RedeemCode.countDocuments({ isUsed: false, expiresAt: { $gt: now } }),
      RedeemCode.countDocuments({ expiresAt: { $lt: now }, isUsed: false }),
      RedeemCode.aggregate([{ $group: { _id: null, total: { $sum: '$diamondAmount' } } }]),
      RedeemCode.aggregate([{ $match: { isUsed: true } }, { $group: { _id: null, total: { $sum: '$diamondAmount' } } }])
    ]);
    
    res.json({
      success: true,
      data: {
        totalCodes,
        usedCodes,
        unusedCodes,
        expiredCodes,
        totalDiamondsGiven: totalDiamondsGiven[0]?.total || 0,
        usedDiamondsGiven: usedDiamondsGiven[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('获取充值统计失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * GET /api/redeem/check/:code
 * 检查充值码有效性（不消耗）
 */
router.get('/check/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const formattedCode = code.trim().toUpperCase();
    
    const redeemCode = await RedeemCode.findOne({ code: formattedCode });
    
    if (!redeemCode) {
      return res.json({ valid: false, error: '充值码不存在' });
    }
    
    if (redeemCode.isUsed) {
      return res.json({ valid: false, error: '充值码已被使用' });
    }
    
    if (new Date() > redeemCode.expiresAt) {
      return res.json({ valid: false, error: '充值码已过期' });
    }
    
    res.json({
      valid: true,
      data: {
        diamondAmount: redeemCode.diamondAmount,
        expiresAt: redeemCode.expiresAt
      }
    });
  } catch (error) {
    console.error('检查充值码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;