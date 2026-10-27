const decoder = new TextDecoder("utf-8", { fatal: true }), keys = /* @__PURE__ */ new Map(), identifier = /^[a-zA-Z0-9_-]{1,64}$/;
function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw Error("encoding");
  const bytes = Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  if (btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_") !== value) throw Error("encoding");
  return bytes;
}
async function verifyGrant(token, film, version, env, now = Math.floor(Date.now() / 1e3)) {
  if (typeof token !== "string" || token.length > 2048 || !env.GRANT_ISSUER || !env.GRANT_AUDIENCE) throw Error("grant");
  const parts = token.split(".");
  if (parts.length !== 3) throw Error("grant");
  const header = JSON.parse(decoder.decode(decode(parts[0]))), claims = JSON.parse(decoder.decode(decode(parts[1])));
  if (!header || Object.keys(header).sort().join(",") !== "alg,kid,typ" || header.alg !== "RS256" || header.typ !== "nfx-playback+jwt" || typeof header.kid !== "string" || !identifier.test(header.kid)) throw Error("header");
  if (!claims || Object.keys(claims).sort().join(",") !== "aud,exp,film,iat,iss,jti,nbf,ver" || claims.iss !== env.GRANT_ISSUER || claims.aud !== env.GRANT_AUDIENCE || typeof film !== "string" || claims.film !== film || claims.ver !== version || !identifier.test(film) || !/^[a-f0-9]{64}$/.test(version) || typeof claims.jti !== "string" || !/^[a-f0-9]{32}$/.test(claims.jti) || ![claims.iat, claims.nbf, claims.exp].every(Number.isSafeInteger) || claims.nbf !== claims.iat || claims.iat > now + 30 || claims.exp <= now || claims.exp <= claims.iat || claims.exp - claims.iat > 1800) throw Error("claims");
  const jwks = JSON.parse(env.GRANT_PUBLIC_KEYS);
  if (!Array.isArray(jwks.keys) || jwks.keys.length < 1 || jwks.keys.length > 2) throw Error("keys");
  const matches = jwks.keys.filter((k) => k.kid === header.kid);
  if (matches.length !== 1) throw Error("kid");
  const jwk = matches[0];
  if (jwk.kty !== "RSA" || jwk.alg !== "RS256" || jwk.use !== "sig" || ["d", "p", "q", "dp", "dq", "qi", "oth"].some((k) => Object.hasOwn(jwk, k)) || !jwk.n || !jwk.e || decode(jwk.n).length < 256 || decode(jwk.n).length > 512) throw Error("key");
  const cacheId = JSON.stringify(jwk);
  let key = keys.get(cacheId);
  if (!key) {
    key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (keys.size >= 4) keys.clear();
    keys.set(cacheId, key);
  }
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]))) throw Error("signature");
  return claims;
}
export {
  verifyGrant
};
