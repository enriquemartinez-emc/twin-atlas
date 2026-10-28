# 006 — Annotation spatial reads

**Status:** Proposed | **Branch:** `feat/annotation-reads`

## Description

The read side: bbox ("visible in view"), nearest-N, within-zone and keyset-paginated lists. All bypass the core and use native SQL via `JdbcClient` straight to response DTOs.

## Acceptance criteria

- [ ] `AnnotationQueries` exposes bbox, nearest-N (`<->` KNN), intersects/within-zone, and a keyset-paginated list. No domain types or entities on this path.
- [ ] Each query uses `&&` first, then the exact predicate (`ST_DWithin`, `ST_Intersects`).
- [ ] Pagination is keyset-based with an opaque cursor. Offset is not used anywhere.
- [ ] Each query is wrapped in a Micrometer timer visible via Actuator.
- [ ] Invalid input (bad bbox, N out of range) returns a `ProblemDetail` with a stable code.
- [ ] Testcontainers tests on real PostGIS verify results for known fixtures, antimeridian and empty-result edge cases, and cursor continuity across pages.
- [ ] An `EXPLAIN` test (or documented query) shows the GiST index is used on a seeded dataset of at least 10k rows.
- [ ] ADRs: reads bypass the core, native SQL vs Hibernate Spatial, keyset pagination.
- [ ] `./mvnw spotless:check verify` green. Client criteria: n/a.

## Out of scope

- 1M-row benchmarking (task 009).
