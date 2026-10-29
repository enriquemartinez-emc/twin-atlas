# 010 — OSM import

**Status:** In progress | **Branch:** `feat/osm-import`

## Description

The `importing` slice: pure transforms from OpenStreetMap features to annotations, and a bulk import endpoint that collects every violation instead of stopping at the first.

## Acceptance criteria

- [x] `importing/core` is pure: total transforms from OSM features to annotation commands, and a bulk evaluation that returns every rejection (`ImportPlan.rejected`, one per element).
- [x] Core tests are table-driven. jqwik covers geometry edge cases (degenerate, self-intersecting, out-of-extent).
- [x] The bulk endpoint returns accepted counts and all rejections with their codes. Bulk import is the only place that collects all violations.
- [x] Import reuses the annotation core rules. It does not duplicate them.
- [x] Testcontainers test imports a small real OSM fixture, including rejected features and a partial-success case.
- [x] ArchUnit still passes (no slice reaches into another's internals).
- [x] Spotless and `./mvnw verify` are green. Client criteria: n/a.

## Notes

- Endpoint: `POST /api/scenes/{sceneId}/imports/osm`, body is an Overpass JSON answer (`out geom;`), at most 5,000 elements. Design in ADR 0011.
- New rejection codes: `UNSUPPORTED_SOURCE_ELEMENT`, `OPEN_WAY`, `UNTAGGED_ELEMENT`. The contract and SDK were regenerated, so the client's typed message map needed three sentences. Nothing else changed in the client.
- Evidence: 32 new tests (15 + 6 core cases, 2 jqwik properties, 9 endpoint tests on real PostGIS). Whole suites: 189 backend, 179 client.
- Mutation checks: removing `ON CONFLICT DO NOTHING` fails the concurrency test (500 from the unique index), and removing the in-batch duplicate check fails 3 tests.
- Found on the way: my first endpoint test compared rejections against a `Map.of(...)`, which has no stable order, so it could pass or fail by chance. It now uses an insertion-ordered map and passed three runs in a row.
- Fixtures: `overpass-real-eixample.json` is a real extract (20 amenity nodes and 15 buildings in the Eixample, downloaded from the public Overpass API on 2026-10-29, `phone`, `contact:phone`, `email` and `website` tags removed; data © OpenStreetMap contributors, ODbL). It imports completely (35 of 35) and a repeat import creates nothing. It contained no unusable element, so rejected features and partial success are covered by `overpass-sagrada-familia.json`, which is hand-written in the same format (invented ids) on purpose.
- Not built: showing OpenStreetMap attribution on the map (there is no import screen yet), importing relations, updating already imported data.

## Out of scope

- Scheduling or streaming large OSM extracts.
