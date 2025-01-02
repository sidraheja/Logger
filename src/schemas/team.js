const mongoose = require('mongoose');
const teamSchema = new mongoose.Schema({
    name: String,
    ageCategory: String
  });
  
const Team = mongoose.model('teams', teamSchema);

module.exports = { Team };