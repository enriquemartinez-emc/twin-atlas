# 021 — UI polish: the app's own icon and name, and a guide for new users

**Status:** In progress | **Branch:** `feat/ui-polish` (stacked on `chore/playwright-cli-skill`)

## Description

The app still carries traces of the Angular starter. The browser tab shows Angular's favicon and the page title is "Client". And a newcomer, or a reviewer, has nowhere that says what the app is for, how to use it in the first five minutes, and what is worth looking at. This task fixes the first two and writes the third.

## Acceptance criteria

- [ ] Angular's `favicon.ico` is gone. The app has its own icon: an SVG (a map pin on a dark square), a 48 px PNG for browsers that ignore SVG icons, and a 180 px PNG for the home screen. All three are linked from `index.html`, with no tool or package added.
- [ ] The page has a real title (`Twin Atlas`), a description, and a theme colour. Route titles keep working.
- [ ] The form hint changes once the shape is placed ("Placed. Add a title and save, or click again to move it."), instead of still asking you to click the map. A test covers it.
- [ ] The README says what problem Twin Atlas solves and for whom, walks a new user through a first session that matches what the app really does (every step checked against the code), says plainly what it is not, and lists what a reviewer should look at, each point with its evidence.
- [ ] Prettier, lint (with the class check), unit tests and the production build are green, and the build output contains the icons.
- [ ] A docs page for the task is written and linked.
- [ ] Not verified, and said so: how the icon looks in a real tab. Needs the owner's approval to drive a browser against the running app (the icon files themselves can be looked at without it).

## Candidates, not in scope unless the owner asks

- Map labels overlap where markers are dense.
- Imported titles such as "OSM node/1361887169" are noisy.
- A separate user guide page in `docs/`. The README carries the five-minute path for now.

## Out of scope

- A redesign, dark mode, a logo for the docs site.
