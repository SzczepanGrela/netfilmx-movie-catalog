#!/usr/bin/env node
'use strict';
// Local Chromium/Firefox evidence. No provider requests or app activation.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

async function main() {
  if (process.argv.includes('--help')) {
    console.log('node qualification/media-browser.cjs <private-manifest.json> <new-output-directory> <playwright-package-directory> [chromium|firefox]');
    return;
  }
  if (![5, 6].includes(process.argv.length)) throw new Error('Expected manifest, output, installed Playwright directory and optional browser');
  const engine = process.argv[5] || 'chromium';
  if (!['chromium', 'firefox'].includes(engine)) throw new Error('Only Chromium or Firefox local evidence is supported');
  const root = path.resolve(__dirname, '..', 'artifacts');
  const within = p => p.startsWith(root + path.sep);
  const manifestPath = fs.realpathSync(process.argv[2]);
  const output = path.resolve(process.argv[3]);
  if (!within(manifestPath) || !within(output)) throw new Error('Evidence must stay in private artifacts');
  fs.mkdirSync(output, { recursive: false, mode: 0o700 });
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  if (manifest.entries.length !== 7) throw new Error('Exactly seven playback records required');
  const files = new Map();
  for (const entry of manifest.entries) {
    if (!/^[a-z0-9-]+$/.test(entry.slug)) throw new Error('Invalid fixture slug');
    for (const kind of ['video', 'poster', 'backdrop']) {
      if (!entry[kind]) continue;
      const filename = fs.realpathSync(entry[kind]);
      if (!within(filename)) throw new Error('Fixture file outside private artifacts');
      files.set('/' + entry.slug + '/' + kind, filename);
    }
  }
  const ranges = new Map();
  const server = http.createServer((req, res) => {
    if (req.url === '/fixture') {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      res.end('<!doctype html><html><body><video controls muted preload="metadata"></video><img id="poster"><img id="backdrop"></body></html>');
      return;
    }
    const filename = files.get(req.url);
    if (!filename || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404).end(); return; }
    const size = fs.statSync(filename).size;
    const mime = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.jpg': 'image/jpeg', '.png': 'image/png' }[path.extname(filename)];
    let start = 0, end = size - 1, status = 200;
    const headers = { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!match) { res.writeHead(416).end(); return; }
      start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start > end || start >= size) { res.writeHead(416).end(); return; }
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
      status = 206; ranges.set(req.url, (ranges.get(req.url) || 0) + 1);
    }
    headers['Content-Length'] = end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') res.end();
    else {
      const stream = fs.createReadStream(filename, { start, end });
      res.on('close', () => stream.destroy());
      stream.on('error', () => res.destroy()); stream.pipe(res);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const playwright = require(path.resolve(process.argv[4]));
  let browser;
  const report = { observed_at_utc: new Date().toISOString(), scope: 'local bytes and local Range server',
    engine, playwright_version: require(path.join(path.resolve(process.argv[4]), 'package.json')).version,
    audible_sound_accepted: false, provider_playback_accepted: false,
    browsers_pending: ['Safari', 'supported mobile', engine === 'firefox' ? 'Chromium (separate evidence)' : 'Firefox'], entries: [] };
  const watchdog = setTimeout(() => { console.error('Local browser wall guard reached'); process.exit(1); }, 240000);
  try {
    const launch = { headless: true };
    if (engine === 'firefox' && process.env.NETFILMX_FIREFOX_LIBRARIES) {
      const libraries = fs.realpathSync(process.env.NETFILMX_FIREFOX_LIBRARIES);
      if (!within(libraries)) throw new Error('Optional Firefox libraries must be private local artifacts');
      launch.env = { ...process.env, LD_LIBRARY_PATH: libraries };
      report.private_codec_fixture = true;
    }
    browser = await playwright[engine].launch(launch);
    report.browser = browser.version();
    for (const entry of manifest.entries) {
      const page = await browser.newPage();
      const record = { slug: entry.slug, status: 'failed' };
      report.entries.push(record);
      try {
        await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
        await page.goto(origin + '/fixture');
        await page.evaluate(({ origin, entry }) => {
          document.querySelector('video').src = origin + '/' + entry.slug + '/video';
          for (const kind of ['poster', 'backdrop']) if (entry[kind]) document.getElementById(kind).src = origin + '/' + entry.slug + '/' + kind;
        }, { origin, entry });
        record.capabilities = await page.$eval('video', v => ({
          h264_aac: v.canPlayType('video/mp4; codecs="avc1.640029, mp4a.40.2"'),
          vp9_opus: v.canPlayType('video/webm; codecs="vp9, opus"'),
          vp8_vorbis: v.canPlayType('video/webm; codecs="vp8, vorbis"')
        }));
        await page.waitForFunction(() => { const v = document.querySelector('video'); return v.error || v.readyState >= 2; }, null, { timeout: 20000 });
        const mediaError = await page.$eval('video', v => v.error && ({ code: v.error.code, message: v.error.message }));
        if (mediaError) throw new Error(entry.slug + ': media error ' + JSON.stringify(mediaError));
        const duration = await page.$eval('video', v => v.duration);
        if (Math.abs(duration - entry.duration) > 0.15) throw new Error(entry.slug + ': duration mismatch');
        const seeks = [];
        for (const target of [0.5, duration / 2, duration - 5, entry.credit_time]) {
          await page.$eval('video', (v, t) => { v.currentTime = t; }, target);
          await page.waitForFunction(t => { const v = document.querySelector('video'); return !v.seeking && v.readyState >= 2 && Math.abs(v.currentTime - t) < 0.3; }, target, { timeout: 20000 });
          await page.$eval('video', async v => { await v.play(); });
          await page.waitForFunction(t => document.querySelector('video').currentTime > t + 0.15, target, { timeout: 10000 });
          await page.$eval('video', v => v.pause());
          seeks.push(target);
        }
        await page.locator('video').screenshot({ path: path.join(output, entry.slug + '-credits.png') });
        const decode = await page.$eval('video', v => ({ video_frames: v.webkitDecodedFrameCount, audio_bytes: v.webkitAudioDecodedByteCount,
          total_video_frames: v.getVideoPlaybackQuality().totalVideoFrames,
          firefox_has_audio: v.mozHasAudio ?? null,
          width: v.videoWidth, height: v.videoHeight, error: v.error?.code ?? null }));
        if (!decode.total_video_frames || decode.error || (engine === 'chromium' && !decode.audio_bytes))
          throw new Error(entry.slug + ': media decoding failed');
        // WebKit's byte counters do not exist in Firefox. Measure decoded audio
        // at the middle seek through Web Audio, with output gain zero. This proves
        // non-silent samples only, never listening quality or a native browser pass.
        const audio = await page.$eval('video', async (v, at) => {
          v.currentTime = at;
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Audio seek timed out')), 10000);
            v.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
          });
          const context = new AudioContext();
          const source = context.createMediaElementSource(v), analyser = context.createAnalyser(), gain = context.createGain();
          gain.gain.value = 0;
          source.connect(analyser); analyser.connect(gain); gain.connect(context.destination);
          await context.resume(); v.muted = false; await v.play();
          let peak = 0;
          const samples = new Float32Array(analyser.fftSize);
          for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 50));
            analyser.getFloatTimeDomainData(samples);
            peak = Math.max(peak, ...samples.map(Math.abs));
          }
          v.pause(); v.muted = true; await context.close();
          return { non_silent_sample_peak: peak, output_gain: 0, listening_accepted: false };
        }, duration / 2);
        if (!(audio.non_silent_sample_peak > 0)) throw new Error(entry.slug + ': no decoded audio samples');
        const artwork = {};
        for (const kind of ['poster', 'backdrop']) if (entry[kind]) {
          await page.waitForFunction(k => { const i = document.getElementById(k); return i.complete && i.naturalWidth > 0; }, kind, { timeout: 10000 });
          artwork[kind] = await page.$eval('#' + kind, i => ({ width: i.naturalWidth, height: i.naturalHeight }));
        }
        const rangeCount = ranges.get('/' + entry.slug + '/video') || 0;
        if (!rangeCount) throw new Error(entry.slug + ': no browser Range request');
        Object.assign(record, { duration, seeks, decode, audio, artwork, range_requests: rangeCount, status: 'passed' });
        console.log(entry.slug + ': local ' + engine + ' decode/artwork/seek passed');
      } catch (error) {
        record.failure = error.message;
        record.media_state = await page.$eval('video', v => ({ ready_state: v.readyState, network_state: v.networkState,
          error: v.error && { code: v.error.code, message: v.error.message } })).catch(() => null);
        console.error(entry.slug + ': ' + error.message);
      } finally { await page.close(); }
    }
    report.status = report.entries.every(entry => entry.status === 'passed') ? 'passed' : 'failed';
    if (report.status === 'failed') process.exitCode = 1;
  } catch (error) {
    report.status = 'failed'; report.failure = error.message; process.exitCode = 1;
  } finally {
    clearTimeout(watchdog);
    await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(output, 'browser-evidence.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    for (const file of fs.readdirSync(output)) fs.chmodSync(path.join(output, file), 0o600);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
