let videoPlayer;

export function initializeVideoPlayer() {
    videoPlayer = new YT.Player('matchVideoPlayer', {
        width: '100%',
        height: '700',
        videoId: '',
        playerVars: { autoplay: 1, controls: 1 },
    });
}

export function getVideoPlayerTimeStamp() {
    const currentTime = videoPlayer.getCurrentTime();
    return new Date(currentTime * 1000).toISOString().substr(11, 8); // HH:MM:SS
}
