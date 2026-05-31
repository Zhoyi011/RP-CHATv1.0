// server/src/utils/socketHelper.js
// 存储 io 实例
let ioInstance = null;

/**
 * 设置 Socket.IO 实例（在 app.js 中调用）
 */
function setIo(io) {
  ioInstance = io;
  console.log('✅ [socketHelper] Socket.IO 实例已设置');
}

/**
 * 向指定用户发送 Socket 事件
 * @param {string} userId - 用户ID
 * @param {string} event - 事件名称
 * @param {any} data - 事件数据
 */
function emitToUser(userId, event, data) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  } else {
    console.warn(`⚠️ [socketHelper] Socket.IO 实例未设置，无法发送事件: ${event}`);
  }
}

module.exports = {
  setIo,
  emitToUser,
};