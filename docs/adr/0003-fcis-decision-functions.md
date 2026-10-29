# 0003 — Functional core with decision functions and explicit context

**Status:** Accepted · 2026-10-28

## Context

Use cases such as "create an annotation" have several business rules: the scene exists, the geometry is valid, it fits the scene, the title is free. Rules that live inside controllers or services are hard to test (they need Spring and a database) and easy to reorder by accident.

## Decision

Split every use case with two or more rules into a pure core and an imperative shell.

- **Core** (`..core..` packages): plain Java records and functions. One `evaluate(command, context)` returns a `Decision`, either `Accepted` or `Rejected(Rejection)`. `Rejection` is an enum of stable codes, never a message or an HTTP status. Transforms such as `Annotation.create(id, now, command)` are total: they run only after acceptance and cannot fail. Time and ids come in as parameters.
- **Context** holds derived facts (the scene extent, a "title in use" flag), not collections. The shell computes them with small SQL queries.
- **Shell** (one endpoint class per use case) follows a fixed flow: load facts, `evaluate`, `if (decision instanceof Rejected(var reason)) return Problems.from(reason);`, apply the transform, persist, respond.
- `Problems.from(Rejection)` is the single exhaustive `switch`, so adding a code without mapping it does not compile. The code is exposed as the problem's `code` and listed in the OpenAPI schema.
- Lifecycle states are types (`Draft`, `Published`, `Archived`) and shapes are types (`Marker`, `Note`, `Outline`), so illegal states and transitions do not compile.
- ArchUnit enforces that `..core..` depends on no Spring, Jakarta or Hibernate code.

Scene and asset CRUD, and all spatial reads, do not use the core (reads get their own ADR with the read task).

## Alternatives

- **Rules in the service layer, domain exceptions for control flow.** Familiar, but rules need the framework to test and rejections travel as exceptions.
- **A generic `Result<T, E>` with monadic chains.** Adds a vocabulary for little gain in a codebase this size. A plain `Decision` and an `if` read more directly.
- **Rules only in the database.** Strong guarantees but poor error messages and no unit-level tests. We keep constraints as the final enforcer, not the only one.

## Consequences

- Core tests are plain JUnit and jqwik: no Spring, no containers, milliseconds.
- Under concurrency a core decision is advisory: two requests can both be accepted. Rules that can race are backed by a database constraint, and the shell translates the violation into the same `Rejection` (see `PersistenceConflicts`). The unique index on `(scene_id, lower(title))` does this for titles.
- Facts cost an extra query before the write. For a rule that races anyway this is acceptable, and the query is indexed.
