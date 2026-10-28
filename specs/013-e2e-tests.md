# 013 — E2E tests

**Status:** Proposed | **Branch:** `test/e2e`

## Description

Browser-driven end-to-end tests of the main flows (explore scene, create annotation, spatial query). They are written and kept out of the default test commands. They are only executed after my explicit approval.

## Acceptance criteria

- [ ] I approve the E2E tool (name, reason, alternatives such as Playwright vs Cypress) before anything is installed.
- [ ] E2E tests live in their own folder with their own script and are excluded from `ng test`, `./mvnw verify` and CI defaults.
- [ ] Flows covered: load the viewer with a scene, create an annotation, see it returned by a bbox query, handle a server rejection.
- [ ] A README section explains how to run them against `docker compose up`.
- [ ] The tests are not executed in this task until I approve the run. When I do, results are reported as they are, including failures.
- [ ] No `any`, linted and formatted. Other criteria: n/a.

## Out of scope

- Visual regression, load testing.
