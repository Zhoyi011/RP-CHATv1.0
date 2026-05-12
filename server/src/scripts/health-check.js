/**
 * RP Chat 系统健康检查脚本
 * 检测所有核心功能是否正常
 * 
 * 使用方法: node src/scripts/health-check.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ========== 测试结果收集 ==========
const results = [];
let passed = 0;
let failed = 0;
let warnings = 0;

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

// ========== 测试函数 ==========
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

async function checkCollections() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map(c => c.name);
  
  const required = ['users', 'personas', 'rooms', 'messages', 'personarooms', 'invitecodes', 'activepersonas'];
  const missing = required.filter(r => !names.includes(r));
  
  if (missing.length > 0) {
    throw new Error(`缺少集合: ${missing.join(', ')}`);
  }
  console.log(`    集合数: ${names.length} (${names.join(', ')})`);
}

async function checkIndexes() {
  const Persona = require('../models/Persona');
  const PersonaRoom = require('../models/PersonaRoom');
  const Room = require('../models/Room');
  const Message = require('../models/Message');
  const User = require('../models/User');
  const InviteCode = require('../models/InviteCode');

  // Persona 有 globalNumber 唯一索引
  const personaIndexes = await Persona.collection.indexes();
  const hasGlobalNumber = personaIndexes.some(i => i.key && i.key.globalNumber);
  if (!hasGlobalNumber) warn('Persona 索引', '缺少 globalNumber 索引（编号系统可能重复）');

  // PersonaRoom 复合唯一索引
  const prIndexes = await PersonaRoom.collection.indexes();
  const hasUnique = prIndexes.some(i => i.unique && i.key?.personaId && i.key?.roomId);
  if (!hasUnique) warn('PersonaRoom 索引', '缺少复合唯一索引（同一角色可能重复加入）');

  console.log(`    索引检查完成`);
}

async function checkPersonas() {
  const Persona = require('../models/Persona');
  
  const total = await Persona.countDocuments();
  const approved = await Persona.countDocuments({ status: 'approved' });
  const pending = await Persona.countDocuments({ status: 'pending' });
  
  console.log(`    总数: ${total}, 已审核: ${approved}, 待审核: ${pending}`);
  
  // 检查是否有缺失 displayName 的已审核角色
  const missingDisplayName = await Persona.countDocuments({ status: 'approved', displayName: { $in: [null, ''] } });
  if (missingDisplayName > 0) warn('Persona 数据', `${missingDisplayName} 个已审核角色缺少 displayName`);
  
  // 检查是否有重复 globalNumber
    const dupes = await Persona.aggregate([
    { $match: { globalNumber: { $exists: true, $ne: null } } },
    { $group: { _id: '$globalNumber', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
    ]);
  if (dupes.length > 0) throw new Error(`${dupes.length} 个重复的 globalNumber，编号系统有问题`);
}

async function checkRooms() {
  const Room = require('../models/Room');
  const PersonaRoom = require('../models/PersonaRoom');
  
  const totalRooms = await Room.countDocuments();
  console.log(`    房间总数: ${totalRooms}`);
  
  // 检查 PersonaRoom 关联
  const prCount = await PersonaRoom.countDocuments();
  console.log(`    PersonaRoom 关联数: ${prCount}`);
  
  // 检查是否有房间的 createdBy 不是 Persona ID
  const rooms = await Room.find().limit(50);
  for (const room of rooms) {
    if (!room.createdBy) {
      warn(`房间 ${room.name}`, '缺少 createdBy（创建者 Persona ID）');
    }
    if (!room.creatorUserId) {
      warn(`房间 ${room.name}`, '缺少 creatorUserId（创建者 User ID）');
    }
  }
}

async function checkMessages() {
  const Message = require('../models/Message');
  
  const total = await Message.countDocuments();
  console.log(`    消息总数: ${total}`);
  
  // 检查最近消息
  const recent = await Message.find().sort({ createdAt: -1 }).limit(5).populate('personaId');
  const missingPersona = recent.filter(m => !m.personaId);
  if (missingPersona.length > 0) warn('消息数据', `${missingPersona.length} 条最近消息缺少 personaId`);
}

async function checkInviteCodes() {
  const InviteCode = require('../models/InviteCode');
  
  const total = await InviteCode.countDocuments();
  const active = await InviteCode.countDocuments({ isActive: true, usedBy: null, expiresAt: { $gt: new Date() } });
  const used = await InviteCode.countDocuments({ usedBy: { $ne: null } });
  const expired = await InviteCode.countDocuments({ isActive: true, usedBy: null, expiresAt: { $lt: new Date() } });
  
  console.log(`    总数: ${total}, 可用: ${active}, 已用: ${used}, 过期: ${expired}`);
  
  // 自动修复过期状态
  if (expired > 0) {
    await InviteCode.updateMany(
      { isActive: true, usedBy: null, expiresAt: { $lt: new Date() } },
      { isActive: false }
    );
    console.log(`    🔧 已自动修复 ${expired} 个过期邀请码`);
  }
}

async function checkUsers() {
  const User = require('../models/User');
  
  const total = await User.countDocuments();
  const withAccess = await User.countDocuments({ hasAccess: true });
  const admins = await User.countDocuments({ role: { $in: ['admin', 'owner'] } });
  
  console.log(`    总数: ${total}, 有权限: ${withAccess}, 管理员: ${admins}`);
  
  if (admins === 0) warn('用户数据', '没有管理员用户');
}

async function checkDependencies() {
  try { require('socket.io'); } catch { throw new Error('socket.io 未安装'); }
  try { require('jsonwebtoken'); } catch { throw new Error('jsonwebtoken 未安装'); }
  try { require('cheerio'); } catch { warn('依赖', 'cheerio 未安装（链接预览功能不可用）'); }
  try { require('node-fetch') || global.fetch; } catch { warn('依赖', 'fetch 不可用（链接预览功能不可用）'); }
  try { require('opencc'); } catch { warn('依赖', 'opencc 未安装（简繁转换功能不可用）'); }
  console.log(`    核心依赖检查完成`);
}

async function checkEnvVars() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(r => !process.env[r]);
  
  if (missing.length > 0) {
    if (missing.includes('JWT_SECRET')) {
      warn('环境变量', 'JWT_SECRET 未设置（使用 fallback，生产环境不安全）');
    } else {
      throw new Error(`缺少环境变量: ${missing.join(', ')}`);
    }
  }
  
  const optional = ['GITHUB_TOKEN', 'PORT'];
  const missingOpt = optional.filter(r => !process.env[r]);
  if (missingOpt.length > 0) {
    console.log(`    可选变量未设置: ${missingOpt.join(', ')}`);
  }
}

async function checkModels() {
  const models = [
    'ActivePersona', 'Changelog', 'InviteCode', 'Message', 
    'Persona', 'PersonaRoom', 'Room', 'User', 'UserReadRecord', 'VoiceRoom'
  ];
  
  for (const model of models) {
    try {
      require(`../models/${model}`);
    } catch (error) {
      throw new Error(`模型 ${model} 加载失败: ${error.message}`);
    }
  }
  console.log(`    所有模型加载正常`);
}

async function checkRoutes() {
  const routes = ['auth', 'changelog', 'diamond', 'persona', 'room', 'search', 'translate', 'user', 'voice'];
  for (const route of routes) {
    try {
      require(`../routes/${route}`);
    } catch (error) {
      if (route === 'voice' || route === 'diamond') {
        warn(`路由 ${route}`, '可能未创建（可忽略）');
      } else {
        throw new Error(`路由 ${route} 加载失败: ${error.message}`);
      }
    }
  }
  console.log(`    路由检查完成`);
}

async function checkServices() {
  try { require('../services/linkService'); } catch { warn('服务', 'linkService 未创建（链接预览不可用）'); }
  try { require('../services/translateService'); } catch { warn('服务', 'translateService 未创建（简繁转换不可用）'); }
  console.log(`    服务检查完成`);
}

// ========== 运行所有测试 ==========
async function runAllTests() {
  console.log('\n🔍 RP Chat 系统健康检查\n');
  console.log('=' .repeat(60));

  // 1. 环境
  console.log('\n📋 环境检查:');
  await test('环境变量', checkEnvVars)();
  await test('依赖检查', checkDependencies)();

  // 2. 数据库
  console.log('\n🗄️ 数据库检查:');
  await test('MongoDB 连接', checkMongoDB)();
  await test('集合完整性', checkCollections)();
  await test('索引检查', checkIndexes)();

  // 3. 模型和路由
  console.log('\n📦 代码结构:');
  await test('模型加载', checkModels)();
  await test('路由加载', checkRoutes)();
  await test('服务加载', checkServices)();

  // 4. 数据完整性
  console.log('\n📊 数据完整性:');
  await test('Persona 数据', checkPersonas)();
  await test('房间数据', checkRooms)();
  await test('消息数据', checkMessages)();
  await test('邀请码数据', checkInviteCodes)();
  await test('用户数据', checkUsers)();

  // 5. 总结
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 检查结果:');
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  ⚠️ 警告: ${warnings}`);
  
  if (failed > 0) {
    console.log('\n❌ 存在严重问题，需要修复:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  if (warnings > 0) {
    console.log('\n⚠️ 警告（非致命）:');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
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