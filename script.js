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
    },
    // New state for action selections
    selectedPrimaryAction: null, // ID of the selected button in Attack, Defense, or GK
    selectedSetPiece: null, // ID of the selected set piece button
    selectedSpecialActions: [] // Array of IDs for selected special buttons
};

// Player details storage - using unique IDs as keys
const playerDetailsMap = new Map();
let actionLog = []; // Holds the raw log strings
let highlightsLog = []; // Holds parsed highlight start/end points
let allHighlightsLog = []; // Holds raw highlight text
let videoPlayer; // YouTube player instance

// DOM Elements
const teamAPlayerButtonsContainer = document.getElementById('teamAPlayerButtons');
const teamBPlayerButtonsContainer = document.getElementById('teamBPlayerButtons');
const teamAPlayerCount = document.getElementById('teamAPlayerCount');
const teamBPlayerCount = document.getElementById('teamBPlayerCount');
const addTeamAPlayerButton = document.getElementById('addTeamAPlayer');
const addTeamBPlayerButton = document.getElementById('addTeamBPlayer');
const removeTeamAPlayerButton = document.getElementById('removeTeamAPlayer');
const removeTeamBPlayerButton = document.getElementById('removeTeamBPlayer');
const gameLogTextBox = document.getElementById('gameLogTextBox');
const gameHighlightsTextBox = document.getElementById('gameHighlightsTextBox');
const popup = document.getElementById('popup');
const playerEditPopup = document.getElementById('playerEditPopup');
const layoutControls = document.querySelectorAll('input[name="layout"]');
const logActionButton = document.getElementById('logActionButton'); // New Log Action Button

const matchVideoPlayer = document.getElementById('matchVideoPlayer');
// const videoIdInput = document.getElementById('videoIdInput'); // Not used with YouTube ID input
const youtubeVideoIdInput = document.getElementById('youtubeVideoIdInput');
const updateYoutubeVideoButton = document.getElementById('updateYoutubeVideoButton');
// let logTimestampButton; // Not currently used

// Make text areas editable by default if needed (though JS updates them)
// gameLogTextBox.removeAttribute('readonly');
// gameHighlightsTextBox.removeAttribute('readonly');

// Initialize event listeners
addTeamAPlayerButton.addEventListener('click', () => addPlayer('teamA'));
addTeamBPlayerButton.addEventListener('click', () => addPlayer('teamB'));
removeTeamAPlayerButton.addEventListener('click', () => removePlayer('teamA'));
removeTeamBPlayerButton.addEventListener('click', () => removePlayer('teamB'));
document.getElementById('undoButton').addEventListener('click', undoAction);
document.getElementById('saveToHighlightsButton').addEventListener('click', startStopHighlights);
document.getElementById('calculateStats').addEventListener('click', calculateStats);
document.getElementById('setMatchDetails').addEventListener('click', showEditMatchPopup);
logActionButton.addEventListener('click', logNewAction); // Listener for new log button
updateYoutubeVideoButton.addEventListener('click', updateYouTubeVideo); // Listener for YouTube video update

// --- New Action Button Setup ---

// Define button groups (IDs must match HTML)
const primaryActionButtons = [
    // Attack
    'passBtn', 'longPassBtn', 'throughBallBtn', 'shotBallBtn', 'crossBtn', 'dribbleAttemptBtn', 'miscontrolBtn', 'noActionBtn', 'goalBtn',
    // Defense
    'defensiveActionBtn', 'clearanceBtn', 'ownGoalBtn',
    // GK
    'saveBtn', 'catchBtn', 'punchBtn'
];

const setPieceButtons = [
    'cornerBtn', 'freeKickBtn', 'penaltyBtn', 'outOfBoundsBtn', 'offsideBtn'
];

const specialButtons = [
    'headerBtn', 'woodworkBtn', 'moiBtn', 'aerialDuelBtn'
];

// Helper to add/remove 'selected' class safely
function toggleSelectedClass(buttonId, force) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (force === true) {
            button.classList.add('selected');
        } else if (force === false) {
            button.classList.remove('selected');
        } else {
            button.classList.toggle('selected');
        }
    } else {
        console.warn(`Button with ID ${buttonId} not found for toggling class.`);
    }
}

// Handle selection for primary actions (Attack, Defense, GK - only one overall)
function handlePrimaryActionSelect(buttonId) {
    if (state.selectedPrimaryAction === buttonId) {
        // Clicking the same button deselects it
        state.selectedPrimaryAction = null;
        toggleSelectedClass(buttonId, false);
    } else {
        // Deselect previously selected primary action if it exists
        if (state.selectedPrimaryAction) {
            toggleSelectedClass(state.selectedPrimaryAction, false);
        }
        // Select the new one
        state.selectedPrimaryAction = buttonId;
        toggleSelectedClass(buttonId, true);
    }
}

// Handle selection for set pieces (only one)
function handleSetPieceSelect(buttonId) {
    if (state.selectedSetPiece === buttonId) {
        // Clicking the same button deselects it
        state.selectedSetPiece = null;
        toggleSelectedClass(buttonId, false);
    } else {
        // Deselect previously selected set piece if it exists
        if (state.selectedSetPiece) {
            toggleSelectedClass(state.selectedSetPiece, false);
        }
        // Select the new one
        state.selectedSetPiece = buttonId;
        toggleSelectedClass(buttonId, true);
    }
}

// Handle selection for special actions (multiple allowed)
function handleSpecialActionSelect(buttonId) {
    const index = state.selectedSpecialActions.indexOf(buttonId);
    if (index > -1) {
        // Already selected, deselect it
        state.selectedSpecialActions.splice(index, 1);
        toggleSelectedClass(buttonId, false);
    } else {
        // Not selected, select it
        state.selectedSpecialActions.push(buttonId);
        toggleSelectedClass(buttonId, true);
    }
}

// Add event listeners to new action buttons safely
function setupActionButtons() {
    primaryActionButtons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => handlePrimaryActionSelect(id));
        } else {
            console.warn(`Primary action button with ID ${id} not found.`);
        }
    });

    setPieceButtons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => handleSetPieceSelect(id));
        } else {
            console.warn(`Set piece button with ID ${id} not found.`);
        }
    });

    specialButtons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => handleSpecialActionSelect(id));
        } else {
            console.warn(`Special action button with ID ${id} not found.`);
        }
    });
}

// Call the setup function once the DOM is ready
document.addEventListener('DOMContentLoaded', setupActionButtons);


// Function to reset action selections (buttons and state)
function resetActionSelections() {
    if (state.selectedPrimaryAction) {
        toggleSelectedClass(state.selectedPrimaryAction, false);
    }
    if (state.selectedSetPiece) {
        toggleSelectedClass(state.selectedSetPiece, false);
    }
    state.selectedSpecialActions.forEach(id => toggleSelectedClass(id, false));

    state.selectedPrimaryAction = null;
    state.selectedSetPiece = null;
    state.selectedSpecialActions = [];

    // Also deselect player
    if (state.selectedPlayerId) {
        const playerButtons = document.querySelectorAll('.team-section-container .player-button.selected');
        playerButtons.forEach(button => {
            button.classList.remove('selected');
        });
        state.selectedPlayerId = null;
    }
}

