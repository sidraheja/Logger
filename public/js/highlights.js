import { state } from './state.js';
import { getVideoPlayerTimeStamp } from './videoManager.js';

export function startStopHighlights() {
    const button = document.getElementById('saveToHighlightsButton');
    if (state.highlights.currentState === "START") {
        state.highlights.start = getVideoPlayerTimeStamp();
        state.highlights.currentState = "STOP";
        button.innerText = "Stop Highlight (H)";
    } else {
        state.highlights.stop = getVideoPlayerTimeStamp();
        state.highlights.currentState = "START";
        button.innerText = "Save Highlight (H)";
        showHighlightsPopup();
    }
}

function showHighlightsPopup() {
    // Show highlights popup logic
}
