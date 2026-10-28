# 007 — Map viewer

**Status:** Proposed | **Branch:** `feat/map-viewer`

## Description

Show a real 3D scene in the browser. CesiumJS lives behind a thin `@Service` wrapper that is lazy-loaded with `injectAsync`, so the Cesium chunk is only fetched on the viewer route. Spartan UI is introduced for the shell.

## Acceptance criteria

- [ ] I approve installing `cesium` and the Spartan CLI (names, reasons, alternatives) before any install.
- [ ] Cesium static assets are copied through `angular.json` and `CESIUM_BASE_URL` is set. No Cesium import exists outside `app/map`.
- [ ] The wrapper (`@Service`, no constructor injection) exposes typed methods and signals (camera position, visible bbox). It destroys all Cesium objects on teardown. A test verifies `destroy` is called.
- [ ] The viewer route loads the wrapper via `injectAsync`. The production build shows Cesium in a separate lazy chunk, and the initial bundle stays within budget.
- [ ] A real 3D Tiles source (open data or self-hosted) renders in the scene. The source and its license terms are in the README.
- [ ] Camera moves publish the visible bbox, debounced with a signal and timer (not `debounced()`).
- [ ] Spartan Brain/Helm components are used for the shell. No hardcoded colors.
- [ ] Vitest tests for the wrapper's pure logic (bbox math, debounce with fake timers). Lint, format and build are green.
- [ ] Backend criteria: n/a.

## Out of scope

- Annotation rendering and editing (task 008).