// --- End New Action Button Setup ---


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
    if (isOpposition) button.classList.add('opposition'); // Mark opposition visually if needed
    button.dataset.uniqueId = uniqueId;

    const textSpan = document.createElement('span');
    textSpan.classList.add('player-text');
    button.appendChild(textSpan);

    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎'; // Use an actual icon or text symbol
    editIcon.classList.add('edit-icon');
    editIcon.title = "Edit Player Details"; // Tooltip
    editIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent player selection when clicking icon
        showEditPopup(uniqueId);
    });

    button.appendChild(editIcon);
    updatePlayerButtonText(button); // Set initial text
    return button;
}

// Add a new player to a team
function addPlayer(team) {
    const uniqueId = generateUniqueId();
    const teamLetter = team === 'teamA' ? 'A' : 'B';
    const nextPlayerNum = state[team].length + 1;

    state[team].push(uniqueId);
    playerDetailsMap.set(uniqueId, {
        playerId: `${teamLetter}${nextPlayerNum}`, // Default PID like A1, A2, B1...
        manualId: 'N/A',
        jerseyId: 'N/A',
        playerName: "Player " + nextPlayerNum, // Default name
        team: team
    });

    const button = createPlayerButton(uniqueId, team === 'teamB'); // Pass opposition flag
    button.addEventListener('click', () => handlePlayerSelection(uniqueId));

    const container = team === 'teamA' ? teamAPlayerButtonsContainer : teamBPlayerButtonsContainer;
    container.appendChild(button);

    console.log(`Added player ${uniqueId} to ${team}. Current state:`, state);
    updateTeamPlayerCount(team);
}

// Remove the last added player from a team
function removePlayer(team) {
    if (state[team].length > 0) {
        const uniqueId = state[team].pop(); // Get the last player's ID
        const details = playerDetailsMap.get(uniqueId); // Get details for logging/alerting
        playerDetailsMap.delete(uniqueId); // Remove from map

        const container = team === 'teamA' ? teamAPlayerButtonsContainer : teamBPlayerButtonsContainer;
        const buttonToRemove = container.querySelector(`[data-unique-id="${uniqueId}"]`);
        if (buttonToRemove) {
            container.removeChild(buttonToRemove);
        } else {
             console.warn(`Could not find button for removed player ${uniqueId}`);
        }

        // If the removed player was selected, clear selection
        if (state.selectedPlayerId === uniqueId) {
            state.selectedPlayerId = null;
        }

        console.log(`Removed player ${details?.playerId || uniqueId} from ${team}.`);
        updateTeamPlayerCount(team);
    } else {
        console.log(`No players to remove from ${team}.`);
    }
}

// Update the displayed player count for a team
function updateTeamPlayerCount(team) {
    const countElement = team === 'teamA' ? teamAPlayerCount : teamBPlayerCount;
    countElement.textContent = state[team].length;
}

// Update button text based on current layout selection
function updatePlayerButtonText(button) {
    const uniqueId = button.dataset.uniqueId;
    const details = playerDetailsMap.get(uniqueId);
    const textSpan = button.querySelector('.player-text');

    if (textSpan && details) { // Ensure elements and data exist
        let displayText = details.playerId; // Default to PID
        switch (state.currentLayout) {
            case 'manual':
                displayText = details.manualId || 'N/A';
                break;
            case 'jersey':
                displayText = details.jerseyId || 'N/A';
                break;
            case 'name':
                displayText = details.playerName || 'N/A';
                break;
            // 'pid' case falls through to default
        }
        textSpan.textContent = displayText;
    } else if (!details) {
        console.warn(`Player details not found for button with uniqueId: ${uniqueId}`);
        if(textSpan) textSpan.textContent = "Error";
    }
}

// Handle player button clicks for selection
function handlePlayerSelection(uniqueId) {
    const allPlayerButtons = document.querySelectorAll('.team-section-container .player-button');
    const clickedButton = document.querySelector(`.player-button[data-unique-id="${uniqueId}"]`);

    if (!clickedButton) return;

    // Check if the clicked button is already selected
    const isAlreadySelected = clickedButton.classList.contains('selected');

    // First, remove 'selected' class from all buttons
    allPlayerButtons.forEach(button => {
        button.classList.remove('selected');
    });

    // If the clicked button was not already selected, select it
    if (!isAlreadySelected) {
        clickedButton.classList.add('selected');
        state.selectedPlayerId = uniqueId;
        console.log(`Player selected: ${uniqueId}`);
    } else {
        // If it was already selected, deselect it (already done by removing class from all)
        state.selectedPlayerId = null;
        console.log(`Player deselected: ${uniqueId}`);
    }
}


// Show popup to edit player details
function showEditPopup(uniqueId) {
    const details = playerDetailsMap.get(uniqueId);
    if (!details) {
        console.error("Cannot edit: Player details not found for uniqueId:", uniqueId);
        alert("Error: Player details not found.");
        return;
    }
    // Generate HTML content for the popup form
    const content = `
        <h2>Edit Player Details</h2>
        <div class="edit-form">
            <div class="form-group">
                <label for="editPlayerId">Player ID (PID):</label>
                <input type="text" id="editPlayerId" value="${details.playerId}" readonly>
            </div>
            <div class="form-group">
                <label for="editManualId">Manual ID:</label>
                <input type="text" id="editManualId" value="${details.manualId === 'N/A' ? '' : details.manualId}" placeholder="Enter Manual ID">
            </div>
            <div class="form-group">
                <label for="editJerseyId">Jersey ID:</label>
                <input type="text" id="editJerseyId" value="${details.jerseyId === 'N/A' ? '' : details.jerseyId}" placeholder="Enter Jersey Number">
            </div>
            <div class="form-group">
                <label for="editPlayerName">Player Name:</label>
                <input type="text" id="editPlayerName" value="${details.playerName === 'N/A' ? '' : details.playerName}" placeholder="Enter Player Name">
            </div>
            <button id="savePlayerDetailsBtn">Save Changes</button>
        </div>
    `;

    // Populate and display the player edit popup
    const popupContentDiv = playerEditPopup.querySelector('.popup-content');
    if (!popupContentDiv) {
       console.error("Player edit popup content area not found.");
       return;
    }
    popupContentDiv.innerHTML = content; // Inject the form
     // Add the close button back if it was overwritten
    if (!popupContentDiv.querySelector('.close')) {
        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close');
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => playerEditPopup.style.display = 'none';
        popupContentDiv.prepend(closeBtn); // Add close button at the top
    }


    playerEditPopup.dataset.uniqueId = uniqueId; // Store ID for saving
    playerEditPopup.style.display = 'flex'; // Show the popup

    // Add event listener for the save button within the popup
    const saveButton = popupContentDiv.querySelector('#savePlayerDetailsBtn');
     if (saveButton) {
        // Remove previous listener if any to avoid duplicates
        saveButton.replaceWith(saveButton.cloneNode(true));
        playerEditPopup.querySelector('#savePlayerDetailsBtn').addEventListener('click', () => {
            savePlayerDetails(uniqueId);
        });
    } else {
         console.error("Save button not found in player edit popup.");
    }
}

