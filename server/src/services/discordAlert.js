// server/src/services/discordAlert.js

const SECURITY_WEBHOOK = process.env.SECURITY_DISCORD_WEBHOOK;
const UPDATES_WEBHOOK = process.env.UPDATES_DISCORD_WEBHOOK;

// 发送安全告警
async function sendSecurityAlert(message, type = 'warning') {
  if (!SECURITY_WEBHOOK) {
    console.log('⚠️ 安全 Discord Webhook 未配置');
    return;
  }

  const colors = {
    warning: 0xffa500,
    critical: 0xff0000,
    info: 0x00aaff,
    success: 0x00ff00
  };

  const emojis = {
    warning: '⚠️',
    critical: '🔴',
    info: 'ℹ️',
    success: '✅'
  };

  const embed = {
    title: `${emojis[type]} 安全警报`,
    description: message,
    color: colors[type],
    timestamp: new Date().toISOString(),
    footer: {
      text: `万物阁 安全系统 | ${process.env.NODE_ENV || 'production'}`
    }
  };

  try {
    await fetch(SECURITY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '万物阁 安全机器人',
        avatar_url: 'https://rp-chat-v1-0.vercel.app/favicon.svg',
        embeds: [embed]
      })
    });
    console.log('✅ 安全告警已发送');
  } catch (error) {
    console.error('发送安全告警失败:', error);
  }
}// server/src/services/discordAlert.js 中的 sendSecurityAlert 函数
async function sendSecurityAlert(message, level = 'warning') {
  if (!process.env.SECURITY_DISCORD_WEBHOOK) return;
  
  const colors = {
    info: 0x3498db,      // 蓝色
    warning: 0xf39c12,   // 橙色
    critical: 0xe74c3c,  // 红色
    success: 0x2ecc71    // 绿色
  };
  
  const color = colors[level] || colors.warning;
  
  const embed = {
    title: level === 'critical' ? '🔴 严重安全警报' : level === 'warning' ? '⚠️ 安全警报' : 'ℹ️ 安全通知',
    description: message,
    color: color,
    timestamp: new Date().toISOString(),  // Discord 会自动显示时间
    footer: {
      text: '万物阁 安全系统 | ' + process.env.NODE_ENV
    }
  };
  
  try {
    await fetch(process.env.SECURITY_DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (error) {
    console.error('发送 Discord 告警失败:', error);
  }
}

// 发送更新公告
async function sendUpdateAnnouncement(title, description, version, commits = []) {
  if (!UPDATES_WEBHOOK) {
    console.log('⚠️ 更新 Discord Webhook 未配置');
    return;
  }

  let description_text = description || '';

  if (commits.length > 0) {
    description_text += `\n\n## 📦 本次更新内容\n`;
    commits.forEach(c => {
      description_text += `• ${c.message}\n`;
    });
  }

  description_text += `\n\n🔗 [查看完整更新日志](${process.env.CHANGELOG_URL || 'https://rp-chat-v1-0.vercel.app/changelog'})`;

  const embed = {
    title: `🎉 ${title}`,
    description: description_text,
    color: 0x5865f2,
    timestamp: new Date().toISOString(),
    footer: {
      text: `版本 ${version} | 万物阁 更新公告`
    }
  };

  try {
    await fetch(UPDATES_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '万物阁 更新机器人',
        avatar_url: 'https://rp-chat-v1-0.vercel.app/favicon.svg',
        embeds: [embed]
      })
    });
    console.log('✅ 更新公告已发送');
  } catch (error) {
    console.error('发送更新公告失败:', error);
  }
}

// 发送部署通知
async function sendDeploymentNotification(status, details = {}) {
  if (!UPDATES_WEBHOOK) return;

  const colors = {
    start: 0x00aaff,
    success: 0x00ff00,
    failure: 0xff0000
  };

  const embed = {
    title: status === 'start' ? '🚀 部署开始' : (status === 'success' ? '✅ 部署成功' : '❌ 部署失败'),
    description: details.message || '',
    color: colors[status] || 0x5865f2,
    timestamp: new Date().toISOString(),
    fields: [
      { name: '环境', value: process.env.NODE_ENV || 'production', inline: true },
      { name: '时间', value: new Date().toLocaleString(), inline: true }
    ]
  };

  if (details.commit) {
    embed.fields.push({ name: '提交', value: details.commit, inline: true });
  }
  if (details.author) {
    embed.fields.push({ name: '作者', value: details.author, inline: true });
  }

  try {
    await fetch(UPDATES_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '万物阁 部署机器人',
        avatar_url: 'https://rp-chat-v1-0.vercel.app/favicon.svg',
        embeds: [embed]
      })
    });
  } catch (error) {
    console.error('发送部署通知失败:', error);
  }
}

module.exports = {
  sendSecurityAlert,
  sendUpdateAnnouncement,
  sendDeploymentNotification
};