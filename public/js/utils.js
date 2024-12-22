export function updatePlayerButtonText(button) {
    const uniqueId = button.dataset.uniqueId;
    const playerDetails = playerDetailsMap.get(uniqueId);
    button.querySelector('.player-text').textContent = playerDetails.playerId;
}

export function updateTeamPlayerCount(team) {
    document.getElementById(`${team}PlayerCount`).textContent = state[team].length;
}

export function generateMatchStatsTable(stats) {
    // Generate and return an HTML string for the stats table
}
