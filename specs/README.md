# Specs

One file per task: short description, acceptance criteria, status. Workflow rules 1, 2 and 10 in [AGENTS.md](../AGENTS.md) apply: criteria are approved before code, one task at a time, status updated in the task's own branch.

Statuses: `Proposed` → `Approved` → `In progress` → `Done` (only after confirmation).

| #   | Spec                                                       | Branch                           | Status      |
| --- | ---------------------------------------------------------- | -------------------------------- | ----------- |
| 001 | [AGENTS.md fixes and repo bootstrap](001-agents-md-fixes.md) | `chore/agents-md-fixes`          | Done       |
| 002 | [Backend housekeeping](002-bootstrap-backend.md)           | `chore/bootstrap-backend`        | Done       |
| 003 | [Angular 22 client init](003-init-client.md)               | `chore/init-client`              | Done       |
| 004 | [Backend foundation](004-backend-foundation.md)            | `chore/backend-foundation`       | Done       |
| 005 | [Annotation create (FCIS slice)](005-annotation-create.md) | `feat/annotation-create`         | Done       |
| 006 | [Annotation spatial reads](006-annotation-reads.md)        | `feat/annotation-reads`          | Done       |
| 007 | [Map viewer](007-map-viewer.md)                            | `feat/map-viewer`                | Done       |
| 008 | [Annotation UI and SDK](008-annotation-ui.md)              | `feat/annotation-ui`             | Done       |
| 009 | [Benchmark dataset](009-benchmark-dataset.md)              | `chore/benchmark-dataset`        | Done       |
| 010 | [OSM import](010-osm-import.md)                            | `feat/osm-import`                | Done        |
| 011 | [Security and integrations](011-security-and-integrations.md) | `feat/security-and-integrations` | Paused     |
| 012 | [Portfolio polish](012-portfolio-polish.md)                | `docs/portfolio-polish`          | In progress |
| 013 | [E2E tests (run only on approval)](013-e2e-tests.md)       | `test/e2e`                       | Proposed   |
| 014 | [Annotation update (rename and move)](014-annotation-update.md) | `feat/annotation-update`        | Done        |
| 015 | [HTML documentation](015-html-docs.md)                     | `docs/html-docs`                 | Done       |
| 016 | [Shared kernel and server cleanup](016-shared-kernel-and-cleanup.md) | `chore/shared-kernel` | Done        |
| 017 | [Figtree font and a Spartan-built UI](017-ui-figtree-and-spartan.md) | `feat/ui-figtree-spartan` | In progress |
| 018 | [One command to start the app](018-one-command-start.md) | `feat/one-command-start` | In progress |
| 019 | [Angular structure, routes and state flow](019-angular-structure.md) | `chore/angular-structure` | In progress |
| 020 | [Spring Boot structure: roles inside the big feature](020-spring-structure.md) | `chore/spring-structure` | In progress |
| 021 | [UI polish: the app's own icon and name, and a guide for new users](021-ui-polish.md) | `feat/ui-polish` | In progress |
| 022 | [Panel polish: readable map, clearer list, honest loading, tidier forms](022-ui-panel-polish.md) | `feat/ui-panel-polish` | In progress |
| 023 | [Redesign: a tool rail, a scene bar and a panel that does one thing at a time](023-ui-redesign.md) | `feat/ui-redesign` | In progress |

## File template

```md
# NNN — Title

**Status:** Proposed | **Branch:** `type/slug`

## Description

Two or three sentences.

## Acceptance criteria

- [ ] ...

## Out of scope

- ...
```
