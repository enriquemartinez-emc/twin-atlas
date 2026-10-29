# 005 — Annotation create (FCIS reference slice)

**Status:** Done | **Branch:** `feat/annotation-create`

## Description

The reference implementation of the functional-core / imperative-shell pattern: create an annotation (marker, note, outline) with decision rules, a total transform, one endpoint class, an entity with optimistic locking and a Flyway table with GiST index.

## Acceptance criteria

- [x] `annotation/core` is pure: `Annotation` lifecycle types (`Draft`, `Published`, `Archived`), `evaluate(command, context)` returning `Accepted | Rejected(reason)`, `Rejection` enum with stable codes, total `Annotation.create`.
- [x] At least two real rules are implemented (scene exists, geometry valid, geometry inside the scene extent, title unused in the scene). Context carries derived facts (counts, extent), not collections.
- [x] Core tests: table-driven JUnit for every rule, jqwik property tests for the geometry rule. No Spring, no containers.
- [x] One `CreateAnnotationEndpoint` follows the five-step shell flow. `Problems.from(Rejection)` exhaustively maps every rejection and exposes the code as the error `code`.
- [x] Flyway migration creates the table with SRID 4326 geometry, a GiST index, `version` column and the DB constraints that back each important rule.
- [x] Entity is never exposed. MapStruct maps entity ↔ domain record at the shell boundary. Updates load and mutate the entity.
- [x] Response carries an ETag from `@Version`.
- [x] `@SpringBootTest` + Testcontainers tests: happy path, one test per rejection path, and a concurrency race test showing the DB constraint is the final enforcer.
- [x] ADRs: FCIS with decision functions, entity mapping at the shell boundary. `ARCHITECTURE.md` started.
- [x] `./mvnw spotless:check verify` green (57 tests). Client criteria: n/a.

## Notes

- Four rules, in this order: `SCENE_NOT_FOUND`, `INVALID_GEOMETRY`, `GEOMETRY_OUTSIDE_SCENE_EXTENT`, `TITLE_ALREADY_USED`. Kind-vs-geometry mismatch is a request-shape error (400, bean validation), because the shape type makes it impossible inside the core.
- Added a minimal plain-CRUD `scene` slice (create and get) because annotations need a scene extent to check against. No update or delete.
- `Rejection` and `Decision` live in `platform.core`, shared by every core, so `Problems.from` is one exhaustive mapping.
- The unique index on `(scene_id, lower(title))` is the final enforcer. A stale-fact test and an 8-client race test prove it.
- Entity → domain mapping is deferred to the first use case that loads state (update and publish). Create needs domain → entity and entity → response only.
- Geometry fields in OpenAPI are plain `object` for now. Task 008 can add a typed GeoJSON schema if the SDK needs it.

## Out of scope

- Update/delete/publish endpoints, spatial reads (task 006), security.
