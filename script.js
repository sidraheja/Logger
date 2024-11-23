// Global state management
const state = {
    teamA: [],
    teamB: [],
    match: {
        id: "",
        teamA: "Team A",
        teamB: "Team B",
        category: ""
    },
    selectedPlayerId: null,
    currentLayout: 'pid',
    gameLog: [],
    nextUniqueId: 1, // Counter for generating unique IDs
    highlights: {
        start: "",
        stop: "",
        currentState: "START"
    }
};

// Player details storage - using unique IDs as keys
const playerDetailsMap = new Map();
let actionLog = [];
let highlightsLog = [];
let videoPlayer;

// DOM Elements
const teamAPlayerButtonsContainer = document.getElementById('teamAPlayerButtons');
const teamBPlayerButtonsContainer = document.getElementById('teamBPlayerButtons');
const teamAPlayerCount = document.getElementById('teamAPlayerCount');
const teamBPlayerCount = document.getElementById('teamBPlayerCount');
const addTeamAPlayerButton = document.getElementById('addTeamAPlayer');
const addTeamBPlayerButton = document.getElementById('addTeamBPlayer');
const removeTeamAPlayerButton = document.getElementById('removeTeamAPlayer');
const removeTeamBPlayerButton = document.getElementById('removeTeamBPlayer');
const teamAPassContainer = document.querySelector('.complete-pass .team-a-pass');
const teamBPassContainer = document.querySelector('.complete-pass .team-b-pass');
const teamAIncompletePassContainer = document.querySelector('.incomplete-pass .team-a-pass');
const teamBIncompletePassContainer = document.querySelector('.incomplete-pass .team-b-pass');
const gameLogTextBox = document.getElementById('gameLogTextBox');
const gameHighlightsTextBox = document.getElementById('gameHighlightsTextBox');
const popup = document.getElementById('popup');
const playerEditPopup = document.getElementById('playerEditPopup');
const layoutControls = document.querySelectorAll('input[name="layout"]');

const matchVideoPlayer = document.getElementById('matchVideoPlayer');
const videoIdInput = document.getElementById('videoIdInput');
const youtubeVideoIdInput = document.getElementById('youtubeVideoIdInput');
const updateYoutubeVideoButton = document.getElementById('updateYoutubeVideoButton');
let logTimestampButton;

gameLogTextBox.removeAttribute('readonly');
gameHighlightsTextBox.removeAttribute('readonly');

// Initialize event listeners
addTeamAPlayerButton.addEventListener('click', () => addPlayer('teamA'));
addTeamBPlayerButton.addEventListener('click', () => addPlayer('teamB'));
removeTeamAPlayerButton.addEventListener('click', () => removePlayer('teamA'));
removeTeamBPlayerButton.addEventListener('click', () => removePlayer('teamB'));
document.getElementById('undoButton').addEventListener('click', undoAction);
document.getElementById('saveToHighlightsButton').addEventListener('click', startStopHighlights);
document.getElementById('calculateStats').addEventListener('click', calculateStats);
document.getElementById('setMatchDetails').addEventListener('click', showEditMatchPopup);
// Add event listeners for all basic stat buttons

const statButtonShortcuts = {
    "A": 'completePass', 
    "D" : 'incompletePass', 
    "S": 'goalBtn', 
    "O": 'ownGoalBtn', 
    "Q": 'assistBtn', 
    "W": 'shotOnTargetBtn', 
    "E": 'shotOffTargetBtn',
    "Z": 'tackleBtn', 
    "X": 'interceptionBtn', 
    "C": 'saveBtn'
}

const basicStatButtons = Object.values(statButtonShortcuts).forEach(btnId => {
    document.getElementById(btnId).addEventListener('click', () => handleBasicStat(btnId));
});

// Layout radio buttons event listener
layoutControls.forEach(radio => {
    radio.addEventListener('change', (e) => {
        state.currentLayout = e.target.value;
        updateAllPlayerButtons();
    });
});

// Generate a unique ID for new players
function generateUniqueId() {
    return `player_${state.nextUniqueId++}`;
}

