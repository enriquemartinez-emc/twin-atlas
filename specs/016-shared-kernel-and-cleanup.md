# 016 — Shared kernel and server cleanup

**Status:** In progress | **Branch:** `chore/shared-kernel` (stacked on `feat/osm-import`, which holds the codes being moved)

## Description

`platform/core` is not a feature core: it holds the vocabulary every feature's core shares (`Decision`, `Rejection`) plus one geometry rule (`Wgs84`). Name it for what it is, move the geometry rule to its own home, and clean up `Problems` and the small repeated patterns found in the code review. No behaviour changes on the wire unless a criterion says so.

## Acceptance criteria

- [x] `platform/core` becomes `platform/kernel` and holds only `Decision` and `Rejection`. Its package comment says it is a shared kernel, not a feature core.
- [x] `Wgs84` moves to a pure `com.twinatlas.geo` package. The one definition of the WGS 84 reference system (SRID 4326 and its geometry factory) lives there, so `OsmTransform`, `PlatformConfig` and the test helpers stop declaring their own.
- [x] ArchUnit: the purity rule covers `..kernel..` and `..geo..` as well as `..core..`. `geo` and `platform.kernel` depend on no slice. A slice may use them. The existing slice-isolation rules still pass.
- [x] `Problems`: no deprecated Spring API (`UNPROCESSABLE_ENTITY` becomes `UNPROCESSABLE_CONTENT`, same 422 on the wire). Status, title and detail of a rejection come from one place, so adding a code touches one switch, not three. A single helper builds an `ApiError` response, replacing the five hand-written copies in `ApiExceptionHandler`, `UpdateAnnotationEndpoint` and `SceneController`.
- [x] No unused pattern variables: Java's unnamed `_` is used in `AnnotationKind`, `OsmImportEndpoint` and `OsmTransform`. `OsmElement` exposes `tags()` so `OsmTransform` no longer needs its own `tagsOf` switch and duplicate untagged cases.
- [x] ADR 0011 states that the import writes straight into the annotation table (and why the slice rules cannot see that). A new ADR 0012 records the shared kernel decision. `ARCHITECTURE.md` and the docs architecture page name the kernel.
- [x] One code for a missing scene: `GET /api/scenes/{id}` answers `SCENE_NOT_FOUND` like every other endpoint. A URL that matches no route answers `NOT_FOUND` (404) instead of `REQUEST_INVALID`. A test shows the current behaviour first, then the fix.
- [x] Annotation `status` is an enum (`DRAFT`, `PUBLISHED`, `ARCHIVED`) in the entity, the read projections and the contract, so the mapper switch is exhaustive without a `default` and the SDK gets a typed union.
- [x] The OpenAPI contract is regenerated and the drift test passes. The SDK is rebuilt, and client lint, tests and build are green. Any client type or message that the new contract needs is updated.
- [x] Spotless and `./mvnw verify` are green. Client lint, tests and build are unaffected and still green. No test is weakened to make this pass.
- [x] A docs page `docs/tasks/016-shared-kernel-and-cleanup.html` is written and linked.

## Notes

- Found while writing the first test: an unknown URL or an unsupported method did not get `REQUEST_INVALID` as I had read it from the code, it got **no `code` at all** (Spring builds the body in `super` for those exceptions, so the override never saw it). The handler now adds the code to whatever body comes back. Both new tests failed on the old code before the fix.
- Both new ArchUnit rules were mutation-checked: a kernel class depending on the shell, and `Wgs84` importing Spring, each fail the build.
- Contract diff: the status enum in two schemas and the corrected `getScene` 404 description. The SDK changed in one type. One client test fixture needed `as const`.
- Evidence: 192 backend tests (189 before), 179 client tests. Specs 005 and 006 still say `platform.core`: they record what was true when those tasks finished.
- `AGENTS.md` and `ARCHITECTURE.md` layouts updated (kernel and geo; `ARCHITECTURE.md` also still listed `importing` as planned).

## Decided

You approved these criteria and left the contract-changing candidates to me. Included: the scene code, the unknown-URL code and the status enum, because each is small, makes the API say what it means, and makes the SDK more precise. Left out: paging of `GET /api/scenes` (newest 100, no paging), which needs a keyset design and a client change, so it is its own task.

## Out of scope

- Splitting `scene-viewer.page.ts` (419 lines). Reviewed by outline only, so it needs its own look and task.
- Paging of `GET /api/scenes`.
- Performance of GeoJSON handling in the read queries.
- Composed OpenAPI annotations to shorten endpoints.
