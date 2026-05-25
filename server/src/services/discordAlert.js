// server/src/services/discordAlert.js
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function sendDiscordAlert(message, type = 'warning') {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('⚠️ Discord Webhook 未配置，跳过告警');
    return;
  }

  const colors = {
    warning: 0xffa500,  // 橙色
    critical: 0xff0000, // 红色
    info: 0x00aaff,     // 蓝色
    success: 0x00ff00   // 绿色
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
      text: `RP Chat 安全系统 | ${process.env.NODE_ENV || 'production'}`
    },
    fields: [
      {
        name: '环境',
        value: process.env.NODE_ENV || 'production',
        inline: true
      },
      {
        name: '时间',
        value: new Date().toLocaleString('zh-CN'),
        inline: true
      }
    ]
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'RP Chat 安全机器人',
        avatar_url: 'https://rp-chat-v1-0.vercel.app/favicon.svg',
        embeds: [embed]
      })
    });
    
    if (response.ok) {
      console.log('✅ Discord 告警发送成功');
    } else {
      console.log('❌ Discord 告警发送失败:', await response.text());
    }
  } catch (error) {
    console.error('Discord 告警错误:', error);
  }
}

// 发送简单文本消息
async function sendDiscordText(message) {
  if (!DISCORD_WEBHOOK_URL) return;
  
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'RP Chat 安全机器人'
      })
    });
  } catch (error) {
    console.error('Discord 文本消息失败:', error);
  }
}

// 批量发送
async function sendBatchDiscordAlerts(alerts) {
  for (const alert of alerts) {
    await sendDiscordAlert(alert.message, alert.type);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

module.exports = { sendDiscordAlert, sendDiscordText, sendBatchDiscordAlerts };