// Show popup to edit match details
function showEditMatchPopup() {
    const matchDetails = state.match;
    console.log("Editing Match Details:", matchDetails);

    const content = `
        <h2>Edit Match Details</h2>
        <div class="edit-form">
            <div class="form-group">
                <label for="matchId">Match ID:</label>
                <input type="text" id="matchId" value="${matchDetails.id || ''}" placeholder="e.g., YYYYMMDD_TeamAvsTeamB">
            </div>
            <div class="form-group">
                <label for="teamAName">Team A Name:</label>
                <input type="text" id="teamAName" value="${matchDetails.teamA || 'Team A'}" placeholder="Enter Team A name">
            </div>
            <div class="form-group">
                <label for="teamBName">Team B Name:</label>
                <input type="text" id="teamBName" value="${matchDetails.teamB || 'Team B'}" placeholder="Enter Team B name">
            </div>
            <div class="form-group">
                <label for="category">Age Category:</label>
                <input type="text" id="category" value="${matchDetails.category || ''}" placeholder="e.g., U18, Senior">
            </div>
            <button id="saveMatchDetailsBtn">Save Match Details</button>
        </div>
    `;

    // Use the general popup, configure content
    const popupContentDiv = playerEditPopup.querySelector('.popup-content'); // Reuse player edit popup structure
     if (!popupContentDiv) {
       console.error("Match edit popup content area not found.");
       return;
    }
    popupContentDiv.innerHTML = content;
     // Add the close button back if it was overwritten
    if (!popupContentDiv.querySelector('.close')) {
        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close');
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => playerEditPopup.style.display = 'none';
        popupContentDiv.prepend(closeBtn); // Add close button at the top
    }

    playerEditPopup.style.display = 'flex'; // Show the reused popup

    // Add event listener for the save button within the popup
     const saveButton = popupContentDiv.querySelector('#saveMatchDetailsBtn');
     if (saveButton) {
         // Remove previous listener to avoid duplicates
        saveButton.replaceWith(saveButton.cloneNode(true));
        playerEditPopup.querySelector('#saveMatchDetailsBtn').addEventListener('click', saveMatchDetails);
     } else {
         console.error("Save button not found in match edit popup.");
     }
}

// Save updated match details from the popup
function saveMatchDetails() {
    const id = document.getElementById('matchId')?.value.trim() || state.match.id; // Keep old if empty
    const teamA = document.getElementById('teamAName')?.value.trim() || 'Team A';
    const teamB = document.getElementById('teamBName')?.value.trim() || 'Team B';
    const category = document.getElementById('category')?.value.trim() || state.match.category;

    // Update the global state
    state.match = { id, teamA, teamB, category };

    // Update team name displays in the UI
    document.getElementById('team-a-name').innerText = teamA;
    document.getElementById('team-b-name').innerText = teamB;

    console.log("Match details updated:", state.match);

    // Close the popup
    playerEditPopup.style.display = 'none';
}


// Save updated player details from the popup
function savePlayerDetails(uniqueId) {
    // const uniqueId = playerEditPopup.dataset.uniqueId; // Get ID from popup data attribute
    const details = playerDetailsMap.get(uniqueId);

    if (!details) {
        console.error("Cannot save: Player details not found for uniqueId:", uniqueId);
        alert("Error saving: Player details not found.");
        playerEditPopup.style.display = 'none'; // Close popup even on error
        return;
    }

    // Get values from the popup form inputs
    const manualId = document.getElementById('editManualId')?.value.trim() || 'N/A';
    const jerseyId = document.getElementById('editJerseyId')?.value.trim() || 'N/A';
    const playerName = document.getElementById('editPlayerName')?.value.trim() || 'N/A';

    // Update the details in the map (keep existing playerId and team)
    playerDetailsMap.set(uniqueId, {
        ...details, // Spread existing details first
        manualId: manualId || 'N/A', // Ensure 'N/A' if empty
        jerseyId: jerseyId || 'N/A',
        playerName: playerName || 'N/A',
    });

    console.log(`Player details updated for ${uniqueId}:`, playerDetailsMap.get(uniqueId));

    // Update all buttons displaying this player's info
    document.querySelectorAll(`[data-unique-id="${uniqueId}"]`).forEach(button => {
        updatePlayerButtonText(button);
    });

    // Close the popup
    playerEditPopup.style.display = 'none';
}

// Update text on all player buttons (e.g., after layout change)
function updateAllPlayerButtons() {
    document.querySelectorAll('.player-button').forEach(updatePlayerButtonText);
}

// Log the currently selected action combination
function logNewAction() {
    if (!state.selectedPlayerId) {
        alert('Please select a player first.');
        return;
    }
    if (!state.selectedPrimaryAction && !state.selectedSetPiece && state.selectedSpecialActions.length === 0) {
         alert('Please select at least one action (Primary, Set Piece, or Special).');
         return;
    }


    const details = playerDetailsMap.get(state.selectedPlayerId);
    if (!details) {
         alert('Error: Selected player details not found.');
         console.error("Details missing for selected player:", state.selectedPlayerId);
         return;
    }

    // Get text labels from selected buttons (handle potential missing buttons)
    const primaryActionButton = state.selectedPrimaryAction ? document.getElementById(state.selectedPrimaryAction) : null;
    const actionText = primaryActionButton ? (primaryActionButton.textContent?.split(' (')[0].trim() || 'Unknown Action') : 'No Action';

    const setPieceButton = state.selectedSetPiece ? document.getElementById(state.selectedSetPiece) : null;
    const setPieceText = setPieceButton ? (setPieceButton.textContent?.split(' (')[0].trim() || 'Unknown Set Piece') : 'N/A';

    const specialTexts = state.selectedSpecialActions.length > 0
        ? state.selectedSpecialActions
            .map(id => document.getElementById(id)?.textContent?.split(' (')[0].trim() || '')
            .filter(text => text) // Remove empty strings if button not found
            .join(', ')
        : 'N/A';

    const timestamp = getVideoPlayerTimeStamp(); // Get current video time

    // Construct the log entry string
    const logEntry = `Set Piece: ${setPieceText} | ID: ${details.playerId} | Jersey: ${details.jerseyId} | Manual: ${details.manualId} | Name: ${details.playerName} | Action: ${actionText} | Special: ${specialTexts} | Timestamp: ${timestamp}`;

    actionLog.push(logEntry); // Add to internal log array
    gameLogTextBox.value += logEntry + '\n'; // Append to text area
    gameLogTextBox.scrollTop = gameLogTextBox.scrollHeight; // Scroll to bottom

    showGreenTick(logEntry); // Display confirmation message
    copyToClipboard(); // Copy logs to clipboard automatically
    resetActionSelections(); // Clear selected buttons and player for next action
}


