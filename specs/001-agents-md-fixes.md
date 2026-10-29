# 001 — AGENTS.md fixes and repo bootstrap

**Status:** Done | **Branch:** `chore/agents-md-fixes`

## Description

Put the repo under git and remove the contradictions in AGENTS.md (unapproved tools required by rules, undefined Docker/SDK tooling, layout, Angular 22 specifics, scale target). Introduce `specs/` with a spec for every planned task.

## Acceptance criteria

- [ ] `git init` done. One bootstrap commit on `main` contains only the original AGENTS.md and `.gitignore`. All other work is on `chore/agents-md-fixes`.
- [ ] No workflow rule requires a tool that the stack section lists as unapproved. Prettier, Spotless, angular-eslint, Docker Compose + PostGIS image, and `@hey-api/openapi-ts` are named as approved. commitlint/husky, Lombok and devtools are not.
- [ ] Layout is documented: `server/`, `client/`, `specs/`, root docs. Package and groupId are `com.twinatlas`.
- [ ] Angular 22 constraints (Node, TypeScript, Vitest, zoneless, Signal Forms, `@Service`, `injectAsync`, experimental APIs out of core paths) are written down.
- [ ] Scale target is tiered and measurable (1M local, 1k–10k Testcontainers, 500k fallback).
- [ ] E2E policy is explicit: tests may be written, tooling needs approval, and they are never run without my explicit approval (not in `verify`, `ng test`, CI or "Done means").
- [ ] Rule 10 and the "Done means" section reference specs and the "n/a" convention. The "stack listed below" typo is fixed.
- [ ] `specs/README.md` plus `specs/001`–`012` exist, each with description, acceptance criteria and status.
- [ ] No existing file other than AGENTS.md is changed. `twinatlas/` is untouched (task 002).
- [ ] `.claude/` and `skills-lock.json` are committed on the branch.
- [ ] Commits follow Conventional Commits with the attribution trailer. Then stop and report.

## Out of scope

- Moving or editing the backend (task 002), creating the client (task 003), installing JDK 25.
- Formatting runs (no formatter is installed yet; "n/a").
