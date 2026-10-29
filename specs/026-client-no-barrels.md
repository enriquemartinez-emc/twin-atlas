# 026 — Client without barrels: one feature, grouped by concept

**Status:** In progress | **Branch:** `chore/client-no-barrels` (stacked on `chore/scene-state-split`)

## Description

Research against the Angular style guide and the `@defer` guide, plus a measurement of our own build, showed two problems. Barrel files (`index.ts`) hide lazy boundaries: with `@map/index.ts` the lazy `map-viewer` chunk was a 119-byte stub and its 7.7 kB of code sat inside the scene chunk, while importing from the file gives a real 7.85 kB lazy chunk. And the style guide says to avoid folders named for the type of code (`components/`), which our features had. This task removes the barrels and the type folders and nests annotations inside the scene feature, because they only exist inside a scene.

## Acceptance criteria

- [ ] **No barrels.** `features/scene/index.ts`, `features/annotation/index.ts` and `map/index.ts` are gone, with the `@map` alias entry. Imports go straight to the file that defines what they use. The lazy route loads `scene.routes` directly.
- [ ] **One feature, nested by concept.** `features/annotation/` moves into `features/scene/annotation/`. The scene feature holds `scene-bar/` (the bar, the chooser, the new-scene form, the token panel and store), `tools/` (the tool rail, the hint, the drawing state) and `annotation/` (data, draft, kind metadata, list, form, editor, edit state). No folder is named `components/`.
- [ ] **Shared stays flat.** `shared/components/` and `shared/forms/` disappear: the badge, the problem alert and `not-blank` sit directly in `shared/`, next to `ui/`.
- [ ] **The lazy boundary is real.** A production build shows `map-viewer` as its own lazy chunk with its code (about 7.8 kB), not a stub.
- [ ] **Directions are linted, not barrelled.** `shared/`, `core/` and `map/` may not import from `features/`, enforced by `no-restricted-imports` (tried with a deliberate bad import). The rule against climbing out of a folder stays. No new package.
- [ ] **Behaviour is unchanged.** All 264 tests pass with only their import paths changed.
- [ ] `AGENTS.md`, `ARCHITECTURE.md` and the earlier docs pages that describe the old layout are updated (the rule about folders mirroring backend slices, the entry-point rule and the aliases table), and a docs page is written.
- [ ] Prettier, lint (with the class check), tests and the production build are green, with no `any`.

## Out of scope

- The Spartan `shared/ui` folder and its CLI aliases.
- Anything the app does.
