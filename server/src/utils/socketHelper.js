// server/src/utils/socketHelper.js
let ioInstance = null;

function setIo(io) {
  ioInstance = io;
  console.log('✅ [socketHelper] Socket.IO 实例已设置');
}

function emitToUser(userId, event, data) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  } else {
    console.warn(`⚠️ [socketHelper] Socket.IO 实例未设置，无法发送消息给用户 ${userId}`);
  }
}

// 🔥 新增：发送消息给房间
function emitToRoom(roomId, event, data) {
  if (ioInstance) {
    ioInstance.to(roomId).emit(event, data);
    console.log(`📡 [socketHelper] 已发送 ${event} 到房间 ${roomId}`);
  } else {
    console.warn(`⚠️ [socketHelper] Socket.IO 实例未设置，无法发送消息到房间 ${roomId}`);
  }
}

// 🔥 新增：发送消息给所有用户
function emitToAll(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  } else {
    console.warn(`⚠️ [socketHelper] Socket.IO 实例未设置，无法广播消息`);
  }
}

module.exports = { setIo, emitToUser, emitToRoom, emitToAll };