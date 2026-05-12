const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

async function generatePersonaCard(persona) {
  const width = 600;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 半透明遮罩
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(20, 20, width - 40, height - 40);

  // 名字
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(persona.displayName || persona.name, 50, 80);

  // 编号
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '16px sans-serif';
  ctx.fillText(`#${persona.sameNameNumber || '?'} · 全局 #${persona.globalNumber || '?'}`, 50, 108);

  // 描述
  if (persona.description) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '14px sans-serif';
    const desc = persona.description.length > 80 ? persona.description.substring(0, 77) + '...' : persona.description;
    ctx.fillText(desc, 50, 140);
  }

  // 标签
  if (persona.tags && persona.tags.length > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px sans-serif';
    ctx.fillText(persona.tags.map(t => `#${t}`).join('  '), 50, 170);
  }

  // 底部装饰线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 200);
  ctx.lineTo(width - 50, 200);
  ctx.stroke();

  // 统计
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`👁 ${persona.viewCount || 0}  ❤ ${persona.likeCount || 0}  📝 ${persona.postsCount || 0}`, 50, 230);

  // 创建时间
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px sans-serif';
  ctx.fillText(`创建于 ${new Date(persona.createdAt).toLocaleDateString('zh-CN')}`, 50, 260);

  return canvas.toBuffer('image/png');
}

async function generateWelcomeCard(username) {
  const width = 500;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#a8edea');
  gradient.addColorStop(1, '#fed6e3');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 欢迎文字
  ctx.fillStyle = '#333';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`欢迎加入 RP Chat！`, width / 2, 80);

  ctx.font = '18px sans-serif';
  ctx.fillText(username, width / 2, 120);

  ctx.fillStyle = '#666';
  ctx.font = '14px sans-serif';
  ctx.fillText('开始你的角色扮演之旅吧 ✨', width / 2, 160);

  return canvas.toBuffer('image/png');
}

module.exports = { generatePersonaCard, generateWelcomeCard };