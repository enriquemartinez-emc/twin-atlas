# 0002 — Maven as the backend build tool

**Status:** Accepted · 2026-10-28

## Context

The backend is a single Spring Boot module. The build must be reproducible from a clean checkout, run formatting and architecture checks, and be easy for contributors to read.

## Decision

Use Maven with the committed wrapper (`server/mvnw`). `./mvnw verify` runs the unit, core, integration (Testcontainers) and ArchUnit tests, and checks formatting with Spotless (google-java-format).

## Alternatives

- **Gradle.** Faster incremental builds and a more flexible DSL. Rejected: this module is small, and the extra flexibility is not needed. Maven's declarative POM and fixed lifecycle are easier to review, and it is the Spring Initializr default.

## Consequences

- Formatting is a build step: `spotless:check` is bound to `verify`, so unformatted code fails the build. `./mvnw spotless:apply` fixes it.
- google-java-format is pinned to 1.36.0: 1.37.0 fails inside spotless-maven-plugin 3.10.4. `server/.mvn/jvm.config` exports the `jdk.compiler` packages that the formatter needs on Java 16+.
- Versions of Spring, Hibernate and Testcontainers come from the Boot BOM. Libraries outside it (MapStruct, springdoc, ArchUnit, jqwik, jackson-datatype-jts, JTS) are pinned as properties in the POM.
