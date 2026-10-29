import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const source = await readFile(new URL('../wwwroot/js/video-player.js', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
async function fixture({ ready = true, answer = true, status = 200, pendingPlay = false } = {}) {
  const dom = new JSDOM(`<div id="playback-gate" data-video-id="1" data-sitekey="public-fixture" data-stage="ready">
    <media-player id="main-video-player"><media-provider></media-provider></media-player>
    <div id="playback-verification"><p id="playback-status"></p><div id="playback-challenge"></div><button id="playback-start">Play film</button></div>
  </div>`, { runScripts: 'outside-only', url: 'https://app.example.test/home/watch/1' });
  const w = dom.window, document = w.document, gate = document.querySelector('#playback-gate'), button = document.querySelector('button');
  let now = 1800000000000, timerId = 0, calls = 0, plays = 0, sdkReady = false;
  const timers = new Map(), widgets = [], scripts = [];
  w.Date.now = () => now;
  w.setTimeout = (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; };
  w.clearTimeout = id => timers.delete(id);
  class Player extends w.HTMLElement {
    paused = true; currentTime = 0; duration = 120; provider = null;
    qualities = { switch: '', auto: true, selected: null, toArray: () => [], autoSelect() { this.auto = true; } };
    textTracks = Object.assign(new w.EventTarget(), { selected: null, preferredLang: '', toArray: () => [] });
    set src(value) {
      this.source = value;
      this.provider = value ? {} : null;
      if (!value) queueMicrotask(() => this.dispatchEvent(new w.CustomEvent('provider-change', { detail: null })));
    }
    get src() { return this.source; }
    startLoading() { queueMicrotask(() => this.dispatchEvent(new w.Event('can-play'))); }
    play() {
      plays++; this.paused = false;
      return pendingPlay ? new Promise((resolve, reject) => { this.rejectPlay = reject; }) : Promise.resolve();
    }
    pause() {
      this.paused = true;
      if (this.rejectPlay) { this.rejectPlay(new w.DOMException('Play interrupted by pause', 'AbortError')); this.rejectPlay = null; }
    }
  }
  w.customElements.define('media-player', Player);
  w.AbortController = AbortController;
  w.fetch = async path => {
    if (path === '/auth/csrf') return { ok: true, json: async () => ({ token: 'csrf-fixture' }) };
    assert.equal(path, '/playback/grant'); calls++;
    return { ok: status === 200, status, json: async () => ({ url: 'https://media.example.test/g/private-fixture/sintel/master.m3u8', subtitles: [], expiresAt: Math.floor(now / 1000) + 1800 }) };
  };
  const emit = (index, name = 'callback', value = 'private-fixture-token') => widgets[index].options[name]?.(value);
  const sdk = {
    // The real provider rejects ready() when api.js is async/defer (3857).
    ready() { throw Error('3857: ready() requires a synchronous script'); },
    render(selector, options) { assert.ok(sdkReady, 'render before SDK readiness'); widgets.push({ options }); return widgets.length - 1; },
    execute(id) { if (answer) queueMicrotask(() => emit(id)); },
    remove(id) { widgets[id].removed = true; }
  };
  const providerReady = () => {
    sdkReady = true;
    const script = scripts.at(-1);
    const callback = new URL(script.src).searchParams.get('onload');
    w[callback]?.();
  };
  const append = document.head.append.bind(document.head);
  document.head.append = script => {
    append(script); scripts.push(script);
    queueMicrotask(() => {
      w.turnstile = sdk;
      // Download completion can precede the provider's readiness callback.
      script.dispatchEvent(new w.Event('load'));
      if (ready) providerReady();
    });
  };
  w.eval(source); await flush();
  return { dom, gate, button, widgets, scripts, player: document.querySelector('media-player'), emit,
    calls: () => calls, plays: () => plays,
    ready: async () => { providerReady(); await flush(); },
    sdkError: async () => { scripts.at(-1).dispatchEvent(new w.Event('error')); await flush(); },
    advance: async ms => { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } await flush(); },
    status: value => { status = value; }, answer: value => { answer = value; }
  };
}

test('watch prepares access without a click, waits for SDK ready and never autoplays', async () => {
  const f = await fixture({ ready: false });
  try {
    assert.equal(f.widgets.length, 0); assert.equal(f.calls(), 0);
    assert.equal(f.gate.dataset.stage, 'verifying');
    assert.equal(f.scripts.length, 1); assert.equal(f.scripts[0].async, true);
    await f.ready();
    assert.equal(f.gate.dataset.stage, 'authorized'); assert.equal(f.calls(), 1);
    assert.equal(f.player.paused, true); assert.equal(f.plays(), 0);
    assert.equal(f.gate.getAttribute('aria-busy'), 'false');
    assert.equal(f.dom.window.document.querySelector('#playback-verification').style.display, 'none');
  } finally { f.dom.window.close(); }
});

test('one normal Play during background loading is retained without a duplicate grant', async () => {
  const f = await fixture({ answer: false });
  try {
    f.button.click(); assert.equal(f.button.disabled, true);
    f.emit(0); await flush();
    assert.equal(f.calls(), 1); assert.equal(f.plays(), 1); assert.equal(f.player.paused, false);
    for (const event of ['callback', 'expired-callback', 'timeout-callback', 'error-callback']) f.emit(0, event);
    await flush();
    assert.equal(f.gate.dataset.stage, 'authorized'); assert.equal(f.calls(), 1); assert.equal(f.plays(), 1);
  } finally { f.dom.window.close(); }
});

test('silent provider timeout ends once, exposes a safe code and permits an explicit fresh retry', async () => {
  const f = await fixture({ answer: false });
  try {
    await f.advance(30001);
    assert.equal(f.gate.dataset.stage, 'error'); assert.equal(f.gate.dataset.errorCode, 'challenge_timeout');
    assert.equal(f.button.disabled, false); assert.equal(f.widgets[0].removed, true);
    await f.advance(60000); assert.equal(f.widgets.length, 1); assert.equal(f.calls(), 0);
    f.button.click(); await flush(); assert.equal(f.widgets.length, 2);
    for (const event of ['callback', 'expired-callback', 'error-callback']) f.emit(0, event);
    await flush(); assert.equal(f.calls(), 0); assert.equal(f.gate.dataset.stage, 'verifying');
    f.emit(1); await flush(); assert.equal(f.calls(), 1); assert.equal(f.gate.dataset.stage, 'authorized');
  } finally { f.dom.window.close(); }
});

test('SDK readiness timeout is distinct from provider rejection and does not render a widget', async () => {
  const f = await fixture({ ready: false });
  try {
    await f.advance(8001);
    assert.equal(f.gate.dataset.errorCode, 'sdk_timeout'); assert.equal(f.widgets.length, 0);
    await f.ready(); assert.equal(f.widgets.length, 0); assert.equal(f.calls(), 0);
  } finally { f.dom.window.close(); }
});

test('retry shares a slow SDK load and a late callback activates only the current attempt', async () => {
  const f = await fixture({ ready: false });
  try {
    await f.advance(8001);
    f.button.click(); await flush();
    assert.equal(f.scripts.length, 1); assert.equal(f.gate.dataset.stage, 'verifying');
    await f.ready();
    assert.equal(f.widgets.length, 1); assert.equal(f.calls(), 1); assert.equal(f.plays(), 1);
    assert.equal(f.gate.dataset.stage, 'authorized');
    const name = new URL(f.scripts[0].src).searchParams.get('onload');
    assert.equal(f.dom.window[name], undefined);
  } finally { f.dom.window.close(); }
});

test('a provider that finishes after timeout is reused only after explicit retry', async () => {
  const f = await fixture({ ready: false });
  try {
    await f.advance(8001); await f.ready();
    assert.equal(f.gate.dataset.stage, 'error'); assert.equal(f.calls(), 0);
    f.button.click(); await flush();
    assert.equal(f.scripts.length, 1); assert.equal(f.calls(), 1);
    assert.equal(f.gate.dataset.stage, 'authorized');
  } finally { f.dom.window.close(); }
});

test('a failed script load stays closed and permits one fresh download on explicit retry', async () => {
  const f = await fixture({ ready: false });
  try {
    await f.sdkError();
    assert.equal(f.gate.dataset.errorCode, 'sdk_load_failed'); assert.equal(f.calls(), 0);
    assert.equal(f.scripts[0].isConnected, false);
    f.button.click(); await flush();
    assert.equal(f.scripts.length, 2);
    await f.ready();
    assert.equal(f.calls(), 1); assert.equal(f.gate.dataset.stage, 'authorized');
  } finally { f.dom.window.close(); }
});

test('only a current six-digit provider code is exposed and retry clears it', async () => {
  const f = await fixture({ answer: false });
  try {
    f.emit(0, 'error-callback', '110200'); await flush();
    assert.equal(f.gate.dataset.providerCode, '110200');
    f.button.click(); await flush();
    assert.equal(f.gate.dataset.providerCode, undefined);
    f.emit(0, 'error-callback', '110100'); await flush();
    assert.equal(f.gate.dataset.providerCode, undefined);
    f.emit(1, 'error-callback', 'private-fixture-token'); await flush();
    assert.equal(f.gate.dataset.providerCode, undefined);
    assert.equal(f.gate.outerHTML.includes('private-fixture-token'), false);
  } finally { f.dom.window.close(); }
});

for (const [status, code] of [[400, 'grant_rejected'], [429, 'grant_limited'], [503, 'playback_unavailable']]) {
  test(`grant HTTP ${status} stays closed with safe diagnostics and no hidden retry`, async () => {
    const f = await fixture({ status });
    try {
      assert.equal(f.gate.dataset.stage, 'error'); assert.equal(f.gate.dataset.errorPhase, 'grant');
      assert.equal(f.gate.dataset.errorCode, code); assert.equal(f.player.src, undefined);
      assert.equal(f.gate.outerHTML.includes('private-fixture'), false);
      await f.advance(61000); assert.equal(f.calls(), 1); assert.equal(f.widgets.length, 1);
    } finally { f.dom.window.close(); }
  });
}

test('actual grant expiry renews once in the background and preserves paused position', async () => {
  const f = await fixture();
  try {
    f.player.currentTime = 37;
    await f.advance(1800001);
    assert.equal(f.calls(), 2); assert.equal(f.player.currentTime, 37);
    assert.equal(f.player.paused, true); assert.equal(f.plays(), 0);
    assert.equal(f.gate.dataset.stage, 'authorized');
  } finally { f.dom.window.close(); }
});

test('pausing a pending play does not replace a valid player with a retry gate', async () => {
  const f = await fixture({ answer: false, pendingPlay: true });
  try {
    f.button.click(); f.emit(0); await flush();
    assert.equal(f.gate.dataset.stage, 'authorized');
    f.player.pause(); await flush();
    assert.equal(f.gate.dataset.stage, 'authorized');
    assert.equal(f.player.paused, true);
    assert.equal(f.calls(), 1);
    assert.equal(f.dom.window.document.querySelector('#playback-verification').style.display, 'none');
  } finally { f.dom.window.close(); }
});
