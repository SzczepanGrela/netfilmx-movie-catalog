import { performance } from "node:perf_hooks";
import catalogue from "../catalogue.json" with {type:"json"};
import { createGateway } from "../src/gateway.js";
import { grant, jwk } from "./fixture.js";
const film = "sintel", key = catalogue.films[film].master, obj = catalogue.objects[key];
const token = grant({ ver: catalogue.version });
const cache = { async match() {
  return new Response(null, { headers: { "Content-Length": String(obj.size), "ETag": '"benchmark"', "Last-Modified": "Thu, 01 Jan 2026 00:00:00 GMT" } });
} };
const env = { APP_ORIGIN: "https://app.example.test", GRANT_ISSUER: "test-issuer", GRANT_AUDIENCE: "test-media", GRANT_PUBLIC_KEYS: JSON.stringify({ keys: [jwk] }), REQUEST_LIMIT: { limit: async () => ({ success: true }) }, GRANT_LIMIT: { limit: async () => ({ success: true }) }, MEDIA: { head() {
  throw Error("Unexpected R2");
} } };
const worker = createGateway(catalogue, { cache });
const request = new Request("https://media.example.test/g/" + token + "/" + film + "/" + key, { method: "HEAD" });
await worker.fetch(request, env, {});
const samples = [], start = process.cpuUsage(), wall = performance.now();
for (let i = 0; i < 1e3; i++) {
  const now = performance.now(), r = await worker.fetch(request, env, {});
  if (r.status !== 200) throw Error("failed");
  samples.push(performance.now() - now);
}
const used = process.cpuUsage(start);
samples.sort((a, b) => a - b);
console.log(JSON.stringify({ engine: process.version, requests: 1e3, objects: Object.keys(catalogue.objects).length, totalCpuMs: (used.user + used.system) / 1e3, cpuMsPerRequest: (used.user + used.system) / 1e6, wallMs: performance.now() - wall, p50WallMs: samples[500], p95WallMs: samples[950], p99WallMs: samples[990], r2Calls: 0, scope: "Warm authorized HEAD; real signature each request; local Node CPU proxy, not production workerd CPU or quota proof" }, null, 2));