// Helper function to create a player button
function createPlayerButton(uniqueId, isOpposition = false) {
    const button = document.createElement('button');
    button.classList.add('player-button');
    if (isOpposition) button.classList.add('opposition');
    button.dataset.uniqueId = uniqueId;

    const textSpan = document.createElement('span');
    textSpan.classList.add('player-text');
    button.appendChild(textSpan);

    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.classList.add('edit-icon');
    editIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        showEditPopup(uniqueId);
    });

    button.appendChild(editIcon);
    updatePlayerButtonText(button);
    return button;
}

function addPlayer(team) {
    const uniqueId = generateUniqueId();
    state[team].push(uniqueId);
    playerDetailsMap.set(uniqueId, {
        playerId: `${team[team.length - 1].toUpperCase()}${state[team].length}`,
        manualId: 'N/A',
        jerseyId: 'N/A',
        playerName: "N/A",
        team: team
    });

    const button = createPlayerButton(uniqueId, team === 'teamB');
    button.addEventListener('click', () => handlePlayerSelection(uniqueId));

    if (team === 'teamA') {
        teamAPlayerButtonsContainer.appendChild(button);
    } else {
        teamBPlayerButtonsContainer.appendChild(button);
    }

    console.log(state)

    updateTeamPlayerCount(team);
}

function removePlayer(team) {
    if (state[team].length > 0) {
        const uniqueId = state[team].pop();
        playerDetailsMap.delete(uniqueId);

        if (team === 'teamA') {
            teamAPlayerButtonsContainer.removeChild(teamAPlayerButtonsContainer.querySelector(`[data-unique-id="${uniqueId}"]`));
        } else {
            teamBPlayerButtonsContainer.removeChild(teamBPlayerButtonsContainer.querySelector(`[data-unique-id="${uniqueId}"]`));
        }

        updateTeamPlayerCount(team);
    }
}

function updateTeamPlayerCount(team) {
    if (team === 'teamA') {
        teamAPlayerCount.textContent = state.teamA.length;
    } else {
        teamBPlayerCount.textContent = state.teamB.length;
    }
}

// Update button text based on current layout
function updatePlayerButtonText(button) {
    const uniqueId = button.dataset.uniqueId;
    const details = playerDetailsMap.get(uniqueId);
    const textSpan = button.querySelector('.player-text');
    
    if (textSpan) {
        switch (state.currentLayout) {
        case 'manual':
            textSpan.textContent = details.manualId;
            break;
        case 'jersey':
            textSpan.textContent = details.jerseyId;
            break;
        default: // pid layout
            textSpan.textContent = details.playerId;
        }
    }
}

// Handle player selection
function handlePlayerSelection(uniqueId) {
    const buttons = document.querySelectorAll('.team-section-container .player-button');
    buttons.forEach(button => {
        if (button.dataset.uniqueId === uniqueId) {
            if (button.classList.contains('selected')) {
                button.classList.remove('selected');
                state.selectedPlayerId = null;
            } else {
                button.classList.add('selected');
                state.selectedPlayerId = uniqueId;
            }
        } else {
            button.classList.remove('selected');
        }
    });
}

// Mark selected player as opposition
function markAsOpposition() {
    if (!state.selectedPlayerId) {
        alert('Select a player');
        return;
    }

    const buttons = document.querySelectorAll(`[data-unique-id="${state.selectedPlayerId}"]`);
    buttons.forEach(button => {
        button.classList.toggle('opposition');
    });
}

// Show edit popup for player details
function showEditPopup(uniqueId) {
    const details = playerDetailsMap.get(uniqueId);
    const content = `
        <h2>Edit Player Details</h2>
        <div class="edit-form">
            <div class="form-group">
                <label for="playerId">Player ID:</label>
                <input type="text" id="playerId" value="${details.playerId}" readonly>
            </div>
            <div class="form-group">
                <label for="manualId">Manual ID:</label>
                <input type="text" id="manualId" value="${details.manualId}">
            </div>
            <div class="form-group">
                <label for="jerseyId">Jersey ID:</label>
                <input type="text" id="jerseyId" value="${details.jerseyId}">
            </div>
            <div class="form-group">
                <label for="playerName">Player Name:</label>
                <input type="text" id="playerName" value="${details.playerName}">
            </div>
            <button id="savePlayerDetails">Save</button>
        </div>
    `;
    
    playerEditPopup.querySelector('.popup-content').innerHTML = content;
    playerEditPopup.dataset.uniqueId = uniqueId;
    playerEditPopup.style.display = 'flex';
    
    document.getElementById('savePlayerDetails').addEventListener('click', () => {
        savePlayerDetails();
    });
}

