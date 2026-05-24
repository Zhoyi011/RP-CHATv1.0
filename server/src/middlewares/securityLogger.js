// server/src/middlewares/securityLogger.js
const fs = require('fs');
const path = require('path');

// 日志文件路径
const LOG_FILE = '/tmp/security_alerts.json';
const LOG_FILE_LOCAL = './security_alerts.json';

// 写入日志
function writeLog(logEntry) {
  const logString = JSON.stringify(logEntry) + '\n';
  
  try {
    // 写入临时目录
    fs.appendFileSync(LOG_FILE, logString);
    // 同时写入本地（用于开发）
    fs.appendFileSync(LOG_FILE_LOCAL, logString);
    console.log(`🔒 安全日志已记录: ${logEntry.type}`);
  } catch (err) {
    console.error('写入安全日志失败:', err);
  }
}

// 获取客户端 IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown';
}

// 安全日志中间件
function securityLogger(req, res, next) {
  // 保存原始 end 方法
  const originalEnd = res.end;
  let responseBody = '';
  
  // 拦截响应
  res.end = function(chunk) {
    if (chunk) {
      responseBody += chunk;
    }
    originalEnd.apply(res, arguments);
  };
  
  res.on('finish', () => {
    // 只记录 401 和 403 错误
    if (res.statusCode === 401 || res.statusCode === 403) {
      const logEntry = {
        type: 'API_ACCESS_DENIED',
        statusCode: res.statusCode,
        method: req.method,
        url: req.url,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        userId: req.userId || 'unknown',
        timestamp: new Date().toISOString()
      };
      
      try {
        if (responseBody) {
          const parsed = JSON.parse(responseBody);
          logEntry.error = parsed.error;
        }
      } catch (e) {}
      
      writeLog(logEntry);
    }
  });
  
  next();
}

// 创建安全报告（生成 TXT 文件）
function generateSecurityReport() {
  try {
    const logs = fs.readFileSync(LOG_FILE, 'utf8');
    const entries = logs.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
    
    if (entries.length === 0) {
      return '暂无安全事件';
    }
    
    let report = '========== 安全警报报告 ==========\n\n';
    
    entries.forEach((entry, index) => {
      report += `【事件 ${index + 1}】\n`;
      report += `类型: ${entry.type}\n`;
      report += `用户ID: ${entry.userId || 'unknown'}\n`;
      report += `用户名: ${entry.username || 'unknown'}\n`;
      report += `邮箱: ${entry.email || 'unknown'}\n`;
      report += `操作: ${entry.action || entry.url || '未知操作'}\n`;
      report += `IP: ${entry.ip || 'unknown'}\n`;
      report += `时间: ${entry.timestamp}\n`;
      report += `详情: ${entry.error || '无'}\n`;
      report += `用户代理: ${entry.userAgent || 'unknown'}\n`;
      report += '\n---\n\n';
    });
    
    report += `报告生成时间: ${new Date().toISOString()}\n`;
    report += `事件总数: ${entries.length}\n`;
    
    return report;
  } catch (err) {
    return `读取日志失败: ${err.message}`;
  }
}

// 下载安全报告
function downloadSecurityReport(req, res) {
  const report = generateSecurityReport();
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="security_report.txt"');
  res.send(report);
}

// 清空日志
function clearSecurityLogs() {
  try {
    fs.writeFileSync(LOG_FILE, '');
    fs.writeFileSync(LOG_FILE_LOCAL, '');
    console.log('✅ 安全日志已清空');
  } catch (err) {
    console.error('清空日志失败:', err);
  }
}

module.exports = {
  securityLogger,
  writeLog,
  generateSecurityReport,
  downloadSecurityReport,
  clearSecurityLogs,
  getClientIp
};