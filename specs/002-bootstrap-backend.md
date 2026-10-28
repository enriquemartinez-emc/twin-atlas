# 002 — Backend housekeeping

**Status:** In progress | **Branch:** `chore/bootstrap-backend`

## Description

Make the Initializr skeleton match AGENTS.md: move it to `server/`, fix the package and coordinates, drop unapproved dependencies, and get a JDK so Maven can run.

## Acceptance criteria

- [ ] The module lives in `server/` (the old `twinatlas/` folder no longer exists). `server/mvnw` is committed.
- [ ] groupId and root package are `com.twinatlas`. The main class is `TwinAtlasApplication`, the test class matches, and the artifactId is `twin-atlas-server`.
- [ ] Lombok (dependency and annotation processor path) and spring-boot-devtools are removed from `server/pom.xml`.
- [ ] The already-installed OpenJDK 25 is used (no new install). `./mvnw` runs with it.
- [ ] `./mvnw verify` in `server/` passes (context-load test green).
- [ ] No backend dependencies beyond the current set are added (they belong to task 004).
- [ ] `.gitignore` ignores `server/target/`. The working tree is clean after the build.
- [ ] Formatter and compose criteria: n/a (not yet introduced).

## Out of scope

- JPA, Flyway, PostGIS, Testcontainers, ArchUnit, Spotless (task 004).
