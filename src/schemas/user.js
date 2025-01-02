const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Adding validation
    playerId: { type: String, required: true }, // Ensure playerId is a string if that's intentional
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true } // Use correct ObjectId reference
  });
  
  const User = mongoose.model('users', userSchema);

  module.exports = { User };