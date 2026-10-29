# 014 — Annotation update (rename and move)

**Status:** Proposed | **Branch:** `feat/annotation-update`

## Description

Split out of spec 008. Add the update use case on the server (get one annotation with its ETag, then change its title, text or geometry with `If-Match`) and the matching edit form in the client. It is the second functional-core slice: it reuses the create rules and adds the optimistic-locking story from AGENTS.md.

## Acceptance criteria

- [ ] `GET /api/scenes/{sceneId}/annotations/{id}` returns the annotation with an `ETag`. Unknown id or scene is a stable 404.
- [ ] `PATCH` changes title, text and/or geometry. A missing `If-Match` is 428, a stale one is 412, and a lost race on `@Version` is `CONCURRENT_MODIFICATION` (409).
- [ ] The core has `evaluate` for the update with rules (annotation exists, geometry valid and inside the scene, new title unused by another annotation) and total transforms (`rename`, `moveTo`). Entity → domain mapping is introduced here.
- [ ] The unique title index is still the final enforcer, with a race test.
- [ ] Endpoint tests on real PostGIS: happy path, one test per rejection and precondition path, race.
- [ ] The client edit form uses Signal Forms, sends `If-Match`, and on 412 or 409 offers to reload the latest version.
- [ ] OpenAPI spec and SDK regenerated with no manual edits. Lint, format, tests and build are green.

## Out of scope

- Publish, archive and delete.