// Show edit popup for player details
function showEditMatchPopup(uniqueId) {
    const matchDetails = state.match
    console.log(matchDetails)

    const content = `
        <h2>Edit Player Details</h2>
        <div class="edit-form">
            <div class="form-group">
                <label for="matchId">Match Id:</label>
                <input type="text" id="matchId" value="${matchDetails.id}">
            </div>
            <div class="form-group">
                <label for="teamAName">Team A Name:</label>
                <input type="text" id="teamAName" value="${matchDetails.teamA}">
            </div>
            <div class="form-group">
                <label for="teamBName">Team B Name:</label>
                <input type="text" id="teamBName" value="${matchDetails.teamB}">
            </div>
            <div class="form-group">
                <label for="category">Age Category:</label>
                <input type="text" id="category" value="${matchDetails.category}">
            </div>
            <button id="saveMatchDetails">Save</button>
        </div>
    `;
    
    playerEditPopup.querySelector('.popup-content').innerHTML = content;
    playerEditPopup.dataset.uniqueId = uniqueId;
    playerEditPopup.style.display = 'flex';
    
    document.getElementById('saveMatchDetails').addEventListener('click', () => {
        const id = document.getElementById('matchId').value;
        const teamA = document.getElementById('teamAName').value || 'N/A';
        const teamB = document.getElementById('teamBName').value || 'N/A';
        const category = document.getElementById('category').value || 'N/A';
        
        // Update the details in the map
        state.match = {
            id,
            teamA,
            teamB,
            category
        }

        document.getElementById('team-a-name').innerText = teamA;
        document.getElementById('team-b-name').innerText = teamB;

        // Close the popup
        playerEditPopup.style.display = 'none';
    });
}

// Save player details from popup
function savePlayerDetails() {
    const uniqueId = playerEditPopup.dataset.uniqueId;
    const playerId = document.getElementById('playerId').value;
    const manualId = document.getElementById('manualId').value || 'N/A';
    const jerseyId = document.getElementById('jerseyId').value || 'N/A';
    const playerName = document.getElementById('playerName').value || 'N/A';
    playerDetails = playerDetailsMap.get(uniqueId)
    team = playerDetails.team
    
    // Update the details in the map
    playerDetailsMap.set(uniqueId, {
        playerId,
        manualId,
        jerseyId,
        playerName,
        team
    });
    
    // Update all buttons to reflect changes
    document.querySelectorAll(`[data-unique-id="${uniqueId}"]`).forEach(button => {
        updatePlayerButtonText(button);
    });
    
    // Close the popup
    playerEditPopup.style.display = 'none';
}

// Update all player buttons text based on current layout
function updateAllPlayerButtons() {
    document.querySelectorAll('.player-button').forEach(updatePlayerButtonText);
}

// Handle basic stat button clicks
function handleBasicStat(btnId) {
    if (!state.selectedPlayerId) {
        alert('Select a player first');
        return;
    }

    const statType = btnId.replace('Btn', '');
    logAction(statType.charAt(0).toUpperCase() + statType.slice(1), state.selectedPlayerId);
}

// Log action with player details
function logAction(action, uniqueId) {
    const details = playerDetailsMap.get(uniqueId);
    const logEntry = `${action} - ${details.playerId} : ${details.manualId} : ${details.jerseyId} : ${details.playerName} : ${uniqueId} - ${getVideoPlayerTimeStamp()}`;
    actionLog.push(logEntry);
    gameLogTextBox.value += logEntry + '\n';
    showGreenTick(logEntry);
    copyToClipboard();
}

function getPlayerDisplayText(uniqueId) {
    const details = playerDetailsMap.get(uniqueId);
    switch (state.currentLayout) {
        case 'manual':
            return details.manualId;
        case 'jersey':
            return details.jerseyId;
        default:
            return details.playerId;
    }
}

// Undo last action
function undoAction() {
    if (actionLog.length > 0) {
        const lastAction = actionLog.pop();
        gameLogTextBox.value = actionLog.join('\n') + '\n';
        alert(`Undone: ${lastAction}`);
    } else {
        alert("No actions to undo.");
    }
    copyToClipboard();
}

