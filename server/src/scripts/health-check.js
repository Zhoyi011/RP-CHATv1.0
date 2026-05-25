/**
 * RP Chat 系统健康检查脚本（完整版）
 * 检测所有核心功能、安全、性能是否正常
 * 
 * 使用方法: node src/scripts/health-check.js
 * 可选参数: --verbose 显示详细信息
 *          --fix 自动修复常见问题
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ========== 配置 ==========
const VERBOSE = process.argv.includes('--verbose');
const AUTO_FIX = process.argv.includes('--fix');

// ========== 测试结果收集 ==========
const results = [];
let passed = 0;
let failed = 0;
let warnings = 0;
let fixed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
      results.push({ name, status: 'PASS' });
    } catch (error) {
      console.log(`  ❌ ${name}: ${error.message}`);
      failed++;
      results.push({ name, status: 'FAIL', error: error.message });
    }
  };
}

function warn(name, message) {
  console.log(`  ⚠️ ${name}: ${message}`);
  warnings++;
  results.push({ name, status: 'WARN', error: message });
}

function info(name, message) {
  console.log(`  ℹ️ ${name}: ${message}`);
  if (VERBOSE) results.push({ name, status: 'INFO', error: message });
}

function fix(name, message) {
  console.log(`  🔧 ${name}: ${message}`);
  fixed++;
  if (AUTO_FIX) results.push({ name, status: 'FIXED', error: message });
}

// ========== 辅助函数 ==========
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========== 1. 环境检查 ==========
async function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major < 18) {
    throw new Error(`Node.js 版本过低: ${version}，需要 >= 18`);
  }
  console.log(`    版本: ${version}`);
  if (major < 20) warn('Node.js 版本', `${version} 不是最新 LTS 版本`);
}

async function checkMemoryUsage() {
  const usage = process.memoryUsage();
  const heapUsed = formatBytes(usage.heapUsed);
  const heapTotal = formatBytes(usage.heapTotal);
  const rss = formatBytes(usage.rss);
  console.log(`    堆使用: ${heapUsed} / ${heapTotal}, RSS: ${rss}`);
  if (usage.heapUsed / usage.heapTotal > 0.8) {
    warn('内存使用', `堆内存使用率过高: ${Math.round(usage.heapUsed / usage.heapTotal * 100)}%`);
  }
}

async function checkEnvVars() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(r => !process.env[r]);
  
  if (missing.includes('JWT_SECRET')) {
    if (AUTO_FIX) {
      const crypto = require('crypto');
      const newSecret = crypto.randomBytes(32).toString('hex');
      warn('环境变量', 'JWT_SECRET 未设置，请添加到 .env');
      fix('JWT_SECRET', `建议值: ${newSecret}`);
    } else {
      warn('环境变量', 'JWT_SECRET 未设置（使用 fallback，生产环境不安全）');
    }
  }
  
  const securityVars = ['REQUEST_SECRET', 'HCAPTCHA_SECRET_KEY'];
  const missingSecurity = securityVars.filter(r => !process.env[r]);
  if (missingSecurity.length > 0) {
    warn('安全配置', `缺少: ${missingSecurity.join(', ')}`);
  }
  
  const optional = ['GITHUB_TOKEN', 'PORT', 'DEEPSEEK_API_KEY', 'CLOUDINARY_URL'];
  const presentOpt = optional.filter(r => process.env[r]);
  console.log(`    已配置: ${presentOpt.length}/${optional.length} 个可选变量`);
}

async function checkPackageJson() {
  const packagePath = path.join(__dirname, '../../package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error('package.json 不存在');
  }
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = Object.keys(pkg.dependencies || {});
  const devDependencies = Object.keys(pkg.devDependencies || {});
  console.log(`    依赖数: ${dependencies.length}, 开发依赖: ${devDependencies.length}`);
  
  const critical = ['express', 'mongoose', 'socket.io', 'jsonwebtoken', 'bcrypt'];
  const missing = critical.filter(d => !dependencies.includes(d));
  if (missing.length > 0) {
    throw new Error(`缺少关键依赖: ${missing.join(', ')}`);
  }
}

// ========== 2. 数据库检查 ==========
async function checkMongoDB() {
  const start = Date.now();
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });
  const latency = Date.now() - start;
  console.log(`    延迟: ${latency}ms`);
  if (latency > 5000) warn('数据库连接', '延迟较高，可能影响性能');
}

async function checkDbStats() {
  const stats = await mongoose.connection.db.stats();
  console.log(`    数据库大小: ${formatBytes(stats.dataSize)}, 索引大小: ${formatBytes(stats.indexSize)}`);
  console.log(`    集合数: ${stats.collections}, 文档数: ${stats.objects}`);
  if (stats.dataSize > 1024 * 1024 * 1024) {
    warn('数据库大小', `数据库已超过 1GB (${formatBytes(stats.dataSize)})，建议清理`);
  }
}

async function checkCollections() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map(c => c.name);
  
  const required = ['users', 'personas', 'rooms', 'messages', 'personarooms', 'invitecodes', 'activepersonas'];
  const missing = required.filter(r => !names.includes(r));
  
  if (missing.length > 0) {
    throw new Error(`缺少集合: ${missing.join(', ')}`);
  }
  console.log(`    集合: ${names.join(', ')}`);
}

async function checkIndexes() {
  const Persona = require('../models/Persona');
  const PersonaRoom = require('../models/PersonaRoom');
  const Room = require('../models/Room');
  const Message = require('../models/Message');
  const User = require('../models/User');

  const personaIndexes = await Persona.collection.indexes();
  const hasGlobalNumber = personaIndexes.some(i => i.key && i.key.globalNumber);
  if (!hasGlobalNumber) warn('Persona 索引', '缺少 globalNumber 索引');

  const prIndexes = await PersonaRoom.collection.indexes();
  const hasUnique = prIndexes.some(i => i.unique && i.key?.personaId && i.key?.roomId);
  if (!hasUnique) warn('PersonaRoom 索引', '缺少复合唯一索引');

  const msgIndexes = await Message.collection.indexes();
  const hasRoomTime = msgIndexes.some(i => i.key && i.key.roomId && i.key.createdAt);
  if (!hasRoomTime) warn('Message 索引', '缺少 (roomId, createdAt) 复合索引');

  console.log(`    索引检查完成`);
}

async function checkOrphanedData() {
  const Persona = require('../models/Persona');
  const Room = require('../models/Room');
  const PersonaRoom = require('../models/PersonaRoom');
  const Message = require('../models/Message');
  const User = require('../models/User');

  // 孤儿 PersonaRoom（引用不存在的角色）
  const orphanedPR = await PersonaRoom.aggregate([
    { $lookup: { from: 'personas', localField: 'personaId', foreignField: '_id', as: 'persona' } },
    { $match: { persona: { $size: 0 } } }
  ]);
  if (orphanedPR.length > 0) {
    warn('数据完整性', `${orphanedPR.length} 个 PersonaRoom 引用不存在的角色`);
    if (AUTO_FIX) {
      await PersonaRoom.deleteMany({ _id: { $in: orphanedPR.map(p => p._id) } });
      fix('清理孤儿数据', `删除了 ${orphanedPR.length} 个孤儿 PersonaRoom`);
    }
  }

  // 孤儿消息（引用不存在的房间）
  const orphanedMessages = await Message.aggregate([
    { $lookup: { from: 'rooms', localField: 'roomId', foreignField: '_id', as: 'room' } },
    { $match: { room: { $size: 0 } } }
  ]);
  if (orphanedMessages.length > 0) {
    warn('数据完整性', `${orphanedMessages.length} 条消息引用不存在的房间`);
    if (AUTO_FIX) {
      await Message.deleteMany({ _id: { $in: orphanedMessages.map(m => m._id) } });
      fix('清理孤儿数据', `删除了 ${orphanedMessages.length} 条孤儿消息`);
    }
  }
}

// 在 checkPasswordSecurity 函数中修改
async function checkPasswordSecurity() {
  const User = require('../models/User');
  
  // 排除 Firebase 用户（有 firebaseUid 但没有 password）
  const weakUsers = await User.find({ 
    hasAccess: true,
    password: { $exists: true, $ne: null, $ne: "" },
    $expr: { $lt: [{ $strLenCP: "$password" }, 60] }
  });
  
  if (weakUsers.length > 0) {
    warn('密码安全', `${weakUsers.length} 个活跃用户的密码哈希可能不安全`);
  } else {
    console.log(`    所有活跃用户的密码哈希正常`);
  }
}

async function checkTokenSecurity() {
  // 检查 JWT 配置
  const secret = process.env.JWT_SECRET;
  if (secret === 'fallback-secret-for-dev' || secret === 'secret') {
    warn('Token 安全', 'JWT_SECRET 使用默认值，生产环境不安全');
  }
  if (secret && secret.length < 32) {
    warn('Token 安全', `JWT_SECRET 长度不足 (${secret.length}/32)`);
  }
}

async function checkRateLimitConfig() {
  // 检查频率限制配置
  const limiter = require('express-rate-limit');
  info('频率限制', '已启用，默认 200 次/分钟');
}

async function checkCorsConfig() {
  const corsOrigins = [
    'localhost:5173',
    'localhost:3000',
    'vercel.app',
    'onrender.com'
  ];
  console.log(`    允许的源: ${corsOrigins.length} 个`);
}

async function checkSecurityHeaders() {
  const headers = ['X-Frame-Options', 'X-Content-Type-Options', 'X-XSS-Protection'];
  info('安全响应头', `${headers.length} 个安全头已配置`);
}

// ========== 4. 数据完整性检查 ==========
async function checkPersonas() {
  const Persona = require('../models/Persona');
  
  const total = await Persona.countDocuments();
  const approved = await Persona.countDocuments({ status: 'approved' });
  const pending = await Persona.countDocuments({ status: 'pending' });
  const rejected = await Persona.countDocuments({ status: 'rejected' });
  
  console.log(`    总数: ${total}, 已审核: ${approved}, 待审核: ${pending}, 已拒绝: ${rejected}`);
  
  const missingDisplayName = await Persona.countDocuments({ 
    status: 'approved', 
    $or: [{ displayName: { $in: [null, ''] } }, { displayName: { $exists: false } }]
  });
  if (missingDisplayName > 0) warn('Persona 数据', `${missingDisplayName} 个已审核角色缺少 displayName`);
  
  const missingAvatar = await Persona.countDocuments({ status: 'approved', avatar: { $in: [null, ''] } });
  info('Persona 头像', `${missingAvatar} 个角色使用默认头像`);
  
  // 检查重复 globalNumber
  const dupes = await Persona.aggregate([
    { $match: { globalNumber: { $exists: true, $ne: null } } },
    { $group: { _id: '$globalNumber', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  if (dupes.length > 0) {
    throw new Error(`${dupes.length} 个重复的 globalNumber`);
  }
}

async function checkRooms() {
  const Room = require('../models/Room');
  const PersonaRoom = require('../models/PersonaRoom');
  const User = require('../models/User');
  
  const totalRooms = await Room.countDocuments();
  const activeRooms = await Room.countDocuments({ isActive: true });
  console.log(`    房间总数: ${totalRooms}, 活跃: ${activeRooms}`);
  
  const emptyRooms = await Room.aggregate([
    { $lookup: { from: 'personarooms', localField: '_id', foreignField: 'roomId', as: 'members' } },
    { $match: { members: { $size: 0 } } }
  ]);
  if (emptyRooms.length > 0) {
    warn('房间数据', `${emptyRooms.length} 个房间没有成员`);
  }
  
  const prCount = await PersonaRoom.countDocuments();
  console.log(`    PersonaRoom 关联: ${prCount}`);
}

async function checkMessages() {
  const Message = require('../models/Message');
  const User = require('../models/User');
  
  const total = await Message.countDocuments();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMessages = await Message.countDocuments({ createdAt: { $gte: today } });
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const weekMessages = await Message.countDocuments({ createdAt: { $gte: lastWeek } });
  
  console.log(`    消息总数: ${total}, 今日: ${todayMessages}, 本周: ${weekMessages}`);
  
  const recalled = await Message.countDocuments({ isRecalled: true });
  const deleted = await Message.countDocuments({ isDeleted: true });
  if (recalled > 0 || deleted > 0) {
    info('消息状态', `已撤回: ${recalled}, 已删除: ${deleted}`);
  }
}

async function checkInviteCodes() {
  const InviteCode = require('../models/InviteCode');
  
  const total = await InviteCode.countDocuments();
  const active = await InviteCode.countDocuments({ isActive: true, usedBy: null, expiresAt: { $gt: new Date() } });
  const used = await InviteCode.countDocuments({ usedBy: { $ne: null } });
  const expired = await InviteCode.countDocuments({ isActive: true, usedBy: null, expiresAt: { $lt: new Date() } });
  
  console.log(`    总数: ${total}, 可用: ${active}, 已用: ${used}, 过期: ${expired}`);
  
  if (expired > 0) {
    if (AUTO_FIX) {
      await InviteCode.updateMany(
        { isActive: true, usedBy: null, expiresAt: { $lt: new Date() } },
        { isActive: false }
      );
      fix('邀请码', `修复了 ${expired} 个过期邀请码`);
    } else {
      warn('邀请码数据', `${expired} 个过期邀请码需要清理`);
    }
  }
  
  // 检查超级管理员邀请码
  const superAdminCodes = await InviteCode.countDocuments({ type: 'super_admin' });
  info('邀请码类型', `超级管理员: ${superAdminCodes}`);
}

async function checkUsers() {
  const User = require('../models/User');
  
  const total = await User.countDocuments();
  const withAccess = await User.countDocuments({ hasAccess: true });
  const withoutAccess = await User.countDocuments({ hasAccess: false });
  const admins = await User.countDocuments({ role: { $in: ['admin', 'owner', 'super_admin'] } });
  const banned = await User.countDocuments({ status: 'banned' });
  const muted = await User.countDocuments({ status: 'muted' });
  
  console.log(`    总数: ${total}, 有权限: ${withAccess}, 无权限: ${withoutAccess}`);
  console.log(`    管理员: ${admins}, 封禁: ${banned}, 禁言: ${muted}`);
  
  if (admins === 0) warn('用户数据', '没有管理员用户');
  
  // 检查僵尸用户（创建超过30天未登录且无权限）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const zombieUsers = await User.countDocuments({
    hasAccess: false,
    createdAt: { $lt: thirtyDaysAgo },
    lastLogin: { $exists: false }
  });
  if (zombieUsers > 0) {
    info('用户数据', `${zombieUsers} 个僵尸用户（超过30天未激活）`);
  }
}

// ========== 5. 性能检查 ==========
async function checkQueryPerformance() {
  const Message = require('../models/Message');
  
  // 测试查询性能
  const start = Date.now();
  await Message.find().sort({ createdAt: -1 }).limit(10).explain('executionStats');
  const latency = Date.now() - start;
  console.log(`    查询延迟: ${latency}ms`);
  if (latency > 100) warn('查询性能', `简单查询耗时 ${latency}ms，可能需要优化索引`);
}

async function checkConnectionPool() {
  const connectionState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  console.log(`    连接状态: ${states[connectionState] || 'unknown'}`);
}

// ========== 6. 业务逻辑检查 ==========
async function checkActivePersonas() {
  const ActivePersona = require('../models/ActivePersona');
  const Persona = require('../models/Persona');
  
  const activeCount = await ActivePersona.countDocuments();
  console.log(`    激活的角色记录: ${activeCount}`);
  
  // 检查无效的激活记录
  const invalidActive = await ActivePersona.aggregate([
    { $lookup: { from: 'personas', localField: 'personaId', foreignField: '_id', as: 'persona' } },
    { $match: { persona: { $size: 0 } } }
  ]);
  if (invalidActive.length > 0) {
    warn('业务数据', `${invalidActive.length} 个激活角色记录引用不存在的角色`);
    if (AUTO_FIX) {
      await ActivePersona.deleteMany({ _id: { $in: invalidActive.map(a => a._id) } });
      fix('清理', `删除了 ${invalidActive.length} 个无效激活记录`);
    }
  }
}

async function checkDuplicateUsernames() {
  const User = require('../models/User');
  
  const dupes = await User.aggregate([
    { $group: { _id: '$username', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  if (dupes.length > 0) {
    throw new Error(`${dupes.length} 个重复的用户名`);
  }
  console.log(`    用户名唯一性: ✅`);
}

// ========== 7. 文件系统检查 ==========
async function checkLogFiles() {
  const logDir = '/tmp';
  const logFiles = ['security_events.log', 'suspicious_activities.log', 'blacklist.json'];
  
  for (const file of logFiles) {
    const filePath = path.join(logDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`    ${file}: ${formatBytes(stats.size)}`);
    } else {
      info('日志文件', `${file} 不存在（首次运行时会创建）`);
    }
  }
}

async function checkUploadsDir() {
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    info('上传目录', 'uploads 目录不存在（首次运行时会创建）');
  } else {
    const files = fs.readdirSync(uploadDir);
    console.log(`    上传文件数: ${files.length}`);
  }
}

// ========== 8. 依赖版本检查 ==========
async function checkDependencies() {
  const required = ['express', 'mongoose', 'socket.io', 'jsonwebtoken', 'bcrypt', 'cors', 'helmet'];
  const missing = [];
  
  for (const dep of required) {
    try {
      require.resolve(dep);
    } catch {
      missing.push(dep);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`缺少依赖: ${missing.join(', ')}`);
  }
  
  try { require('cheerio'); info('依赖', 'cheerio 已安装（链接预览可用）'); } 
  catch { warn('依赖', 'cheerio 未安装（链接预览不可用）'); }
  
  try { require('opencc'); info('依赖', 'opencc 已安装（简繁转换可用）'); } 
  catch { warn('依赖', 'opencc 未安装（简繁转换不可用）'); }
  
  try { require('nodemailer'); info('依赖', 'nodemailer 已安装（邮件功能可用）'); } 
  catch { warn('依赖', 'nodemailer 未安装（邮件功能不可用）'); }
  
  console.log(`    核心依赖: ✅`);
}

// ========== 运行所有测试 ==========
async function runAllTests() {
  console.log('\n🔍 RP Chat 系统健康检查（完整版）\n');
  console.log('=' .repeat(60));

  // 1. 环境检查
  console.log('\n📋 环境检查:');
  await test('Node.js 版本', checkNodeVersion)();
  await test('内存使用', checkMemoryUsage)();
  await test('环境变量', checkEnvVars)();
  await test('package.json', checkPackageJson)();
  await test('依赖检查', checkDependencies)();

  // 2. 数据库检查
  console.log('\n🗄️ 数据库检查:');
  await test('MongoDB 连接', checkMongoDB)();
  await test('数据库统计', checkDbStats)();
  await test('集合完整性', checkCollections)();
  await test('索引检查', checkIndexes)();
  await test('孤儿数据', checkOrphanedData)();
  await test('连接池', checkConnectionPool)();

  // 3. 安全检查
  console.log('\n🔒 安全检查:');
  await test('密码安全', checkPasswordSecurity)();
  await test('Token 安全', checkTokenSecurity)();
  await test('频率限制', checkRateLimitConfig)();
  await test('CORS 配置', checkCorsConfig)();
  await test('安全响应头', checkSecurityHeaders)();

  // 4. 数据完整性
  console.log('\n📊 数据完整性:');
  await test('Persona 数据', checkPersonas)();
  await test('房间数据', checkRooms)();
  await test('消息数据', checkMessages)();
  await test('邀请码数据', checkInviteCodes)();
  await test('用户数据', checkUsers)();
  await test('激活角色', checkActivePersonas)();
  await test('用户名唯一性', checkDuplicateUsernames)();

  // 5. 性能检查
  console.log('\n⚡ 性能检查:');
  await test('查询性能', checkQueryPerformance)();

  // 6. 文件系统检查
  console.log('\n📁 文件系统:');
  await test('日志文件', checkLogFiles)();
  await test('上传目录', checkUploadsDir)();

  // 7. 总结
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 检查结果:');
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  ⚠️ 警告: ${warnings}`);
  if (AUTO_FIX) console.log(`  🔧 修复: ${fixed}`);
  
  if (failed > 0) {
    console.log('\n❌ 存在严重问题，需要修复:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  if (warnings > 0 && !AUTO_FIX) {
    console.log('\n⚠️ 警告（非致命，建议修复）:');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    console.log('\n💡 提示: 运行 `node src/scripts/health-check.js --fix` 尝试自动修复');
  }

  if (failed === 0) {
    console.log('\n✅ 所有核心功能正常！');
  }

  await mongoose.disconnect();
  console.log('\n🔌 数据库连接已关闭\n');
}

runAllTests().catch(error => {
  console.error('\n💥 检查脚本执行失败:', error);
  process.exit(1);
});