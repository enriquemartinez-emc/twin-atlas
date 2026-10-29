# 022 — Panel polish: readable map, clearer list, honest loading, tidier forms

**Status:** In progress | **Branch:** `feat/ui-panel-polish` (stacked on `feat/ui-polish`)

## Description

The second round of UI polish, from the list agreed after the browser run. It uses Sim UI's patterns and the Spartan components we do not have yet, with no new package.

About Sim UI (read from its site and repository, not assumed): a free, open-source, copy-paste collection of Angular components built on Spartan UI and Tailwind, MIT licence (Copyright (c) 2025 Phuong Tran Dong, `github.com/dofu-lab/simui`). Its model is copy and paste, so we copy the source (keeping its notice) and adapt it: here the status-dot badge (`badge-08`), turned into a reusable component whose dot takes the annotation kind's colour. The other pieces come from Spartan itself. Most Sim UI examples that look richer need the `@ng-icons` package, so they wait for a decision on that. The paid part is only its optional theme editor, which we do not use.

## Acceptance criteria

- [ ] **Labels.** A point's label is drawn only when the camera is within a set range of it, except the selected annotation, whose label always shows. The rule sits in the pure descriptor and is unit-tested. The range is a first guess, to be tuned by eye.
- [ ] **The list explains itself.** The panel says what the list is: a heading ("In this view"), one line saying it is everything added inside the part of the map you are looking at and that panning or zooming changes it, and, when items come from an import, that their titles carry the OpenStreetMap reference. Nobody should have to guess why there are many markers.
- [ ] **List.** It shows a count ("26 in view", or "12 of 26 in view" when filtered), a filter by kind (All, Markers, Notes, Outlines), and for each kind an outline badge with a dot in the map's own colour (Sim UI's status-dot pattern), taken from the same palette the map uses. Each row is still a button in a list item.
- [ ] **Loading and empty.** Skeleton rows show while the first load runs. The empty message (Spartan's `empty`) shows only once loading has finished. The Map section says the 3D viewer is loading until it is up.
- [ ] **Scene forms.** "New scene" sits in a collapsible (Spartan's `collapsible`), open when there are no scenes and closed otherwise.
- [ ] **Panel.** A "Copy link" button copies the address and says so (and says plainly if it could not). The panel can be hidden and shown again. On narrow screens it sits at the bottom with a limited height.
- [ ] **Header.** The pin icon sits next to the title.
- [ ] **A user guide page.** `docs/guide.html`, "Using Twin Atlas", is in "Start here" on every page and linked from the README. It explains the panel section by section (with a labelled diagram), what markers, notes and outlines are, why a scene can hold many of them (including imports), how the list relates to the map view, and the first-session workflow.
- [ ] **Attribution.** `THIRD-PARTY-NOTICES.md` lists Sim UI (MIT, with its notice), Spartan UI, Figtree and Geist Mono with their licences, and the README links to it.
- [ ] **No new package.** `collapsible`, `skeleton` and `empty` come from the Spartan CLI.
- [ ] Prettier, lint (with the class check), unit tests and the production build are green, with no `any`. A docs page is written.
- [ ] Not verified, and said so: how it looks, the label range, the narrow-screen layout and the clipboard in a real browser. Needs the owner's approval to drive the running app.

## Candidates, not in scope unless the owner asks

- Components that need the `@ng-icons` package (Spartan's `spinner`, `tabs`, `dialog`, `select`, `accordion` chevrons, and Sim UI examples with icons). A new dependency, so a decision first.
- A page title that follows the selected scene. The router resets the title on every navigation, so it needs a title strategy.
- Better titles for imported places.

## Out of scope

- Replacing the floating panel with Sim UI's Sidebar. It pulls in sheet, tooltip, skeleton and the icon package.
