import { playerDetailsMap, state } from './state.js';
import { generateMatchStatsTable } from './utils.js';

export function calculateStats() {
    const stats = {};
    const actionLog = state.gameLog;

    actionLog.forEach(entry => {
        const [action, playerInfo] = entry.split(' - ');
        const [playerId, manualId, jerseyId, playerName, uniqueId] = playerInfo.split(' : ');
        const playerKey = uniqueId;
        const player = playerDetailsMap.get(uniqueId);

        if (!stats[playerKey]) {
            stats[playerKey] = {
                ...player,
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

        switch (action) {
            case 'Goal': stats[playerKey].goals++; break;
            case 'Assist': stats[playerKey].assists++; break;
            // Add other cases
        }
    });

    const statsTable = generateMatchStatsTable(stats);
    document.body.innerHTML += statsTable;
}
