# 023 — Redesign: a tool rail, a scene bar and a panel that does one thing at a time

**Status:** Proposed | **Branch:** `feat/ui-redesign` (stacked on `feat/ui-panel-polish`)

## Description

The owner asked whether the current screen is the best design on offer. It is not. Read from the code, the problems are structural, not cosmetic:

- One 20 rem card holds everything at the same weight: copy link, scene picker, New scene, tool buttons, the form, the editor, the list, the map details and the token box. Nothing says what to look at first.
- The tools (Select, Marker, Note, Outline) are bare words in a toggle group. The word "Marker" is then used again for the tool, the kind and every list row, which is why the list reads as "a bunch of markers".
- Editing a place pushes the list down inside the same scroll.
- Source and camera coordinates (developer information) are always on screen.
- The scene being worked on has no place of its own: the name is only inside the picker.
- Kinds are told apart by colour alone.

The redesign keeps the colours, the font and the Spartan base, and changes the layout and how each thing is shown. The new dependency is the icon package the owner approved ("add your Sim UI suggested additions"): `@ng-icons/core` and `@ng-icons/lucide`, plus the Spartan components that need it (`icon`, `tabs`, `spinner`, `tooltip`, `dialog`, `select`).

## The design

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◉ Twin Atlas   [ Old Town ▾ ]                    [⧉ Copy link] [⚙]  │  scene bar
├────┬─────────────────────────────────────────────────┬───────────────┤
│ ➤  │                                                 │ Places | Map  │  tabs
│ 📍 │                                                 │ ───────────── │
│ ✎  │              the map, full width                │ 26 in view    │
│ ⬠  │                                                 │ All 26 📍20   │
│    │      ┌──────────────────────────────┐           │ ✎3 ⬠3         │
│    │      │ Click the map to place a pin │           │ ● Cafe Roma   │
│    │      └──────────────────────────────┘           │ ✎ Broken sill │
├────┴─────────────────────────────────────────────────┴───────────────┤
│ OpenStreetMap · 41.4036, 2.1744 · 320 m                    [⌂ Reset] │  map status
└──────────────────────────────────────────────────────────────────────┘
```

- **Scene bar.** The header becomes the scene bar: icon and name, the scene chooser (a Spartan select with "New scene…" as its last entry, opening a dialog), Copy link as an icon button with a tooltip, and a settings button that opens the 3D-tiles token dialog. The scene name is always visible.
- **Tool rail.** A narrow vertical rail on the map's left edge with four icon buttons and tooltips: Select, Place a pin (marker), Add a note, Draw an outline. The active tool takes the colour of the kind it will create. On a phone the rail runs along the bottom.
- **On-map hint.** A pill at the bottom of the map says what to do next in the current tool, and replaces the hint text inside the form.
- **Panel with tabs.** The panel moves to the right. **Places** holds the list, count and kind filter (icons with counts instead of the word toggle). Choosing a place, or starting to draw, swaps the list for the form or editor with a back arrow, so the two never compete for the same scroll. **Map** holds the source and the Reset view button.
- **Rows.** Each kind has an icon (pin, message, polygon) in its colour, so colour is never the only cue. Imported places get a small "OSM" badge, and the long explanation becomes the tooltip on that badge and a single line under the count.
- **Map status bar.** Source, camera and Reset view move to a slim bar at the bottom of the map, out of the panel.
- **Loading.** The Spartan spinner replaces the "Loading the 3D viewer…" line.
- **Small screens.** The panel is a bottom sheet with a drag-free toggle (the Places and Map tabs stay), and the rail runs along the bottom.

Colour stays as it is: neutral chrome, and the three kind colours as the only strong colour on screen.

## Acceptance criteria

- [ ] **Dependency.** `@ng-icons/core` and `@ng-icons/lucide` are added (approved by the owner) and the Spartan components `icon`, `tabs`, `spinner`, `tooltip`, `dialog` and `select` are copied with the CLI. Licences of the icon packages go into `THIRD-PARTY-NOTICES.md`. Nothing else is added.
- [ ] **Scene bar.** The scene name and chooser are always visible in the header. "New scene…" opens a dialog that holds the name field and its problem message. Copy link is an icon button with a tooltip and still says when it worked or failed (announced to screen readers).
- [ ] **Tool rail.** Four icon buttons with accessible names and tooltips, one active at a time, active state in the kind's colour. Keyboard operable, with a visible focus ring.
- [ ] **Hint.** A status pill states the next step for each tool and each drawing stage (for example, an outline needs three points), and disappears in Select mode unless something is being moved.
- [ ] **Panel.** Tabs Places and Map. Places shows the count, the kind filter with a count per kind, and the rows. The form or editor replaces the list while open, with a back control that returns to the list without losing the selection. The Map tab holds source and Reset view. The token box lives in the settings dialog.
- [ ] **Rows.** Each row has the kind's icon in its colour, the title and the first line of the body; imported places show an "OSM" badge with an explanation in its tooltip. The earlier "In this view" heading and its one-line explanation remain.
- [ ] **Map status bar.** Source, camera and Reset view sit at the bottom of the map; the Map section leaves the panel.
- [ ] **Loading and empty.** A spinner while the 3D viewer starts; skeleton rows and the empty message keep working as now.
- [ ] **Small screens.** The panel is a bottom sheet, the rail runs along the bottom, and nothing overflows horizontally.
- [ ] **Unchanged behaviour.** Routes, `?annotation=`, the draft and edit rules, the conflict handling and the map code keep working; no endpoint, contract or SDK changes.
- [ ] **Quality.** Component tests for the rail, hint, tabs, dialog and the list-to-form swap; at least five deliberate breaks, each caught by a test. Prettier, lint (with the class check), all unit tests and the production build are green, no `any`, single-file components, at most four utility classes per static `class`. `THIRD-PARTY-NOTICES.md`, the user guide and a docs page are updated, with new screenshots only if the owner approves driving the app.
- [ ] **Not verified, and said so:** the look and feel, the phone layout, tooltips and dialogs in a real browser, until the owner approves a run.

## Out of scope

- Map symbols with the same icons as the rail (Cesium billboards). Worth doing next, and it would make the map and the list match, but it changes the Cesium wrapper.
- Sim UI's full Sidebar block.
- The paused sign-in work and the browser end-to-end suite.
