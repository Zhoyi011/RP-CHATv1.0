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
    console.warn(`⚠️ [socketHelper] Socket.IO 实例未设置`);
  }
}

module.exports = { setIo, emitToUser };