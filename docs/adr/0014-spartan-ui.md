# 0014 — Spartan UI for the client's components

**Status:** Accepted · 2026-10-28

## Context

The client needs accessible form controls, alerts, toggles and layout pieces, styled consistently with Tailwind, without a heavy design system and without long runs of utility classes in every template.

## Decision

Use **Spartan UI**: Brain for behaviour and accessibility, Helm for styling.

- **Helm components are copied into the repository** (`client/src/app/shared/ui`) with Spartan's CLI, so the project owns and can edit them. Brain is the only runtime package.
- **Templates use Helm directives** (`hlmBtn`, `hlmInput`, `hlmCard`, `hlmAlert`, `hlmItem`, `hlmToggleGroup`, `hlmField`...) and theme variables for colour. Long class strings belong in Helm files, not in feature templates. A static `class` attribute holds at most four utility classes, and `npm run lint:classes` enforces it.
- **Don't hand-roll what Spartan provides.** Adding a component uses the CLI. A component that needs an extra npm package (the native select needs an icon library) needs approval like any dependency.
- **The font is Figtree**, a variable font served from the project ([task page](../tasks/017-ui-figtree-and-spartan.html)).

## Alternatives

- **Angular Material.** Complete and well supported, but a strong visual identity that is costly to move away from and heavy theming.
- **PrimeNG.** A very large component set, with its own styling system alongside Tailwind.
- **`@angular/aria` only.** Accessible primitives without styling. Spartan Brain already provides them, so it is added only if Spartan lacks one.
- **Hand-rolled components with utility classes.** What the client started with: it works and it produces templates full of class strings.

## Consequences

- The look is Spartan's (shadcn-style) and is changed by editing Helm files and theme variables.
- Components are code in the repository, so upgrades are manual copies, not a version bump.
- Spartan's field error shows itself from Brain's form state, which does not know about Signal Forms. It is used as a styled message inside our own checks until that changes.
