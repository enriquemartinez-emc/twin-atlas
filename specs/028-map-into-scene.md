# 028 — Map code moves into the scene feature

**Status:** In progress | **Branch:** `chore/map-into-scene` (stacked on `feat/map-loading-notice`)

## Description

`client/src/app/map/` sat outside every feature with a wrong excuse in `AGENTS.md` ("tools and aliases fix it"; no tool does, `@map/*` was our own alias). Every import of it comes from the scene feature, so Angular's guidance to group code with the feature that uses it puts it at `features/scene/map/`.

## Acceptance criteria

- [ ] **Moved.** Everything in `map/` is in `features/scene/map/`, with its tests. `src/app/map/` and the `@map/*` alias are gone. Imports use relative paths inside the feature and `@features/scene/map/…` from other folders.
- [ ] **Lazy loading still works.** A production build shows `map-viewer` as its own lazy chunk of about 8 kB.
- [ ] **Lint follows.** The rule that `map/` may not import features is dropped (the folder no longer exists); the rules for `shared/` and `core/` stay.
- [ ] **Docs tell the truth.** `AGENTS.md` and `ARCHITECTURE.md` no longer claim the folder is fixed by tools. A docs page is written.
- [ ] **Behaviour is unchanged.** All 273 tests pass with only import paths changed. Prettier, lint (with the class check) and the build are green.

## Then

A review of the whole Angular app against the style guide, the Angular developer skill and the CLI's own defaults, with what it finds fixed or listed.
