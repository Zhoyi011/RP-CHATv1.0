// server/src/models/Donation.js
const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  fromPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toPersonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  novelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Novel',
    required: true
  },
  diamondAmount: {
    type: Number,
    required: true,
    min: 1
  },
  message: {
    type: String,
    maxlength: 200,
    default: ''
  }
}, {
  timestamps: true
});

donationSchema.index({ toPersonaId: 1, createdAt: -1 });
donationSchema.index({ novelId: 1, createdAt: -1 });
donationSchema.index({ fromPersonaId: 1, createdAt: -1 });

module.exports = mongoose.model('Donation', donationSchema);