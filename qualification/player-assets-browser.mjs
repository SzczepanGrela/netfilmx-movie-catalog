#!/usr/bin/env node
// Test HTTP assets from the shipping image, never the source-tree web server.
// External traffic is blocked; there is no provider fixture or media access.
// Playback behavior is qualified separately by playback_browser.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
const result = {scope: 'HTTP watch page and executable player dependencies from exact image; no live provider or media', passed: false, engines: []};
let browser;
try {
    for (const name of engines) {
        const entry = {browser: name, passed: false, assetFailures: [], pageErrors: [], loadedAssets: []};
        result.engines.push(entry);
        browser = await ({chromium, firefox})[name].launch({headless: true});
        const context = await browser.newContext({viewport: {width: 1000, height: 800}, serviceWorkers: 'block'});
        context.setDefaultTimeout(15000);
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin.origin) return route.abort();
            return route.continue();
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

        // These libraries load lazily after authorization in the watch page.
        // Execute their real HTTP-served code without granting media access.
        await page.addScriptTag({url: origin.origin + '/lib/hls.js/dist/hls.min.js'});
        const dependencies = await page.evaluate(async () => {
            const captions = await import('/lib/media-captions/dist/prod.js');
            const parsed = await captions.parseText('WEBVTT\n\n00:00:00.000 --> 00:00:12.000\nŻółć — polskie napisy\n');
            return {hlsConstructor: typeof window.Hls, hlsLoadSource: typeof window.Hls?.prototype.loadSource,
                captions: parsed.cues.map(cue => cue.text)};
        });
        assert.deepEqual(dependencies, {hlsConstructor: 'function', hlsLoadSource: 'function', captions: ['Żółć — polskie napisy']});
        entry.hlsLibraryAndCaptionParserExecuted = true;
        for (const required of ['/lib/media-icons/dist/cdn.js', '/lib/hls.js/dist/hls.min.js', '/lib/media-captions/dist/prod.js'])
            assert.ok(entry.loadedAssets.includes(required), `Required lazy dependency was not exercised: ${required}`);
        assert.deepEqual(entry.assetFailures, []);
        assert.deepEqual(entry.pageErrors, []);
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
