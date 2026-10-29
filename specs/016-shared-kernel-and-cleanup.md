# 016 — Shared kernel and server cleanup

**Status:** Proposed | **Branch:** `chore/shared-kernel` (stacked on `feat/osm-import`, which holds the codes being moved)

## Description

`platform/core` is not a feature core: it holds the vocabulary every feature's core shares (`Decision`, `Rejection`) plus one geometry rule (`Wgs84`). Name it for what it is, move the geometry rule to its own home, and clean up `Problems` and the small repeated patterns found in the code review. No behaviour changes on the wire unless a criterion says so.

## Acceptance criteria

- [ ] `platform/core` becomes `platform/kernel` and holds only `Decision` and `Rejection`. Its package comment says it is a shared kernel, not a feature core.
- [ ] `Wgs84` moves to a pure `com.twinatlas.geo` package. The one definition of the WGS 84 reference system (SRID 4326 and its geometry factory) lives there, so `OsmTransform`, `PlatformConfig` and the test helpers stop declaring their own.
- [ ] ArchUnit: the purity rule covers `..kernel..` and `..geo..` as well as `..core..`. `geo` and `platform.kernel` depend on no slice. A slice may use them. The existing slice-isolation rules still pass.
- [ ] `Problems`: no deprecated Spring API (`UNPROCESSABLE_ENTITY` becomes `UNPROCESSABLE_CONTENT`, same 422 on the wire). Status, title and detail of a rejection come from one place, so adding a code touches one switch, not three. A single helper builds an `ApiError` response, replacing the five hand-written copies in `ApiExceptionHandler`, `UpdateAnnotationEndpoint` and `SceneController`.
- [ ] No unused pattern variables: Java's unnamed `_` is used in `AnnotationKind`, `OsmImportEndpoint` and `OsmTransform`. `OsmElement` exposes `tags()` so `OsmTransform` no longer needs its own `tagsOf` switch and duplicate untagged cases.
- [ ] ADR 0011 states that the import writes straight into the annotation table (and why the slice rules cannot see that). A new ADR 0012 records the shared kernel decision. `ARCHITECTURE.md` and the docs architecture page name the kernel.
- [ ] The committed OpenAPI contract is unchanged (the drift test passes without `-Dopenapi.update`), so the SDK is not rebuilt. If a criterion below changes the contract, this one is replaced by "contract and SDK regenerated".
- [ ] Spotless and `./mvnw verify` are green. Client lint, tests and build are unaffected and still green. No test is weakened to make this pass.
- [ ] A docs page `docs/tasks/016-shared-kernel-and-cleanup.html` is written and linked.

## Candidates that need a decision first (not in scope unless approved)

- Scene lookup answers `NOT_FOUND` on `GET /api/scenes/{id}` but `SCENE_NOT_FOUND` everywhere else. Unifying changes the contract and one client message.
- An unknown URL or an unsupported method currently gets the code `REQUEST_INVALID` (read from the code, not run). It should say what it is. Changes the contract.
- The annotation `status` is a free string in the entity and the API. An enum would make the mapper switch exhaustive and give the SDK a typed union. Changes the contract.
- `GET /api/scenes` returns the newest 100 with no paging, while the project rule is keyset pagination.

## Out of scope

- Splitting `scene-viewer.page.ts` (419 lines). Reviewed by outline only, so it needs its own look and task.
- Performance of GeoJSON handling in the read queries.
- Composed OpenAPI annotations to shorten endpoints.
