# 004 — Backend foundation

**Status:** Proposed | **Branch:** `chore/backend-foundation`

## Description

Add the persistence, testing and platform plumbing the feature slices need: Compose with PostGIS, Flyway, Hibernate Spatial, Testcontainers, ArchUnit, Spotless, Actuator, and the `platform` beans. The dependency list is presented for approval before editing the pom.

## Acceptance criteria

- [ ] I am shown the exact dependency list (Flyway, JPA + Hibernate Spatial/JTS, MapStruct, springdoc, Actuator, Testcontainers, ArchUnit, jqwik, Spotless) with reasons and alternatives, and approve it before any change to `pom.xml`.
- [ ] `docker-compose.yml` at the root starts a pinned `postgis/postgis` image with a healthcheck. `docker compose up` brings up the database and the server connects.
- [ ] `spring.jpa.hibernate.ddl-auto=validate` and `spring.jpa.open-in-view=false`. Flyway runs an initial migration that enables PostGIS.
- [ ] A Testcontainers test using the same image proves `SELECT postgis_version()` works through the app's datasource.
- [ ] `platform` contains `Problems` (ProblemDetail mapping skeleton), clock and id beans, and a `@RestControllerAdvice`.
- [ ] ArchUnit tests enforce: `..core..` has no `org.springframework..`, `jakarta..`, `org.hibernate..` dependencies, and slices don't reach into each other's internals. A temporary violation proves the rule fails (not committed).
- [ ] Jackson 3 JTS/GeoJSON serialization is verified: a test round-trips a `Point`; if no library support exists, a minimal serializer is written and documented.
- [ ] `./mvnw spotless:apply` has been run and `spotless:check` passes. `./mvnw verify` is green.
- [ ] ADR drafted: geometry vs geography. ADR: Maven choice. Both in `docs/adr/`.
- [ ] Client criteria: n/a.

## Out of scope

- Any annotation, scene or asset endpoints.
