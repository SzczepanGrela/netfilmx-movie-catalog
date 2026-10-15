const player = document.getElementById('main-video-player');
if (player) {
    player.addEventListener('provider-change', event => {
        if (event.detail?.type === 'hls') event.detail.library = '/lib/hls.js/dist/hls.min.js';
    });
    const status = document.getElementById('subtitle-status');
    const observed = new WeakSet();
    const failed = new WeakSet();
    customElements.whenDefined('media-player').then(() => {
        const update = () => {
            const selected = player.textTracks.selected;
            if (status) status.hidden = !selected || (selected.readyState !== 3 && !failed.has(selected));
        };
        const observe = () => {
            for (const track of player.textTracks.toArray()) {
                if (observed.has(track)) continue;
                observed.add(track);
                track.addEventListener('error', () => { failed.add(track); update(); });
                track.addEventListener('load', () => {
                    // Required generated sidecars always contain cues. Some
                    // provider responses parse as an empty track without an error event.
                    if (track.cues.length === 0) failed.add(track);
                    else failed.delete(track);
                    update();
                });
                if (track.readyState === 2 && track.cues.length === 0) failed.add(track);
            }
            update();
        };
        player.addEventListener('text-tracks-change', observe);
        player.addEventListener('text-track-change', update);
        player.textTracks.addEventListener('mode-change', update);
        observe();
    });
}
