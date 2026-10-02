# Authentication and session contract

The modernization branch uses JWT access tokens and random refresh tokens in
`Secure`, `HttpOnly`, `SameSite=Strict`, host-scoped cookies. HTTPS is required.
Refresh tokens are stored only as SHA-256 hashes; never log or export their raw
values. This document describes candidate code, not production acceptance.

## Configuration

`JwtSettings:SecretKey` must be supplied through the secret configuration, contain
at least 32 bytes and be generated randomly. Length validation does not prove
entropy. There is no built-in fallback key. `Issuer` and `Audience` are required.
`AccessTokenTtlMinutes` defaults to 15 and accepts 1–60. Startup rejects invalid
configuration before automatic migration or HTTP traffic. Both JWT validation
paths require issuer, audience, lifetime, signature and HS256, with zero clock skew.

Refresh lifetimes retain the configured `RefreshTokenTtlDays` (default 7) and
`RefreshTokenTtlDaysRemember` (default 30). Rotation preserves the original
absolute expiry, including remembered logins; it does not indefinitely extend a
session. Cookies use the actual persisted refresh-session expiry.

## Browser requests

MVC unsafe methods require an antiforgery token. Razor POST forms generate it;
logout is a POST form and GET `/auth/logout` has no side effect. AJAX callers can
GET `/auth/csrf` (no-store) with their current cookies, then submit the returned
`token` as `X-CSRF-TOKEN` alongside the same cookie jar. This also allows fetching
a new token after an access JWT expires. `/auth/refresh` and `/auth/logout` require
that token. A token issued to a different identity is not interchangeable.
No automatic browser refresh scheduler is added by this change.

Refresh rotation consumes the old session and inserts its replacement in one
relational transaction. A conditional database update permits only one concurrent
consumer. Failed insertion rolls back consumption. Replayed, expired or revoked
refresh tokens are rejected. Logout hashes the received cookie before revocation
and clears both cookies. External return URLs fall back to `/`.

An already copied access JWT remains valid until its short expiry: there is no
access-token denylist or refresh-token family revocation. Admin role changes are
visible in newly issued JWTs; existing JWTs retain their claims until expiry.
Do not describe cookie deletion as instant revocation of every bearer credential.

## Verification and deployment gates

Real MVC form tests cover registration/login, rotation, remembered expiry,
logout/replay, secure cookies, CSRF rejection and ordinary-user/admin separation.
They use isolated migrated SQLite databases. Disposable PostgreSQL tests cover
simultaneous consumption and transaction rollback. JWT tests reject wrong
issuer/audience, expired, unsigned and wrongly signed tokens.

Before deployment still qualify login throttling, exact trusted proxy handling,
TLS/public behavior and a shared protected Data Protection key ring across
rolling instances (antiforgery/TempData). No live settings or data are changed here.