// Copy to clipboard utility
function copyToClipboard() {
    const clipboardContent = `Game Log:
    ${gameLogTextBox.value}
    --------
    Game Highlights:
    ${gameHighlightsTextBox.value}`;

    navigator.clipboard.writeText(clipboardContent).then(() => {
        console.log('Content copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
} 

function createPlayerCheckboxes() {
    const playerIds = [...state.teamA, ...state.teamB];
    return playerIds.map(uniqueId => {
        const details = playerDetailsMap.get(uniqueId);
        const displayText = getPlayerDisplayText(uniqueId);
        return `
            <div>
                <input type="checkbox" id="player_${uniqueId}" class="player-checkbox" data-unique-id="${uniqueId}">
                <label for="player_${uniqueId}">${displayText}</label>
            </div>
        `;
    }).join('');
}

function startStopHighlights() {
    const button = document.getElementById('saveToHighlightsButton');

    if (state.highlights.currentState == "START") {
        console.log("Start")
        button.innerText = "Stop Highlight (H)";
        button.style.backgroundColor = "#0000FF"; // Change color to red
        state.highlights.start = getVideoPlayerTimeStamp()
        state.highlights.currentState = "STOP"
    } else {
        console.log("Stop")
        button.innerText = "Save Highlight (H)";
        state.highlights.currentState = "START"
        button.style.backgroundColor = "#4CAF50"; // Change color to red
        state.highlights.stop = getVideoPlayerTimeStamp()
        videoPlayer.pauseVideo()
        showHighlightsPopup()
    }
}

// Show highlights popup
function showHighlightsPopup() {
    const content = `
        <div class="highlights-popup-content">
            <h2>Add to Highlights</h2>
            <div class="highlights-form">
                <div class="form-group">
                    <label for="startTimestamp">Start Timestamp:</label>
                    <input type="text" id="startTimestamp" placeholder="Enter start timestamp">
                </div>
                <div class="form-group">
                    <label for="endTimestamp">Stop Timestamp:</label>
                    <input type="text" id="endTimestamp" placeholder="Enter end timestamp">
                </div>
                <div class="form-group">
                    <label for="notes">Notes:</label>
                    <textarea id="notes" placeholder="Enter notes"></textarea>
                </div>
                <div class="highlights-players">
                    ${createPlayerCheckboxes()}
                </div>
                <div class="popup-buttons">
                    <button id="cancelHighlights">Close</button>
                    <button id="saveHighlights">Save</button>
                </div>
            </div>
        </div>
    `;
    
    popup.querySelector('.popup-content').innerHTML = content;
    popup.style.display = 'flex';
    
    document.getElementById('cancelHighlights').addEventListener('click', () => {
        state.highlights.stop = ""
        state.highlights.start = ""
        popup.style.display = 'none';
    });

    const endTimestampInput = document.getElementById('endTimestamp');
    if (endTimestampInput) {
        endTimestampInput.value = state.highlights.stop;
    }

    const startTimestampInput = document.getElementById('startTimestamp');
    if (startTimestampInput) {
        startTimestampInput.value = state.highlights.start;
    }
    
    document.getElementById('saveHighlights').addEventListener('click', () => {
        const startTimestamp = document.getElementById('startTimestamp').value;
        const endTimestamp = document.getElementById('endTimestamp').value;
        const notes = document.getElementById('notes').value;
        const selectedPlayers = Array.from(document.querySelectorAll('.player-checkbox:checked'))
            .map(checkbox => {
                const uniqueId = checkbox.dataset.uniqueId;
                return getPlayerDisplayText(uniqueId);
            });
        
        const highlightEntry = `Inpoint: ${startTimestamp}\nOutpoint: ${endTimestamp}\nNotes: ${notes}\nPlayers selected: ${selectedPlayers.join(', ')}`;
        gameHighlightsTextBox.value += (gameHighlightsTextBox.value ? '\n\n' : '') + highlightEntry;
        popup.style.display = 'none';
        state.highlights.stop = ""
        state.highlights.start = ""
        showGreenTick(highlightEntry);
        copyToClipboard();
    });
}

// Close popup handlers
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        closeBtn.closest('.popup').style.display = 'none';
    });
});

