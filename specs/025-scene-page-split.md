# 025 — Scene page split: a thin component and feature-scoped state

**Status:** Proposed | **Branch:** `chore/scene-state-split` (stacked on `chore/client-structure-tidy`)

## Description

`features/scene/scene.ts` is 613 lines and does six jobs: it starts and stops the map, owns the drawing tool and draft, owns the edit state, creates scenes, copies the link and works out the hint. Angular's guidance is small, focused components, with feature state in a service that the component provides for itself. This task moves the state out and leaves `Scene` as a thin shell that wires the parts together.

## Acceptance criteria

- [ ] **State leaves the component.** The drawing state (tool, draft, saving, form problem, hint) and the edit state (moving, moved position, problem, stale) each live in a service provided by `Scene` (`providers: [...]`), not in root. Each service is named for the data it holds.
- [ ] **`Scene` is thin.** It starts and destroys the map, connects the map's signals to the services through the three existing effects, and renders. It is at most about 250 lines.
- [ ] **No effect copies a signal into a signal.** The three effects that sync to the map stay; nothing new is added.
- [ ] **Behaviour is unchanged.** The existing page tests pass with only the changes the move needs. The new services get their own unit tests for what moved (tool change clears the draft, edit state resets when another annotation is chosen, hint follows the draft).
- [ ] At least three deliberate breaks, each caught by a test.
- [ ] A docs page is written, and `ARCHITECTURE.md` says where feature state lives.
- [ ] Prettier, lint (with the class check), tests and the production build are green, with no `any`.
