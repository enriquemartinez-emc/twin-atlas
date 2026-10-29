# 027 — A loading notice while the map loads

**Status:** In progress | **Branch:** `feat/map-loading-notice` (stacked on `chore/client-no-barrels`)

## Description

The only loading indicator ended as soon as the 3D viewer existed, but Google's photorealistic tiles keep arriving for several seconds after that, so the screen looked empty and unresponsive. This task shows one notice for the whole wait and removes it when the first view is loaded.

## Acceptance criteria

- [x] **The map reports when its first view is ready.** `MapViewer` has a `tilesReady` signal: false from the start of `init`, true once the Google tileset says its initial tiles are loaded (`initialTilesLoaded`) or, on the OpenStreetMap globe, once the globe reports `tilesLoaded`. It goes back to false when the viewer is destroyed or rebuilt (for example after a token is saved).
- [x] **One notice, in the middle of the map.** A card with a spinner reads "Starting the 3D viewer…" until the viewer exists and "Loading the map…" until the first view is ready. With the Google tiles it adds that they can take a few seconds. It does not block the map (clicks pass through) and has a status role for screen readers.
- [x] **It admits when it is slow.** After 15 seconds of waiting it adds that the map needs an internet connection and can be slow the first time. Done with a template `@defer (on timer(…))`, not a timer in code.
- [x] **It never lies.** It is gone when the first view is ready, and when the viewer failed to start (the error alert is shown instead). The old spinner in the status bar is removed, so there is only one indicator, and the status bar shows nothing until the source is known.
- [x] **Tested.** `MapViewer` tests for each way of becoming ready and for the reset; component tests for the notice texts and the slow message; page tests for shown while loading, hidden when ready, hidden on a startup error. At least three deliberate breaks, each caught.
- [x] A docs page is written and the user guide mentions the notice.
- [x] Prettier, lint (with the class check), tests and the production build are green, with no `any`.

## Out of scope

- A progress bar or percentage (Cesium reports pending request counts, not a total).
- A notice for later camera moves, when more tiles stream in.