// Close popups when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('popup')) {
        e.target.style.display = 'none';
    }
});

function getVideoPlayerTimeStamp() {
    const currentTime = videoPlayer.getCurrentTime();
    const hours = Math.floor(currentTime / 3600);
    const minutes = Math.floor((currentTime % 3600) / 60);
    const secs = Math.floor(currentTime % 60);
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function calculateStats() {
    const stats = {};
    if (gameLogTextBox.value !== '') {
         actionLog = gameLogTextBox.value.split('\n').filter(line => line.trim() !== '');
    }

    if (gameHighlightsTextBox.value !== '') {
        highlightsLog = gameHighlightsTextBox.value
                                .split('\n') // Split the input into an array of lines
                                .filter(line => line.trim() !== '') // Remove empty or whitespace-only lines
                                .filter(line => line.includes('Inpoint') || line.includes('Outpoint')); // Keep lines containing "Inpoint" and "Outpoint"

   }

    // Iterate through all logged actions
    actionLog.forEach(entry => {
        console.log("HERE!!");
        const [action, playerInfo, timestamp] = entry.split(' - ');
        let [playerId, manualId, jerseyId, playerName, uniqueId] = playerInfo.split(' : ');
        const playerKey = `${uniqueId}`;
        player = playerDetailsMap.get(uniqueId)
        const team = state.match[player.team] ? state.match[player.team] : player.team
        const ageCategory = state.match.category
        playerId = player.playerId
        manualId = player.manualId
        jerseyId = player.jerseyId
        playerName = player.playerName

        // Initialize player stats if not already present
        if (!stats[playerKey]) {
            stats[playerKey] = {
                playerName,
                playerId,
                manualId,
                jerseyId,
                team,
                ageCategory,
                goals: 0,
                assists: 0,
                completePasses: 0,
                incompletePasses: 0,
                totalShots: 0,
                shotsOnTarget: 0,
                tackles: 0,
                interceptions: 0,
                saves: 0,
                ownGoals: 0
            };
        }

        // Update player stats based on the action
        switch (action) {
            case 'Goal':
                stats[playerKey].goals++;
                break;
            case "OwnGoal":
                stats[playerKey].ownGoals++;
                break;
            case 'Assist':
                stats[playerKey].assists++;
                break;
            case 'CompletePass':
                stats[playerKey].completePasses++;
                break;
            case 'IncompletePass':
                stats[playerKey].incompletePasses++;
                break;
            case 'ShotOnTarget':
                stats[playerKey].shotsOnTarget++;
                stats[playerKey].totalShots++;
                break;
            case 'ShotOffTarget':
                stats[playerKey].totalShots++;
                break;
            case 'Tackle':
                stats[playerKey].tackles++;
                break;
            case 'Interception':
                stats[playerKey].interceptions++;
                break;
            case 'Save':
                stats[playerKey].saves++;
                break;
        }
    });

    // Calculate team stats
    const matchStatsTable = generateMatchStatsTable(stats);
    
    // Generate the stats table
    let statsTable = `
        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Player Name</th>
                    <th>Manual ID</th>
                    <th>Jersey ID</th>
                    <th>Team</th>
                    <th>Age Category</th>
                    <th>Goals</th>
                    <th>Own Goals</th>
                    <th>Assists</th>
                    <th>Complete Passes</th>
                    <th>Incomplete Passes</th>
                    <th>Passing Accuracy</th>
                    <th>Total Shots</th>
                    <th>Shots on Target</th>
                    <th>Tackles</th>
                    <th>Interceptions</th>
                    <th>Saves</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Populate the stats table
    Object.values(stats).forEach(player => {
        const passingAccuracy = player.completePasses + player.incompletePasses > 0
            ? `${((player.completePasses / (player.completePasses + player.incompletePasses)) * 100).toFixed(2)}%`
            : 'N/A';

        statsTable += `
            <tr>
                <td>${player.playerId}</td>
                <td>${player.playerName}</td>
                <td>${player.manualId || 'N/A'}</td>
                <td>${player.jerseyId || 'N/A'}</td>
                <td>${player.team || 'N/A'}</td>
                <td>${player.ageCategory || 'N/A'}</td>
                <td>${player.goals}</td>
                <td>${player.ownGoals}</td>
                <td>${player.assists}</td>
                <td>${player.completePasses}</td>
                <td>${player.incompletePasses}</td>
                <td>${passingAccuracy}</td>
                <td>${player.totalShots}</td>
                <td>${player.shotsOnTarget}</td>
                <td>${player.tackles}</td>
                <td>${player.interceptions}</td>
                <td>${player.saves}</td>
            </tr>
        `;
    });

    statsTable += `
            </tbody>
        </table>
    `;

    // Display the stats table in a full-screen popup
    const statsPopup = document.createElement('div');
    statsPopup.classList.add('stats-popup', 'full-screen');
    statsPopup.innerHTML = `
        <div class="stats-popup-content">
            <div class="stats-popup-header">
                <h2>Player Statistics</h2>
                <a href="#" class="download-button">Download as Excel</a>
                <span class="close-button">&times;</span>
            </div>
            <div class="stats-container">
                ${statsTable}
            </div>

            <div class="stats-container">
                ${matchStatsTable}
            </div>
        </div>
    `;
    document.body.appendChild(statsPopup);

    // Add event listener to the download button
    statsPopup.querySelector('.download-button').addEventListener('click', () => {
        exportTablesToZip()
    });

    // Close the popup when the close button is clicked
    statsPopup.querySelector('.close-button').addEventListener('click', () => {
        statsPopup.remove();
    });

    // Close the popup when clicking outside the content
    statsPopup.addEventListener('click', (e) => {
        if (e.target === statsPopup) {
            statsPopup.remove();
        }
    });
}

function showGreenTick(logEntry) {
    const tick = document.createElement('div');
    tick.innerHTML = logEntry;
    tick.className = 'green-tick';
    document.body.appendChild(tick);
    setTimeout(() => document.body.removeChild(tick), 500);
}

function downloadStatsAsExcel() {
    // Convert the HTML table to a CSV string
    const tableData = document.querySelector('.stats-container table').outerHTML;
    const csvData = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(tableData);

    // Create a download link and click it
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', csvData);
    downloadLink.setAttribute('download', 'player-stats.xls');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

//Video Upload
document.getElementById('updateVideoButton');
updateYoutubeVideoButton.addEventListener('click', () => {
    const youtubeVideoId = youtubeVideoIdInput.value.trim();
    if (youtubeVideoId) {
        videoPlayer.loadVideoById(youtubeVideoId);
        // matchVideoPlayer.src = `https://www.youtube.com/embed/${youtubeVideoId}`;
    } else {
        alert('Please enter a valid YouTube video ID');
    }
});

