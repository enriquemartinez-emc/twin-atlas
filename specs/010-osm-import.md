# 010 — OSM import

**Status:** Proposed | **Branch:** `feat/osm-import`

## Description

The `importing` slice: pure transforms from OpenStreetMap features to annotations, and a bulk import endpoint that collects every violation instead of stopping at the first.

## Acceptance criteria

- [ ] `importing/core` is pure: total transforms from OSM features to annotation commands, and a bulk evaluation that returns `List<Rejection>`.
- [ ] Core tests are table-driven. jqwik covers geometry edge cases (degenerate, self-intersecting, out-of-extent).
- [ ] The bulk endpoint returns accepted counts and all rejections with their codes. Bulk import is the only place that collects all violations.
- [ ] Import reuses the annotation core rules. It does not duplicate them.
- [ ] Testcontainers test imports a small real OSM fixture, including rejected features and a partial-success case.
- [ ] ArchUnit still passes (no slice reaches into another's internals).
- [ ] Spotless and `./mvnw verify` are green. Client criteria: n/a.

## Out of scope

- Scheduling or streaming large OSM extracts.
