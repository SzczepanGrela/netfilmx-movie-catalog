#!/usr/bin/env node
// Test HTTP assets from the shipping image, never the source-tree web server.
// Only the synthetic media/page paths below are intercepted. No Turnstile bypass
// or grant fixture is installed in the application, and external traffic is blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium, firefox} from '../media-worker/node_modules/playwright/index.mjs';

if (process.argv.includes('--help')) {
    console.log('node qualification/player-assets-browser.mjs <http://127.0.0.1:port> <new-output-under-artifacts> [chromium|firefox]');
    process.exit(0);
}
const root = fileURLToPath(new URL('..', import.meta.url));
const origin = new URL(process.argv[2]);
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
assert.ok(origin.port && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash);
const out = path.resolve(process.argv[3]);
assert.ok(out.startsWith(path.join(root, 'artifacts') + path.sep));
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.mkdirSync(out, {mode: 0o700});
const engines = process.argv[4] ? [process.argv[4]] : ['chromium', 'firefox'];
assert.ok(engines.every(name => ['chromium', 'firefox'].includes(name)));
const result = {scope: 'HTTP assets from exact image; local synthetic HLS/subtitles; no live provider or media', passed: false, engines: []};
let browser;
try {
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=12', '-t', '12',
        '-filter_complex', '[0:v]split=2[a][b];[a]scale=320:180[v0];[b]scale=160:90[v1]',
        '-map', '[v0]', '-map', '[v1]', '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1',
        '-g', '24', '-keyint_min', '24', '-sc_threshold', '0', '-f', 'hls', '-hls_time', '2',
        '-hls_list_size', '0', '-hls_playlist_type', 'vod', '-hls_flags', 'independent_segments',
        '-var_stream_map', 'v:0 v:1', '-hls_segment_filename', path.join(out, 'stream_%v_data%03d.ts'),
        '-master_pl_name', 'master.m3u8', path.join(out, 'stream_%v.m3u8')], {timeout: 30000, stdio: 'pipe'});
    const fixture = '/__image_assets__/';
    const files = new Map(fs.readdirSync(out).map(name => [name, fs.readFileSync(path.join(out, name))]));
    files.set('pl.vtt', Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:12.000\nŻółć — polskie napisy\n'));
    files.set('index.html', Buffer.from(`<!doctype html><html><head>
        <link rel="stylesheet" href="/lib/vidstack/styles/player/default/theme.css">
        <link rel="stylesheet" href="/lib/vidstack/styles/player/default/layouts/video.css">
        </head><body><media-player id="main-video-player" view-type="video" stream-type="on-demand" playsinline style="width:640px;height:360px">
        <media-provider></media-provider><media-video-layout></media-video-layout></media-player>
        <p id="subtitle-status" hidden></p>
        <script src="/js/video-player.js"></script><script type="module" src="/lib/vidstack/player.js"></script>
        </body></html>`));
    for (const name of engines) {
        const entry = {browser: name, passed: false, assetFailures: [], pageErrors: [], loadedAssets: []};
        result.engines.push(entry);
        browser = await ({chromium, firefox})[name].launch({headless: true});
        const context = await browser.newContext({viewport: {width: 1000, height: 800}, serviceWorkers: 'block'});
        context.setDefaultTimeout(15000);
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin.origin) return route.abort();
            if (!url.pathname.startsWith(fixture)) return route.continue();
            const file = url.pathname.slice(fixture.length), body = files.get(file);
            const type = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : file.endsWith('.ts') ? 'video/mp2t' : file.endsWith('.vtt') ? 'text/vtt' : 'text/html';
            return route.fulfill({status: body ? 200 : 404, body: body || 'Missing synthetic fixture', contentType: type});
        });
        const page = await context.newPage();
        const isAsset = url => url.origin === origin.origin && /^\/(lib|js|css)\//.test(url.pathname);
        page.on('response', response => {
            const url = new URL(response.url());
            if (!isAsset(url)) return;
            if (response.status() !== 200) entry.assetFailures.push({path: url.pathname, status: response.status()});
            else if (!entry.loadedAssets.includes(url.pathname)) entry.loadedAssets.push(url.pathname);
        });
        page.on('requestfailed', request => {
            const url = new URL(request.url());
            if (isAsset(url)) entry.assetFailures.push({path: url.pathname, status: 'request_failed'});
        });
        page.on('pageerror', error => entry.pageErrors.push(error.message));
        // The real production-rendered watch page must register its components.
        // The disposable application has no provider keys: access stays closed.
        const watch = await page.goto(origin.origin + '/Home/Watch/1');
        assert.equal(watch.status(), 200);
        await page.waitForFunction(() => !!customElements.get('media-player') && !!customElements.get('media-video-layout'));
        assert.equal(await page.locator('#main-video-player').count(), 1);
        entry.watchComponentsRegistered = true;
        assert.deepEqual(entry.assetFailures, []);

        // Reuse the HTTP-served production libraries with a twelve-second local
        // sample to exercise lazy HLS, icon and caption imports, without granting
        // access to any retained film or modifying the server's authorization.
        await page.goto(origin.origin + fixture + 'index.html');
        await page.waitForFunction(() => !!customElements.get('media-player'));
        await page.evaluate(prefix => {
            const player = document.querySelector('#main-video-player');
            player.textTracks.add({src: prefix + 'pl.vtt', kind: 'subtitles', language: 'pl', label: 'Polski', default: true});
            player.src = {src: prefix + 'master.m3u8', type: 'application/x-mpegurl'};
        }, fixture);
        await page.locator('media-play-button:visible').first().click();
        await page.waitForFunction(() => document.querySelector('#main-video-player').currentTime > 1);
        await page.waitForFunction(() => document.querySelector('#main-video-player').textTracks.selected?.cues.length > 0);
        await page.evaluate(() => {
            const player = document.querySelector('#main-video-player');
            player.currentTime = 5;
            player.qualities[1].selected = true;
        });
        await page.waitForFunction(() => {
            const player = document.querySelector('#main-video-player');
            return player.currentTime > 5.2 && !player.paused && !player.qualities.auto && player.textTracks.selected?.language === 'pl';
        });
        await page.evaluate(() => {
            for (const track of document.querySelector('#main-video-player').textTracks.toArray()) track.mode = 'disabled';
        });
        await page.waitForFunction(() => !document.querySelector('#main-video-player').textTracks.selected);
        for (const required of ['/lib/media-icons/dist/cdn.js', '/lib/hls.js/dist/hls.min.js', '/lib/media-captions/dist/prod.js'])
            assert.ok(entry.loadedAssets.includes(required), `Required lazy dependency was not exercised: ${required}`);
        assert.deepEqual(entry.assetFailures, []);
        assert.deepEqual(entry.pageErrors, []);
        entry.syntheticPlaybackSeekQualityPlOff = true;
        entry.passed = true;
        await browser.close(); browser = undefined;
    }
    result.passed = true;
} catch (error) {
    result.error = error.message;
    process.exitCode = 1;
} finally {
    if (browser) await browser.close();
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n', {mode: 0o600});
    console.log(JSON.stringify(result));
}