//Listen for Key Strokes
document.addEventListener('keydown', (event) => {
    const isInputActive = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA';

    if (isInputActive) {
        return; // Exit if the user is typing in a text box
    }

    if (statButtonShortcuts.hasOwnProperty(event.key.toUpperCase())) {
        handleBasicStat(statButtonShortcuts[event.key.toUpperCase()])
    } else if(event.key.toUpperCase() == 'H') {
        startStopHighlights()
    } else if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault(); // Prevent the page from scrolling down
        const currentState = videoPlayer.getPlayerState();
        if (currentState === 1) {
            console.log("The video is currently playing.");
            videoPlayer.pauseVideo()
        } else if (currentState === 2) {
            console.log("The video is currently paused.");
            videoPlayer.playVideo();
        }
    } else if (event.key === 'ArrowRight') { // Check if the right arrow key is pressed
        const currentTime = videoPlayer.getCurrentTime(); // Get the current playback time
        const newTime = currentTime + 3; // Add 3 seconds to the current time
        videoPlayer.seekTo(newTime, true); // Seek to the new time
    } else if (event.key === 'ArrowLeft') { // Check if the right arrow key is pressed
        const currentTime = videoPlayer.getCurrentTime(); // Get the current playback time
        const newTime = currentTime - 3; // Add 3 seconds to the current time
        videoPlayer.seekTo(newTime, true); // Seek to the new time
    }
});

function onYouTubeIframeAPIReady() {
    videoPlayer = new YT.Player('matchVideoPlayer', {
        width: '100%',
        height: '700',
        videoId: '', // Start with an empty video
        playerVars: {
            autoplay: 1,
            controls: 1,
        },
        events: {
            onReady: onVideoPlayerReady
        },
    });
}

