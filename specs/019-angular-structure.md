# 019 — Angular structure, routes and state flow

**Status:** In progress | **Branch:** `chore/angular-structure` (stacked on `feat/one-command-start`)

## Description

Bring the client in line with Angular's own recommended structure (the Angular developer skill's project layout and naming rules): feature folders with a main component named after the feature, a `components/` folder for the parts, services named for the data they hold, real routes with parameters, and no effect that copies one signal into another. Behaviour does not change.

Measured before: one route (`/scene`), no catch-all, scene and annotation selection kept only in memory and `localStorage`; a `features/asset` folder that holds one empty export; the scene page's state pushed into the annotation data service by three `effect`s that call `.set()` (the skill's one critical rule against); `scenes.service.ts` in the old suffix style next to `annotation.data.ts` in the new one.

## Acceptance criteria

- [ ] **Structure.** `features/asset` is gone (and its alias test import). Each feature has its main component named after it (`features/scene/scene.ts`, class `Scene`), a `components/` folder for sub-components, and services named by data: `scene-data.ts` (`SceneData`), `annotation-data.ts`, `ion-token-store.ts`. The shared alert moves to `shared/components/`. No `.page.ts`, `.service.ts` or dotted `.data.ts`/`.store.ts` names remain. Specs sit beside their source and move with it.
- [ ] **Fixed paths stay, and the reason is written down.** `api/` (generated, path set in the generator and the rulebook), `map/` (the `@map` alias) and `shared/ui/` (Spartan's CLI path) keep their place. There is no empty `core/`, because the app has no global singleton to put there.
- [ ] **Routes.** `/` redirects to `/scenes`. `/scenes` shows the scene you used last (as today). `/scenes/:sceneId` shows that scene. `?annotation=<id>` selects an annotation. Unknown URLs show a not-found page with a link back. Every route has a title. Route values arrive as signal inputs (`withComponentInputBinding`).
- [ ] **Deep links.** Opening `/scenes/<id>?annotation=<id>` selects that scene and that annotation, and choosing a scene or an annotation updates the URL.
- [ ] **No state-copying effects.** The annotation data is derived from the scene, the map view and the selection by signals (`computed`, `linkedSignal`, resources), not by effects that call `.set()`. The edit state resets when the selection changes through `linkedSignal`. The only effects left sync to the map (an imperative API) and turn map clicks into actions, each with a comment saying why.
- [ ] **Behaviour is unchanged.** Every existing test still passes, changed only where file names, routes or component names changed, never weakened. New tests: a deep link selects the scene and the annotation, choosing updates the URL, an unknown URL shows the not-found page, and the edit state resets on a new selection.
- [ ] `npm run lint` (including the class check), Prettier, unit tests and the production build are green, with no `any`.
- [ ] Rulebook and docs follow: `AGENTS.md` (feature folders and naming), `ARCHITECTURE.md` (client layout), a docs page.
- [ ] Browser check of deep links, back button and not-found: needs the owner's approval to run the app.

## Out of scope

- Splitting the scene component further (drawing and editing state). It is smaller after this task, and a split needs its own look.
- Renaming `api/`, `map/` or `shared/ui/`, which the tools and aliases fix.
- Server structure (task 020).
