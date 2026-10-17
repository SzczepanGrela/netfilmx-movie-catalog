#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');

async function main() {
  if (process.argv.includes('--help')) {
    console.log('node qualification/hls_browser.cjs <publication-record.json> <new-private-output> <playwright-package-directory> [full|chromium|firefox|trace] [film-slug]');
    return;
  }
  const [packetArg, outputArg, packageArg, mode = 'full', filterSlug] = process.argv.slice(2);
  if (!['full', 'chromium', 'firefox', 'trace'].includes(mode)) throw Error('Use --help');
  const root = path.resolve(__dirname, '..'), output = path.resolve(outputArg);
  if (!output.startsWith(root + '/artifacts/')) throw Error('Use a new private artifacts directory');
  fs.mkdirSync(output, {recursive: false, mode: 0o700});
  const packetPath = fs.realpathSync(packetArg), packet = JSON.parse(fs.readFileSync(packetPath));
  if (packet.kind !== 'retained-seven-film-hls' || packet.manifestActivated || packet.providerWrites) throw Error('Inactive HLS proposal required');
  const playwright = require(path.resolve(packageArg));
  const preview = spawn('python3', [path.join(__dirname, 'hls_preview.py'), packetPath, path.join(output, 'fixture')], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
  const previewLog = fs.createWriteStream(path.join(output, 'preview.log'), {mode: 0o600});
  preview.stderr.pipe(previewLog);
  let browser;
  const report = {startedUtc: new Date().toISOString(), scope: `actual ${filterSlug ? 'selected diagnostic' : 'seven-film'} HLS in MVC Vidstack, private loopback fixture; no final-image import`,
    audibleAcceptance: false, nativeSafariMobileAcceptance: false, targetHttpsCorsAcceptance: false, engines: [], status: 'failed'};
  report.requested = {mode, filterSlug: filterSlug || null};
  const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  report.provenance = {sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
    packetSha256: digest(packetPath), appAssemblySha256: digest(path.join(root, 'NetFilmx_Web/bin/Release/net10.0/NetFilmx_Web.dll')),
    files: Object.fromEntries(['NetFilmx_Web/Views/Shared/_VideoPlayer.cshtml', 'NetFilmx_Web/wwwroot/js/video-player.js',
      'NetFilmx_Service/Processing/FFmpegService.cs', 'qualification/hls_browser.cjs'].map(file => [file, digest(path.join(root, file))]))};
  const check = (value, message) => {if (!value) throw Error(message);};
  try {
    const origin = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('HLS fixture startup timeout')), 35000);
      preview.once('exit', code => {clearTimeout(timeout); reject(Error('HLS fixture exited: ' + code));});
      let text = '';
      preview.stdout.on('data', chunk => {
        text += chunk;
        if (text.includes('\n')) {
          clearTimeout(timeout);
          try {resolve(JSON.parse(text.split('\n')[0]).origin);} catch (error) {reject(error);}
        }
      });
    });
    report.origin = origin;
    for (const engine of mode === 'full' ? ['chromium', 'firefox'] : mode === 'trace' ? ['chromium'] : [mode]) {
      const launch = {headless: true};
      if (engine === 'firefox') {
        launch.executablePath = path.join(root, 'artifacts/tools/playwright/firefox-1538/firefox/firefox');
        launch.env = {...process.env, LD_LIBRARY_PATH: path.join(root, 'artifacts/tools/firefox-codecs')};
      }
      browser = await playwright[engine].launch(launch);
      const result = {engine, browserVersion: browser.version(), privateCodecLibraries: engine === 'firefox', entries: [], status: 'failed'};
      report.engines.push(result);
      const context = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 1280, height: 900}});
      await context.route('**/*', async route => {
        if (!route.request().url().startsWith(origin + '/')) return route.abort();
        // Reproduce the observed native-HLS/pre-library readiness race.
        if (route.request().url().endsWith('/lib/hls.js/dist/hls.min.js')) await new Promise(resolve => setTimeout(resolve, 300));
        return route.continue();
      });
      for (let index = 0; index < packet.films.length; index++) {
        if (mode === 'trace' && index !== 1) continue;
        const film = packet.films[index], page = await context.newPage();
        if (filterSlug && film.slug !== filterSlug) {await page.close(); continue;}
        page.setDefaultTimeout(12000);
        const errors = [], requested = new Set();
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => {if (response.url().includes('/stream_')) requested.add(new URL(response.url()).pathname);});
        const entry = {slug: film.slug, status: 'failed', qualitySwitches: []};
        await page.addInitScript(() => {
          window.hlsTrace = [];
          document.addEventListener('DOMContentLoaded', () => {
            const p = document.querySelector('media-player');
            const record = event => {
              if (window.hlsTrace.length > 120) return;
              window.hlsTrace.push({event: event.type, time: performance.now(), position: p.querySelector('video')?.currentTime,
                playbackRate: p.querySelector('video')?.playbackRate, canPlay: p.state?.canPlay,
                provider: p.provider?.type,
                qualities: p.qualities?.length, levels: p.provider?.instance?.levels?.length,
                source: p.querySelector('video')?.currentSrc?.slice(0, 120)});
            };
            for (const name of ['provider-change','provider-setup','load-start','loaded-metadata','can-play','hls-manifest-parsed','hls-level-loaded','hls-level-switched','qualities-change','quality-change','source-change','seeking','seeked','ended','play','hls-buffer-flushing','hls-buffer-flushed','hls-buffered-to-end','hls-error']) p.addEventListener(name, record);
          });
        });
        result.entries.push(entry);
        async function select(menu, label) {
          entry.lastMenu = {menu, label};
          await page.locator('media-player').hover();
          await page.getByRole('button', {name: /Settings/}).first().click();
          await page.locator('media-menu-button').filter({hasText: menu}).first().click();
          const group = menu === 'Quality' ? 'media-quality-radio-group' : 'media-captions-radio-group';
          await page.locator(group + ' media-radio').filter({hasText: label}).first().click();
          await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
        }
        async function seek(time) {
          entry.lastSeek = time;
          await page.$eval('media-player', async (p, t) => {
            // Replay clears Vidstack's ended state before a later seek is observable.
            if (p.state.ended) await p.play();
            p.currentTime = t;
          }, time);
          await page.waitForFunction(t => {
            const p = document.querySelector('media-player'), video = document.querySelector('video');
            return !p.state.seeking && !video.seeking && Math.abs(p.currentTime - t) < .5
              && Math.abs(video.currentTime - t) < .5 && video.readyState >= 2;
          }, time);
        }
        try {
          check((await page.goto(origin + '/Home/Watch/' + (index + 1))).status() === 200, 'Watch response');
          await page.waitForFunction(() => document.querySelector('media-player')?.state?.canPlay, null, {timeout: 30000});
          await page.waitForFunction(count => document.querySelector('media-player')?.provider?.instance?.levels?.length === count, film.variants.length);
          if (mode !== 'trace') await page.waitForFunction(count => document.querySelector('media-player').qualities.length === count, film.variants.length);
          entry.initial = await page.$eval('media-player', p => ({duration: p.duration, provider: p.provider.type, qualitySwitchMode: p.qualities.switch,
            maxMaxBufferLength: p.provider.instance.config.maxMaxBufferLength,
            levels: p.provider.instance.levels.map(l => ({width: l.width, height: l.height, bitrate: l.bitrate})),
            tracks: p.textTracks.toArray().map(t => ({language: t.language, label: t.label}))}));
          check(entry.initial.provider === 'hls' && Math.abs(entry.initial.duration - film.variants[0].duration) < .16, 'Actual HLS provider/duration');
          check(entry.initial.qualitySwitchMode === 'next', 'Preserve current fragment when switching quality');
          check(entry.initial.maxMaxBufferLength === 30, 'Bound HLS prefetch');
          check(entry.initial.tracks.length === (film.slug === 'sintel' ? 10 : 0), 'Persistent subtitle count');
          await page.$eval('media-player', p => {p.muted = true; return p.play();});
          if (mode === 'trace') {
            await page.waitForTimeout(2000);
            entry.trace = await page.evaluate(() => window.hlsTrace);
            entry.snapshot = await page.$eval('media-player', p => ({qualities: p.qualities.length, canPlay: p.state.canPlay,
              nativeHls: p.querySelector('video').canPlayType('application/vnd.apple.mpegurl'), source: p.querySelector('video').currentSrc}));
            entry.status = 'traced';
            continue;
          }
          for (let n = 0; n < film.variants.length; n++) {
            const variant = film.variants[n];
            await select('Quality', variant.height + 'p');
            await seek(12 + n * 12);
            await page.waitForFunction(height => {
              const p = document.querySelector('media-player'), v = document.querySelector('video');
              return !p.state.ended && !v.ended && p.qualities.selected?.height === height
                && Math.abs(v.videoHeight - height) <= Math.max(2, height * .01);
            }, variant.height, {timeout: 20000});
            entry.qualitySwitches.push(await page.$eval('media-player', p => ({selectedHeight: p.qualities.selected.height,
              auto: p.qualities.auto, decodedWidth: p.querySelector('video').videoWidth, decodedHeight: p.querySelector('video').videoHeight,
              hlsCurrentLevel: p.provider.instance.currentLevel, time: p.currentTime})));
          }
          await select('Quality', 'Auto');
          await page.waitForFunction(() => document.querySelector('media-player').qualities.auto === true);
          entry.autoSelection = true;
          entry.seeks = [];
          // Pinned Vidstack rounds seeked/end comparison to seconds. Seek three
          // seconds before the end, then require the native video to finish naturally.
          for (const time of [.5, entry.initial.duration / 2, entry.initial.duration - 3]) {
            await seek(time);
            entry.seeks.push(await page.$eval('media-player', p => p.currentTime));
          }
          await page.$eval('media-player', p => p.play());
          await page.waitForFunction(() => document.querySelector('video').ended && document.querySelector('media-player').state.ended, null, {timeout: 20000});
          entry.naturalEnd = await page.$eval('media-player', p => ({time: p.currentTime, duration: p.duration, videoEnded: p.querySelector('video').ended, playerEnded: p.state.ended}));
          check(Math.abs(entry.naturalEnd.time - film.variants[0].duration) < .16, 'Native end follows complete HLS duration');
          if (film.slug === 'sintel') {
            entry.captions = [];
            await seek(107.75);
            await page.$eval('media-player', p => p.pause());
            for (const track of packet.objects.filter(o => o.slug === 'sintel' && o.role === 'subtitle')) {
              const text = fs.readFileSync(path.join(root, track.file), 'utf8').trim().split(/\r?\n\r?\n/)[1].split(/\r?\n/).slice(1).join('\n');
              await select('Captions', track.label);
              await page.waitForFunction(({language, text}) => {
                const p = document.querySelector('media-player');
                return p.textTracks.selected?.language === language && p.querySelector('media-captions').innerText.replace(/\s+/g, ' ').trim() === text.replace(/\s+/g, ' ').trim();
              }, {language: track.language, text});
              entry.captions.push({language: track.language, label: track.label, text, at: await page.$eval('media-player', p => p.currentTime)});
              if (['pl', 'ru', 'vi'].includes(track.language)) await page.screenshot({path: path.join(output, engine + '-sintel-' + track.language + '.png')});
              await select('Captions', 'Off');
              await page.waitForFunction(() => !document.querySelector('media-player').textTracks.selected && !document.querySelector('media-captions').innerText.trim());
            }
            entry.offAfterEachLanguage = true;
          }
          await seek(2);
          await page.$eval('media-player', p => p.play());
          await page.waitForFunction(() => document.querySelector('media-player').currentTime > 2.4);
          await page.$eval('media-player', p => p.pause());
          entry.decode = await page.$eval('video', v => ({width: v.videoWidth, height: v.videoHeight, frames: v.getVideoPlaybackQuality().totalVideoFrames}));
          check(entry.decode.frames > 0 && errors.length === 0, 'Decoded frames / player JavaScript errors');
          entry.variantRequests = [...requested].filter(url => url.endsWith('.m3u8'));
          check(entry.variantRequests.length >= film.variants.length, 'All selected variant playlists requested');
          entry.errors = errors; entry.status = 'passed';
        } catch (error) {
          entry.error = error.message; entry.stack = error.stack; entry.errors = errors;
          entry.state = await page.$eval('media-player', p => ({time: p.currentTime, duration: p.duration, provider: p.provider?.type,
            selectedQuality: p.qualities.selected?.height, qualities: p.qualities.toArray().map(q => ({height: q.height, width: q.width})),
            currentLevel: p.provider?.instance?.currentLevel, seeking: p.state.seeking, mediaError: p.state.error,
            video: {ready: p.querySelector('video')?.readyState, time: p.querySelector('video')?.currentTime, height: p.querySelector('video')?.videoHeight}})).catch(() => null);
          entry.menu = await page.locator('media-radio').allTextContents().catch(() => []);
          entry.trace = await page.evaluate(() => window.hlsTrace).catch(() => []);
          await page.screenshot({path: path.join(output, engine + '-' + film.slug + '-failed.png')}).catch(() => {});
          process.exitCode = 1;
        } finally {
          console.log(JSON.stringify({engine, slug: film.slug, status: entry.status, error: entry.error}));
          fs.writeFileSync(path.join(output, 'browser-evidence.json'), JSON.stringify(report, null, 2));
          await page.close();
        }
      }
      result.status = result.entries.length > 0 && result.entries.every(e => e.status === 'passed') ? 'passed' : 'failed';
      await browser.close(); browser = null;
    }
    report.status = report.engines.every(e => e.status === 'passed') ? 'passed' : 'failed';
    report.completeCatalogueQualification = mode === 'full' && !filterSlug && report.engines.length === 2
      && report.engines.every(e => e.entries.length === 7 && e.status === 'passed');
  } finally {
    if (browser) await browser.close();
    preview.kill('SIGTERM');
    await new Promise(resolve => {
      if (preview.exitCode !== null) return resolve();
      const timeout = setTimeout(resolve, 15000);
      preview.once('exit', () => {clearTimeout(timeout); resolve();});
    });
    previewLog.end(); report.completedUtc = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'browser-evidence.json'), JSON.stringify(report, null, 2));
  }
  if (report.status !== 'passed') process.exitCode = 1;
}
main().catch(error => {console.error(error.message);process.exitCode = 1;});
