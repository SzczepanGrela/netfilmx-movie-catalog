import { generateKeyPairSync, sign, randomUUID } from "node:crypto";
import { createGateway } from "../src/gateway.js";
const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...pair.publicKey.export({ format: "jwk" }), alg: "RS256", use: "sig", kid: "test-key" };
function grant(change = {}, headerChange = {}) {
  const now = Math.floor(Date.now() / 1e3);
  const header = { alg: "RS256", typ: "nfx-playback+jwt", kid: "test-key", ...headerChange };
  const claims = { iss: "test-issuer", aud: "test-media", film: "sintel", ver: "a".repeat(64), iat: now, nbf: now, exp: now + 1800, jti: randomUUID().replaceAll("-", ""), ...change };
  const input = [header, claims].map((v) => Buffer.from(JSON.stringify(v)).toString("base64url")).join(".");
  return input + "." + sign("RSA-SHA256", Buffer.from(input), pair.privateKey).toString("base64url");
}
class MemoryCache {
  map = /* @__PURE__ */ new Map();
  lookups = 0;
  puts = 0;
  async match(request) {
    this.lookups++;
    const found = this.map.get(request.url);
    if (!found) return void 0;
    const range = request.headers.get("Range");
    if (!range) return found.clone();
    const m = /bytes=(\d+)-(\d+)/.exec(range), bytes = new Uint8Array(await found.clone().arrayBuffer());
    const start = Number(m[1]), end = Number(m[2]), headers = new Headers(found.headers);
    headers.set("Content-Length", end - start + 1);
    headers.set("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
    return new Response(bytes.slice(start, end + 1), { status: 206, headers });
  }
  async put(request, response) {
    if (response.status !== 200) throw Error("not full");
    this.puts++;
    this.map.set(request.url, response);
  }
}
function fixture() {
  const data = {
    "videos/sintel/master.m3u8": "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100000\nstream.m3u8\n",
    "videos/sintel/stream.m3u8": "#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\nsegment.ts\n#EXT-X-ENDLIST\n",
    "videos/sintel/segment.ts": "0123456789",
    "subtitles/sintel/pl.vtt": "WEBVTT\n\n00:00:00.500 --> 00:00:01.500\n\u017B\xF3\u0142\u0107 \u017Ar\xF3d\u0142o\n",
    "videos/charge/master.m3u8": "#EXTM3U\n",
    "posters/sintel.jpg": "picture"
  };
  const catalogue = { version: "a".repeat(64), films: { sintel: {}, charge: {} }, objects: Object.fromEntries(Object.entries(data).map(([key, body]) => [key, { film: key.startsWith("posters") ? null : key.includes("charge") ? "charge" : "sintel", mime: key.endsWith(".ts") ? "video/mp2t" : key.endsWith(".vtt") ? "text/vtt; charset=utf-8" : key.endsWith(".jpg") ? "image/jpeg" : "application/vnd.apple.mpegurl", size: Buffer.byteLength(body) }])) };
  const stats = { heads: 0, gets: 0, ranges: [], limits: [] }, cache = new MemoryCache(), pending = [];
  const env = {
    APP_ORIGIN: "https://app.example.test",
    GRANT_ISSUER: "test-issuer",
    GRANT_AUDIENCE: "test-media",
    GRANT_PUBLIC_KEYS: JSON.stringify({ keys: [jwk] }),
    REQUEST_LIMIT: { async limit({ key }) {
      stats.limits.push(["ip", key]);
      return { success: true };
    } },
    GRANT_LIMIT: { async limit({ key }) {
      stats.limits.push(["grant", key]);
      return { success: true };
    } },
    MEDIA: { async head(key) {
      stats.heads++;
      return meta(key);
    }, async get(key, options) {
      stats.gets++;
      stats.ranges.push(options.range);
      let body = new TextEncoder().encode(data[key]);
      if (options.range) body = body.slice(options.range.offset, options.range.offset + options.range.length);
      return { ...meta(key), body: new Response(body).body };
    } }
  };
  function meta(key) {
    return data[key] === void 0 ? null : { size: Buffer.byteLength(data[key]), httpEtag: '"fixture-etag"', uploaded: /* @__PURE__ */ new Date("2026-01-01T00:00:00Z") };
  }
  const gateway = createGateway(catalogue, { cache });
  async function fetch(path2, options = {}) {
    const result = await gateway.fetch(new Request("https://media.example.test" + path2, options), env, { waitUntil(p) {
      pending.push(p);
    } });
    await Promise.all(pending.splice(0));
    return result;
  }
  const path = (token = grant(), key = "videos/sintel/master.m3u8", film = "sintel") => "/g/" + token + "/" + film + "/" + key;
  return { fetch, path, cache, stats, env, catalogue, data };
}
export {
  MemoryCache,
  fixture,
  grant,
  jwk,
  pair
};
