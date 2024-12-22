// Global state
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

// Player details storage
const playerDetailsMap = new Map();
export { state, playerDetailsMap };
