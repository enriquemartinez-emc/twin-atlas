# 020 — Spring Boot structure: roles inside the big feature

**Status:** In progress | **Branch:** `chore/spring-structure` (stacked on `chore/angular-structure`)

## Description

The server is a modular monolith packaged by feature (the project rule, and what Spring Boot's own guide shows). One feature package, `annotation`, had grown to 21 files of mixed roles: endpoints, request and response shapes, entity, repository, mapper, SQL reads. Give it the same shape Spring Modulith recommends for a module: the shapes it publishes in the base package, and its internals in sub-packages by role. Configuration gets the conventional `config` package. Behaviour and the API contract do not change.

**Not done, on purpose:** switching to top-level `controller/`, `service/`, `repository/` packages. That is package by layer, which the rulebook forbids (`AGENTS.md`, ADR 0013).

## Acceptance criteria

- [x] `annotation/` holds only what the feature returns: `AnnotationKind`, `AnnotationStatus`, `AnnotationResponse`, `AnnotationSummary`, `AnnotationPage`, `NearestAnnotation`. `annotation/core/` is unchanged.
- [x] `annotation/web/` holds the four endpoints and the request shapes (`CreateAnnotationRequest`, `UpdateAnnotationRequest`, `SearchRequest`). `annotation/persistence/` holds the entity, repository, mapper, facts, reads (`AnnotationQueries`), `PersistenceConflicts` and the query inputs (`ViewBox`, `Cursor`).
- [x] `platform/config/` holds `PlatformConfig` and `OpenApiConfig`. `scene/` and `importing/` stay flat (6 and 4 files): the rule is to split a feature once its package passes about 8 files.
- [x] Dependencies run one way: `web` to `persistence` to the base package and `core`. ArchUnit fails the build if `persistence` depends on `web`, if the base package depends on either, or if a `core` depends on a role package. Each new rule is shown to fail on a deliberate break.
- [x] Visibility is only widened where a class is used across the new packages. Other slices still reach nothing but `core` (the existing rule still passes).
- [x] The committed OpenAPI contract is unchanged (the drift test passes without `-Dopenapi.update`), and the SDK is not rebuilt.
- [x] Every existing test passes, moved only where the package of what they test moved (the query-plan test moves to `persistence`, which keeps it package-private), never weakened. `./mvnw verify` and Spotless are green.
- [x] `AGENTS.md` (layout and the split rule), `ARCHITECTURE.md`, ADR 0013 and a docs page are updated.
- [ ] Optional, needs approval: Spring Modulith would make the module boundaries a Spring feature (verification test, generated docs). It is a new dependency, so it is a proposal, not part of this task.

## Notes

- Measured after: the `annotation` package went from 21 files to 6 (the shapes it returns), with `web/` (7), `persistence/` (8) and the unchanged `core/` (11). `platform/config/` has the two configuration classes. Backend tests 192 to 193 (one new architecture test with three rules).
- Evidence: `./mvnw spotless:check verify` on the final tree gives 193 passing tests against real PostGIS. The contract drift test passes without regenerating, and the client is untouched.
- Rules can fail: a persistence class using a web class, a returned shape using persistence, and a core using persistence each failed their rule. All were restored.
- A mistake of mine: a malformed mutation command left a stray `record Marker(...)` in `AnnotationPage.java`, because a pipe cut the step that restores the file. The full build still passed with it. I found it by reading the diff, removed it and re-ran everything.
- The Docker integration of this WSL distro went away during the task, which killed one verify run. The container-free tests ran meanwhile, and the full verify ran again when Docker was back.
- Widened to `public`: the persistence classes the endpoints use, `AnnotationKind.of/bodyOf`, and a few members. Other slices still cannot reach them (the existing rule passes).
- The query-plan test moved into `persistence`, which keeps what it tests package-private.
- Not done: Spring Modulith (a new dependency, needs approval). The app was not started.

## Out of scope

- Renaming endpoint classes, the core, or the shell flow.
- Splitting `scene/` or `importing/`.
