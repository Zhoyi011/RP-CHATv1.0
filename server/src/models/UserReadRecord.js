const mongoose = require('mongoose');

const userReadRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastReadAt: { type: Date, default: Date.now }
});

userReadRecordSchema.index({ userId: 1, roomId: 1 }, { unique: true });

module.exports = mongoose.model('UserReadRecord', userReadRecordSchema);