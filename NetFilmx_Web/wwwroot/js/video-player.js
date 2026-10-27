const player = document.getElementById('main-video-player');
if (player) {
    player.addEventListener('provider-change', event => {
        if (event.detail?.type === 'hls') {
            event.detail.library = '/lib/hls.js/dist/hls.min.js';
            // Bound VOD prefetch and retained history instead of buffering an
            // entire short film before the first quality change/seek.
            event.detail.config = {...event.detail.config,
                maxBufferLength: 30, maxMaxBufferLength: 30, backBufferLength: 30,
                manifestLoadingMaxRetry: 0, levelLoadingMaxRetry: 0, fragLoadingMaxRetry: 0};
        }
    });
    const status = document.getElementById('subtitle-status');
    const observed = new WeakSet();
    const failed = new WeakSet();
    customElements.whenDefined('media-player').then(() => {
        // Keep the playing fragment while changing HLS quality. Flushing the
        // whole buffer can race a seek and end Chromium playback prematurely.
        player.qualities.switch = 'next';
        const update = () => {
            const selected = player.textTracks.selected;
            // Off is an explicit choice. A pending provider track-selection
            // debounce must not re-enable the previously preferred language.
            if (!selected) player.textTracks.preferredLang = '';
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

// Playback URLs stay in memory only. No localStorage, catalogue mutation or public fallback.
const gate = document.getElementById('playback-gate');
if (gate && player) {
    const panel = document.getElementById('playback-verification');
    const button = document.getElementById('playback-start');
    const message = document.getElementById('playback-status');
    let activeAttempt, busy = false, expiry = 0, timer;
    let resume = {time: 0, height: null, auto: true, language: null, paused: false};
    const text = (key, fallback) => { const value = window.NetFilmxI18n?.t?.(key); return value && value !== key ? value : fallback; };
    function show(stage, key, fallback) {
        gate.dataset.stage = stage;
        panel.style.display = 'flex';
        message.setAttribute('role', stage === 'error' ? 'alert' : 'status');
        message.dataset.i18n = key;
        message.textContent = text(key, fallback);
        button.disabled = busy;
    }
    function remember() {
        resume = {time: player.currentTime || 0, height: player.qualities?.selected?.height,
            auto: player.qualities?.auto !== false, language: player.textTracks?.selected?.language || null,
            paused: player.paused};
    }
    function stop(key = 't_playback_retry', fallback = 'Playback stopped. Verify again to resume from this position.') {
        if (busy || !expiry || gate.dataset.stage !== 'authorized') return;
        remember();
        clearTimeout(timer);
        player.pause();
        player.inert = true;
        show('retry', key, fallback);
        button.dataset.i18n = 't_playback_resume';
        button.textContent = text('t_playback_resume', 'Verify and resume');
    }
    player.addEventListener('error', () => stop());
    document.addEventListener('visibilitychange', () => {
        if (expiry && Date.now() >= expiry * 1000) stop();
    });
    const verifying = attempt => activeAttempt === attempt && attempt.phase === 'verifying';
    function removeWidget(attempt) {
        const widget = attempt.widget;
        attempt.widget = undefined;
        if (widget !== undefined) {
            try { window.turnstile.remove(widget); } catch { /* Callbacks remain retired even if SDK cleanup fails. */ }
        }
    }
    function finishAttempt(attempt) {
        // Retire identity/phase before SDK cleanup, including any queued events.
        if (activeAttempt === attempt) activeAttempt = undefined;
        attempt.phase = 'finished';
        removeWidget(attempt);
    }
    function failure(attempt) {
        if (activeAttempt !== attempt) return;
        finishAttempt(attempt);
        busy = false;
        show('error', 't_playback_failed', 'Verification or playback service is unavailable. Please try again.');
        button.dataset.i18n = 't_playback_resume';
        button.textContent = text('t_playback_resume', 'Verify and resume');
    }
    function verificationFailed(attempt) {
        if (verifying(attempt)) failure(attempt);
    }
    async function receive(attempt, token) {
        if (!verifying(attempt)) return;
        // The single-use widget token has been handed to activation. Its later
        // expiry/error is unrelated to the lifetime of a playback grant.
        attempt.phase = 'activating';
        removeWidget(attempt);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        try {
            const csrfResponse = await fetch('/auth/csrf', {cache: 'no-store', signal: controller.signal});
            if (!csrfResponse.ok) throw Error('csrf');
            const {token: csrf} = await csrfResponse.json();
            const response = await fetch('/playback/grant', {
                method: 'POST', cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
                headers: {'X-CSRF-TOKEN': csrf},
                body: new URLSearchParams({videoId: gate.dataset.videoId, token})
            });
            if (!response.ok) throw Error('grant');
            const access = await response.json();
            if (activeAttempt !== attempt) return;
            if (!Number.isSafeInteger(access.expiresAt) || access.expiresAt * 1000 <= Date.now()) throw Error('expiry');
            // A same-type source replacement can leave Vidstack's quality
            // auto-selector detached. Dispose the old provider before renewal.
            if (player.provider) {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => { cleanup(); reject(Error('provider reset')); }, 3000);
                    const changed = event => { if (!event.detail) { cleanup(); resolve(); } };
                    function cleanup() {
                        clearTimeout(timeout);
                        player.removeEventListener('provider-change', changed);
                    }
                    player.addEventListener('provider-change', changed);
                    player.src = '';
                });
            }
            expiry = access.expiresAt;
            const provider = player.querySelector('media-provider');
            provider.querySelectorAll('track').forEach(track => track.remove());
            for (const track of access.subtitles) {
                const element = document.createElement('track');
                Object.assign(element, {id: 'subtitle-' + track.trackKey, src: track.url,
                    kind: 'subtitles', srclang: track.language, label: track.label});
                element.dataset.type = 'vtt';
                provider.append(element);
            }
            const saved = {...resume};
            const restore = () => {
                if (saved.time > 0) player.currentTime = Math.min(saved.time, player.duration - 0.1);
                if (!saved.auto) {
                    const quality = player.qualities?.toArray().find(q => q.height === saved.height);
                    if (quality) quality.selected = true;
                } else player.qualities?.autoSelect?.();
                for (const track of player.textTracks?.toArray() || []) {
                    track.mode = saved.language && track.language === saved.language ? 'showing' : 'disabled';
                }
                if (saved.paused) player.pause();
            };
            // Vidstack rejects play() before can-play. Start authorized loading
            // explicitly, then restore state once the new provider is ready.
            const ready = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => { cleanup(); reject(Error('media readiness')); }, 30000);
                const loaded = () => { cleanup(); resolve(); };
                const failed = () => { cleanup(); reject(Error('media load')); };
                function cleanup() {
                    clearTimeout(timeout);
                    player.removeEventListener('can-play', loaded);
                    player.removeEventListener('error', failed);
                }
                player.addEventListener('can-play', loaded);
                player.addEventListener('error', failed);
            });
            player.src = {src: access.url, type: 'application/x-mpegurl'};
            player.preload = 'auto';
            player.startLoading();
            await ready;
            if (activeAttempt !== attempt) return;
            restore();
            attempt.phase = 'authorized';
            busy = false;
            player.inert = false;
            panel.style.display = 'none';
            player.focus({preventScroll: true});
            gate.dataset.stage = 'authorized';
            clearTimeout(timer);
            timer = setTimeout(() => stop(), Math.max(1, expiry * 1000 - Date.now()));
            // An asynchronous challenge can consume browser autoplay activation.
            // Keep the normal Play control usable, without another grant/challenge.
            try { if (!saved.paused) await player.play(); }
            catch (error) {
                if (activeAttempt !== attempt) return;
                if (error.name === 'NotAllowedError') {
                    show('authorized', 't_playback_authorized', 'Access verified. Press Play to start.');
                    button.dataset.i18n = 't_playback_start';
                    button.textContent = text('t_playback_start', 'Play film');
                } else stop();
            }
        } catch { failure(attempt); }
        finally {
            clearTimeout(timeout);
            if (attempt.phase === 'authorized') finishAttempt(attempt);
        }
    }
    async function start() {
        if (busy) return;
        if (gate.dataset.stage === 'authorized' && expiry * 1000 > Date.now()) {
            panel.style.display = 'none';
            player.inert = false;
            try { await player.play(); } catch { stop(); }
            return;
        }
        if (expiry && gate.dataset.stage === 'authorized') remember();
        const attempt = {phase: 'verifying', widget: undefined};
        activeAttempt = attempt;
        busy = true;
        show('verifying', 't_playback_verifying', 'Verifying playback access…');
        try {
            if (!gate.dataset.sitekey) throw Error('widget configuration');
            if (!window.turnstile) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                    const deadline = setTimeout(() => { script.remove(); reject(Error('widget timeout')); }, 8000);
                    script.onload = () => { clearTimeout(deadline); resolve(); };
                    script.onerror = () => { clearTimeout(deadline); script.remove(); reject(Error('widget')); };
                    document.head.append(script);
                });
            }
            if (!verifying(attempt)) return;
            // A new widget gives every explicit retry a fresh callback identity.
            attempt.widget = window.turnstile.render('#playback-challenge', {
                sitekey: gate.dataset.sitekey, action: 'netfilmx-playback', execution: 'execute',
                appearance: 'interaction-only', retry: 'never', 'refresh-expired': 'manual',
                callback: token => receive(attempt, token),
                'error-callback': () => verificationFailed(attempt),
                'timeout-callback': () => verificationFailed(attempt),
                'expired-callback': () => verificationFailed(attempt), 'refresh-timeout': 'manual'
            });
            if (!verifying(attempt)) {
                removeWidget(attempt);
                return;
            }
            window.turnstile.execute(attempt.widget);
        } catch { verificationFailed(attempt); }
    }
    button.addEventListener('click', start);
}
