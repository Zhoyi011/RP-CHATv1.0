const mongoose = require('mongoose');

const activePersonaSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    unique: true 
  },
  personaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Persona',
    required: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('ActivePersona', activePersonaSchema);