// Get the display text for a player based on the current layout setting
function getPlayerDisplayText(uniqueId) {
    const details = playerDetailsMap.get(uniqueId);
    if (!details) return 'Unknown Player'; // Fallback

    switch (state.currentLayout) {
        case 'manual':
            return details.manualId || 'N/A';
        case 'jersey':
            return details.jerseyId || 'N/A';
        default: // 'pid' or any other case
            return details.playerId || 'N/A';
    }
}

// Undo the last logged action
function undoAction() {
    if (actionLog.length > 0) {
        const lastAction = actionLog.pop(); // Remove last entry from array

        // Update the text area by rebuilding its content from the modified array
        gameLogTextBox.value = actionLog.join('\n') + (actionLog.length > 0 ? '\n' : ''); // Add trailing newline if not empty

        alert(`Action removed:\n${lastAction}`); // Show what was undone
        copyToClipboard(); // Update clipboard content
    } else {
        alert("No actions in the log to undo.");
    }
}

// Copy current log and highlights content to the clipboard
function copyToClipboard() {
    const clipboardContent = `Game Log:\n${gameLogTextBox.value}\n--------\nGame Highlights:\n${gameHighlightsTextBox.value}`;

    navigator.clipboard.writeText(clipboardContent).then(() => {
        console.log('Log and Highlights copied to clipboard.');
    }).catch(err => {
        console.error('Failed to copy to clipboard: ', err);
        // Might fail in insecure contexts or if permissions denied
        // alert('Failed to copy to clipboard. Your browser might not support this feature or requires permissions.');
    });
}

// Create checkboxes for player selection in the highlights popup
function createPlayerCheckboxes() {
    const playerIds = [...state.teamA, ...state.teamB]; // Combine players from both teams
    if (playerIds.length === 0) {
        return "<p>No players added yet.</p>";
    }

    return playerIds.map(uniqueId => {
        const details = playerDetailsMap.get(uniqueId);
        if (!details) return ''; // Skip if details somehow missing
        const displayText = getPlayerDisplayText(uniqueId); // Get name/ID based on layout
        return `
            <div>
                <input type="checkbox" id="highlight_player_${uniqueId}" class="player-checkbox" data-unique-id="${uniqueId}">
                <label for="highlight_player_${uniqueId}">${displayText}</label>
            </div>
        `;
    }).join(''); // Join the HTML strings
}

// Start or stop recording a highlight clip
function startStopHighlights() {
    const button = document.getElementById('saveToHighlightsButton');
    const currentTime = getVideoPlayerTimeStamp();

    if (state.highlights.currentState === "START") {
        // Start recording
        state.highlights.start = currentTime;
        state.highlights.currentState = "STOP";
        button.innerText = "Stop Highlight (H)";
        button.style.backgroundColor = "#dc3545"; // Red color for stopping
        console.log("Highlight recording started at:", state.highlights.start);
    } else {
        // Stop recording
        state.highlights.stop = currentTime;
        state.highlights.currentState = "START";
        button.innerText = "Save Highlight (H)";
        button.style.backgroundColor = "#4CAF50"; // Back to green
        console.log("Highlight recording stopped at:", state.highlights.stop);

        // Pause video if possible
        if (videoPlayer && typeof videoPlayer.pauseVideo === 'function') {
            videoPlayer.pauseVideo();
        }
        showHighlightsPopup(); // Show popup to add details
    }
}

// Show the popup for adding highlight details
function showHighlightsPopup() {
    const content = `
        <div class="highlights-popup-content">
            <h2>Add Highlight Details</h2>
            <div class="highlights-form">
                <div class="form-group">
                    <label for="startTimestamp">Start Timestamp:</label>
                    <input type="text" id="startTimestamp" value="${state.highlights.start || ''}" placeholder="HH:MM:SS">
                </div>
                <div class="form-group">
                    <label for="endTimestamp">Stop Timestamp:</label>
                    <input type="text" id="endTimestamp" value="${state.highlights.stop || ''}" placeholder="HH:MM:SS">
                </div>
                <div class="form-group">
                    <label for="notes">Notes:</label>
                    <textarea id="notes" placeholder="Describe the highlight..."></textarea>
                </div>
                <div class="form-group">
                     <label>Players Involved (Optional):</label>
                     <div class="highlights-players">
                        ${createPlayerCheckboxes()}
                     </div>
                </div>
                <div class="popup-buttons">
                    <button id="cancelHighlights">Cancel</button>
                    <button id="saveHighlights">Save Highlight</button>
                </div>
            </div>
        </div>
    `;

    // Populate and display the general popup
    const popupContentDiv = popup.querySelector('.popup-content');
    if (!popupContentDiv) {
       console.error("Highlights popup content area not found.");
       return;
    }
    popupContentDiv.innerHTML = content;
    // Add the close button back if it was overwritten
    if (!popupContentDiv.querySelector('.close')) {
        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close');
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => {
            popup.style.display = 'none';
            resetHighlightState(); // Reset state if cancelled
        };
        popupContentDiv.prepend(closeBtn); // Add close button at the top
    }


    popup.style.display = 'flex'; // Show the popup

    // Add event listeners for buttons inside the popup
    const cancelButton = popupContentDiv.querySelector('#cancelHighlights');
    const saveButton = popupContentDiv.querySelector('#saveHighlights');

    if (cancelButton) {
        cancelButton.onclick = () => {
            popup.style.display = 'none';
            resetHighlightState();
        };
    }
    if (saveButton) {
        saveButton.onclick = () => {
            saveHighlightDetails();
            popup.style.display = 'none';
            resetHighlightState();
        };
    }
}
// Reset highlight start/stop times
function resetHighlightState() {
    state.highlights.start = "";
    state.highlights.stop = "";
    // Keep currentState as "START"
}


// Save the highlight details from the popup to the log
function saveHighlightDetails() {
    const startTimestamp = document.getElementById('startTimestamp')?.value.trim() || 'N/A';
    const endTimestamp = document.getElementById('endTimestamp')?.value.trim() || 'N/A';
    const notes = document.getElementById('notes')?.value.trim() || 'No notes.';
    const selectedPlayers = Array.from(document.querySelectorAll('.player-checkbox:checked'))
        .map(checkbox => {
            const uniqueId = checkbox.dataset.uniqueId;
            return getPlayerDisplayText(uniqueId); // Use consistent display text
        });

    const playersText = selectedPlayers.length > 0 ? selectedPlayers.join(', ') : 'None';

    // Construct the highlight entry string
    const highlightEntry = `Inpoint: ${startTimestamp}\nOutpoint: ${endTimestamp}\nNotes: ${notes}\nPlayers: ${playersText}`;

    // Append to the highlights text area
    gameHighlightsTextBox.value += (gameHighlightsTextBox.value ? '\n\n---\n\n' : '') + highlightEntry; // Add separator
    gameHighlightsTextBox.scrollTop = gameHighlightsTextBox.scrollHeight; // Scroll to bottom

    showGreenTick("Highlight Saved!"); // Confirmation
    copyToClipboard(); // Update clipboard
}


