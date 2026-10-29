# 006 — Annotation spatial reads

**Status:** Done | **Branch:** `feat/annotation-reads`

## Description

The read side: bbox ("visible in view"), nearest-N, within-zone and keyset-paginated lists. All bypass the core and use native SQL via `JdbcClient` straight to response DTOs.

## Acceptance criteria

- [x] `AnnotationQueries` exposes bbox, nearest-N (`<->` KNN), intersects/within-zone, and a keyset-paginated list. No domain types or entities on this path.
- [x] Each query uses `&&` first, then the exact predicate (`ST_DWithin`, `ST_Intersects`).
- [x] Pagination is keyset-based with an opaque cursor. Offset is not used anywhere.
- [x] Each query is wrapped in a Micrometer timer visible via Actuator.
- [x] Invalid input (bad bbox, N out of range) returns a `ProblemDetail` with a stable code.
- [x] Testcontainers tests on real PostGIS verify results for known fixtures, antimeridian and empty-result edge cases, and cursor continuity across pages.
- [x] An `EXPLAIN` test shows the GiST index (and the keyset index) is used on a seeded dataset of 20k rows.
- [x] ADRs: reads bypass the core, native SQL vs Hibernate Spatial, keyset pagination.
- [x] `./mvnw spotless:check verify` green (89 tests). Client criteria: n/a.

## Notes

- Endpoints: `GET .../annotations` (list and `bbox`), `GET .../annotations/nearest`, `POST .../annotations/search` (zone intersects).
- Mutation checks: removing `ST_Intersects` fails the exact-shape test, and dropping the `id` tie-break fails the same-timestamp pagination test.
- Added a V3 migration for the keyset index `(scene_id, created_at, id)`.
- Moved the "valid WGS 84 geometry" check into `platform.core.Wgs84` (one definition for the core and request validation).
- Known limit, recorded in ADR 0006: the nearest radius pre-filter box does not wrap the antimeridian.
- Pagination of the nearest query is intentionally not provided (limit 1..100).

## Out of scope

- 1M-row benchmarking (task 009).
