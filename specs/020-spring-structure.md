# 020 — Spring Boot structure: roles inside the big feature

**Status:** In progress | **Branch:** `chore/spring-structure` (stacked on `chore/angular-structure`)

## Description

The server is a modular monolith packaged by feature (the project rule, and what Spring Boot's own guide shows). One feature package, `annotation`, had grown to 21 files of mixed roles: endpoints, request and response shapes, entity, repository, mapper, SQL reads. Give it the same shape Spring Modulith recommends for a module: the shapes it publishes in the base package, and its internals in sub-packages by role. Configuration gets the conventional `config` package. Behaviour and the API contract do not change.

**Not done, on purpose:** switching to top-level `controller/`, `service/`, `repository/` packages. That is package by layer, which the rulebook forbids (`AGENTS.md`, ADR 0013).

## Acceptance criteria

- [ ] `annotation/` holds only what the feature returns: `AnnotationKind`, `AnnotationStatus`, `AnnotationResponse`, `AnnotationSummary`, `AnnotationPage`, `NearestAnnotation`. `annotation/core/` is unchanged.
- [ ] `annotation/web/` holds the four endpoints and the request shapes (`CreateAnnotationRequest`, `UpdateAnnotationRequest`, `SearchRequest`). `annotation/persistence/` holds the entity, repository, mapper, facts, reads (`AnnotationQueries`), `PersistenceConflicts` and the query inputs (`ViewBox`, `Cursor`).
- [ ] `platform/config/` holds `PlatformConfig` and `OpenApiConfig`. `scene/` and `importing/` stay flat (6 and 4 files): the rule is to split a feature once its package passes about 8 files.
- [ ] Dependencies run one way: `web` to `persistence` to the base package and `core`. ArchUnit fails the build if `persistence` depends on `web`, if the base package depends on either, or if a `core` depends on a role package. Each new rule is shown to fail on a deliberate break.
- [ ] Visibility is only widened where a class is used across the new packages. Other slices still reach nothing but `core` (the existing rule still passes).
- [ ] The committed OpenAPI contract is unchanged (the drift test passes without `-Dopenapi.update`), and the SDK is not rebuilt.
- [ ] Every existing test passes, moved only where the package of what they test moved (the query-plan test moves to `persistence`, which keeps it package-private), never weakened. `./mvnw verify` and Spotless are green.
- [ ] `AGENTS.md` (layout and the split rule), `ARCHITECTURE.md`, ADR 0013 and a docs page are updated.
- [ ] Optional, needs approval: Spring Modulith would make the module boundaries a Spring feature (verification test, generated docs). It is a new dependency, so it is a proposal, not part of this task.

## Out of scope

- Renaming endpoint classes, the core, or the shell flow.
- Splitting `scene/` or `importing/`.
