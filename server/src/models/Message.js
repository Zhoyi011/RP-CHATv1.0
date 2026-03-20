const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room',
    required: true 
  },
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
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  isAction: { 
    type: Boolean, 
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Message', messageSchema);