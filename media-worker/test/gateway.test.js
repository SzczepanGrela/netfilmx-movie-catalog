import test from "node:test";
import assert from "node:assert/strict";
import { fixture, grant, jwk } from "./fixture.js";
import { verifyGrant } from "../src/grant.js";
import { readFile } from "node:fs/promises";
for (const path of ["/videos/sintel/master.m3u8", "/videos/sintel.mkv", "/unknown", "/__objects/x", "/posters/unknown.jpg", "/g/invalid/sintel/videos/sintel/master.m3u8", "/g/invalid/charge/videos/sintel/master.m3u8"]) {
  test("denied path never touches cache/R2: " + path, async () => {
    const f = fixture(), r = await f.fetch(path);
    assert.ok(r.status >= 400);
    assert.equal(f.stats.heads + f.stats.gets, 0);
    assert.equal(f.cache.lookups, 0);
  });
}
test("authorized cache bytes are shared, authorization still runs on warm GET/HEAD/Range/conditional/OPTIONS", async () => {
  const f = fixture();
  let r = await f.fetch(f.path());
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Cache-Control"), /no-store/);
  await r.text();
  assert.equal(f.stats.gets, 1);
  assert.equal(f.cache.puts, 1);
  for (const options of [{}, { method: "HEAD" }, { headers: { Range: "bytes=0-4" } }, { headers: { "If-None-Match": '"fixture-etag"' } }, { method: "OPTIONS", headers: { Origin: f.env.APP_ORIGIN, "Access-Control-Request-Method": "GET" } }]) {
    r = await f.fetch(f.path(), options);
    assert.ok([200, 206, 304, 204].includes(r.status));
    const before = f.cache.lookups;
    const denied = await f.fetch(f.path("bad"), options);
    assert.equal(denied.status, 403);
    assert.equal(f.cache.lookups, before);
  }
  assert.equal(f.stats.gets, 1);
  assert.equal(f.stats.heads, 1);
  for (const key of f.cache.map.keys()) {
    assert.ok(!key.includes("/g/"));
    assert.ok(key.includes("/__objects/" + f.catalogue.version + "/"));
  }
});
test("GET HEAD Range suffix/open-ended/If-Range/304 and CORS preserve exact semantics", async () => {
  const f = fixture(), path = f.path(void 0, "videos/sintel/segment.ts");
  let r = await f.fetch(path, { method: "HEAD", headers: { Origin: f.env.APP_ORIGIN } });
  assert.equal(await r.text(), "");
  assert.equal(r.headers.get("Content-Length"), "10");
  assert.equal(f.stats.gets, 0);
  r = await f.fetch(path, { headers: { Range: "bytes=2-5", Origin: f.env.APP_ORIGIN } });
  assert.equal(r.status, 206);
  assert.equal(await r.text(), "2345");
  assert.equal(r.headers.get("Content-Range"), "bytes 2-5/10");
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), f.env.APP_ORIGIN);
  assert.equal(f.cache.puts, 0);
  r = await f.fetch(path, { headers: { Range: "bytes=-3" } });
  assert.equal(await r.text(), "789");
  r = await f.fetch(path, { headers: { Range: "bytes=8-" } });
  assert.equal(await r.text(), "89");
  r = await f.fetch(path, { headers: { Range: "bytes=2-5", "If-Range": '"old"' } });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "0123456789");
  assert.equal(f.cache.puts, 1);
  r = await f.fetch(path, { headers: { Range: "bytes=2-5" } });
  assert.equal(r.status, 206);
  assert.equal(await r.text(), "2345");
  r = await f.fetch(path, { headers: { "If-Modified-Since": "Thu, 01 Jan 2026 00:00:00 GMT" } });
  assert.equal(r.status, 304);
});
for (const range of ["bytes=0-1,3-4", "items=0-1", "bytes=-0", "bytes=99-", "bytes=8-2", "bytes=9007199254740992-"]) {
  test("unsupported range rejected before R2: " + range, async () => {
    const f = fixture(), r = await f.fetch(f.path(void 0, "videos/sintel/segment.ts"), { headers: { Range: range } });
    assert.equal(r.status, 416);
    assert.equal(f.stats.gets + f.stats.heads, 0);
  });
}
test("relative HLS graph and subtitle use the same signed prefix", async () => {
  const f = fixture(), token = grant(), start = f.path(token);
  const master = await (await f.fetch(start)).text();
  const variant = new URL(master.trim().split("\n").at(-1), "https://media.example.test" + start).pathname;
  const playlist = await (await f.fetch(variant)).text();
  const segment = new URL(playlist.split("\n").find((l) => l === "segment.ts"), "https://media.example.test" + variant).pathname;
  assert.equal(await (await f.fetch(segment)).text(), "0123456789");
  assert.ok(segment.startsWith("/g/" + token + "/sintel/"));
  const vtt = await f.fetch(f.path(token, "subtitles/sintel/pl.vtt"));
  assert.match(await vtt.text(), /Żółć źródło/);
  assert.equal((await f.fetch(f.path(token, "videos/charge/master.m3u8", "charge"))).status, 403);
});
test("only reviewed public artwork is anonymous; wrong Origin/method/query/encoding never hit R2", async () => {
  const f = fixture();
  assert.equal((await f.fetch("/posters/sintel.jpg")).status, 200);
  for (const [path, options] of [[f.path() + "?x=1", {}], [f.path().replace("videos/", "videos%2f"), {}], [f.path(), { method: "POST" }], [f.path(), { headers: { Origin: "https://evil.example" } }]]) {
    const before = f.stats.gets + f.stats.heads;
    assert.ok((await f.fetch(path, options)).status >= 400);
    assert.equal(f.stats.gets + f.stats.heads, before);
  }
});
test("rate binding failure/denial and R2 failure stay closed", async () => {
  const f = fixture();
  f.env.GRANT_LIMIT.limit = async () => ({ success: false });
  assert.equal((await f.fetch(f.path())).status, 429);
  assert.equal(f.stats.gets + f.stats.heads, 0);
  f.env.GRANT_LIMIT.limit = async () => {
    throw Error("unavailable");
  };
  assert.equal((await f.fetch(f.path())).status, 503);
  f.env.GRANT_LIMIT.limit = async () => ({ success: true });
  f.env.MEDIA.head = async () => {
    throw Error("R2");
  };
  assert.equal((await f.fetch(f.path())).status, 503);
});
test("strict claims and algorithm/key rotation are checked even for correctly signed grants", async () => {
  const f = fixture(), now = Math.floor(Date.now() / 1e3);
  for (const changes of [{ exp: now - 1 }, { iat: now + 31, nbf: now + 31, exp: now + 1800 }, { exp: now + 1801 }, { exp: String(now + 1800) }, { ver: "b".repeat(64) }, { aud: ["test-media"] }, { iss: "admin" }, { jti: 4 }, { nbf: now - 1 }, { prefix: "videos" }]) assert.equal((await f.fetch(f.path(grant(changes)))).status, 403);
  assert.equal((await f.fetch(f.path(grant({}, { alg: "HS256" })))).status, 403);
  assert.equal((await f.fetch(f.path(grant({}, { kid: "unknown" })))).status, 403);
  const token = grant();
  assert.equal((await f.fetch(f.path(token))).status, 200);
  f.env.GRANT_PUBLIC_KEYS = JSON.stringify({ keys: [{ ...jwk, kid: "replacement" }] });
  assert.equal((await f.fetch(f.path(token))).status, 403);
});
test("cross-runtime .NET issuer vectors", { skip: !process.env.NETFILMX_GRANT_VECTORS }, async () => {
  const input = JSON.parse(await readFile(process.env.NETFILMX_GRANT_VECTORS, "utf8"));
  const env = { GRANT_ISSUER: "test-issuer", GRANT_AUDIENCE: "test-media", GRANT_PUBLIC_KEYS: JSON.stringify(input.jwks) };
  for (const vector of input.vectors) {
    let accepted = false;
    try {
      await verifyGrant(vector.token, vector.film, input.version, env, input.now);
      accepted = true;
    } catch {
    }
    assert.equal(accepted, vector.accepted, vector.name);
  }
});

test("CORS remains readable on authorization denial, and unsupported preconditions never touch R2",async()=>{
 const f=fixture();
 const denied=await f.fetch(f.path("invalid"),{headers:{Origin:f.env.APP_ORIGIN}});
 assert.equal(denied.status,403);assert.equal(denied.headers.get("Access-Control-Allow-Origin"),f.env.APP_ORIGIN);
 const unsupported=await f.fetch(f.path(),{headers:{"If-Match":"\"other\""}});
 assert.equal(unsupported.status,400);assert.equal(f.stats.gets+f.stats.heads,0);
});
