const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = 3000; // Port for local testing

app.use(express.json());

// Middleware to serve static files
app.use(express.static('public'));

// MongoDB connection
mongoose.connect('mongodb+srv://gauravyas:r5uIjbtIT0F4rIgB@closecontrolcluster.wfvax.mongodb.net/beta', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define schema and model
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

// API endpoint to fetch active games
app.get('/api/active-games', async (req, res) => {
  try {
    const activeGames = await Game.find({ isActive: true }, { matchId: 1, _id: 0 }).lean();
    const matchIds = activeGames.map(game => game.matchId);

    res.json(matchIds);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching active games' });
  }
});

const teamSchema = new mongoose.Schema({
  name: String,
  ageCategory: String
});

const Team = mongoose.model('teams', teamSchema);


const userSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Adding validation
  playerId: { type: String, required: true }, // Ensure playerId is a string if that's intentional
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true } // Use correct ObjectId reference
});

const User = mongoose.model('users', userSchema);

app.get('/api/games/:matchId', async (req, res) => {
  const { matchId } = req.params;

  try {
    // Find the game by matchId
    const game = await Game.findOne({ matchId });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Fetch the home and away team details from the teams collection
    const homeTeam = await Team.findOne({ _id: game["home"]["teamId"] });
    const awayTeam = await Team.findOne({ _id: game["away"]["teamId"] });

    const homeTeamPlayers = await User.find({teamId: game["home"]["teamId"]})
    const homeTeamDict = {}
    homeTeamPlayers.forEach(player => {
      homeTeamDict[player.name] = player.playerId
    })

    const awayTeamPlayers = await User.find({teamId: game["away"]["teamId"]}) 
    const awayTeamDict = {}
    awayTeamPlayers.forEach(player => {
      awayTeamDict[player.name] = player.playerId
    })

    // Construct the response
    const response = {
      matchId: game.matchId,
      ageCategory: game.ageCategory,
      videoLink: game.videoLink,
      isActive: game.isActive,
      home: {
        colour: game.home.colour,
        teamDetails: homeTeam || null, // Include team details or null if not found
        players: homeTeamDict
      },
      away: {
        colour: game.away.colour,
        teamDetails: awayTeam || null, // Include team details or null if not found
        players: awayTeamDict
      },
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching game details' });
  }
});

const statSchema = new mongoose.Schema({
  title: { type: String, required: false },
  stat: { type: String, required: false }
});

const teamStatsSchema = new mongoose.Schema({
  goals: { type: String, required: false },
  stats: { type: [statSchema], required: false },
  teamId: { type: mongoose.Schema.Types.ObjectId, required: false }
});

const gameStatsSchema = new mongoose.Schema({
  home: { type: teamStatsSchema, required: false },
  away: { type: teamStatsSchema, required: false },
  highlightLink: { type: String, required: false },
  gameLog: { type: [String], required: false },
  videoLog: { type: [String], required: false },
  gameId: { type: mongoose.Schema.Types.ObjectId, required: false }
});

const userStatsSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  teamId: { type: mongoose.Schema.Types.ObjectId, required: false },
  stats: { type: [statSchema], required: false },
  team: { type: String, required: false }
});

const GameStats = mongoose.model('game-stats', gameStatsSchema);
const UserStats = mongoose.model('user-stats', userStatsSchema);

app.post('/api/games-stats/:matchId', async (req, res) => {

  const { matchId } = req.params;
  const { gameStats, gameLog, videoLog, playerStats } = req.body;

  const game = await Game.findOne({ matchId });
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const matchObjectId = game._id;
  const homeTeamId = game.home.teamId;
  const awayTeamId = game.away.teamId;

  let gameStatsModel = await GameStats.findOne({ gameId: game._id });

  if (!gameStatsModel) {
    gameStatsModel = new GameStats()
  }

  gameStatsModel.gameId = matchObjectId;
  gameStatsModel.gameLog = gameLog;
  gameStatsModel.videoLog = videoLog;
  gameStatsModel.highlightLink = "";
  gameStatsModel.home = {
    "teamId": homeTeamId,
    "goals": 0,
    "stats": []
  }

  gameStatsModel.away = {
    "teamId": awayTeamId,
    "goals": 0,
    "stats": []
  }

  gameStats.forEach(stat => {
    if (stat[0] === "Goals") {
      gameStatsModel.home.goals = stat[1];
      gameStatsModel.away.goals = stat[2];
    } else {
      gameStatsModel.home.stats.push({
        "title": stat[0],
        "stat": stat[1]
      });
      gameStatsModel.away.stats.push({
        "title": stat[0],
        "stat": stat[2]
      });
    }
  });

  gameStatsModel.save();


});

app.post('/api/user-stats/:matchId', async (req, res) => {

});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