function onVideoPlayerReady(event) {

}

function calculateMatchStats(stats) {
    // Initialize team stats
    teamStats = {};
    for (const playerKey in stats) {
        const { team } = stats[playerKey];
        if (!teamStats[team]) {
            teamStats[team] = {
                goals: 0,
                ownGoals: 0,
                possession: 0,
                completePasses: 0,
                incompletePasses: 0,
                passingAccuracySum: 0,
                playersWithPasses: 0, // Used for calculating average passing accuracy
                totalShots: 0,
                shotsOnTarget: 0,
                tackles: 0,
                interceptions: 0,
                saves: 0
            };
        }
    }

    // Aggregate stats for each team
    for (const playerKey in stats) {
        const {
            team,
            goals,
            ownGoals,
            completePasses,
            incompletePasses,
            totalShots,
            shotsOnTarget,
            tackles,
            interceptions,
            saves
        } = stats[playerKey];

        // Add stats to the corresponding team
        teamStats[team].goals += goals;
        teamStats[team].ownGoals += ownGoals;
        teamStats[team].completePasses += completePasses;
        teamStats[team].incompletePasses += incompletePasses;
        teamStats[team].totalShots += totalShots;
        teamStats[team].shotsOnTarget += shotsOnTarget;
        teamStats[team].tackles += tackles;
        teamStats[team].interceptions += interceptions;
        teamStats[team].saves += saves;

        // Add passing accuracy for average calculation
        const totalPasses = completePasses + incompletePasses;
        if (totalPasses > 0) {
            const passingAccuracy = (completePasses / totalPasses) * 100;
            teamStats[team].passingAccuracySum += passingAccuracy;
            teamStats[team].playersWithPasses += 1;
        }
    }

    if (teamStats[state.match.teamA] && teamStats[state.match.teamA].ownGoals > 0) {
        if(!teamStats[state.match.teamB]) {
            teamStats[state.match.teamB] = {
                goals: 0
            }
        }
        teamStats[state.match.teamB].goals +=  teamStats[state.match.teamA].ownGoals 
    }

    if (teamStats[state.match.teamB] && teamStats[state.match.teamB].ownGoals > 0) {
        if(!teamStats[state.match.teamA]) {
            teamStats[state.match.teamA] = {
                goals: 0
            }
        }
        teamStats[state.match.teamA].goals +=  teamStats[state.match.teamB].ownGoals 
    }


    // Calculate possession and average passing accuracy
    const totalCompletePasses = Object.values(teamStats).reduce((sum, team) => sum + team.completePasses, 0);
    const totalIncompletePasses = Object.values(teamStats).reduce((sum, team) => sum + team.incompletePasses, 0);
    const totalPasses = totalCompletePasses + totalIncompletePasses;

    for (const team in teamStats) {
        if (totalPasses > 0) {
            teamStats[team].possession = (
                ((teamStats[team].completePasses + teamStats[team].incompletePasses) / totalPasses) *
                100
            ).toFixed(2);
        } else {
            teamStats[team].possession = 'N/A';
        }        
        if (teamStats[team].playersWithPasses > 0) {
            teamStats[team].averagePassingAccuracy = `${(
                teamStats[team].passingAccuracySum / teamStats[team].playersWithPasses
            ).toFixed(2)}%`;
        } else {
            teamStats[team].averagePassingAccuracy = 'N/A';
        }

        // Remove temporary keys used for calculations
        delete teamStats[team].passingAccuracySum;
        delete teamStats[team].playersWithPasses;
    }

    return teamStats;
}

