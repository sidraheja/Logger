const mongoose = require('mongoose');
const gameSchema = new mongoose.Schema({
    matchId: { type: String, required: true },
    ageCategory: { type: String, required: true },
    away: {
      colour: { type: String, required: true },
      teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    },
    gameweek: { type: String, required: true },
    home: {
      colour: { type: String, required: true },
      teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    },
    videoLink: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  });
  
  const Game = mongoose.model('games', gameSchema);

  module.exports = { Game };