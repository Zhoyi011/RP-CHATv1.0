// server/src/models/FollowAuthor.js
const mongoose = require('mongoose');

const followAuthorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  personaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  authorPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  }
}, {
  timestamps: true
});

// 同一用户同一角色只能关注同一作者一次
followAuthorSchema.index({ userId: 1, personaId: 1, authorPersonaId: 1 }, { unique: true });
followAuthorSchema.index({ authorPersonaId: 1, createdAt: -1 });

module.exports = mongoose.model('FollowAuthor', followAuthorSchema);