# 017 — Figtree font and a Spartan-built UI

**Status:** In progress | **Branch:** `feat/ui-figtree-spartan` (stacked on `chore/shared-kernel`)

## Description

The app uses the Figtree variable font, and its panels, alerts, tool buttons, list rows and form fields are built from Spartan UI components instead of long runs of utility classes. Templates stay readable: no class bloat.

Measured before this task: all four installed Spartan components (button, input, label, textarea) are used for form controls, but everything structural is hand-built, with 47 `class` attributes across 6 feature templates, the longest 249 characters.

## Acceptance criteria

- [x] Figtree (variable, SIL Open Font License) is self-hosted in `client/public/fonts/` with its licence file, declared with `@font-face` (weight range 300-900, `font-display: swap`) and used as the app's sans font. No CDN, no new npm package. The docs site keeps Geist Mono.
- [x] The Spartan CLI adds these components with no new npm package: card, alert, badge, separator, toggle-group (with toggle), item, field, typography. `components.json`, the `tsconfig` aliases, the test config and the lint rules are updated together, as the rulebook says.
- [x] The scene panel is a card, errors and warnings are alerts, the tool choice is a toggle group, annotation rows are items with a badge for the kind, and label, input and message go together in fields. The plain `<select>` stays (Spartan's native select needs an icon library, which is a new dependency) and takes the `hlmInput` look.
- [x] No class attribute in a feature template has more than 4 utility classes. Positioning and size of the floating panel live in the component's own `styles` block, using theme variables. A small script, `npm run lint:classes`, checks this and fails on a violation, and it is part of the lint step.
- [x] Behaviour is unchanged. Existing component tests pass. They are changed only where markup changed (roles and selectors), never weakened, and the accessibility they assert (pressed state, alerts, labels, current item) still holds.
- [x] Prettier, ESLint, unit tests and the production build are green, and the build output contains the font and its `@font-face`.
- [x] `AGENTS.md` records the Figtree choice and the class rule. A docs page for the task is written and linked.
- [x] How it looks in a browser is checked in a run the owner approves, and what was not seen is said so.

## Notes

- Measured after: 6 `class` attributes in the feature templates (was 47), the longest 18 characters (was 249). The app shell had two more bloated ones, found by the new check, and is fixed. All controls (12 buttons, inputs, textarea, 7 labels) go through Helm.
- Font: two WOFF2 files (latin, latin-ext), 30 KB together. I checked their table directory: both contain the variable-font tables (`fvar`, `gvar`, `HVAR`, `avar`). The 300-900 weight range is upstream's published range, not read from the axis. The build output contains both files and both `@font-face` rules.
- Evidence: 182 client tests (179 before, plus a pressed-state test, a test that the highlight returns to Select when the app leaves drawing mode, and a test for the new alert component). One test asserted a Tailwind class that no longer exists on the shell, and now asserts that Spartan typography delivers its utility classes. The list test now checks title, badge and text separately.
- Mutation checks: freezing the toggle group's value first **survived** (Brain tracks clicks by itself, so my first test proved nothing). The second test fails on that mutation. A bloated class makes `lint:classes` fail.
- `ng lint` flagged 9 style errors in the generated Helm files (type-only imports). They were fixed in place with `--fix`, as the rulebook allows.
- Known limits: Spartan's field error is used as a styled message inside our own checks, because its automatic display is built for Brain's form state and not for Signal Forms. The scene `<select>` is plain (no new package). Helm components carry long class strings by design: that is where they belong.
- Seen in the approved browser run of 2026-10-29 (headless Chromium, software rendering): the panel, toggle group, item list with badges, editor, conflict alert and the Figtree font (reported loaded, weight range 300-900, title at weight 600). The run found one flaw the tests could not: the Map section's children had no gap, because Chromium does not apply a flex gap inside an open `<details>`. They now sit in a div. Not seen: dark mode, small screens, other browsers, the photorealistic tiles.
- Rough edges seen, not fixed: overlapping map labels where markers are dense, noisy imported titles (`OSM node/1361887169`), and a form hint that stays after the marker is placed.

## Out of scope

- A new import screen, dark-mode design, redesign of the map controls.
- Spartan's native select and anything else that needs a new npm package.
