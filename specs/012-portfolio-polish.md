# 012 — Portfolio polish

**Status:** Proposed | **Branch:** `docs/portfolio-polish`

## Description

Make the repo readable in five minutes by a hiring manager: README with a demo, ARCHITECTURE.md, ROADMAP.md and a complete ADR set.

## Acceptance criteria

- [ ] README states what Twin Atlas is, shows a demo GIF or screenshots, and gives a working quick start (`docker compose up` plus client and server commands tested from a clean clone).
- [ ] `ARCHITECTURE.md` covers the modular monolith, FCIS split, reads bypass, mapping boundary and a diagram.
- [ ] `docs/adr/` contains every ADR listed in AGENTS.md "Docs to maintain" (slices, decision functions, reads bypass, native SQL vs Hibernate Spatial, entity mapping, Maven, keyset pagination, Spartan UI) plus geometry vs geography, with the benchmark note and before/after query plans.
- [ ] `ROADMAP.md` lists what is done and next, and the trade-offs deliberately left out.
- [ ] Every spec `001`–`012` has an accurate status.
- [ ] Links resolve. No placeholder text remains.
- [ ] Formatters and all test suites are green on a clean checkout.

## Out of scope

- New features.
