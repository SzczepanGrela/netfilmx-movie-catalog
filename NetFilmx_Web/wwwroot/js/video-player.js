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
    let activeAttempt, busy = false, expiry = 0, timer, sdkLoading;
    let playRequested = false;
    let resume = {time: 0, height: null, auto: true, language: null, paused: true};
    const text = (key, fallback) => { const value = window.NetFilmxI18n?.t?.(key); return value && value !== key ? value : fallback; };
    function show(stage, key, fallback) {
        gate.dataset.stage = stage;
        panel.style.display = 'flex';
        message.setAttribute('role', stage === 'error' ? 'alert' : 'status');
        message.dataset.i18n = key;
        message.textContent = text(key, fallback);
        gate.setAttribute('aria-busy', String(busy));
        button.disabled = busy && playRequested;
    }
    function remember() {
        resume = {time: player.currentTime || 0, height: player.qualities?.selected?.height,
            auto: player.qualities?.auto !== false, language: player.textTracks?.selected?.language || null,
            paused: player.paused};
    }
    function stop(renew = false) {
        if (busy || !expiry || gate.dataset.stage !== 'authorized') return;
        remember();
        clearTimeout(timer);
        player.pause();
        player.inert = true;
        playRequested = !resume.paused;
        show('retry', 't_playback_retry', 'Playback stopped. Try again to continue from this position.');
        button.dataset.i18n = 't_playback_resume';
        button.textContent = text('t_playback_resume', 'Try again');
        if (renew) start();
    }
    player.addEventListener('error', () => stop(false));
    document.addEventListener('visibilitychange', () => {
        if (expiry && Date.now() >= expiry * 1000) stop(true);
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
        clearTimeout(attempt.deadline);
        removeWidget(attempt);
    }
    function failure(attempt, code) {
        if (activeAttempt !== attempt) return;
        finishAttempt(attempt);
        busy = false;
        // Only bounded stage codes are exposed, never provider tokens or media URLs.
        gate.dataset.errorCode = code;
        gate.dataset.errorPhase = attempt.failurePhase || 'verification';
        show('error', 't_playback_failed', 'This film could not be loaded. Please try again.');
        button.dataset.i18n = 't_playback_resume';
        button.textContent = text('t_playback_resume', 'Try again');
    }
    function verificationFailed(attempt, code = 'challenge_failed', providerCode) {
        if (!verifying(attempt)) return;
        // Cloudflare's numeric error code is useful for diagnosis. Never expose
        // arbitrary callback content (which can contain request details).
        if (typeof providerCode === 'string' && /^\d{6}$/.test(providerCode)) gate.dataset.providerCode = providerCode;
        failure(attempt, code);
    }
    async function receive(attempt, token) {
        if (!verifying(attempt)) return;
        // The single-use widget token has been handed to activation. Its later
        // expiry/error is unrelated to the lifetime of a playback grant.
        attempt.phase = 'activating';
        clearTimeout(attempt.deadline);
        removeWidget(attempt);
        attempt.failurePhase = 'csrf';
        let failureCode = 'csrf_failed';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        try {
            const csrfResponse = await fetch('/auth/csrf', {cache: 'no-store', signal: controller.signal});
            if (!csrfResponse.ok) throw Error('csrf');
            const {token: csrf} = await csrfResponse.json();
            attempt.failurePhase = 'grant';
            failureCode = 'grant_failed';
            const response = await fetch('/playback/grant', {
                method: 'POST', cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
                headers: {'X-CSRF-TOKEN': csrf},
                body: new URLSearchParams({videoId: gate.dataset.videoId, token})
            });
            if (!response.ok) {
                failureCode = response.status === 400 ? 'grant_rejected' : response.status === 429 ? 'grant_limited' : response.status === 503 ? 'playback_unavailable' : 'grant_failed';
                throw Error('grant');
            }
            const access = await response.json();
            if (activeAttempt !== attempt) return;
            if (!Number.isSafeInteger(access.expiresAt) || access.expiresAt * 1000 <= Date.now()) throw Error('expiry');
            clearTimeout(timeout);
            attempt.failurePhase = 'media';
            failureCode = 'media_failed';
            await Promise.race([customElements.whenDefined('media-player'), new Promise((_, reject) => {
                attempt.playerDeadline = setTimeout(() => reject(Error('player readiness')), 8000);
            })]);
            clearTimeout(attempt.playerDeadline);
            if (activeAttempt !== attempt) return;
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
                if (resume.paused) player.pause();
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
            gate.setAttribute('aria-busy', 'false');
            player.inert = false;
            panel.style.display = 'none';
            if (document.activeElement === button) player.focus({preventScroll: true});
            gate.dataset.stage = 'authorized';
            clearTimeout(timer);
            timer = setTimeout(() => stop(true), Math.max(1, expiry * 1000 - Date.now()));
            // An asynchronous challenge can consume browser autoplay activation.
            // Keep the normal Play control usable, without another grant/challenge.
            try { if (!resume.paused) await player.play(); }
            catch (error) {
                if (activeAttempt !== attempt) return;
                if (error.name === 'NotAllowedError') {
                    show('authorized', 't_playback_authorized', 'Ready to play.');
                    button.dataset.i18n = 't_playback_start';
                    button.textContent = text('t_playback_start', 'Play film');
                } else stop(false);
            }
        } catch { failure(attempt, failureCode); }
        finally {
            clearTimeout(timeout);
            clearTimeout(attempt.playerDeadline);
            if (attempt.phase === 'authorized') finishAttempt(attempt);
        }
    }
    function readySdk() {
        if (sdkLoading) return sdkLoading;
        sdkLoading = new Promise((resolve, reject) => {
            let settled = false, script;
            const finish = error => {
                if (settled) return;
                settled = true;
                clearTimeout(deadline);
                if (error) { script?.remove(); reject(Error(error)); }
                else resolve();
            };
            const deadline = setTimeout(() => finish('sdk_timeout'), 8000);
            const waitReady = () => {
                // Script download is not the SDK readiness boundary.
                if (typeof window.turnstile?.ready !== 'function') return finish('sdk_unavailable');
                try { window.turnstile.ready(() => finish()); }
                catch { finish('sdk_unavailable'); }
            };
            if (window.turnstile) waitReady();
            else {
                script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                script.onload = waitReady;
                script.onerror = () => finish('sdk_load_failed');
                document.head.append(script);
            }
        }).catch(error => { sdkLoading = undefined; throw error; });
        return sdkLoading;
    }
    async function start() {
        if (busy) return;
        if (gate.dataset.stage === 'authorized' && expiry * 1000 > Date.now()) {
            panel.style.display = 'none';
            player.inert = false;
            try { await player.play(); } catch { stop(false); }
            return;
        }
        if (expiry && gate.dataset.stage === 'authorized') remember();
        const attempt = {phase: 'verifying', widget: undefined, failurePhase: 'verification'};
        activeAttempt = attempt;
        busy = true;
        delete gate.dataset.errorCode;
        delete gate.dataset.errorPhase;
        delete gate.dataset.providerCode;
        show('verifying', 't_playback_loading', 'Loading film…');
        button.dataset.i18n = 't_playback_start';
        button.textContent = text('t_playback_start', 'Play film');
        // One bounded attempt. Provider errors/timeouts require an explicit retry.
        attempt.deadline = setTimeout(() => verificationFailed(attempt, 'challenge_timeout'), 30000);
        try {
            if (!gate.dataset.sitekey) throw Error('widget_configuration');
            await readySdk();
            if (!verifying(attempt)) return;
            // The provider widget is configured Invisible. Each attempt still
            // owns a fresh widget identity so late callbacks remain harmless.
            attempt.widget = window.turnstile.render('#playback-challenge', {
                sitekey: gate.dataset.sitekey, action: 'netfilmx-playback', execution: 'execute',
                retry: 'never', 'refresh-expired': 'manual',
                callback: token => receive(attempt, token),
                'error-callback': code => verificationFailed(attempt, 'challenge_failed', code),
                'timeout-callback': () => verificationFailed(attempt, 'challenge_timeout'),
                'expired-callback': () => verificationFailed(attempt, 'challenge_expired'), 'refresh-timeout': 'manual'
            });
            if (!verifying(attempt)) {
                removeWidget(attempt);
                return;
            }
            window.turnstile.execute(attempt.widget);
        } catch (error) {
            const codes = ['widget_configuration', 'sdk_timeout', 'sdk_unavailable', 'sdk_load_failed'];
            verificationFailed(attempt, codes.includes(error.message) ? error.message : 'widget_failed');
        }
    }
    button.addEventListener('click', () => {
        playRequested = true;
        resume.paused = false;
        if (busy) { button.disabled = true; return; }
        start();
    });
    // Prepare access silently on the watch page, but do not autoplay. A normal
    // Play click during loading is remembered; no second verification click.
    start();
}
