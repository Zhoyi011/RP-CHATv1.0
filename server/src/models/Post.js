const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  content: { type: String, required: true, maxLength: 500 },
  images: { type: [String], default: [], maxLength: 2 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ personaId: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);