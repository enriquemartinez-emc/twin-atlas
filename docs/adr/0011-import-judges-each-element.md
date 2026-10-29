# 0011 — An import judges each element on its own

**Status:** Accepted · 2026-10-29

## Context

OpenStreetMap extracts mix good data with data we cannot use: shops without a name, streets that are lines rather than areas, relations, shapes that cross themselves, places outside the scene. A person importing a neighbourhood wants the usable part in, and a complete list of what was left out and why. Stopping at the first problem would make a large extract unimportable. Reporting a single "import failed" would hide which elements to fix.

## Decision

- **A batch is the one place that collects every rejection.** Elsewhere the first failed rule decides (see AGENTS.md). `ImportRules.evaluate` returns a plan: the annotations to create, and one `ItemRejection(reference, code)` per element turned away. Every element lands in exactly one list, which a property test checks.
- **The import adds no rules of its own about annotations.** Each element is first converted to the same `CreateAnnotation` command a person would send by hand, then goes through `CreateAnnotationRules.evaluate`. Valid geometry, "inside the scene" and "title unused" mean the same thing in both places. The import only adds the rules about the source: unsupported element, open way, no tags (new codes `UNSUPPORTED_SOURCE_ELEMENT`, `OPEN_WAY`, `UNTAGGED_ELEMENT`).
- **Titles carry the OpenStreetMap reference**, for example `Bar Pep (node/123)`, and `OSM node/123` when there is no name. Two places called "Bar" stay distinct, and importing the same extract twice is recognised as a repeat: the second run creates nothing and says `TITLE_ALREADY_USED` for each element.
- **Facts stay small.** The shell asks the database which of this batch's titles are taken, with one query bounded by the batch size, and passes a set of them in the context. The core never sees the scene's annotations.
- **One request, one round trip, one transaction.** The shell inserts every accepted annotation with a single `batchUpdate` and `ON CONFLICT DO NOTHING`. The unique index on `(scene_id, lower(title))` stays the final judge: if another import takes a title between the facts query and the insert, that row inserts nothing and is reported as `TITLE_ALREADY_USED`.
- **A request is capped at 5,000 elements** (400 `VALIDATION_FAILED` beyond). That keeps one request bounded in memory and time. Larger extracts are sent in several requests.
- **Everything arrives as drafts**, the first lifecycle state, so imported data can be reviewed before it is published.
- **The input is the Overpass JSON answer** (`out geom;`, so ways carry their coordinates). Unknown fields are ignored.

## Alternatives

- **Fail the whole batch on the first rejection.** Simple, and useless for real extracts.
- **Insert through Hibernate one entity at a time.** Loads and flushes thousands of entities that nobody reads again. Plain SQL is the right tool, as for reads.
- **Reimplement the geometry rules in the importing slice.** Two definitions of "valid" would drift apart.
- **Deduplicate by an OSM id column.** Cleaner in the long run, but needs a schema change and a rule for edited data. The title carries the reference for now. Revisit when updates to already imported data matter.
- **Parse OSM XML or PBF.** More formats, more code, no new capability for the exercise.

## Consequences

- A client can import a whole extract and show a per-element report. The response says how many were received, how many were imported and every rejection with its stable code.
- A race between two imports cannot create a duplicate. A test sends the same extract from six clients at once and expects each annotation exactly once.
- Imported rows are ordinary annotations: they carry version 0, so they have an ETag and can be edited like any other.
- The first result from a very large extract may be 5,000 elements at a time. Streaming and scheduling imports are out of scope.
- Map data from OpenStreetMap is © OpenStreetMap contributors and available under the Open Database License (ODbL). The endpoint's description and the docs page say so. Showing attribution next to imported data on the map is a task for the screen that offers import.
