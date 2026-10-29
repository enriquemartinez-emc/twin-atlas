# 0005 — Spatial reads bypass the core

**Status:** Accepted · 2026-10-28

## Context

Writes have business rules, so they go through a pure core ([ADR 0003](0003-fcis-decision-functions.md)). Reads (bbox for the visible view, nearest-N, intersects, paginated lists) have no rules: they filter and project rows, and performance is the whole point.

## Decision

Reads do not use the core and do not build domain types. `AnnotationQueries` runs native SQL through `JdbcClient` and maps rows straight to response records (`AnnotationSummary`, `NearestAnnotation`, `AnnotationPage`). The only validation is of the request shape: ranges, bbox format, cursor format.

- Each query uses the bbox operator `&&` first (GiST index), then the exact predicate (`ST_Intersects`, `ST_DWithin`, the `<->` KNN ordering).
- Each query is timed with Micrometer (`twinatlas.annotation.query`, tag `type` = `list`, `bbox`, `nearest`, `intersects`).
- An unknown scene is `SCENE_NOT_FOUND` (404), reusing the same stable code as writes.

## Alternatives

- **Load entities or domain records and filter in Java.** Pulls rows the client does not need and loses the index.
- **Spring Data derived or `@Query` methods returning entities.** Couples the read contract to the write model and hides the SQL that the query-plan tests inspect.

## Consequences

- Read responses cannot drift into the write model, and the SQL is visible and testable. A query-plan test runs `EXPLAIN` on exactly the SQL strings the code executes (`AnnotationQueries.listSql`, `nearestSql`).
- Rules that apply to reads (for example visibility by role) would need a place of their own. There are none yet.
