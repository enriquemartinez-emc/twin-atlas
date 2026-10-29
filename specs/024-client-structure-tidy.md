# 024 — Client structure tidy: names and homes

**Status:** In progress | **Branch:** `chore/client-structure-tidy` (stacked on `feat/ui-redesign`)

## Description

A review of the client against the Angular developer skill and style guide found four places where names or homes did not follow Angular's recommendations. This task fixes them without changing behaviour.

## Acceptance criteria

- [x] **Entry points are called `index.ts`.** `public-api.ts` sounds like a REST API. Each feature's entry point is `features/<name>/index.ts`, imported as `@features/<name>`. The Cesium wrapper's is `map/index.ts`, imported as `@map` (one new alias entry, `"@map"`, next to the existing `@map/*`). The empty `shared/ui/public-api.ts` is deleted. The lint rule still forbids reaching into a feature's other files, with an updated message.
- [x] **No role suffix left.** `map/map.service.ts` becomes `map/map-viewer.ts`, class `MapViewer`.
- [x] **Shared means no business logic.** The server-error-to-message mapping and the `Outcome` type move from `shared/problems/` to a new `core/problems/` (app-wide error handling). The GeoJSON helpers move from `shared/geo/` to `map/geojson.ts` (two features use them, and they are map geometry). `shared/` keeps only components, `forms/` and `ui/`.
- [x] **Data shapes end in `.model.ts`.** `map/features.ts` becomes `map/feature.model.ts`, `outcome.ts` becomes `outcome.model.ts`.
- [x] **Behaviour is unchanged.** All 243 tests pass without edits to what they assert, only to import paths and the renamed class.
- [x] `AGENTS.md`, `ARCHITECTURE.md` and ADR 0008 name the new paths, and the rule about `core/` is updated to say what it holds. A docs page is written and the status board updated.
- [x] Prettier, lint (with the class check), tests and the production build are green, with no `any`.

## Out of scope

- Splitting the `Scene` page component (its own task).
- Renaming `@map` or the other aliases beyond the one new entry.
