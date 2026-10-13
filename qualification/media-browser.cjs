#!/usr/bin/env node
'use strict';
// Local Chromium evidence. No provider requests, credentials or app activation.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

async function main() {
  if (process.argv.includes('--help')) {
    console.log('node qualification/media-browser.cjs <private-manifest.json> <new-output-directory> <playwright-package-directory>');
    return;
  }
  if (process.argv.length !== 5) throw new Error('Expected manifest, output and installed Playwright directory');
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
  const { chromium } = require(path.resolve(process.argv[4]));
  let browser;
  const report = { observed_at_utc: new Date().toISOString(), scope: 'local bytes and local Range server',
    provider_playback_accepted: false, browsers_pending: ['Firefox', 'Safari', 'supported mobile'], entries: [] };
  const watchdog = setTimeout(() => { console.error('Local browser wall guard reached'); process.exit(1); }, 240000);
  try {
    browser = await chromium.launch({ headless: true });
    report.browser = browser.version();
    for (const entry of manifest.entries) {
      const page = await browser.newPage();
      await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
      await page.goto(origin + '/fixture');
      await page.evaluate(({ origin, entry }) => {
        document.querySelector('video').src = origin + '/' + entry.slug + '/video';
        for (const kind of ['poster', 'backdrop']) if (entry[kind]) document.getElementById(kind).src = origin + '/' + entry.slug + '/' + kind;
      }, { origin, entry });
      await page.waitForFunction(() => document.querySelector('video').readyState >= 2, null, { timeout: 20000 });
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
        width: v.videoWidth, height: v.videoHeight, error: v.error?.code ?? null }));
      if (!decode.video_frames || !decode.audio_bytes || decode.error) throw new Error(entry.slug + ': audio/video decoding failed');
      const artwork = {};
      for (const kind of ['poster', 'backdrop']) if (entry[kind]) {
        await page.waitForFunction(k => { const i = document.getElementById(k); return i.complete && i.naturalWidth > 0; }, kind, { timeout: 10000 });
        artwork[kind] = await page.$eval('#' + kind, i => ({ width: i.naturalWidth, height: i.naturalHeight }));
      }
      const rangeCount = ranges.get('/' + entry.slug + '/video') || 0;
      if (!rangeCount) throw new Error(entry.slug + ': no browser Range request');
      report.entries.push({ slug: entry.slug, duration, seeks, decode, artwork, range_requests: rangeCount, status: 'passed' });
      await page.close(); console.log(entry.slug + ': local Chromium decode/artwork/seek passed');
    }
    report.status = 'passed';
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
