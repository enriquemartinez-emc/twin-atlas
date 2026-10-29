# Specs

One file per task: short description, acceptance criteria, status. Workflow rules 1, 2 and 10 in [AGENTS.md](../AGENTS.md) apply: criteria are approved before code, one task at a time, status updated in the task's own branch.

Statuses: `Proposed` → `Approved` → `In progress` → `Done` (only after confirmation).

| #   | Spec                                                       | Branch                           | Status      |
| --- | ---------------------------------------------------------- | -------------------------------- | ----------- |
| 001 | [AGENTS.md fixes and repo bootstrap](001-agents-md-fixes.md) | `chore/agents-md-fixes`          | Done        |
| 002 | [Backend housekeeping](002-bootstrap-backend.md)           | `chore/bootstrap-backend`        | Done        |
| 003 | [Angular 22 client init](003-init-client.md)               | `chore/init-client`              | In progress |
| 004 | [Backend foundation](004-backend-foundation.md)            | `chore/backend-foundation`       | In progress |
| 005 | [Annotation create (FCIS slice)](005-annotation-create.md) | `feat/annotation-create`         | In progress |
| 006 | [Annotation spatial reads](006-annotation-reads.md)        | `feat/annotation-reads`          | In progress |
| 007 | [Map viewer](007-map-viewer.md)                            | `feat/map-viewer`                | Proposed    |
| 008 | [Annotation UI and SDK](008-annotation-ui.md)              | `feat/annotation-ui`             | Proposed    |
| 009 | [Benchmark dataset](009-benchmark-dataset.md)              | `chore/benchmark-dataset`        | Proposed    |
| 010 | [OSM import](010-osm-import.md)                            | `feat/osm-import`                | Proposed    |
| 011 | [Security and integrations](011-security-and-integrations.md) | `feat/security-and-integrations` | Proposed    |
| 012 | [Portfolio polish](012-portfolio-polish.md)                | `docs/portfolio-polish`          | Proposed    |
| 013 | [E2E tests (run only on approval)](013-e2e-tests.md)       | `test/e2e`                       | Proposed    |

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
