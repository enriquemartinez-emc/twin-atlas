# 023 — Redesign: a tool rail, a scene bar and a panel that does one thing at a time

**Status:** In progress | **Branch:** `feat/ui-redesign` (stacked on `feat/ui-panel-polish`)

## Description

The owner asked whether the current screen is the best design on offer. It is not. Read from the code, the problems are structural, not cosmetic:

- One 20 rem card holds everything at the same weight: copy link, scene picker, New scene, tool buttons, the form, the editor, the list, the map details and the token box. Nothing says what to look at first.
- The tools (Select, Marker, Note, Outline) are bare words in a toggle group. The word "Marker" is then used again for the tool, the kind and every list row, which is why the list reads as "a bunch of markers".
- Editing a place pushes the list down inside the same scroll.
- Source and camera coordinates (developer information) are always on screen.
- The scene being worked on has no place of its own: the name is only inside the picker.
- Kinds are told apart by colour alone.

The redesign keeps the colours, the font and the Spartan base, and changes the layout and how each thing is shown. The new dependency is the icon package the owner approved ("add your Sim UI suggested additions"): `@ng-icons/core` and `@ng-icons/lucide`, plus the Spartan components that need it (`spinner`, `tooltip`, `dialog`, `select`).

Changes made while building, and why: Spartan has no `icon` component (icons are `ng-icon` from the package), so none was copied. `tabs` was generated and removed again, because nothing needed a second tab once the map details moved to the status bar, so the panel swaps between list, form and editor instead. The form and editor keep their own Cancel and Close buttons as the way back, so no extra back arrow was added.

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
- **Panel.** The panel moves to the right and shows one thing at a time: the list with its count and kind filter (icons with counts instead of the word toggle), or the form, or the editor. Starting to draw or selecting a place swaps the list for the form or editor, so they never compete for the same scroll.
- **Rows.** Each kind has an icon (pin, message, polygon) in its colour, so colour is never the only cue. Imported places get a small "OSM" badge, and the long explanation becomes the tooltip on that badge and a single line under the count.
- **Map status bar.** Source, camera and Reset view move to a slim bar at the bottom of the map, out of the panel.
- **Loading.** The Spartan spinner replaces the "Loading the 3D viewer…" line.
- **Small screens.** The panel is a bottom sheet and the tools run along the top.

Colour stays as it is: neutral chrome, and the three kind colours as the only strong colour on screen.

## Acceptance criteria

- [x] **Dependency.** `@ng-icons/core` and `@ng-icons/lucide` are added (approved by the owner) and the Spartan components `spinner`, `tooltip`, `dialog` and `select` are copied with the CLI, and the scene chooser is Sim UI's "select with description" (`select-40`), copied and adapted with its notice. Licences of the icon packages go into `THIRD-PARTY-NOTICES.md`. Nothing else is added.
- [x] **Scene bar.** The scene name and chooser are always visible in the header. "New scene…" opens a dialog that holds the name field and its problem message. Copy link is an icon button with a tooltip and still says when it worked or failed (announced to screen readers).
- [x] **Tool rail.** Four icon buttons with accessible names and tooltips, one active at a time, active state in the kind's colour. Keyboard operable, with a visible focus ring.
- [x] **Hint.** A status pill states the next step for each tool and each drawing stage (for example, an outline needs three points), and disappears in Select mode unless something is being moved.
- [x] **Panel.** It shows the list (count, kind filter with a count per kind, rows), or the form, or the editor, never two at once. Cancel and Close return to the list. The token box lives in the settings dialog.
- [x] **Rows.** Each row has the kind's icon in its colour, the title and the first line of the body; imported places show an "OSM" badge with an explanation in its tooltip. The earlier "In this view" heading and its one-line explanation remain.
- [x] **Map status bar.** Source, camera and Reset view sit at the top of the map beside the tools (the bottom edge belongs to Cesium's credits); the Map section leaves the panel.
- [x] **Loading and empty.** A spinner while the 3D viewer starts; skeleton rows and the empty message keep working as now.
- [x] **Small screens.** The panel is a bottom sheet, the rail runs along the bottom, and nothing overflows horizontally.
- [x] **Unchanged behaviour.** Routes, `?annotation=`, the draft and edit rules, the conflict handling and the map code keep working; no endpoint, contract or SDK changes.
- [x] **Quality.** Component tests for the rail, hint, status bar, dialogs and the panel swapping between list, form and editor; at least five deliberate breaks, each caught by a test. Prettier, lint (with the class check), all unit tests and the production build are green, no `any`, single-file components, at most four utility classes per static `class`. `THIRD-PARTY-NOTICES.md`, the user guide and a docs page are updated. New screenshots need the owner's approval to drive the app, so the README says its screenshots show the earlier layout.
- [ ] **Not verified, and said so:** the look and feel, the phone layout, tooltips and dialogs in a real browser, until the owner approves a run.

## Out of scope

- Map symbols with the same icons as the rail (Cesium billboards). Worth doing next, and it would make the map and the list match, but it changes the Cesium wrapper.
- Sim UI's full Sidebar block.
- The paused sign-in work and the browser end-to-end suite.

## Found in the browser run (approved by the owner)

- A list pick left the selected dot blue: Cesium merges a remove and a re-add of one id inside a batch and keeps the old colour. Fixed in the layer, with a test that models the batching.
- Phone layout overflowed (scene bar, status bar over the tools): fixed.
- The status bar covered the map credits: moved to the top.
- Label range 1500 m to 300 m after seeing a crowded real import.
- Not exercised, because they write data: the conflict message and moving a place. README screenshots still show the earlier layout.
- Soft Google tiles (reported by the owner): render at the real device resolution and lower the tile screen-space error from 16 to 8. Unit-tested as settings; the look needs a real tileset.
