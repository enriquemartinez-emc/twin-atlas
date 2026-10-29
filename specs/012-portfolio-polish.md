# 012 — Portfolio polish

**Status:** In progress | **Branch:** `docs/portfolio-polish`

## Description

Make the repo readable in five minutes by a hiring manager: README with a demo, ARCHITECTURE.md, ROADMAP.md and a complete ADR set.

## Acceptance criteria

- [x] README states what Twin Atlas is, shows screenshots, and gives a working quick start. The three screenshots come from the approved browser run of 2026-10-29. The start commands were run from the working checkout (not a clean clone); the clean clone ran tests and builds.
- [x] `ARCHITECTURE.md` covers the modular monolith, FCIS split, reads bypass, mapping boundary and a diagram.
- [x] `docs/adr/` contains every ADR listed in AGENTS.md "Docs to maintain" (slices, decision functions, reads bypass, native SQL vs Hibernate Spatial, entity mapping, Maven, keyset pagination, Spartan UI) plus geometry vs geography, with the benchmark note and before/after query plans.
- [x] `ROADMAP.md` lists what is done and next, and the trade-offs deliberately left out.
- [x] Every spec `001`–`012` has an accurate status.
- [x] Links resolve. No placeholder text remains.
- [x] Formatters and all test suites are green on a clean checkout.

## Notes

- Added the two ADRs the rules require and that did not exist: the modular monolith (0013) and the Spartan UI choice (0014). `ARCHITECTURE.md` still described the OpenStreetMap import as planned, so it was updated.
- Checked: 72 links in the new and changed documents resolve, no placeholder text, every spec's status matches the index (011 is paused, 012 is this task).
- Clean clone of the branch: server `spotless:check verify` gives 192 passing tests, client `npm ci`, lint (with the class check), formatting, 182 passing tests and the production build pass, and regenerating the SDK leaves no diff. This ran tests and builds only. The database, server and client were not started.
- Not opened: the Swagger UI address in the README is springdoc's default path.

## Out of scope

- New features.
