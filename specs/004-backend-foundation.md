# 004 — Backend foundation

**Status:** In progress | **Branch:** `chore/backend-foundation`

## Description

Add the persistence, testing and platform plumbing the feature slices need: Compose with PostGIS, Flyway, Hibernate Spatial, Testcontainers, ArchUnit, Spotless, Actuator, and the `platform` beans. The dependency list is presented for approval before editing the pom.

## Acceptance criteria

- [x] I was shown the dependency list (Flyway, JPA + Hibernate Spatial/JTS, MapStruct, springdoc, Actuator, Testcontainers, ArchUnit, jqwik, Spotless) with reasons and alternatives and approved it. Added by my request: `org.n52.jackson:jackson-datatype-jts` instead of a custom serializer.
- [x] `docker-compose.yml` at the root starts a pinned `postgis/postgis` image with a healthcheck. `docker compose up` brings up the database and the server connects.
- [x] `spring.jpa.hibernate.ddl-auto=validate` and `spring.jpa.open-in-view=false`. Flyway runs an initial migration that enables PostGIS.
- [x] A Testcontainers test using the same image proves `SELECT postgis_version()` works through the app's datasource.
- [x] `platform` contains `Problems` (ProblemDetail mapping skeleton), clock and id beans, and a `@RestControllerAdvice`.
- [x] ArchUnit tests enforce: `..core..` has no `org.springframework..`, `jakarta..`, `org.hibernate..` dependencies, and slices don't reach into each other's internals. Planted violations (not committed) proved all three rule families fail.
- [x] Jackson 3 JTS/GeoJSON serialization uses the n52 module (no custom serializer). A test round-trips a `Point` and a `Polygon` through the app's own `JsonMapper` and checks SRID 4326 on read.
- [x] `./mvnw spotless:apply` has been run and `spotless:check` passes (bound to `verify`). `./mvnw verify` is green (18 tests). google-java-format is pinned to 1.36.0 because 1.37.0 fails inside the Spotless plugin.
- [x] ADR drafted: geometry vs geography. ADR: Maven choice. Both in `docs/adr/`.
- [ ] Client criteria: n/a.

## Notes

- `docker compose up` was run and the server (java -jar) connected: Flyway applied V1, `/actuator/health` was UP, Swagger UI and `/v3/api-docs` were served.
- No server container yet: the Compose stack is the database only. A server image is not part of this task.

## Out of scope

- Any annotation, scene or asset endpoints.
