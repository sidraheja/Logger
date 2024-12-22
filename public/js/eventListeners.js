import { addPlayer, removePlayer } from './playerManager.js';
import { calculateStats } from './statsManager.js';
import { startStopHighlights } from './highlights.js';

export function setupEventListeners() {
    document.getElementById('addTeamAPlayer').addEventListener('click', () => addPlayer('teamA'));
    document.getElementById('removeTeamAPlayer').addEventListener('click', () => removePlayer('teamA'));
    document.getElementById('calculateStats').addEventListener('click', calculateStats);
    document.getElementById('saveToHighlightsButton').addEventListener('click', startStopHighlights);
}
