# Durable Data Protection

The candidate stores ASP.NET Core antiforgery and cookie TempData keys in a
shared filesystem key ring. `DataProtection__KeyRingPath` is required in every
web environment and must be an existing absolute directory outside the app and
web roots. Startup refuses missing directories, symbolic links, Linux modes
other than `0700`, inaccessible storage and unreadable/corrupt key-ring XML.
A protect/unprotect probe runs before HTTP and hosted workers start. There is
no fallback to a container-local or ephemeral repository.

The application discriminator is the fixed `NetFilmx.Web` across revisions.
The antiforgery cookie is `__Host-NetFilmx.Antiforgery`, with Secure, HttpOnly,
SameSite=Strict and path `/`. Each deployment/environment must have its own key
directory; development must never share production keys. Keys do not hash
passwords and are separate from the JWT signing secret.

## Container and rolling contract

The image runs as UID/GID `10001:10001`. Provision a dedicated persistent
directory owned by that UID/GID with mode `0700`. Mount the **same** directory
read/write into every old/new web instance at the configured path, outside
`/app`; for example `/var/lib/netfilmx/keyring`. Use a separate mount from
the database and upload staging. A writable directory alone does not prove a
persistent mount: effective ownership, recreation, old/new sharing and restore
must be checked on the target host before release.

The application uses the framework's normal automatic rotation. Retain expired
keys so existing protected data can still be read. Never prune keys during an
image release or rollback, replace the directory with an empty one, or change
the discriminator with an image tag. Keep key-ring/configuration backups
separate from database backups. An image rollback must keep the current key
ring. A compromised key requires a reviewed revocation/recovery procedure,
including refresh/restart of all instances and any resulting token invalidation.

Filesystem persistence does **not** encrypt these keys at rest. This candidate
uses filesystem access controls and no XML encryptor; key files and their backups
must be treated as secrets. Any future certificate encryptor requires a separate
private-key backup and demonstrated recovery, including old-key decryption.

See Microsoft's [configuration guide](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview)
and [key lifecycle](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/implementation/key-management).

## Verification

Regression tests use isolated temporary key rings and migrated SQLite. Real MVC
login forms keep the same cookie/token through host restart and two simultaneous
hosts. Rotation retains existing form tokens and protected payloads; retained
expired keys can unprotect old data after a new host automatically creates a
current key. Independent rings, a different discriminator and modified tokens
are rejected. Configuration tests cover missing/relative/public paths,
permissions, symbolic links and corrupt XML.

These tests qualify the code contract locally. Live mounted storage, protected
backup/isolated restore and actual rolling release acceptance remain open.
