// server/scripts/test-discord.js
require('dotenv').config();

const webhookUrl = process.env.UPDATES_DISCORD_WEBHOOK;

async function testDiscord() {
  if (!webhookUrl) {
    console.error('❌ UPDATES_DISCORD_WEBHOOK 环境变量未设置');
    console.log('请在 .env 或 Render 环境变量中添加：');
    console.log('UPDATES_DISCORD_WEBHOOK=https://discord.com/api/webhooks/xxx/xxx');
    process.exit(1);
  }

  console.log('📡 测试 Discord Webhook...');
  console.log(`Webhook: ${webhookUrl.substring(0, 50)}...`);

  const testMessage = {
    content: '🧪 **RP Chat 测试消息**\n\n如果看到这条消息，Discord 更新频道配置成功！\n\n时间: ' + new Date().toLocaleString(),
    username: 'RP Chat 测试机器人',
    avatar_url: 'https://rp-chat-v1-0.vercel.app/favicon.svg'
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });

    if (response.ok) {
      console.log('✅ Discord 消息发送成功！');
      console.log('请检查你的 Discord 频道是否收到消息。');
    } else {
      const text = await response.text();
      console.error(`❌ 发送失败 (${response.status}): ${text}`);
    }
  } catch (error) {
    console.error('❌ 发送失败:', error.message);
  }
}

testDiscord();