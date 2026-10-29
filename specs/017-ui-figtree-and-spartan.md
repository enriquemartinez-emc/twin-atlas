# 017 — Figtree font and a Spartan-built UI

**Status:** In progress | **Branch:** `feat/ui-figtree-spartan` (stacked on `chore/shared-kernel`)

## Description

The app uses the Figtree variable font, and its panels, alerts, tool buttons, list rows and form fields are built from Spartan UI components instead of long runs of utility classes. Templates stay readable: no class bloat.

Measured before this task: all four installed Spartan components (button, input, label, textarea) are used for form controls, but everything structural is hand-built, with 47 `class` attributes across 6 feature templates, the longest 249 characters.

## Acceptance criteria

- [ ] Figtree (variable, SIL Open Font License) is self-hosted in `client/public/fonts/` with its licence file, declared with `@font-face` (weight range 300-900, `font-display: swap`) and used as the app's sans font. No CDN, no new npm package. The docs site keeps Geist Mono.
- [ ] The Spartan CLI adds these components with no new npm package: card, alert, badge, separator, toggle-group (with toggle), item, field, typography. `components.json`, the `tsconfig` aliases, the test config and the lint rules are updated together, as the rulebook says.
- [ ] The scene panel is a card, errors and warnings are alerts, the tool choice is a toggle group, annotation rows are items with a badge for the kind, and label, input and message go together in fields. The plain `<select>` stays (Spartan's native select needs an icon library, which is a new dependency) and takes the `hlmInput` look.
- [ ] No class attribute in a feature template has more than 4 utility classes. Positioning and size of the floating panel live in the component's own `styles` block, using theme variables. A small script, `npm run lint:classes`, checks this and fails on a violation, and it is part of the lint step.
- [ ] Behaviour is unchanged. Existing component tests pass. They are changed only where markup changed (roles and selectors), never weakened, and the accessibility they assert (pressed state, alerts, labels, current item) still holds.
- [ ] Prettier, ESLint, unit tests and the production build are green, and the build output contains the font and its `@font-face`.
- [ ] `AGENTS.md` records the Figtree choice and the class rule. A docs page for the task is written and linked.
- [ ] Not verified, and said so: how it looks in a browser. Nothing is started or driven without the owner's approval.

## Out of scope

- A new import screen, dark-mode design, redesign of the map controls.
- Spartan's native select and anything else that needs a new npm package.
