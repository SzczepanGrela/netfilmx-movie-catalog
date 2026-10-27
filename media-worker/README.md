# NetFilmx read-only media gateway

Code, allowlist, locked local tooling and tests for NAB26-1. No Worker has been
published by this implementation. Read the [protocol and release contract](../docs/playback-protection.md).

```bash
npm ci --ignore-scripts
npm audit --audit-level=low
npm run build
NETFILMX_GRANT_VECTORS=/absolute/path/to/local/dotnet-vectors.json npm test
npm run bench
```

Production has no runtime npm dependencies. Miniflare/esbuild/Playwright are
local/CI tools. Patched undici/sharp overrides remove advisories from the pinned
Miniflare tool chain; the native Worker does not run those Node libraries.
`dist/worker.js` embeds the reviewed immutable catalogue. Keep a completed
Wrangler configuration and signing material outside Git; the example is purposely
not a deployment target. Bind existing R2, rate limits and public JWKS only after
coordinator review. No credential discovery or provider-write command is included.
