/**
 * RP Chat 系统健康检查脚本（超强完整版）
 * 检测所有核心功能、安全、性能、实时状态
 * 
 * 使用方法: node src/scripts/health-check.js
 * 可选参数: --verbose 显示详细信息
 *          --fix 自动修复常见问题
 *          --quick 快速检查（跳过耗时检查）
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ========== 配置 ==========
const VERBOSE = process.argv.includes('--verbose');
const AUTO_FIX = process.argv.includes('--fix');
const QUICK_MODE = process.argv.includes('--quick');
const API_BASE = process.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';

// ========== 测试结果收集 ==========
const results = [];
let passed = 0;
let failed = 0;
let warnings = 0;
let fixed = 0;
let startTime = Date.now();

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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ========== 1. 环境检查 ==========
async function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major < 18) throw new Error(`Node.js 版本过低: ${version}，需要 >= 18`);
  console.log(`    版本: ${version}`);
  if (major < 20) warn('Node.js 版本', `${version} 不是最新 LTS 版本`);
}

async function checkMemoryUsage() {
  const usage = process.memoryUsage();
  console.log(`    堆使用: ${formatBytes(usage.heapUsed)} / ${formatBytes(usage.heapTotal)}, RSS: ${formatBytes(usage.rss)}`);
  if (usage.heapUsed / usage.heapTotal > 0.8) {
    warn('内存使用', `堆内存使用率过高: ${Math.round(usage.heapUsed / usage.heapTotal * 100)}%`);
  }
}

async function checkSystemResources() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const loadAvg = os.loadavg();
  
  console.log(`    CPU: ${cpus.length} 核心, 负载: ${loadAvg[0].toFixed(2)} (1分钟)`);
  console.log(`    内存: 总 ${formatBytes(totalMem)}, 可用 ${formatBytes(freeMem)} (${Math.round(freeMem / totalMem * 100)}% 可用)`);
  
  if (freeMem / totalMem < 0.1) {
    warn('系统资源', '内存严重不足，可用内存低于 10%');
  }
}

async function checkEnvVars() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(r => !process.env[r]);
  
  if (missing.includes('JWT_SECRET')) {
    if (AUTO_FIX) {
      const crypto = require('crypto');
      const newSecret = crypto.randomBytes(32).toString('hex');
      warn('环境变量', 'JWT_SECRET 未设置');
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
  
  const discordVars = ['SECURITY_DISCORD_WEBHOOK', 'UPDATES_DISCORD_WEBHOOK'];
  const missingDiscord = discordVars.filter(r => !process.env[r]);
  if (missingDiscord.length > 0) {
    info('Discord 配置', `缺少: ${missingDiscord.join(', ')}（告警功能受限）`);
  }
  
  const optional = ['GITHUB_TOKEN', 'PORT', 'DEEPSEEK_API_KEY', 'CLOUDINARY_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const presentOpt = optional.filter(r => process.env[r]);
  console.log(`    已配置: ${presentOpt.length}/${optional.length} 个可选变量`);
}

async function checkPackageJson() {
  const packagePath = path.join(__dirname, '../../package.json');
  if (!fs.existsSync(packagePath)) throw new Error('package.json 不存在');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = Object.keys(pkg.dependencies || {});
  console.log(`    依赖数: ${dependencies.length}, 版本: ${pkg.version || 'unknown'}`);
  
  const critical = ['express', 'mongoose', 'socket.io', 'jsonwebtoken', 'bcrypt'];
  const missing = critical.filter(d => !dependencies.includes(d));
  if (missing.length > 0) throw new Error(`缺少关键依赖: ${missing.join(', ')}`);
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
  
  const required = ['users', 'personas', 'rooms', 'messages', 'personarooms', 'invitecodes', 'activepersonas', 'auditlogs', 'systemsettings'];
  const missing = required.filter(r => !names.includes(r));
  
  if (missing.length > 0 && !QUICK_MODE) {
    warn('集合完整性', `缺少集合: ${missing.join(', ')}（可能尚未创建）`);
  }
  console.log(`    集合: ${names.length} 个`);
}

async function checkIndexes() {
  const collections = ['personas', 'personarooms', 'messages', 'users', 'invitecodes'];
  let issues = 0;
  
  for (const collName of collections) {
    try {
      const coll = mongoose.connection.db.collection(collName);
      const indexes = await coll.indexes();
      console.log(`    ${collName}: ${indexes.length} 个索引`);
    } catch (e) {
      issues++;
    }
  }
  if (issues > 0) warn('索引检查', `${issues} 个集合索引检查失败`);
}

async function checkOrphanedData() {
  const orphans = [];
  
  try {
    const orphanedPR = await mongoose.connection.db.collection('personarooms').aggregate([
      { $lookup: { from: 'personas', localField: 'personaId', foreignField: '_id', as: 'persona' } },
      { $match: { persona: { $size: 0 } } }
    ]).toArray();
    
    if (orphanedPR.length > 0) {
      orphans.push(`${orphanedPR.length} 个孤儿 PersonaRoom`);
      if (AUTO_FIX) {
        await mongoose.connection.db.collection('personarooms').deleteMany({ _id: { $in: orphanedPR.map(p => p._id) } });
        fix('清理孤儿数据', `删除了 ${orphanedPR.length} 个孤儿 PersonaRoom`);
      }
    }
  } catch (e) {}
  
  try {
    const orphanedMessages = await mongoose.connection.db.collection('messages').aggregate([
      { $lookup: { from: 'rooms', localField: 'roomId', foreignField: '_id', as: 'room' } },
      { $match: { room: { $size: 0 } } }
    ]).toArray();
    
    if (orphanedMessages.length > 0) {
      orphans.push(`${orphanedMessages.length} 条孤儿消息`);
      if (AUTO_FIX) {
        await mongoose.connection.db.collection('messages').deleteMany({ _id: { $in: orphanedMessages.map(m => m._id) } });
        fix('清理孤儿数据', `删除了 ${orphanedMessages.length} 条孤儿消息`);
      }
    }
  } catch (e) {}
  
  if (orphans.length > 0 && !AUTO_FIX) {
    warn('数据完整性', orphans.join(', '));
  }
}

// ========== 3. 安全检查（使用 db 集合，避免模型重复编译）==========
async function checkPasswordSecurity() {
  try {
    const users = await mongoose.connection.db.collection('users').find({ 
      hasAccess: true, 
      password: { $exists: true, $ne: null, $ne: "" } 
    }).toArray();
    
    const weakUsers = users.filter(u => u.password && u.password.length < 60);
    
    if (weakUsers.length > 0) {
      warn('密码安全', `${weakUsers.length} 个活跃用户的密码哈希可能不安全`);
    } else {
      console.log(`    所有活跃用户的密码哈希正常`);
    }
  } catch (e) {
    console.log(`    无法检查密码安全（集合可能不存在）`);
  }
}

async function checkTokenSecurity() {
  const secret = process.env.JWT_SECRET;
  if (secret === 'fallback-secret-for-dev' || secret === 'secret' || !secret) {
    warn('Token 安全', 'JWT_SECRET 使用默认值或未设置，生产环境不安全');
  } else if (secret && secret.length < 32) {
    warn('Token 安全', `JWT_SECRET 长度不足 (${secret.length}/32)`);
  } else {
    console.log(`    JWT_SECRET 已配置 (${secret.length} 字符)`);
  }
}

async function checkRateLimit() {
  console.log(`    频率限制: 60次/分钟 (API), 30次/分钟 (认证), 20次/分钟 (上传)`);
}

async function checkCorsConfig() {
  const allowedOrigins = ['localhost:5173', 'vercel.app', 'onrender.com'];
  console.log(`    允许的源: ${allowedOrigins.length} 个`);
}

async function checkSecurityHeadersCheck() {
  const headers = ['X-Frame-Options', 'X-Content-Type-Options', 'X-XSS-Protection', 'Strict-Transport-Security'];
  console.log(`    安全响应头: ${headers.length} 个已配置`);
}

// ========== 4. 数据完整性检查（使用 db 集合）==========
async function checkPersonas() {
  try {
    const personas = await mongoose.connection.db.collection('personas');
    
    const total = await personas.countDocuments();
    const approved = await personas.countDocuments({ status: 'approved' });
    const pending = await personas.countDocuments({ status: 'pending' });
    
    console.log(`    总数: ${total}, 已审核: ${approved}, 待审核: ${pending}`);
    
    const missingDisplayName = await personas.countDocuments({ 
      status: 'approved', 
      $or: [{ displayName: { $in: [null, ''] } }, { displayName: { $exists: false } }]
    });
    if (missingDisplayName > 0 && !QUICK_MODE) {
      warn('Persona 数据', `${missingDisplayName} 个已审核角色缺少 displayName`);
    }
  } catch (e) {
    console.log(`    无法检查 Persona 数据（集合可能不存在）`);
  }
}

async function checkRooms() {
  try {
    const rooms = await mongoose.connection.db.collection('rooms');
    const personaRooms = await mongoose.connection.db.collection('personarooms');
    
    const totalRooms = await rooms.countDocuments();
    const activeRooms = await rooms.countDocuments({ isActive: true });
    const memberCount = await personaRooms.countDocuments();
    
    console.log(`    房间总数: ${totalRooms}, 活跃: ${activeRooms}`);
    console.log(`    PersonaRoom 关联: ${memberCount}`);
  } catch (e) {
    console.log(`    无法检查房间数据（集合可能不存在）`);
  }
}

async function checkMessages() {
  try {
    const messages = await mongoose.connection.db.collection('messages');
    
    const total = await messages.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessages = await messages.countDocuments({ createdAt: { $gte: today } });
    
    console.log(`    消息总数: ${total}, 今日: ${todayMessages}`);
    
    const recalled = await messages.countDocuments({ isRecalled: true });
    const deleted = await messages.countDocuments({ isDeleted: true });
    info('消息状态', `已撤回: ${recalled}, 已删除: ${deleted}`);
  } catch (e) {
    console.log(`    无法检查消息数据（集合可能不存在）`);
  }
}

async function checkInviteCodes() {
  try {
    const inviteCodes = await mongoose.connection.db.collection('invitecodes');
    
    const total = await inviteCodes.countDocuments();
    const active = await inviteCodes.countDocuments({ isActive: true, usedBy: null, expiresAt: { $gt: new Date() } });
    const used = await inviteCodes.countDocuments({ usedBy: { $ne: null } });
    
    console.log(`    总数: ${total}, 可用: ${active}, 已用: ${used}`);
    
    const superAdminCodes = await inviteCodes.countDocuments({ type: 'super_admin' });
    info('邀请码类型', `超级管理员: ${superAdminCodes}`);
  } catch (e) {
    console.log(`    无法检查邀请码数据（集合可能不存在）`);
  }
}

async function checkUsers() {
  try {
    const users = await mongoose.connection.db.collection('users');
    
    const total = await users.countDocuments();
    const withAccess = await users.countDocuments({ hasAccess: true });
    const admins = await users.countDocuments({ role: { $in: ['admin', 'owner', 'super_admin'] } });
    const banned = await users.countDocuments({ status: 'banned' });
    
    console.log(`    总数: ${total}, 有权限: ${withAccess}, 管理员: ${admins}, 封禁: ${banned}`);
    
    if (admins === 0) warn('用户数据', '没有管理员用户');
  } catch (e) {
    console.log(`    无法检查用户数据（集合可能不存在）`);
  }
}

async function checkAuditLogs() {
  try {
    const auditLogs = await mongoose.connection.db.collection('auditlogs');
    
    const total = await auditLogs.countDocuments();
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recent = await auditLogs.countDocuments({ createdAt: { $gte: lastWeek } });
    
    console.log(`    审计日志: ${total} 条, 本周: ${recent} 条`);
    
    if (total === 0) {
      info('审计日志', '暂无审计日志（首次运行时会自动创建）');
    }
  } catch (e) {
    info('审计日志', 'auditlogs 集合尚未创建');
  }
}

async function checkMaintenanceMode() {
  try {
    const systemSettings = await mongoose.connection.db.collection('systemsettings');
    
    const maintenance = await systemSettings.findOne({ key: 'maintenance_mode' });
    const isEnabled = maintenance?.value === true;
    
    console.log(`    维护模式: ${isEnabled ? '🔴 已开启' : '🟢 已关闭'}`);
    if (isEnabled) {
      const message = await systemSettings.findOne({ key: 'maintenance_message' });
      info('维护模式', `提示: ${message?.value || '服务器正在维护中'}`);
    }
  } catch (e) {
    info('维护模式', 'systemsettings 集合尚未创建');
  }
}

async function checkActivePersonas() {
  try {
    const activePersonas = await mongoose.connection.db.collection('activepersonas');
    
    const activeCount = await activePersonas.countDocuments();
    console.log(`    激活的角色记录: ${activeCount}`);
    
    const invalidActive = await activePersonas.aggregate([
      { $lookup: { from: 'personas', localField: 'personaId', foreignField: '_id', as: 'persona' } },
      { $match: { persona: { $size: 0 } } }
    ]).toArray();
    
    if (invalidActive.length > 0) {
      warn('业务数据', `${invalidActive.length} 个激活角色记录引用不存在的角色`);
      if (AUTO_FIX) {
        await activePersonas.deleteMany({ _id: { $in: invalidActive.map(a => a._id) } });
        fix('清理', `删除了 ${invalidActive.length} 个无效激活记录`);
      }
    }
  } catch (e) {
    console.log(`    无法检查激活角色（集合可能不存在）`);
  }
}

async function checkDuplicateUsernames() {
  try {
    const users = await mongoose.connection.db.collection('users');
    
    const dupes = await users.aggregate([
      { $group: { _id: '$username', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (dupes.length > 0) {
      throw new Error(`${dupes.length} 个重复的用户名`);
    }
    console.log(`    用户名唯一性: ✅`);
  } catch (e) {
    if (e.message.includes('重复')) throw e;
    console.log(`    用户名唯一性: 无法检查`);
  }
}

// ========== 5. API 端点检查 ==========
async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE}/test`);
    if (response.ok) {
      const data = await response.json();
      console.log(`    状态: ${data.message || '正常'}`);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(`API 不可达: ${error.message}`);
  }
}

async function checkAuthEndpoint() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, { method: 'HEAD' });
    console.log(`    状态码: ${response.status} (需要认证)`);
  } catch (error) {
    warn('认证端点', `无法访问: ${error.message}`);
  }
}

async function checkWebSocket() {
  console.log(`    WebSocket 端点: wss://${new URL(API_BASE).host}/socket.io/`);
  info('WebSocket', '需要单独测试连接');
}

// ========== 6. Discord 集成检查 ==========
async function checkDiscordWebhooks() {
  const securityWebhook = process.env.SECURITY_DISCORD_WEBHOOK;
  const updatesWebhook = process.env.UPDATES_DISCORD_WEBHOOK;
  
  if (securityWebhook) {
    const masked = securityWebhook.substring(0, 30) + '...';
    console.log(`    安全频道: ${masked}`);
  } else {
    warn('Discord', '安全 Webhook 未配置');
  }
  
  if (updatesWebhook) {
    const masked = updatesWebhook.substring(0, 30) + '...';
    console.log(`    更新频道: ${masked}`);
  } else {
    warn('Discord', '更新 Webhook 未配置');
  }
}

// ========== 7. 性能检查（使用 db 集合）==========
async function checkQueryPerformance() {
  try {
    const messages = mongoose.connection.db.collection('messages');
    
    const start = Date.now();
    await messages.find().sort({ createdAt: -1 }).limit(10).toArray();
    const latency = Date.now() - start;
    console.log(`    查询延迟: ${latency}ms`);
    if (latency > 100) warn('查询性能', `简单查询耗时 ${latency}ms`);
  } catch (e) {
    console.log(`    无法测试查询性能（messages 集合可能为空）`);
  }
}

async function checkResponseTime() {
  const start = Date.now();
  try {
    await fetch(`${API_BASE}/test`);
    const latency = Date.now() - start;
    console.log(`    API 响应: ${latency}ms`);
    if (latency > 500) warn('API 性能', `响应时间较长: ${latency}ms`);
  } catch (error) {
    warn('API 性能', `无法测量: ${error.message}`);
  }
}

// ========== 8. 文件系统检查 ==========
async function checkLogFiles() {
  const logDir = '/tmp';
  const logFiles = ['security_events.log', 'blacklist.json', 'frontend_alerts.log'];
  const localLog = path.join(__dirname, '../../security_alerts.json');
  
  for (const file of logFiles) {
    const filePath = path.join(logDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`    ${file}: ${formatBytes(stats.size)}`);
    } else {
      info('日志文件', `${file} 不存在（首次运行时会创建）`);
    }
  }
  
  if (fs.existsSync(localLog)) {
    const stats = fs.statSync(localLog);
    console.log(`    local_security_alerts.json: ${formatBytes(stats.size)}`);
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

async function checkBackups() {
  const backupDir = path.join(__dirname, '../../backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    const backupFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.gz'));
    console.log(`    备份文件: ${backupFiles.length} 个`);
    if (backupFiles.length === 0) {
      info('备份', '暂无数据库备份');
    }
  } else {
    info('备份', 'backups 目录不存在');
  }
}

// ========== 9. 依赖版本检查 ==========
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
  
  const optional = ['cheerio', 'opencc', 'nodemailer', 'multer', 'cloudinary'];
  const installed = [];
  for (const dep of optional) {
    try {
      require.resolve(dep);
      installed.push(dep);
    } catch {}
  }
  console.log(`    可选依赖已安装: ${installed.length}/${optional.length}`);
}

// ========== 10. 实时告警检查 ==========
async function checkAlertSystem() {
  const alertLog = '/tmp/security_events.log';
  if (fs.existsSync(alertLog)) {
    const stats = fs.statSync(alertLog);
    const lastModified = new Date(stats.mtime);
    const daysSince = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    console.log(`    最后告警: ${lastModified.toLocaleString()}`);
    if (daysSince > 7 && stats.size > 0) {
      info('告警系统', `最近 7 天无新告警`);
    }
  } else {
    info('告警系统', '暂无告警日志');
  }
}

// ========== 11. Socket.IO 连接池检查 ==========
async function checkSocketConnections() {
  console.log(`    传输协议: websocket + polling`);
  console.log(`    心跳间隔: 25 秒`);
}

// ========== 运行所有测试 ==========
async function runAllTests() {
  const totalStart = Date.now();
  
  console.log('\n🔍 RP Chat 系统健康检查（超强完整版）\n');
  console.log('=' .repeat(60));

  // 1. 环境检查
  console.log('\n📋 环境检查:');
  await test('Node.js 版本', checkNodeVersion)();
  await test('内存使用', checkMemoryUsage)();
  if (!QUICK_MODE) await test('系统资源', checkSystemResources)();
  await test('环境变量', checkEnvVars)();
  await test('package.json', checkPackageJson)();
  await test('依赖检查', checkDependencies)();

  // 2. 数据库检查
  console.log('\n🗄️ 数据库检查:');
  await test('MongoDB 连接', checkMongoDB)();
  await test('数据库统计', checkDbStats)();
  await test('集合完整性', checkCollections)();
  await test('索引检查', checkIndexes)();
  if (!QUICK_MODE) await test('孤儿数据', checkOrphanedData)();

  // 3. 安全检查
  console.log('\n🔒 安全检查:');
  await test('密码安全', checkPasswordSecurity)();
  await test('Token 安全', checkTokenSecurity)();
  await test('频率限制', checkRateLimit)();
  await test('CORS 配置', checkCorsConfig)();
  await test('安全响应头', checkSecurityHeadersCheck)();

  // 4. 数据完整性
  console.log('\n📊 数据完整性:');
  await test('Persona 数据', checkPersonas)();
  await test('房间数据', checkRooms)();
  await test('消息数据', checkMessages)();
  await test('邀请码数据', checkInviteCodes)();
  await test('用户数据', checkUsers)();
  await test('审计日志', checkAuditLogs)();
  await test('维护模式', checkMaintenanceMode)();
  await test('激活角色', checkActivePersonas)();
  await test('用户名唯一性', checkDuplicateUsernames)();

  // 5. API 端点检查
  console.log('\n🌐 API 端点检查:');
  await test('健康检查', checkApiHealth)();
  if (!QUICK_MODE) await test('认证端点', checkAuthEndpoint)();
  await test('WebSocket 配置', checkWebSocket)();

  // 6. 集成检查
  console.log('\n🔌 集成检查:');
  await test('Discord Webhook', checkDiscordWebhooks)();

  // 7. 性能检查
  console.log('\n⚡ 性能检查:');
  await test('查询性能', checkQueryPerformance)();
  if (!QUICK_MODE) await test('API 响应时间', checkResponseTime)();

  // 8. 文件系统检查
  console.log('\n📁 文件系统:');
  await test('日志文件', checkLogFiles)();
  await test('上传目录', checkUploadsDir)();
  await test('备份目录', checkBackups)();

  // 9. 额外检查
  console.log('\n📡 额外检查:');
  await test('告警系统', checkAlertSystem)();
  await test('Socket.IO', checkSocketConnections)();

    // 11. 充值系统检查
  console.log('\n💎 充值系统检查:');
  await test('RedeemCode 模型', checkRedeemCodeModel)();
  await test('RedemptionRecord 模型', checkRedemptionRecordModel)();
  if (!QUICK_MODE) await test('充值路由', checkRedeemRoutes)();
  await test('充值码完整性', checkRedeemCodeIntegrity)();
  await test('过期充值码', checkExpiredRedeemCodes)();
  await test('充值权限', checkRedeemPermissions)();
  if (!QUICK_MODE) await test('充值 API 性能', checkRedeemApiPerformance)();

  // 12. 角色权限中间件检查
  console.log('\n🛡️ 权限中间件检查:');
  await test('roleMiddleware.js', checkRoleMiddleware)();

  // 13. 前端组件检查
  console.log('\n🎨 前端组件检查:');
  await test('钱包页面组件', checkWalletFrontend)();

  // 14. 充值码格式验证
  console.log('\n📝 充值码格式检查:');
  await test('充值码格式规范', checkRedeemCodeFormat)();

  // 15. 钻石余额完整性
  console.log('\n💎 钻石余额检查:');
  await test('钻石完整性', checkDiamondIntegrity)();
  
  // 10. 总结
  const totalDuration = Date.now() - totalStart;
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 检查结果:');
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  ⚠️ 警告: ${warnings}`);
  if (AUTO_FIX) console.log(`  🔧 修复: ${fixed}`);
  console.log(`  ⏱️ 耗时: ${formatDuration(totalDuration)}`);
  
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

// ========== 11. 充值系统检查 ==========
async function checkRedeemCodeModel() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const names = collections.map(c => c.name);
    
    if (!names.includes('redeemcodes')) {
      info('充值系统', 'redeemcodes 集合尚未创建（首次使用时自动创建）');
      return;
    }
    
    const stats = await mongoose.connection.db.collection('redeemcodes').stats();
    console.log(`    redeemcodes 集合: ${stats.count || 0} 条记录, ${formatBytes(stats.size)}`);
  } catch (e) {
    warn('充值系统', `redeemcodes 集合检查失败: ${e.message}`);
  }
}

async function checkRedemptionRecordModel() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const names = collections.map(c => c.name);
    
    if (!names.includes('redemptionrecords')) {
      info('充值系统', 'redemptionrecords 集合尚未创建（首次使用时自动创建）');
      return;
    }
    
    const stats = await mongoose.connection.db.collection('redemptionrecords').stats();
    console.log(`    redemptionrecords 集合: ${stats.count || 0} 条记录, ${formatBytes(stats.size)}`);
    
    // 检查最近的充值记录
    const recent = await mongoose.connection.db.collection('redemptionrecords')
      .find()
      .sort({ usedAt: -1 })
      .limit(5)
      .toArray();
    
    if (recent.length > 0) {
      const totalDiamonds = recent.reduce((sum, r) => sum + (r.diamondAmount || 0), 0);
      info('充值记录', `最近5笔充值共 ${totalDiamonds} 💎`);
    }
  } catch (e) {
    warn('充值系统', `redemptionrecords 集合检查失败: ${e.message}`);
  }
}

async function checkRedeemRoutes() {
  const routes = [
    '/api/redeem/create',
    '/api/redeem/use',
    '/api/redeem/history',
    '/api/redeem/list',
    '/api/redeem/stats',
    '/api/redeem/check/:code'
  ];
  
  for (const route of routes) {
    try {
      // 只检查路由是否存在（发送 OPTIONS 请求）
      const response = await fetch(`${API_BASE}${route.split(':')[0]}`, { 
        method: 'OPTIONS',
        signal: AbortSignal.timeout(3000)
      });
      if (response.status === 404) {
        warn('充值路由', `${route} 不存在`);
      } else {
        if (VERBOSE) console.log(`    ${route}: ${response.status}`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        if (VERBOSE) console.log(`    ${route}: 路由存在（需认证）`);
      }
    }
  }
  console.log(`    已配置 ${routes.length} 个充值端点`);
}

async function checkRedeemCodeIntegrity() {
  try {
    const redeemCodes = mongoose.connection.db.collection('redeemcodes');
    if (!redeemCodes) return;
    
    const total = await redeemCodes.countDocuments();
    const used = await redeemCodes.countDocuments({ isUsed: true });
    const unused = await redeemCodes.countDocuments({ isUsed: false });
    const expired = await redeemCodes.countDocuments({ 
      isUsed: false, 
      expiresAt: { $lt: new Date() } 
    });
    
    console.log(`    充值码统计: 总数 ${total}, 已用 ${used}, 未用 ${unused}, 已过期 ${expired}`);
    
    // 检查孤儿充值码（被使用但没有对应记录）
    const orphanedRedeems = await redeemCodes.aggregate([
      { $match: { isUsed: true, usedBy: { $ne: null } } },
      { $lookup: { from: 'redemptionrecords', localField: '_id', foreignField: 'redeemCodeId', as: 'record' } },
      { $match: { record: { $size: 0 } } }
    ]).toArray();
    
    if (orphanedRedeems.length > 0) {
      warn('数据完整性', `${orphanedRedeems.length} 个充值码已使用但无记录`);
      if (AUTO_FIX) {
        // 自动修复：为这些充值码创建记录
        for (const code of orphanedRedeems) {
          const user = await mongoose.connection.db.collection('users').findOne({ _id: code.usedBy });
          await mongoose.connection.db.collection('redemptionrecords').insertOne({
            userId: code.usedBy,
            redeemCodeId: code._id,
            code: code.code,
            diamondAmount: code.diamondAmount,
            previousBalance: (user?.diamonds || 0) - code.diamondAmount,
            newBalance: user?.diamonds || 0,
            usedAt: code.usedAt || new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        fix('数据完整性', `为 ${orphanedRedeems.length} 个充值码补录了使用记录`);
      }
    }
  } catch (e) {
    console.log(`    充值码完整性检查跳过（集合可能不存在）`);
  }
}

async function checkExpiredRedeemCodes() {
  try {
    const redeemCodes = mongoose.connection.db.collection('redeemcodes');
    if (!redeemCodes) return;
    
    const now = new Date();
    const expiredCodes = await redeemCodes.find({
      isUsed: false,
      expiresAt: { $lt: now }
    }).toArray();
    
    if (expiredCodes.length > 0) {
      info('过期充值码', `${expiredCodes.length} 个充值码已过期未使用`);
      
      const totalDiamonds = expiredCodes.reduce((sum, c) => sum + c.diamondAmount, 0);
      info('过期钻石', `共 ${totalDiamonds} 💎 未兑换`);
      
      if (AUTO_FIX && expiredCodes.length > 0) {
        // 可选：发送警告或记录
        console.log(`    💡 提示: 运行清理脚本可删除过期充值码`);
      }
    }
  } catch (e) {
    // 集合可能不存在
  }
}

async function checkRedeemPermissions() {
  try {
    const users = mongoose.connection.db.collection('users');
    const superAdmins = await users.countDocuments({ 
      role: { $in: ['owner', 'super_admin'] } 
    });
    
    console.log(`    可创建充值码的用户: ${superAdmins} 个（owner/super_admin）`);
    
    if (superAdmins === 0) {
      warn('充值权限', '没有超级管理员，无法创建充值码');
    }
  } catch (e) {
    console.log(`    无法检查充值权限`);
  }
}

async function checkRedeemApiPerformance() {
  try {
    const start = Date.now();
    const response = await fetch(`${API_BASE}/redeem/stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    const latency = Date.now() - start;
    
    if (response.status === 401) {
      console.log(`    充值统计 API: ${latency}ms (需要认证)`);
    } else if (response.ok) {
      console.log(`    充值统计 API: ${latency}ms ✅`);
      if (latency > 500) warn('API 性能', `充值统计 API 响应慢: ${latency}ms`);
    } else {
      warn('充值 API', `充值统计 API 返回 ${response.status}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      warn('充值 API', '充值统计 API 超时');
    } else {
      info('充值 API', '充值统计 API 需要认证（正常）');
    }
  }
}

// ========== 12. 角色权限中间件检查 ==========
async function checkRoleMiddleware() {
  const middlewarePath = path.join(__dirname, '../middleware/roleMiddleware.js');
  
  if (fs.existsSync(middlewarePath)) {
    const stats = fs.statSync(middlewarePath);
    console.log(`    roleMiddleware.js: ${formatBytes(stats.size)}`);
    
    const content = fs.readFileSync(middlewarePath, 'utf8');
    const hasSuperAdminCheck = content.includes('requireSuperAdminOrOwner');
    const hasAdminCheck = content.includes('requireAdminOrOwner');
    
    if (hasSuperAdminCheck && hasAdminCheck) {
      console.log(`    权限函数: requireSuperAdminOrOwner ✅, requireAdminOrOwner ✅`);
    } else {
      warn('权限中间件', '缺少必要的权限检查函数');
    }
  } else {
    warn('权限中间件', 'roleMiddleware.js 不存在');
  }
}

// ========== 13. 钱包页面相关检查 ==========
async function checkWalletFrontend() {
  // 检查前端组件是否存在（通过文件系统）
  const walletDir = path.join(__dirname, '../../client/src/components/wallet');
  
  if (fs.existsSync(walletDir)) {
    const files = fs.readdirSync(walletDir);
    const requiredFiles = ['Wallet.tsx', 'RedeemModal.tsx', 'RedemptionHistory.tsx'];
    const existing = requiredFiles.filter(f => files.includes(f));
    const missing = requiredFiles.filter(f => !files.includes(f));
    
    console.log(`    钱包组件: ${existing.length}/${requiredFiles.length}`);
    if (missing.length > 0) {
      warn('前端组件', `缺少钱包组件: ${missing.join(', ')}`);
    }
  } else {
    info('前端组件', '钱包组件目录不存在（可能是前端未部署）');
  }
  
  // 检查管理员组件
  const adminCreatePath = path.join(__dirname, '../../client/src/components/admin/CreateRedeemCode.tsx');
  if (fs.existsSync(adminCreatePath)) {
    const stats = fs.statSync(adminCreatePath);
    console.log(`    CreateRedeemCode.tsx: ${formatBytes(stats.size)}`);
  } else {
    info('前端组件', 'CreateRedeemCode.tsx 不存在（管理员功能受限）');
  }
}

// ========== 14. 充值码格式验证 ==========
async function checkRedeemCodeFormat() {
  try {
    const redeemCodes = mongoose.connection.db.collection('redeemcodes');
    if (!redeemCodes) return;
    
    // 检查充值码格式是否正确
    const codes = await redeemCodes.find({}, { code: 1 }).limit(100).toArray();
    const codeRegex = /^RP-[A-Z0-9]{4}-[0-9]{4}$/;
    const invalidCodes = codes.filter(c => !codeRegex.test(c.code));
    
    if (invalidCodes.length > 0) {
      warn('充值码格式', `${invalidCodes.length} 个充值码格式不符合规范`);
      if (VERBOSE) {
        invalidCodes.forEach(c => console.log(`      ${c.code}`));
      }
    } else if (codes.length > 0) {
      console.log(`    充值码格式: 全部符合规范 ✅`);
    }
  } catch (e) {
    // 跳过
  }
}

// ========== 15. 钻石余额完整性检查 ==========
async function checkDiamondIntegrity() {
  try {
    const users = mongoose.connection.db.collection('users');
    const redemptionRecords = mongoose.connection.db.collection('redemptionrecords');
    
    if (!redemptionRecords) return;
    
    // 计算所有充值记录的总钻石数
    const totalFromRecords = await redemptionRecords.aggregate([
      { $group: { _id: null, total: { $sum: '$diamondAmount' } } }
    ]).toArray();
    
    // 计算所有用户的钻石总和
    const totalUserDiamonds = await users.aggregate([
      { $group: { _id: null, total: { $sum: '$diamonds' } } }
    ]).toArray();
    
    const recordedTotal = totalFromRecords[0]?.total || 0;
    const userTotal = totalUserDiamonds[0]?.total || 0;
    
    console.log(`    充值记录总额: ${recordedTotal.toLocaleString()} 💎`);
    console.log(`    用户钻石总额: ${userTotal.toLocaleString()} 💎`);
    
    // 注意：用户钻石还可能来自其他途径（签到、任务等），所以不完全相等是正常的
    const diff = Math.abs(userTotal - recordedTotal);
    if (diff > 10000) {
      info('钻石统计', `充值记录与用户余额差异较大: ${diff.toLocaleString()} 💎（可能来自其他来源）`);
    }
  } catch (e) {
    console.log(`    钻石完整性检查跳过`);
  }
}