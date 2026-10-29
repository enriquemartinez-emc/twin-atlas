# 0013 — A modular monolith, packaged by feature

**Status:** Accepted · 2026-10-28

## Context

Twin Atlas is built and run by one developer, and it has a small number of clearly separate areas: annotations, scenes, imports (and, planned, assets). The code must stay easy to navigate as it grows, and the boundaries between areas must not depend on everyone remembering them.

## Decision

- **One deployable, one Maven module.** There is one Spring Boot application and one database.
- **Package by feature, never by layer.** `annotation/`, `scene/`, `importing/` each hold their own endpoints, entities, mapping and reads. There is no top-level `controllers/` or `services/`.
- **Each slice with rules has a `core/` package.** It is pure Java (see [ADR 0003](0003-fcis-decision-functions.md)). A slice with no rules is plain CRUD and has none.
- **Boundaries are tests, not conventions.** ArchUnit fails the build when a core uses Spring, Jakarta or Hibernate, when a slice reaches into another slice's inner parts (only another slice's `core` may be used), or when the shared packages depend on a feature ([ADR 0012](0012-shared-kernel.md)).
- **Cross-cutting code is small and shared.** `platform/` (errors, clock, ids, OpenAPI) and `geo/` (WGS 84) depend on no feature.

## Alternatives

- **Microservices.** Network calls, separate deployments and distributed failure for a system with one database and one developer. No benefit that pays for that.
- **Layered packages** (`controller`, `service`, `repository`). Every change touches every package, and nothing stops any class from calling any other.
- **Several Maven modules.** Stronger isolation, but more build files and more ceremony. ArchUnit gives the boundary we need inside one module. Splitting later is possible because the slices already do not reach into each other.

## Consequences

- A new feature is a new folder with the same shape, and its boundary is checked from the first commit.
- One slice may depend on another's `core` only. The import therefore reuses the annotation rules ([ADR 0011](0011-import-judges-each-element.md)), but it cannot call the annotation slice's endpoints or entities. Where that is awkward (it writes straight into the annotation table), the cost is written down.
- A big feature gets role folders. `annotation` had 21 files in one package, so it is split into `web/`, `persistence/` and `core/`, with the shapes it returns left in the base package. Dependencies run one way (`web` to `persistence` to the base and `core`), and ArchUnit fails the build otherwise. The cost is that classes used across those folders are public instead of package-private; other slices still cannot reach them. Small features (`scene`, `importing`) stay flat, because folders for six files are noise. The split is by role inside a feature, never by layer across features, which the rule above forbids.
- Everything shares one database and one transaction boundary, so a consistency rule can use a database constraint as its final guard.
