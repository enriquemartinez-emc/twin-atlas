# 025 — Scene page split: a thin component and feature-scoped state

**Status:** In progress | **Branch:** `chore/scene-state-split` (stacked on `chore/client-structure-tidy`)

## Description

`features/scene/scene.ts` is 613 lines and does six jobs: it starts and stops the map, owns the drawing tool and draft, owns the edit state, creates scenes, copies the link and works out the hint. Angular's guidance is small, focused components, with feature state kept out of them. This task moves the state out and leaves `Scene` as a thin shell that wires the parts together.

## Acceptance criteria

- [x] **State leaves the component.** Selection, drawing, editing, scene creation and the link copy each live in their own file, as a function fed with the page's signals (the same pattern as `annotationData`, because the page's inputs are route-bound signals of the component). Each is named for the data it holds.
- [x] **`Scene` is thin.** It starts and destroys the map, connects the map's signals to the state through the three existing effects, and renders. The class is at most about 150 lines (the file also holds its template and styles, so it cannot be 250 lines in all).
- [x] **No effect copies a signal into a signal.** The three effects that sync to the map stay; nothing new is added.
- [x] **Behaviour is unchanged.** The existing page tests pass with only the changes the move needs. The new state files get their own unit tests for what moved (tool change clears the draft, edit state resets when another annotation is chosen, a refused save, the link label).
- [x] At least three deliberate breaks, each caught by a test.
- [x] A docs page is written, and `ARCHITECTURE.md` says where feature state lives.
- [x] Prettier, lint (with the class check), tests and the production build are green, with no `any`.
