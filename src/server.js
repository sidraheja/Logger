const express = require('express');
const mongoose = require('mongoose');
const { GameStats, UserStats } = require('./schemas/stats');
const { Game } = require('./schemas/game');
const { Team } = require('./schemas/team');
const { User } = require('./schemas/user');
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
  saveUserGameStats(homeTeamId, awayTeamId, matchObjectId, playerStats);

  return res.status(200).json({
    statusText: "Game stats updated successfully"
  })
});

async function saveUserGameStats(homeTeamId, awayTeamId, gameId, playerStats) {

  const keySetToAvoid = new Set(["Player", "Player Name", "Manual ID", "Jersey ID", "Team", "Age Category"]);


  let index = 0
  let titleArray = []
  const homeTeam = await Team.findOne({ _id: homeTeamId });

  await UserStats.deleteMany({gameId: gameId})

  playerStats.forEach(stats => {
    if(index == 0) {
      titleArray = stats
      index = index + 1
    } else {
      const playerStats = titleArray.reduce((acc, title, index) => {
        acc[title] = stats[index];
        return acc;
      }, {});

      let teamId = playerStats["Team"] == homeTeam["name"] ? homeTeamId : awayTeamId

      let player = User.findOne({
        name: playerStats["Player Name"], // Replace with the variable holding the player's name
        playerId: playerStats["Player"], // Replace with the variable holding the player ID
        teamId: teamId // Replace with the variables holding home and away team IDs
      });

      if(!player) {
        player = User.create({
          name: playerStats["Player Name"],
          playerId: playerStats["Player"],
          teamId: teamId
        })
      }

      const playerDBStats = []

      Object.keys(playerStats).forEach(key => {
        if (!keySetToAvoid.has(key)) {
            playerDBStats.push({
              "title": key,
              "stat": playerStats[key]
            })
        }
      });

    
      UserStats.create({
        gameId: gameId, 
        userId: player["_id"],
        teamId: teamId,
        stats: playerDBStats,
        team: teamId == homeTeamId ? "home" : "away"
      })

    }
  })
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
