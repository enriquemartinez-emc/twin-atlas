# 019 — Angular structure, routes and state flow

**Status:** In progress | **Branch:** `chore/angular-structure` (stacked on `feat/one-command-start`)

## Description

Bring the client in line with Angular's own recommended structure (the Angular developer skill's project layout and naming rules): feature folders with a main component named after the feature, a `components/` folder for the parts, services named for the data they hold, real routes with parameters, and no effect that copies one signal into another. Behaviour does not change.

Measured before: one route (`/scene`), no catch-all, scene and annotation selection kept only in memory and `localStorage`; a `features/asset` folder that holds one empty export; the scene page's state pushed into the annotation data service by three `effect`s that call `.set()` (the skill's one critical rule against); `scenes.service.ts` in the old suffix style next to `annotation.data.ts` in the new one.

## Acceptance criteria

- [x] **Structure.** `features/asset` is gone (and its alias test import). Each feature has its main component named after it (`features/scene/scene.ts`, class `Scene`), a `components/` folder for sub-components, and services named by data: `scene-data.ts` (`SceneData`), `annotation-data.ts`, `ion-token-store.ts`. The shared alert moves to `shared/components/`. No `.page.ts`, `.service.ts` or dotted `.data.ts`/`.store.ts` names remain. Specs sit beside their source and move with it.
- [x] **Fixed paths stay, and the reason is written down.** `api/` (generated, path set in the generator and the rulebook), `map/` (the `@map` alias) and `shared/ui/` (Spartan's CLI path) keep their place. There is no empty `core/`, because the app has no global singleton to put there.
- [x] **Routes.** `/` redirects to `/scenes`. `/scenes` shows the scene you used last (as today). `/scenes/:sceneId` shows that scene. `?annotation=<id>` selects an annotation. Unknown URLs show a not-found page with a link back. Every route has a title. Route values arrive as signal inputs (`withComponentInputBinding`).
- [x] **Deep links.** Opening `/scenes/<id>?annotation=<id>` selects that scene and that annotation, and choosing a scene or an annotation updates the URL.
- [x] **No state-copying effects.** The annotation data is derived from the scene, the map view and the selection by signals (`computed`, `linkedSignal`, resources), not by effects that call `.set()`. The edit state resets when the selection changes through `linkedSignal`. The only effects left sync to the map (an imperative API) and turn map clicks into actions, each with a comment saying why.
- [x] **Behaviour is unchanged.** Every existing test still passes, changed only where file names, routes or component names changed, never weakened. New tests: a deep link selects the scene and the annotation, choosing updates the URL, an unknown URL shows the not-found page, and the edit state resets on a new selection.
- [x] `npm run lint` (including the class check), Prettier, unit tests and the production build are green, with no `any`.
- [x] Rulebook and docs follow: `AGENTS.md` (feature folders and naming), `ARCHITECTURE.md` (client layout), a docs page.
- [ ] Browser check of deep links, back button and not-found: needs the owner's approval to run the app.

## Notes

- Measured after: effects in the page 7 to 3 (all three sync to the map or turn its clicks into actions), routes 1 to 3 (redirect, scene matcher, not found), `features/asset` removed, tests 182 to 194, no `any`, lint, Prettier and the build clean.
- Not a win: `scene.ts` grew from 440 to 531 lines. The first version of this spec said it would shrink, which was wrong.
- The import lint rule was narrowed on purpose: `../name` (a file in the parent folder) is allowed so `components/` can reach its feature, `../../` and `../other-folder/` stay forbidden. Both were tested with deliberately bad imports.
- Mutation checks: ignoring the address, never updating the address, and two routes instead of one matcher each failed tests. A plain signal instead of the self-resetting edit state first **survived**: my test never let the second annotation load, so the editor was not on screen either way. The test now waits for it, and the same break fails it.
- Design choice: `/scenes` and `/scenes/:sceneId` are one route with a custom matcher. With two routes the router rebuilds the page, and the map with it, on the first scene change. A test (same page instance, map initialised once) guards it.
- Known limits: an address with an id that does not exist shows the generic "could not load" message and not a not-found page; `/scenes` is not rewritten to `/scenes/<id>`.
- Not seen in a browser: deep links, the back button, the not-found page. Needs the owner's approval to run the app.

## Out of scope

- Splitting the scene component further (drawing and editing state). It did not get smaller: it grew from 440 to 531 lines, because the routing inputs and the self-resetting edit state live there now. Splitting it is the next step and needs its own look.
- Renaming `api/`, `map/` or `shared/ui/`, which the tools and aliases fix.
- Server structure (task 020).
