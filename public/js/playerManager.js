import { state, playerDetailsMap } from './state.js';
import { updatePlayerButtonText, updateTeamPlayerCount } from './utils.js';

export function addPlayer(team) {
    const uniqueId = `player_${state.nextUniqueId++}`;
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

    document.getElementById(`${team}PlayerButtonsContainer`).appendChild(button);
    updateTeamPlayerCount(team);
}

export function removePlayer(team) {
    if (state[team].length > 0) {
        const uniqueId = state[team].pop();
        playerDetailsMap.delete(uniqueId);

        const container = document.getElementById(`${team}PlayerButtonsContainer`);
        const button = container.querySelector(`[data-unique-id="${uniqueId}"]`);
        container.removeChild(button);
        updateTeamPlayerCount(team);
    }
}

// Helper to create player button
function createPlayerButton(uniqueId, isOpposition) {
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
