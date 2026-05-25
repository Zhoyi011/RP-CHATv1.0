// server/src/services/securityReport.js
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');

async function generateSecurityReport(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const report = {
    generatedAt: new Date().toISOString(),
    period: `${days}天`,
    summary: {},
    topActions: [],
    recentAlerts: [],
    userStats: {},
    securityIssues: []
  };
  
  // 1. 审计日志统计
  const auditStats = await AuditLog.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  report.topActions = auditStats;
  
  // 2. 用户统计
  const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
  const activeUsers = await User.countDocuments({ lastLogin: { $gte: startDate } });
  const totalUsers = await User.countDocuments();
  report.userStats = { newUsers, activeUsers, totalUsers };
  
  // 3. 邀请码统计
  const newInvites = await InviteCode.countDocuments({ createdAt: { $gte: startDate } });
  const usedInvites = await InviteCode.countDocuments({ usedAt: { $gte: startDate } });
  report.inviteStats = { newInvites, usedInvites };
  
  // 4. 最近的安全事件
  const recentEvents = await AuditLog.find({
    action: { $in: ['LOGIN_FAILED', 'KICK_MEMBER', 'BAN_USER'] },
    createdAt: { $gte: startDate }
  }).sort({ createdAt: -1 }).limit(20);
  report.recentAlerts = recentEvents;
  
  // 5. 安全问题检测
  const weakPasswords = await User.countDocuments({ 
    password: { $exists: true, $regex: /^.{1,16}$/ } 
  });
  if (weakPasswords > 0) {
    report.securityIssues.push(`${weakPasswords} 个用户密码长度不足`);
  }
  
  const expiredInvites = await InviteCode.countDocuments({ 
    expiresAt: { $lt: new Date() }, 
    isActive: true 
  });
  if (expiredInvites > 0) {
    report.securityIssues.push(`${expiredInvites} 个邀请码已过期但未失效`);
  }
  
  return report;
}

async function sendSecurityReport(report) {
  const { sendDiscordAlert } = require('./discordAlert');
  
  let message = `**📊 安全报告 (${report.period})**\n\n`;
  message += `**用户统计**\n`;
  message += `• 新增用户: ${report.userStats.newUsers}\n`;
  message += `• 活跃用户: ${report.userStats.activeUsers}\n`;
  message += `• 总用户数: ${report.userStats.totalUsers}\n\n`;
  
  message += `**邀请码**\n`;
  message += `• 新增: ${report.inviteStats.newInvites}\n`;
  message += `• 使用: ${report.inviteStats.usedInvites}\n\n`;
  
  if (report.topActions.length > 0) {
    message += `**热门操作**\n`;
    report.topActions.slice(0, 5).forEach(a => {
      message += `• ${a._id}: ${a.count}次\n`;
    });
  }
  
  if (report.securityIssues.length > 0) {
    message += `\n**⚠️ 安全问题**\n`;
    report.securityIssues.forEach(issue => {
      message += `• ${issue}\n`;
    });
  }
  
  await sendDiscordAlert(message, 'info');
}

module.exports = { generateSecurityReport, sendSecurityReport };