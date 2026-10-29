# 008 — Annotation UI and SDK

**Status:** In progress | **Branch:** `feat/annotation-ui`

## Description

Wire the client to the API so annotations show up on the 3D scene: generate the OpenAPI spec and the TypeScript SDK, pick or create a scene, render the annotations in the visible view, and create new ones by clicking on the map with a Signal Forms form. Editing moves to spec 014: it needs an update endpoint that does not exist yet.

## Acceptance criteria

Backend (small additions the UI needs):

- [ ] `GET /api/scenes` lists scenes (newest first, up to 100). Plain CRUD, with a test.
- [ ] The OpenAPI spec types geometry as GeoJSON (`GeoJsonPoint`, `GeoJsonPolygon`, `GeoJsonGeometry` oneOf), not a bare `object`, so the SDK gets a discriminated union.
- [ ] The spec is committed at `docs/openapi.json`. A test regenerates it from the running app (Testcontainers) and fails when the committed file is stale. `-Dopenapi.update=true` rewrites it.

SDK:

- [ ] `@hey-api/openapi-ts` generates the SDK into `client/src/app/api` through an npm script, from `docs/openapi.json`. Nothing there is edited by hand. Regenerating leaves no diff.
- [ ] The generated code compiles under the app's strict settings. If it contains `any`, that is recorded in the report (generated code is not hand-editable).

Client:

- [ ] Dev server proxies `/api` to the backend (no CORS config needed). Base URL comes from `@env/environment`.
- [ ] A scene picker lists scenes and a "Create scene from current view" action creates one with the visible bbox as extent. The chosen scene is remembered in this browser.
- [ ] Annotations of the chosen scene for the visible bbox load through `resource`/`httpResource` using the SDK, with no hand-written API types, and render on the map (markers, notes, outlines). Rendering objects are destroyed on teardown and replaced on refresh.
- [ ] Clicking the map places a marker or note. Outlines are drawn by clicking vertices and finishing. A draft preview shows while drawing.
- [ ] The create form uses Signal Forms, shows server problems by `code` with a readable message, and refreshes the list and map after success.
- [ ] Smart components fetch, presentational components use inputs and outputs. Cross-feature imports go through `public-api`.
- [ ] Every component is a single `.ts` file (inline template and styles).
- [ ] Vitest tests for form validation, problem-code mapping, the data service and map layer logic. Lint, format and build are green with zero warnings.
- [ ] `docker compose up` still runs the database, and the app works end to end against the real server (manual screenshot check, not an E2E test).

## Out of scope

- Editing and `If-Match` (spec 014), delete and archive flows, authentication.
