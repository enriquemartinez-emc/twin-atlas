# 005 — Annotation create (FCIS reference slice)

**Status:** Proposed | **Branch:** `feat/annotation-create`

## Description

The reference implementation of the functional-core / imperative-shell pattern: create an annotation (marker, note, outline) with decision rules, a total transform, one endpoint class, an entity with optimistic locking and a Flyway table with GiST index.

## Acceptance criteria

- [ ] `annotation/core` is pure: `Annotation` lifecycle types (`Draft`, `Published`, `Archived`), `evaluate(command, context)` returning `Accepted | Rejected(reason)`, `Rejection` enum with stable codes, total `Annotation.create`.
- [ ] At least two real rules are implemented (for example: geometry inside the scene extent, per-scene annotation limit). Context carries derived facts (counts, extent), not collections.
- [ ] Core tests: table-driven JUnit for every rule, jqwik property tests for the geometry rule. No Spring, no containers.
- [ ] One `CreateAnnotationEndpoint` follows the five-step shell flow. `Problems.from(Rejection)` exhaustively maps every rejection and exposes the code as the error `code`.
- [ ] Flyway migration creates the table with SRID 4326 geometry, a GiST index, `version` column and the DB constraints that back each important rule.
- [ ] Entity is never exposed. MapStruct maps entity ↔ domain record at the shell boundary. Updates load and mutate the entity.
- [ ] Response carries an ETag from `@Version`.
- [ ] `@SpringBootTest` + Testcontainers tests: happy path, one test per rejection path, and a concurrency race test showing the DB constraint is the final enforcer.
- [ ] ADRs: FCIS with decision functions, entity mapping at the shell boundary. `ARCHITECTURE.md` started.
- [ ] `./mvnw spotless:check verify` green. Client criteria: n/a.

## Out of scope

- Update/delete/publish endpoints, spatial reads (task 006), security.
