import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { fileURLToPath } from "node:url";
import { fixture, grant } from "./fixture.js";
test("actual workerd R2 and Cache API serve full/HEAD/Range while warm unauthorized stays denied", async () => {
  const f = fixture();
  const bundle = await build({ stdin: { contents: `import {createGateway} from './src/gateway.js'; export default createGateway(${JSON.stringify(f.catalogue)});`, resolveDir: fileURLToPath(new URL("..", import.meta.url)), sourcefile: "synthetic-only-entry.js" }, bundle: true, write: false, format: "esm", platform: "browser" });
  const mf = new Miniflare({
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: "2026-07-30",
    r2Buckets: ["MEDIA"],
    bindings: Object.fromEntries(Object.entries(f.env).filter(([, v]) => typeof v === "string")),
    ratelimits: { REQUEST_LIMIT: { namespace_id: "1", simple: { limit: 1200, period: 60 } }, GRANT_LIMIT: { namespace_id: "2", simple: { limit: 180, period: 60 } } }
  });
  try {
    const bucket = await mf.getR2Bucket("MEDIA");
    for (const [key, body] of Object.entries(f.data)) await bucket.put(key, body, { httpMetadata: { contentType: f.catalogue.objects[key].mime } });
    const token = grant(), url = "https://media.example.test" + f.path(token, "videos/sintel/segment.ts");
    let response = await mf.dispatchFetch(url, { headers: { Origin: f.env.APP_ORIGIN } });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "0123456789");
    response = await mf.dispatchFetch(url, { headers: { Range: "bytes=2-5", Origin: f.env.APP_ORIGIN } });
    assert.equal(response.status, 206);
    assert.equal(await response.text(), "2345");
    assert.equal(response.headers.get("Content-Range"), "bytes 2-5/10");
    await bucket.delete("videos/sintel/segment.ts");
    response = await mf.dispatchFetch(url, { method: "HEAD" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Length"), "10");
    response = await mf.dispatchFetch("https://media.example.test" + f.path("invalid", "videos/sintel/segment.ts"), { headers: { Range: "bytes=0-2" } });
    assert.equal(response.status, 403);
    response = await mf.dispatchFetch("https://media.example.test/videos/sintel/segment.ts");
    assert.equal(response.status, 404);
  } finally {
    await mf.dispose();
  }
});