// Close popup handlers (for the close 'X' button)
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        // Find the closest parent popup and hide it
        const parentPopup = closeBtn.closest('.popup');
        if (parentPopup) {
            parentPopup.style.display = 'none';
            // If it was the highlights popup being closed, reset state
            if (parentPopup === popup) {
                resetHighlightState();
                // Ensure highlight button is reset if needed
                 const hButton = document.getElementById('saveToHighlightsButton');
                 if(state.highlights.currentState === 'STOP') { // If closed while "recording"
                     state.highlights.currentState = "START";
                     hButton.innerText = "Save Highlight (H)";
                     hButton.style.backgroundColor = "#4CAF50";
                 }
            }
        }
    });
});

// Close popups when clicking on the background overlay
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('popup')) {
        e.target.style.display = 'none';
         // If it was the highlights popup being closed, reset state
        if (e.target === popup) {
             resetHighlightState();
             // Ensure highlight button is reset if needed
             const hButton = document.getElementById('saveToHighlightsButton');
             if(state.highlights.currentState === 'STOP') { // If closed while "recording"
                 state.highlights.currentState = "START";
                 hButton.innerText = "Save Highlight (H)";
                 hButton.style.backgroundColor = "#4CAF50";
             }
        }
    }
});

// Get formatted timestamp from video player
function getVideoPlayerTimeStamp() {
    if (videoPlayer && typeof videoPlayer.getCurrentTime === 'function') {
        try {
            const currentTime = videoPlayer.getCurrentTime();
            if (typeof currentTime === 'number' && !isNaN(currentTime)) {
                const hours = Math.floor(currentTime / 3600);
                const minutes = Math.floor((currentTime % 3600) / 60);
                const secs = Math.floor(currentTime % 60);
                // Format to HH:MM:SS
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            } else {
                console.warn("getCurrentTime() did not return a valid number.");
                return '00:00:00';
            }
        } catch (error) {
             console.error("Error getting video player time:", error);
             return '00:00:00';
        }
    } else {
        // console.warn("Video player not ready or available.");
        return '00:00:00'; // Return default if player not ready
    }
}

// --- Statistics Calculation (Based on OLD Format) ---
// !!! IMPORTANT: This section needs a complete rewrite to parse the NEW log format.
// The current implementation only works with the old "Action - PlayerInfo - Timestamp" format.

function calculateStats() {
    console.warn("--- Calculating Stats based on OLD Log Format ---");
    alert("Warning: Statistics calculation is based on the old log format and may be inaccurate or incomplete. The parser needs to be updated for the new log structure.");

    const stats = {}; // Player stats accumulator

    // 1. Parse Game Log (OLD FORMAT)
    if (gameLogTextBox.value.trim() !== '') {
        // Split into lines and filter out empty ones
        actionLog = gameLogTextBox.value.split('\n').filter(line => line.trim() !== '');
    } else {
        actionLog = []; // Ensure it's an empty array if log is empty
    }

    actionLog.forEach((entry, index) => {
        // Try to parse OLD format: "Action - PlayerID : ManualID : JerseyID : Name : UniqueID - Timestamp"
        const oldFormatMatch = entry.match(/^([^-]+)\s+-\s+([^:]+)\s+:\s+([^:]+)\s+:\s+([^:]+)\s+:\s+([^:]+)\s+:\s+([^ -]+)\s+-\s+(\d{2}:\d{2}:\d{2})$/);

        if (oldFormatMatch) {
            // console.log(`Parsing OLD format entry ${index + 1}`);
            const [ , action, playerId, manualId, jerseyId, playerName, uniqueId, timestamp] = oldFormatMatch;

            const playerKey = uniqueId.trim(); // Use uniqueId as the key

            // Initialize stats object for the player if it doesn't exist
            if (!stats[playerKey]) {
                 const playerDetails = playerDetailsMap.get(playerKey); // Get full details
                 if (!playerDetails) {
                      console.warn(`Skipping stats for entry ${index+1}: Player details not found for uniqueId ${playerKey}`);
                      return; // Skip if we don't have details for this player
                 }
                 stats[playerKey] = {
                    playerName: playerDetails.playerName,
                    playerId: playerDetails.playerId,
                    manualId: playerDetails.manualId,
                    jerseyId: playerDetails.jerseyId,
                    team: playerDetails.team === 'teamA' ? state.match.teamA : state.match.teamB, // Use current team name
                    ageCategory: state.match.category,
                    // Initialize all countable stats to 0
                    goals: 0, assists: 0, completePasses: 0, incompletePasses: 0,
                    totalShots: 0, shotsOnTarget: 0, tackles: 0, interceptions: 0,
                    saves: 0, ownGoals: 0
                };
            }

            // Increment stats based on the action (OLD ACTION NAMES)
            switch (action.trim()) {
                case 'Goal': stats[playerKey].goals++; break;
                case 'OwnGoal': stats[playerKey].ownGoals++; break;
                case 'Assist': stats[playerKey].assists++; break;
                case 'CompletePass': stats[playerKey].completePasses++; break;
                case 'IncompletePass': stats[playerKey].incompletePasses++; break;
                case 'ShotOnTarget':
                    stats[playerKey].shotsOnTarget++;
                    stats[playerKey].totalShots++;
                    break;
                case 'ShotOffTarget':
                    stats[playerKey].totalShots++;
                    break;
                case 'Tackle': stats[playerKey].tackles++; break;
                case 'Interception': stats[playerKey].interceptions++; break;
                case 'Save': stats[playerKey].saves++; break;
                // Add more cases here if there were other old actions
                default:
                    // console.log(`Ignoring unknown action in old format log entry ${index + 1}: ${action.trim()}`);
                    break;
            }
        } else {
             console.warn(`Skipping log entry ${index + 1}: Does not match expected OLD format.`);
             // Here, you would ideally add parsing logic for the NEW format
             // e.g., const newFormatMatch = entry.match(/Set Piece: (.*?) \| ID: (.*?) \| ... /);
             // and update stats accordingly based on `Action: ...` part.
        }
    });


    // 2. Parse Highlights Log (Separate from action stats)
    if (gameHighlightsTextBox.value.trim() !== '') {
        allHighlightsLog = gameHighlightsTextBox.value.split('\n').filter(line => line.trim() !== '');
        // Extract just Inpoint/Outpoint for potential future use (not used in current stats table)
        highlightsLog = allHighlightsLog.filter(line => line.startsWith('Inpoint:') || line.startsWith('Outpoint:'));
    } else {
        highlightsLog = [];
        allHighlightsLog = [];
    }


    // 3. Generate Stats Tables (Based on OLD format parsed data)
    const matchStatsTableHTML = generateMatchStatsTable(stats); // Calculate team stats
    const playerStatsTableHTML = generatePlayerStatsTable(stats); // Create player table HTML

    // 4. Display in Popup
    displayStatsPopup(playerStatsTableHTML, matchStatsTableHTML);
}

