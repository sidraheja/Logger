const mongoose = require('mongoose');

// Stat Schema
const statSchema = new mongoose.Schema({
  title: { type: String, required: false },
  stat: { type: String, required: false }
});

// Team Stats Schema
const teamStatsSchema = new mongoose.Schema({
  goals: { type: String, required: false },
  stats: { type: [statSchema], required: false },
  teamId: { type: mongoose.Schema.Types.ObjectId, required: false }
});

// Game Stats Schema
const gameStatsSchema = new mongoose.Schema({
  home: { type: teamStatsSchema, required: false },
  away: { type: teamStatsSchema, required: false },
  highlightLink: { type: String, required: false },
  gameLog: { type: [String], required: false },
  videoLog: { type: [String], required: false },
  gameId: { type: mongoose.Schema.Types.ObjectId, required: false }
});

// User Stats Schema
const userStatsSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  teamId: { type: mongoose.Schema.Types.ObjectId, required: false },
  stats: { type: [statSchema], required: false },
  team: { type: String, required: false },
  identifiers: {type: Object}
});

const GameStats = mongoose.model('game-stats', gameStatsSchema);
const UserStats = mongoose.model('user-stats', userStatsSchema);

module.exports = { GameStats, UserStats };