function generateMatchStatsTable(playerStats) {
    matchStats = calculateMatchStats(playerStats)
    console.log(matchStats)
    const teamA = Object.keys(matchStats)[0] ? Object.keys(matchStats)[0] : "Team A"
    const teamB = Object.keys(matchStats)[1] ? Object.keys(matchStats)[1] : "Team B"

    if (!matchStats[teamA]) {
        matchStats[teamA] = {
            goals: 0,
            possession: 0,
            completePasses: 0,
            incompletePasses: 0,
            passingAccuracySum: 0,
            playersWithPasses: 0, // Used for calculating average passing accuracy
            totalShots: 0,
            shotsOnTarget: 0,
            tackles: 0,
            interceptions: 0,
            saves: 0,
            averagePassingAccuracy: 'N/A'
        }
    }

    if (!matchStats[teamB]) {
        matchStats[teamB] = {
            goals: 0,
            possession: 0,
            completePasses: 0,
            incompletePasses: 0,
            passingAccuracySum: 0,
            playersWithPasses: 0, // Used for calculating average passing accuracy
            totalShots: 0,
            shotsOnTarget: 0,
            tackles: 0,
            interceptions: 0,
            saves: 0,
            averagePassingAccuracy: 'N/A'
        }
    }


    return `
        <table>
            <thead>
                <tr>
                    <th>Match Stats</th>
                    <th>${teamA}</th>
                    <th>${teamB}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Goals</td>
                    <td>${matchStats[teamA].goals}</td>
                    <td>${matchStats[teamB].goals}</td>
                </tr>
                <tr>
                    <td>Possession</td>
                    <td>${matchStats[teamA].possession}%</td>
                    <td>${matchStats[teamB].possession}%</td>
                </tr>
                <tr>
                    <td>Cumulative Passing Accuracy</td>
                    <td>${matchStats[teamA].averagePassingAccuracy}</td>
                    <td>${matchStats[teamB].averagePassingAccuracy}</td>
                </tr>
                <tr>
                    <td>Total Shots</td>
                    <td>${matchStats[teamA].totalShots}</td>
                    <td>${matchStats[teamB].totalShots}</td>
                </tr>
                <tr>
                    <td>Total Shots on Target</td>
                    <td>${matchStats[teamA].shotsOnTarget}</td>
                    <td>${matchStats[teamB].shotsOnTarget}</td>
                </tr>
                <tr>
                    <td>Total Tackles</td>
                    <td>${matchStats[teamA].tackles}</td>
                    <td>${matchStats[teamB].tackles}</td>
                </tr>
                <tr>
                    <td>Total Interceptions</td>
                    <td>${matchStats[teamA].interceptions}</td>
                    <td>${matchStats[teamB].interceptions}</td>
                </tr>
                <tr>
                    <td>Saves</td>
                    <td>${matchStats[teamA].saves}</td>
                    <td>${matchStats[teamB].saves}</td>
                </tr>
            </tbody>
        </table>
    `;
}

function exportTablesToZip() {
    // Parse the player stats table
    const playerStatsTable = document.querySelector('.stats-container table');
    const playerStatsArray = parseHTMLTableToArray(playerStatsTable.outerHTML);

    // Parse the match stats table
    const matchStatsTable = document.querySelectorAll('.stats-container table')[1];
    const matchStatsArray = parseHTMLTableToArray(matchStatsTable.outerHTML);

    // Create a new workbook for Excel
    const wb = XLSX.utils.book_new();

    // Convert arrays to worksheets
    const playerStatsSheet = XLSX.utils.aoa_to_sheet(playerStatsArray);
    const matchStatsSheet = XLSX.utils.aoa_to_sheet(matchStatsArray);

    // Append sheets to the workbook
    XLSX.utils.book_append_sheet(wb, playerStatsSheet, "Player Stats");
    XLSX.utils.book_append_sheet(wb, matchStatsSheet, "Match Stats");

    // Generate the Excel file as a binary string
    const excelData = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const actionLogString = actionLog.join("\n")
    const highlightsLogString = highlightsLog.join("\n");

    // Create a new ZIP file
    const zip = new JSZip();

    const name = `${state.match.teamA} - ${state.match.teamB} - ${state.match.id}`
    // Add the Excel file to the ZIP
    zip.file(`${name}.xlsx`, excelData);

    // Add the text file to the ZIP
    zip.file("logs.txt", actionLogString);
    zip.file("highlights.txt", highlightsLogString);

    // Generate the ZIP file and trigger the download
    zip.generateAsync({ type: "blob" }).then(function (content) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `${name}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
        console.log("ZIP file has been downloaded.");
    });
}




// Helper to parse HTML tables into arrays
function parseHTMLTableToArray(htmlTable) {
    const table = document.createElement('div');
    table.innerHTML = htmlTable.trim();
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(row => Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent));
}