// Generates HTML for the player statistics table
function generatePlayerStatsTable(stats) {
    let tableBodyHTML = '';

    Object.values(stats).forEach(player => {
        // Calculate passing accuracy safely
        const totalPasses = player.completePasses + player.incompletePasses;
        const passingAccuracy = totalPasses > 0
            ? `${((player.completePasses / totalPasses) * 100).toFixed(1)}%` // Use 1 decimal place
            : 'N/A';

        tableBodyHTML += `
            <tr>
                <td>${player.playerId || 'N/A'}</td>
                <td>${player.playerName || 'N/A'}</td>
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

    return `
        <p style="color: red; font-weight: bold;">WARNING: Player Statistics below are based ONLY on the OLD log format parser and may be inaccurate or incomplete.</p>
        <table>
            <thead>
                <tr>
                    <th>PID</th>
                    <th>Name</th>
                    <th>Manual ID</th>
                    <th>Jersey</th>
                    <th>Team</th>
                    <th>Category</th>
                    <th>Goals</th>
                    <th>Own Goals</th>
                    <th>Assists</th>
                    <th>Pass OK</th>
                    <th>Pass NOK</th>
                    <th>Pass Acc %</th>
                    <th>Shots</th>
                    <th>Shots OT</th>
                    <th>Tackles</th>
                    <th>Intercepts</th>
                    <th>Saves</th>
                </tr>
            </thead>
            <tbody>
                ${tableBodyHTML || '<tr><td colspan="17">No statistics calculated (check log format).</td></tr>'}
            </tbody>
        </table>
    `;
}


// Calculates aggregated team stats from player stats
function calculateMatchStats(playerStats) {
     // !!! WARNING: Based on stats derived from the OLD log format parser.
    console.warn("calculateMatchStats is based on stats derived from the OLD log format.");

    const teamAName = state.match.teamA || 'Team A';
    const teamBName = state.match.teamB || 'Team B';

    // Initialize stats objects for both teams, ensuring all keys exist
    const initTeamStats = () => ({
        goals: 0, ownGoals: 0, possession: 0, completePasses: 0, incompletePasses: 0,
        passingAccuracySum: 0, playersWithPasses: 0, totalShots: 0, shotsOnTarget: 0,
        tackles: 0, interceptions: 0, saves: 0, averagePassingAccuracy: 'N/A'
    });

    let teamStats = {
        [teamAName]: initTeamStats(),
        [teamBName]: initTeamStats()
    };

    // Aggregate player stats into teams
    for (const playerKey in playerStats) {
        const player = playerStats[playerKey];
        const teamName = player.team; // Should be the actual team name (Team A or Team B)

        // Ensure the player's team exists in our stats object
        if (!teamStats[teamName]) {
            console.warn(`Player ${player.playerId} has unknown team ${teamName}, skipping for match stats.`);
            continue; // Skip players with teams not matching current match setup
        }

        // Aggregate countable stats
        teamStats[teamName].goals += player.goals || 0;
        teamStats[teamName].ownGoals += player.ownGoals || 0;
        teamStats[teamName].completePasses += player.completePasses || 0;
        teamStats[teamName].incompletePasses += player.incompletePasses || 0;
        teamStats[teamName].totalShots += player.totalShots || 0;
        teamStats[teamName].shotsOnTarget += player.shotsOnTarget || 0;
        teamStats[teamName].tackles += player.tackles || 0;
        teamStats[teamName].interceptions += player.interceptions || 0;
        teamStats[teamName].saves += player.saves || 0;

        // Sum accuracy for averaging later
        const totalPasses = player.completePasses + player.incompletePasses;
        if (totalPasses > 0) {
            const accuracy = (player.completePasses / totalPasses) * 100;
            teamStats[teamName].passingAccuracySum += accuracy;
            teamStats[teamName].playersWithPasses += 1;
        }
    }

    // Adjust goals for own goals (Team A own goal adds to Team B goals, etc.)
    teamStats[teamBName].goals += teamStats[teamAName].ownGoals;
    teamStats[teamAName].goals += teamStats[teamBName].ownGoals;

    // Calculate total passes across both teams for possession
    const totalCompletePasses = teamStats[teamAName].completePasses + teamStats[teamBName].completePasses;
    const totalIncompletePasses = teamStats[teamAName].incompletePasses + teamStats[teamBName].incompletePasses;
    const overallTotalPasses = totalCompletePasses + totalIncompletePasses;

    // Calculate final possession and average accuracy for each team
    for (const teamName of [teamAName, teamBName]) {
        // Possession
        const teamTotalPasses = teamStats[teamName].completePasses + teamStats[teamName].incompletePasses;
        teamStats[teamName].possession = overallTotalPasses > 0
            ? ((teamTotalPasses / overallTotalPasses) * 100).toFixed(1) // 1 decimal place
            : '0.0';

        // Average Passing Accuracy
        if (teamStats[teamName].playersWithPasses > 0) {
            teamStats[teamName].averagePassingAccuracy =
                `${(teamStats[teamName].passingAccuracySum / teamStats[teamName].playersWithPasses).toFixed(1)}%`; // 1 decimal place
        } else {
            teamStats[teamName].averagePassingAccuracy = 'N/A';
        }

        // Clean up temporary calculation fields
        delete teamStats[teamName].passingAccuracySum;
        delete teamStats[teamName].playersWithPasses;
    }

    return teamStats; // Return stats for both teams
}

// Generates HTML for the match statistics table
function generateMatchStatsTable(playerStats) {
    // !!! WARNING: Based on stats derived from the OLD log format parser.
    const teamStats = calculateMatchStats(playerStats); // Get calculated team stats
    const teamA = state.match.teamA || "Team A";
    const teamB = state.match.teamB || "Team B";

    // Get stats, providing defaults if a team had no actions logged
    const teamAStats = teamStats[teamA] || { goals: 0, possession: '0.0', averagePassingAccuracy: 'N/A', totalShots: 0, shotsOnTarget: 0, tackles: 0, interceptions: 0, saves: 0 };
    const teamBStats = teamStats[teamB] || { goals: 0, possession: '0.0', averagePassingAccuracy: 'N/A', totalShots: 0, shotsOnTarget: 0, tackles: 0, interceptions: 0, saves: 0 };


    return `
        <p style="color: red; font-weight: bold;">WARNING: Match Statistics below are based ONLY on the OLD log format parser and may be inaccurate or incomplete.</p>
        <table>
            <thead>
                <tr>
                    <th>Match Stats</th>
                    <th>${teamA}</th>
                    <th>${teamB}</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Goals</td> <td>${teamAStats.goals}</td> <td>${teamBStats.goals}</td> </tr>
                <tr><td>Possession %</td> <td>${teamAStats.possession}%</td> <td>${teamBStats.possession}%</td> </tr>
                <tr><td>Avg. Pass Acc %</td> <td>${teamAStats.averagePassingAccuracy}</td> <td>${teamBStats.averagePassingAccuracy}</td> </tr>
                <tr><td>Total Shots</td> <td>${teamAStats.totalShots}</td> <td>${teamBStats.totalShots}</td> </tr>
                <tr><td>Shots on Target</td> <td>${teamAStats.shotsOnTarget}</td> <td>${teamBStats.shotsOnTarget}</td> </tr>
                <tr><td>Tackles</td> <td>${teamAStats.tackles}</td> <td>${teamBStats.tackles}</td> </tr>
                <tr><td>Interceptions</td> <td>${teamAStats.interceptions}</td> <td>${teamBStats.interceptions}</td> </tr>
                <tr><td>Saves</td> <td>${teamAStats.saves}</td> <td>${teamBStats.saves}</td> </tr>
                <!-- Add Own Goals display if desired -->
                <tr><td>Own Goals Against</td> <td>${teamBStats.ownGoals || 0}</td> <td>${teamAStats.ownGoals || 0}</td> </tr>
            </tbody>
        </table>
    `;
}


// Displays the statistics popup with generated table HTML
function displayStatsPopup(playerStatsTableHTML, matchStatsTableHTML) {
    // Create the popup container if it doesn't exist, otherwise clear it
    let statsPopup = document.getElementById('statsPopupContainer');
    if (!statsPopup) {
        statsPopup = document.createElement('div');
        statsPopup.id = 'statsPopupContainer';
        statsPopup.classList.add('stats-popup', 'full-screen'); // Use existing classes
        document.body.appendChild(statsPopup);
    }

    // Set the inner HTML
    statsPopup.innerHTML = `
        <div class="stats-popup-content">
            <div class="stats-popup-header">
                <h2>Statistics (Old Format Parser)</h2>
                <a href="#" class="download-button" id="downloadStatsZipBtn">Download Zip</a>
                <span class="close-button" id="closeStatsPopupBtn">×</span>
            </div>
            <div class="stats-container" id="playerStatsContainer">
                ${playerStatsTableHTML}
            </div>
            <hr>
            <div class="stats-container" id="matchStatsContainer">
                ${matchStatsTableHTML}
            </div>
        </div>
    `;

    // Add event listeners for close and download buttons
    document.getElementById('closeStatsPopupBtn').addEventListener('click', () => {
        statsPopup.remove(); // Remove the popup from the DOM
    });
    document.getElementById('downloadStatsZipBtn').addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        exportTablesToZip();
    });

     // Optional: Close popup when clicking outside the content area
    statsPopup.addEventListener('click', (e) => {
        if (e.target === statsPopup) { // Clicked on the background overlay
            statsPopup.remove();
        }
    });

    // Make the popup visible
    statsPopup.style.display = 'flex';
}


// Show a temporary confirmation message (green tick style)
function showGreenTick(message) {
    const tick = document.createElement('div');
    // Show only first part of log entry for brevity, or the provided message
    const shortLog = message.length > 100 ? message.split('|').slice(0, 3).join('|') + '...' : message;
    tick.innerHTML = shortLog + " Logged!";
    tick.className = 'green-tick'; // Apply CSS class for styling

    document.body.appendChild(tick);

    // Remove the tick after a short delay (e.g., 1.5 seconds)
    setTimeout(() => {
      if (document.body.contains(tick)) { // Check if it hasn't been removed already
         document.body.removeChild(tick);
      }
    }, 1500); // 1.5 seconds duration
}


// --- YouTube Player Integration ---

// Update the YouTube video player source
function updateYouTubeVideo() {
    const youtubeVideoId = youtubeVideoIdInput.value.trim();
    if (youtubeVideoId && videoPlayer && typeof videoPlayer.loadVideoById === 'function') {
        console.log(`Loading YouTube video: ${youtubeVideoId}`);
        videoPlayer.loadVideoById(youtubeVideoId);
        // Optionally clear logs or reset state when a new video is loaded
        // gameLogTextBox.value = "";
        // actionLog = [];
        // resetActionSelections();
    } else if (!youtubeVideoId) {
         alert('Please enter a YouTube Video ID.');
    } else {
        alert('YouTube player is not ready yet. Please wait a moment.');
        console.error('Attempted to load video, but player object is not ready or loadVideoById is unavailable.');
    }
}

// Keyboard shortcuts listener
document.addEventListener('keydown', (event) => {
    // Ignore keypresses if user is typing in an input or textarea
    const isInputActive = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA';
    if (isInputActive) {
        return;
    }

    // --- Add New Keyboard Shortcuts Here (Optional) ---
    // Example: if (event.key === 'p') { handlePrimaryActionSelect('passBtn'); }
    //          if (event.key === 'l') { logNewAction(); }

    // --- Existing Shortcuts ---
    if (event.key.toUpperCase() === 'H') { // Toggle Highlight Start/Stop
        event.preventDefault(); // Prevent browser's history action
        startStopHighlights();
    } else if (event.code === 'Space' || event.key === ' ') { // Play/Pause Video
        event.preventDefault(); // Prevent page scrolling
        toggleVideoPlayback();
    } else if (event.key === 'ArrowRight') { // Seek Forward
        event.preventDefault();
        seekVideo(3); // Seek forward 3 seconds
    } else if (event.key === 'ArrowLeft') { // Seek Backward
        event.preventDefault();
        seekVideo(-3); // Seek backward 3 seconds
    } else if (event.key.toUpperCase() === 'S') { // Log Action Hotkey
        event.preventDefault(); // Prevent typing 's' if accidentally focused elsewhere
        console.log("Log Action hotkey ('S') pressed.");
        // Find the button and click it
        const logButton = document.getElementById('logActionButton');
        if (logButton) {
            logButton.click(); // Programmatically click the button
        } else {
            console.error("Log Action button not found for hotkey.");
        }
    }
});

// Toggle video playback state (Play/Pause)
function toggleVideoPlayback() {
    if (videoPlayer && typeof videoPlayer.getPlayerState === 'function') {
        const currentState = videoPlayer.getPlayerState();
        if (currentState === YT.PlayerState.PLAYING) {
            videoPlayer.pauseVideo();
            console.log("Video Paused");
        } else if (currentState === YT.PlayerState.PAUSED || currentState === YT.PlayerState.ENDED || currentState === YT.PlayerState.CUED) {
            videoPlayer.playVideo();
            console.log("Video Playing");
        }
        // Ignore buffering, unstarted states
    } else {
        console.warn("Cannot toggle playback: Video player not ready.");
    }
}

// Seek video by a relative amount of seconds
function seekVideo(seconds) {
     if (videoPlayer && typeof videoPlayer.getCurrentTime === 'function' && typeof videoPlayer.seekTo === 'function') {
        const currentTime = videoPlayer.getCurrentTime();
        const newTime = Math.max(0, currentTime + seconds); // Ensure time doesn't go below 0
        videoPlayer.seekTo(newTime, true); // Seek to new time, allow seeking ahead
        console.log(`Video seeked by ${seconds}s to ${getVideoPlayerTimeStamp()}`);
    } else {
        console.warn("Cannot seek: Video player not ready.");
    }
}


// This function is called automatically when the YouTube IFrame Player API code downloads.
function onYouTubeIframeAPIReady() {
    console.log("YouTube IFrame API Ready. Initializing player...");
    try {
        videoPlayer = new YT.Player('matchVideoPlayer', {
            width: '100%',  // Take full width of its container
            height: '100%', // Take full height of its container
            videoId: '',    // Start with no video loaded
            playerVars: {
                'autoplay': 0, // Don't autoplay initially
                'controls': 1, // Show default YouTube controls
                'rel': 0, // Don't show related videos at the end
                'showinfo': 0, // Hide video title/uploader (deprecated but good practice)
                'modestbranding': 1 // Reduce YouTube logo visibility
            },
            events: {
                'onReady': onVideoPlayerReady,
                'onStateChange': onVideoPlayerStateChange, // Add state change listener
                'onError': onVideoPlayerError // Add error listener
            }
        });
    } catch (error) {
        console.error("Error initializing YouTube player:", error);
        alert("Failed to initialize YouTube player. Check console for errors.");
    }
}

// Called when the player is ready to start receiving API calls.
function onVideoPlayerReady(event) {
    console.log("YouTube Player Instance Ready (onReady event).");
    // You could load a default video ID here if desired:
    // const defaultVideoId = "your_default_video_id_here";
    // updateYoutubeVideoButton.value = defaultVideoId; // Set input value too
    // event.target.loadVideoById(defaultVideoId);
}

// Called when the player's state changes (playing, paused, buffering, etc.)
function onVideoPlayerStateChange(event) {
    let stateName = "Unknown";
    switch (event.data) {
        case YT.PlayerState.UNSTARTED: stateName = 'Unstarted'; break;
        case YT.PlayerState.ENDED: stateName = 'Ended'; break;
        case YT.PlayerState.PLAYING: stateName = 'Playing'; break;
        case YT.PlayerState.PAUSED: stateName = 'Paused'; break;
        case YT.PlayerState.BUFFERING: stateName = 'Buffering'; break;
        case YT.PlayerState.CUED: stateName = 'Cued'; break;
    }
     console.log(`Player state changed: ${stateName} (${event.data})`);
}

// Called if an error occurs in the player.
function onVideoPlayerError(event) {
    console.error("YouTube Player Error:", event.data);
    let errorMessage = `An error occurred with the YouTube player (Code: ${event.data}).`;
    // Provide more specific messages for common errors
    switch (event.data) {
        case 2: errorMessage += " The video ID might be invalid."; break;
        case 5: errorMessage += " Error related to HTML5 playback."; break;
        case 100: errorMessage += " Video not found or removed."; break;
        case 101:
        case 150: errorMessage += " Playback disallowed by video owner."; break;
    }
    alert(errorMessage + " Please check the video ID and try again.");
}


// --- Data Export ---

// Export stats tables and logs to a ZIP file
function exportTablesToZip() {
    console.log("Initiating ZIP export...");

    // Get the HTML content of the stats tables from the popup
    const playerStatsContainer = document.getElementById('playerStatsContainer');
    const matchStatsContainer = document.getElementById('matchStatsContainer');

    if (!playerStatsContainer || !matchStatsContainer) {
        console.error("Stats containers not found in the popup.");
        alert("Error: Could not find statistics tables to export.");
        return;
    }

    const playerTableHTML = playerStatsContainer.querySelector('table')?.outerHTML;
    const matchTableHTML = matchStatsContainer.querySelector('table')?.outerHTML;

    if (!playerTableHTML || !matchTableHTML) {
        console.error("Stats tables not found within containers.");
        alert("Error: Could not find statistics tables content.");
        return;
    }

    // 1. Create Excel Data
    let wb; // Workbook
    try {
        const playerStatsArray = parseHTMLTableToArray(playerTableHTML);
        const matchStatsArray = parseHTMLTableToArray(matchTableHTML);

        wb = XLSX.utils.book_new();
        const playerStatsSheet = XLSX.utils.aoa_to_sheet(playerStatsArray);
        const matchStatsSheet = XLSX.utils.aoa_to_sheet(matchStatsArray);

        // Add sheets to the workbook with descriptive names
        XLSX.utils.book_append_sheet(wb, playerStatsSheet, "Player Stats (Old Format)");
        XLSX.utils.book_append_sheet(wb, matchStatsSheet, "Match Stats (Old Format)");

    } catch (error) {
         console.error("Error creating Excel data:", error);
         alert("Error preparing Excel file. Check console for details.");
         return;
    }


    // 2. Prepare Log Data
    // Use the current content of the text areas
    const gameLogContent = gameLogTextBox.value;
    const highlightsContent = gameHighlightsTextBox.value;
    const combinedLogContent = `Game Log:\n${gameLogContent}\n\n--------\n\nGame Highlights:\n${highlightsContent}`;

    // 3. Create ZIP File
    const zip = new JSZip();

    // Sanitize file names (replace non-alphanumeric chars with underscore)
    const safeTeamA = (state.match.teamA || 'TeamA').replace(/[^a-z0-9]/gi, '_');
    const safeTeamB = (state.match.teamB || 'TeamB').replace(/[^a-z0-9]/gi, '_');
    const safeMatchId = (state.match.id || 'Match').replace(/[^a-z0-9]/gi, '_');
    const baseFileName = `${safeMatchId}_${safeTeamA}_vs_${safeTeamB}`;

    // Add Excel file to ZIP
    try {
        const excelData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        zip.file(`${baseFileName}_Stats.xlsx`, excelData);
    } catch (error) {
        console.error("Error writing Excel file to ZIP:", error);
        alert("Error adding Excel file to ZIP. Check console.");
        // Continue to try zipping logs even if Excel fails
    }

    // Add log files to ZIP
    zip.file(`${baseFileName}_GameLog.txt`, gameLogContent);
    zip.file(`${baseFileName}_Highlights.txt`, highlightsContent);
    zip.file(`${baseFileName}_CombinedLogs.txt`, combinedLogContent); // Optional combined log

    // 4. Generate and Download ZIP
    zip.generateAsync({ type: "blob" })
        .then(function (content) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = `${baseFileName}_Export.zip`;
            document.body.appendChild(a); // Append link to body for Firefox compatibility
            a.click();
            document.body.removeChild(a); // Clean up link
            URL.revokeObjectURL(a.href); // Release object URL
            console.log("ZIP file generated and download initiated.");
        })
        .catch(function (err) {
            console.error("Error generating ZIP file:", err);
            alert("Error generating ZIP file. See console for details.");
        });
}


// Helper function to parse an HTML table string into a 2D array for Excel export
function parseHTMLTableToArray(htmlTableString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlTableString, 'text/html');
    const tableElement = doc.querySelector('table');
    if (!tableElement) return []; // Return empty if no table found

    const data = [];
    // Parse header (thead)
    const headers = Array.from(tableElement.querySelectorAll('thead th'))
                         .map(th => th.textContent?.trim() || '');
    if (headers.length > 0) data.push(headers);

    // Parse body (tbody)
    const rows = Array.from(tableElement.querySelectorAll('tbody tr'));
    rows.forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td'))
                             .map(td => td.textContent?.trim() || '');
        if (rowData.length > 0) data.push(rowData); // Only add non-empty rows
    });

    return data;
}

// --- Initialization ---
// Update team names on initial load based on default state
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('team-a-name').innerText = state.match.teamA;
    document.getElementById('team-b-name').innerText = state.match.teamB;
    console.log("DOM Loaded. Initial state:", state);
     // If you want to start with some players by default, call addPlayer here:
     // addPlayer('teamA');
     // addPlayer('teamB');
});