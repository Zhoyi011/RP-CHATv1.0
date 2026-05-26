// server/src/middlewares/mentionHandler.js
const Persona = require('../models/Persona');
const PersonaRoom = require('../models/PersonaRoom');
const { sendSecurityAlert } = require('../services/discordAlert');

// 解析消息中的 @ 提及
function parseMentions(content) {
  const mentionPattern = /@([^\s@]+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionPattern.exec(content)) !== null) {
    const mentionName = match[1];
    mentions.push({
      name: mentionName,
      position: match.index
    });
  }
  
  return mentions;
}

// 处理提及，返回被提及的用户列表
async function processMentions(content, roomId, senderPersonaId, senderPersona) {
  const mentions = parseMentions(content);
  const mentionedUsers = [];
  
  for (const mention of mentions) {
    const mentionName = mention.name;
    
    // 1. 检查是否是 @所有人
    if (mentionName === '所有人' || mentionName === 'everyone' || mentionName === 'all') {
      const allMembers = await PersonaRoom.find({ roomId }).populate('personaId');
      for (const member of allMembers) {
        if (member.personaId && member.personaId._id.toString() !== senderPersonaId) {
          mentionedUsers.push({
            personaId: member.personaId._id,
            displayName: member.personaId.displayName || member.personaId.name,
            type: 'all'
          });
        }
      }
      continue;
    }
    
    // 2. 检查是否是 @头衔（组织）
    const membersWithTitle = await PersonaRoom.find({ 
      roomId, 
      title: { $regex: mentionName, $options: 'i' }
    }).populate('personaId');
    
    for (const member of membersWithTitle) {
      if (member.personaId && member.personaId._id.toString() !== senderPersonaId) {
        mentionedUsers.push({
          personaId: member.personaId._id,
          displayName: member.personaId.displayName || member.personaId.name,
          type: 'title',
          title: member.title
        });
      }
    }
    
    // 3. 检查是否是 @角色名
    const targetPersona = await Persona.findOne({ 
      displayName: { $regex: `^${mentionName}$`, $options: 'i' },
      status: 'approved'
    });
    
    if (targetPersona) {
      const isInRoom = await PersonaRoom.findOne({ 
        personaId: targetPersona._id, 
        roomId 
      });
      
      if (isInRoom && targetPersona._id.toString() !== senderPersonaId) {
        mentionedUsers.push({
          personaId: targetPersona._id,
          displayName: targetPersona.displayName || targetPersona.name,
          type: 'persona'
        });
      }
    }
  }
  
  // 去重
  const uniqueUsers = [];
  const seen = new Set();
  for (const user of mentionedUsers) {
    if (!seen.has(user.personaId.toString())) {
      seen.add(user.personaId.toString());
      uniqueUsers.push(user);
    }
  }
  
  return uniqueUsers;
}

// 发送提及通知（通过 Socket.IO）
function sendMentionNotifications(io, mentionedUsers, message, senderPersona, roomId, roomName) {
  for (const user of mentionedUsers) {
    io.to(`user_${user.personaId}`).emit('mention', {
      from: senderPersona.displayName || senderPersona.name,
      fromId: senderPersona._id,
      message: message.content,
      messageId: message._id,
      roomId,
      roomName,
      type: user.type,
      title: user.title,
      timestamp: new Date().toISOString()
    });
  }
}

// 发送 Discord 告警（提及通知）- 使用安全频道
async function sendMentionDiscordAlert(mentionedUsers, senderPersona, roomName) {
  if (mentionedUsers.length === 0) return;
  
  const mentionNames = mentionedUsers.map(u => u.displayName).join(', ');
  const message = `🔔 **@提及通知**\n\n**${senderPersona.displayName || senderPersona.name}** 在房间 **${roomName}** 中提到了：\n${mentionNames}`;
  
  // 使用安全频道告警
  await sendSecurityAlert(message, 'info');
}

// 渲染带有高亮的消息内容（前端用）
function renderMentions(content, currentUserId) {
  return content.replace(/@(\w+)/g, (match, name) => {
    return `<span class="mention" data-mention="${name}">@${name}</span>`;
  });
}

module.exports = {
  parseMentions,
  processMentions,
  sendMentionNotifications,
  sendMentionDiscordAlert,
  renderMentions
};