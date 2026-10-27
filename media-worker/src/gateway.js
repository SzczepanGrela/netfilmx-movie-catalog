import { verifyGrant } from "./grant.js";
const own = (o, k) => Object.hasOwn(o, k), safeKey = /^[A-Za-z0-9_./-]{1,512}$/;
const error = (status, code, extra = {}) => new Response(JSON.stringify({ error: code }), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", ...extra } });
function rangeOf(value, size) {
  if (!value) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!m || !m[1] && !m[2] || value.length > 80) throw Error("range");
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] ? m[2] ? Math.min(Number(m[2]), size - 1) : size - 1 : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size || !m[1] && Number(m[2]) === 0) throw Error("range");
  return { offset: start, length: end - start + 1, end };
}
function metadata(obj, expected) {
  if (!obj || !Number.isSafeInteger(obj.size) || obj.size <= 0 || expected.size && obj.size !== expected.size || !Number.isFinite(new Date(obj.uploaded).getTime()) || typeof obj.httpEtag !== "string" || !/^"[a-zA-Z0-9-]+"$/.test(obj.httpEtag)) throw Error("metadata");
  return { size: obj.size, etag: obj.httpEtag, uploaded: new Date(obj.uploaded).toUTCString() };
}
function isUnmodified(request, meta) {
  const tag = request.headers.get("If-None-Match");
  if (tag) return tag === "*" || tag.split(",").some((t) => t.trim().replace(/^W\//, "") === meta.etag);
  const modified = request.headers.get("If-Modified-Since");
  return !!modified && Number.isFinite(Date.parse(modified)) && Date.parse(modified) >= Date.parse(meta.uploaded);
}
function rangeApplies(request, meta) {
  const v = request.headers.get("If-Range");
  return !v || v === meta.etag || Number.isFinite(Date.parse(v)) && Date.parse(v) >= Date.parse(meta.uploaded);
}
function responseHeaders(meta, obj, protectedMedia, origin) {
  const h = new Headers({ "Content-Type": obj.mime, "ETag": meta.etag, "Last-Modified": meta.uploaded, "Accept-Ranges": "bytes", "Cache-Control": protectedMedia ? "private, no-store" : "public, max-age=3600", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Vary": "Origin" });
  if (origin) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
    h.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified");
  }
  return h;
}
// The production entry embeds its catalogue; request/env data cannot replace it.
function createGateway(catalogue, { now = () => Math.floor(Date.now() / 1e3), cache: injectedCache } = {}) {
  async function handle(request, env, ctx) {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) return error(405, "method", { "Allow": "GET, HEAD, OPTIONS" });
      const url = new URL(request.url);
      // Inspect the received path before WHATWG URL normalization hides dot segments.
      const rawPath = /^https:\/\/[^/?#]+(\/[^?#]*)$/.exec(request.url)?.[1];
      if (!rawPath || rawPath !== url.pathname || url.protocol !== "https:" || /[%\\]/.test(rawPath) || rawPath.includes("//")) return error(400, "path");
      const origin = request.headers.get("Origin");
      if (!env.APP_ORIGIN || origin && origin !== env.APP_ORIGIN) return error(403, "origin");
      let key, film, claims;
      if (url.pathname.startsWith("/g/")) {
        const parts = url.pathname.slice(3).split("/");
        if (parts.length < 3 || parts[0].length > 2048) return error(403, "grant");
        const token = parts.shift();
        film = parts.shift();
        key = parts.join("/");
        if (!own(catalogue.films, film)) return error(404, "unknown");
        if (!safeKey.test(key) || key.split("/").some((p) => p === "" || p === "." || p === "..") || !own(catalogue.objects, key) || catalogue.objects[key].film !== film) return error(404, "unknown");
        try {
          claims = await verifyGrant(token, film, catalogue.version, env, now());
        } catch {
          return error(403, "grant");
        }
      } else {
        key = url.pathname.slice(1);
        if (!safeKey.test(key) || !own(catalogue.objects, key) || catalogue.objects[key].film !== null) return error(404, "unknown");
      }
      const ip = request.headers.get("CF-Connecting-IP") || "unavailable";
      if (!env.REQUEST_LIMIT || !(await env.REQUEST_LIMIT.limit({ key: ip })).success || claims && (!env.GRANT_LIMIT || !(await env.GRANT_LIMIT.limit({ key: claims.jti })).success)) return error(429, "rate", { "Retry-After": "60" });
      if (request.method === "OPTIONS") {
        if (!origin || !["GET", "HEAD"].includes(request.headers.get("Access-Control-Request-Method"))) return error(403, "preflight");
        const requested = (request.headers.get("Access-Control-Request-Headers") || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
        if (requested.some((h) => !["range", "if-none-match", "if-modified-since", "if-range"].includes(h))) return error(403, "preflight");
        return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, HEAD", "Access-Control-Allow-Headers": "Range, If-None-Match, If-Modified-Since, If-Range", "Vary": "Origin", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
      }
      if (request.headers.has("If-Match") || request.headers.has("If-Unmodified-Since")) return error(400, "unsupported_precondition");
      const obj = catalogue.objects[key];
      if (request.headers.has("Range") && request.method === "GET") {
        try {
          rangeOf(request.headers.get("Range"), obj.size || Number.MAX_SAFE_INTEGER);
        } catch {
          return error(416, "range", obj.size ? { "Content-Range": `bytes */${obj.size}` } : {});
        }
      }
      const cache = injectedCache || caches.default, cacheKey = new Request(`${url.origin}/__objects/${catalogue.version}/${key}`);
      const cached = await cache.match(cacheKey);
      let meta;
      if (cached) {
        if (cached.status !== 200) throw Error("cache");
        meta = metadata({ size: Number(cached.headers.get("Content-Length")), httpEtag: cached.headers.get("ETag"), uploaded: cached.headers.get("Last-Modified") }, obj);
      } else meta = metadata(await env.MEDIA.head(key), obj);
      const headers = responseHeaders(meta, obj, !!claims, origin);
      if (isUnmodified(request, meta)) return new Response(null, { status: 304, headers });
      let range = null;
      try {
        if (request.method === "GET" && rangeApplies(request, meta)) range = rangeOf(request.headers.get("Range"), meta.size);
      } catch {
        return error(416, "range", { "Content-Range": `bytes */${meta.size}`, ...origin ? { "Access-Control-Allow-Origin": origin } : {} });
      }
      headers.set("Content-Length", String(range ? range.length : meta.size));
      if (range) headers.set("Content-Range", `bytes ${range.offset}-${range.end}/${meta.size}`);
      if (request.method === "HEAD") return new Response(null, { headers });
      if (cached) {
        const body = range ? await cache.match(new Request(cacheKey, { headers: { Range: `bytes=${range.offset}-${range.end}` } })) : cached;
        if (!body || body.status !== (range ? 206 : 200) || range && body.headers.get("Content-Range") !== headers.get("Content-Range")) throw Error("cache");
        return new Response(body.body, { status: range ? 206 : 200, headers });
      }
      const fetched = await env.MEDIA.get(key, { onlyIf: { etagMatches: meta.etag.slice(1, -1) }, ...range ? { range: { offset: range.offset, length: range.length } } : {} });
      if (!fetched || !("body" in fetched) || metadata(fetched, obj).etag !== meta.etag || fetched.size !== meta.size) throw Error("object");
      const response = new Response(fetched.body, { status: range ? 206 : 200, headers });
      if (!range) {
        const internal = response.clone(), h = new Headers(headers);
        for (const name of ["Access-Control-Allow-Origin", "Access-Control-Expose-Headers", "Vary", "Referrer-Policy"]) h.delete(name);
        h.set("Cache-Control", "public, max-age=86400");
        ctx.waitUntil(cache.put(cacheKey, new Response(internal.body, { headers: h })).catch(() => {
        }));
      }
      return response;
    } catch {
      return error(503, "media_unavailable");
    }
  }
  return { async fetch(request, env, ctx) {
    const response = await handle(request, env, ctx);
    if (request.headers.get("Origin") === env.APP_ORIGIN) {
      response.headers.set("Access-Control-Allow-Origin", env.APP_ORIGIN);
      response.headers.set("Vary", "Origin");
    }
    return response;
  } };
}
export {
  createGateway
};
