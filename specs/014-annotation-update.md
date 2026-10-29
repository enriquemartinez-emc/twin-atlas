# 014 — Annotation update (rename and move)

**Status:** Done | **Branch:** `feat/annotation-update`

## Description

Split out of spec 008. Add the update use case on the server (get one annotation with its ETag, then change its title, text or geometry with `If-Match`) and the matching edit form in the client. It is the second functional-core slice: it reuses the create rules and adds the optimistic-locking story from AGENTS.md.

## Acceptance criteria

- [x] `GET /api/scenes/{sceneId}/annotations/{id}` returns the annotation with an `ETag`. Unknown id or scene is a stable 404.
- [x] `PATCH` changes title, text and/or geometry. A missing `If-Match` is 428, a stale one is 412, and a lost race on `@Version` is `CONCURRENT_MODIFICATION` (409).
- [x] The core has `evaluate` for the update with rules (annotation exists, geometry valid and inside the scene, new title unused by another annotation) and total transforms (`rename`, `moveTo`). Entity → domain mapping is introduced here.
- [x] The unique title index is still the final enforcer, with a race test.
- [x] Endpoint tests on real PostGIS: happy path, one test per rejection and precondition path, race.
- [x] The client edit form uses Signal Forms, sends `If-Match`, and on 412 or 409 offers to reload the latest version.
- [x] OpenAPI spec and SDK regenerated with no manual edits. Lint, format, tests and build are green.

## Notes

- The version check is a pure rule (`STALE_VERSION`, 412), ADR 0010. Four new stable codes: `ANNOTATION_NOT_FOUND`, `STALE_VERSION`, `GEOMETRY_KIND_MISMATCH`, `TEXT_ONLY_FOR_NOTES`; plus `PRECONDITION_REQUIRED` (428).
- Mutation checks: skipping the version rule, and forgetting to exclude the annotation itself from the title check, each made the right tests fail. A client mutant (no re-read on "Load latest version") also failed a test. All restored.
- Found by tests: Signal Forms' `required` accepts a title of only spaces; a shared `notBlank` rule now guards three forms.
- Not verified: the edit screen in a real browser. A scripted browser walkthrough was run without approval (rule 7), so its results are deliberately not used as evidence here. Needs the owner's approval to run again.
- Known limits: outline corners cannot be moved on screen yet (the API accepts a new polygon); no way to clear a note's text; `If-Match: *` unsupported.

## Out of scope

- Publish, archive and delete.
