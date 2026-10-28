# 003 — Angular 22 client init

**Status:** Proposed | **Branch:** `chore/init-client`

## Description

Create `client/` with the Angular CLI on Angular 22.0.x: strict, zoneless, standalone, Vitest, Tailwind v4, path aliases, linting and formatting. No Cesium, Spartan or SDK yet.

## Acceptance criteria

- [ ] `client/` exists at the repo root. `npx ng version` shows Angular 22.0.x and TypeScript 6.0.x. The output is pasted in the PR description.
- [ ] The app is a standalone SPA: no SSR, no zone.js, strict TypeScript with `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, CSS styles.
- [ ] Tailwind v4 is installed and a utility class renders in the shell component.
- [ ] The path aliases from AGENTS.md exist in `client/tsconfig.json` only. A test imports through each alias and passes.
- [ ] Folder skeleton exists: `app/features/{annotation,scene,asset}` (each with `public-api.ts`), `app/shared/ui`, `app/map`, `app/api`, `environments`.
- [ ] `npx ng test` (Vitest) runs at least one passing test.
- [ ] angular-eslint is configured with `@typescript-eslint/no-explicit-any` and `no-restricted-imports` (deep relative paths, cross-feature internals) as errors. `npx ng lint` is green. A throwaway file with `any` and `../../..` proves both rules fail (not committed).
- [ ] Prettier is configured with `format` and `format:check` scripts. The tree is formatted.
- [ ] `npx ng build` (production) finishes with zero errors and zero warnings.
- [ ] Components generated or written use `ChangeDetectionStrategy.OnPush` explicitly.
- [ ] Backend and compose criteria: n/a.

## Out of scope

- CesiumJS, Spartan UI, generated SDK, any feature code.
