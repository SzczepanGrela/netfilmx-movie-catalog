# Catalogue DTO mapping

`CatalogueMapper` explicitly copies scalar fields from entities into the 35
catalogue/view DTOs. Query handlers request either one DTO or an ordered list.
Unsupported type pairs fail; there is no recursive fallback, runtime reflection
or navigation-property traversal. User password form fields are always blank;
password hashes and refresh sessions are never mapped.

This replaces AutoMapper 13.0.1, affected by
[GHSA-rvv3-g6hj-g44x](https://github.com/LuckyPennySoftware/AutoMapper/security/advisories/GHSA-rvv3-g6hj-g44x).
The project only needs scalar projections, so it does not need the general
mapping engine or the licensing/configuration change required by newer versions.
The old DTO-to-command profile registrations were unused; controllers already
construct commands explicitly. Purchase-list DTOs now have explicit mappings.

When adding a DTO, add its scalar projection and run `CatalogueMapperTests`.
The contract suite discovers all public DTOs, checks fields with unloaded
relations, preserves list order/media URLs and excludes stored credentials.
Nullable descriptions remain nullable; the mapper does not rewrite retained URLs
or invent content. The database model and existing media are unchanged.
