# 007 — Map viewer

**Status:** In progress | **Branch:** `feat/map-viewer`

## Description

Show a real 3D scene in the browser. CesiumJS lives behind a thin `@Service` wrapper that is lazy-loaded with `injectAsync`, so the Cesium chunk is only fetched on the viewer route. Spartan UI is introduced for the shell. Without a Cesium ion token the viewer falls back to OpenStreetMap imagery, so a globe renders immediately.

## Acceptance criteria

- [x] Approved by me: Cesium (already in the stack) and the Spartan CLI with Brain/Helm. Peer and helper dependencies they require are listed in the final report.
- [x] Cesium static assets are copied through `angular.json` and `CESIUM_BASE_URL` is set. No Cesium import exists outside `app/map`.
- [x] The wrapper (`@Service`, no constructor injection) exposes typed methods and signals (camera position, visible bbox). It destroys all Cesium objects on teardown. A test verifies the viewer's `destroy` is called.
- [x] The viewer route loads the wrapper via `injectAsync`. The production build shows Cesium in a separate lazy chunk, and the initial bundle stays within budget.
- [ ] With a Cesium ion token (pasted once in the UI, kept in `localStorage`, never committed) the scene loads Google Photorealistic 3D Tiles. Without one, an OpenStreetMap imagery globe is shown with a notice. The source, license and attribution terms are in `client/README.md`. **Open: the token path is untested until I try my own token.** The no-token globe and the rejected-token fallback are verified.
- [x] Camera moves publish the visible bbox, debounced with a plain timer (not `debounced()`).
- [x] Spartan Brain/Helm components (button, input) are used for the shell. No hardcoded colors.
- [x] Vitest tests cover bbox math, debounce (fake timers) and wrapper teardown. Lint, format and build are green with zero warnings.
- [ ] Backend criteria: n/a.

## Out of scope

- Annotation rendering and editing (task 008).
- Visual verification of the photorealistic scene needs my ion token. Verified without it: the OSM render and the invalid-token fallback (headless screenshot, manual, not an E2E test).
