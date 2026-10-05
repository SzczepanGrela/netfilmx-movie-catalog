# Dependency maintenance

Reviewed 2026-10-03 for the modernization candidate. These changes have not
been deployed to the VPS. The original local checkout and production data are
outside this preparation.

## .NET packages

All five projects target .NET 10. `global.json` pins SDK 10.0.401 without
roll-forward. ASP.NET/EF Core packages and the local `dotnet-ef` tool
are aligned to 10.0.12; the PostgreSQL provider is 10.0.3. The unused web
code-generation package is removed. The updated xUnit 2/test tooling no longer
pulls the legacy .NET Standard HTTP/regex packages. Test package wildcards are
replaced with explicit versions.

Keep the native SQLite version independent of EF's minimum bundle. An explicit
`SQLitePCLRaw.bundle_e_sqlite3` 3.0.5 reference and `SourceGear.sqlite3` 3.53.4
replace that library, following the maintainer's
[v3 upgrade notes](https://github.com/ericsink/SQLitePCL.raw/blob/main/v3.md).
The integration test queries `sqlite_version()` through the actual EF
connection and rejects versions below the 3.50.2 security fix. Keep both the
SQLite and PostgreSQL migration histories.

Hangfire.Core permits Newtonsoft.Json 11.0.1. The Web project explicitly pins
13.0.4 to prevent the patched serializer from depending on another development
tool's incidental version override. Revisit that reference when Hangfire's
minimum dependency becomes safe.

`Directory.Build.props` enables direct **and transitive** NuGet auditing, from
low severity upward. NU1900–NU1905 are errors, including failure to retrieve
audit data. No advisory is suppressed. `NuGet.Config` uses the official v3
NuGet source. Each project has a committed `packages.lock.json` containing the
resolved versions and package hashes. CI and Docker restore in locked mode;
Docker publishes with `--no-restore`.

```bash
dotnet restore "ST2 NetFilmx.sln" --locked-mode --force --no-cache
dotnet list "ST2 NetFilmx.sln" package --vulnerable --include-transitive
dotnet tool restore
```

To deliberately update a dependency, edit its project version, regenerate
the graph with `dotnet restore "ST2 NetFilmx.sln" --force-evaluate`, review all
lockfile changes and repeat the audit/tests. Do not work around audit failures
by disabling `NuGetAudit` or suppressing advisories.

## Browser libraries

`NetFilmx_Web/package.json` and `package-lock.json` track the checked-in browser
libraries: Bootstrap 5.3.8, jQuery 3.7.1, jQuery Validation 1.22.1 and Microsoft
unobtrusive validation 4.0.0. npm and Node are development/CI tools; the deployed
ASP.NET app serves the committed files and needs no Node process.

The previous jQuery Validation 1.19.5 is affected by
[CVE-2025-3573](https://github.com/advisories/GHSA-rrj2-ph5q-jxw2).
The shared validation partial explicitly sets `escapeHtml: true` before
unobtrusive parsing. DOM tests load the served files and shared partial, check
that malicious error HTML stays text, and verify valid/invalid email behavior.
The admin user form uses the existing local jQuery instead of loading a second
older CDN instance.

```bash
cd NetFilmx_Web
npm ci --ignore-scripts
npm audit --audit-level=low
npm run vendor:check
npm test
```

When updating these packages, regenerate their committed files with
`npm run vendor`, preserving upstream licenses. `vendor:check` compares both
the file inventory and bytes against installed locked packages. Vendor files
are excluded from Git line-ending conversion; `node_modules` is excluded from
Git and the Docker context. Do not edit generated third-party files by hand.

## Verification and limits

The October 3 .NET 10 locked restore/audit passed across all five projects.
The Release suite passed **256 .NET tests, none skipped**, including actual
SQLite/disposable PostgreSQL, native media tools, key-ring recovery and release
ownership. Existing nullable/compiler warnings remain. The final image is
qualified independently by the [delivery workflow](release-delivery.md).

Historical evidence: the October 2 candidate audit reported **zero NuGet findings across five
projects**, including transitives, and **zero npm findings**, including test
dependencies. The loaded Linux native SQLite reports 3.53.4. Local verification
passed 187 .NET tests (none skipped) using real SQLite/disposable PostgreSQL and
three DOM tests. Isolated negative controls rejected a dependency/lockfile
mismatch with NU1004 and a vulnerable package with NU1903; disabling HTML
escaping made the XSS regression fail.

The CI build tests the browser packages as well as .NET. A separate read-only
dependency workflow repeats both audits every Monday and on dependency PRs.
Its scheduled runs begin after that workflow reaches the default branch; they
are not production deployment jobs.

A clean package audit establishes absence of currently reported package
advisories, not absence of application vulnerabilities. It does not qualify
VPS packages, the full container OS or external CDN resources (including the
currently unversioned Vidstack loader). Media-player/CDN pinning and playback
acceptance remain open. Local HTTP controls/shared Data Protection and the
candidate delivery path have regression coverage; live proxy, mount, recovery
and rolling acceptance remain separate. The unused root-level MVC template
is not the built Web project. The .NET 10 base digests, native-tool image smoke
and vulnerability gate are recorded in the delivery guide/workflow.
