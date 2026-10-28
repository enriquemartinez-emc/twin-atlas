# 008 — Annotation UI and SDK

**Status:** Proposed | **Branch:** `feat/annotation-ui`

## Description

Wire the client to the API: generate the OpenAPI spec and TypeScript SDK, render annotations in the scene for the visible bbox, and create/edit them with Signal Forms.

## Acceptance criteria

- [ ] The OpenAPI spec is generated from the running server and committed. Rejection codes appear in it.
- [ ] `@hey-api/openapi-ts` generates the SDK into `client/src/app/api` through an npm script. Nothing in `@api/*` is hand-edited. Regeneration leaves no diff.
- [ ] Annotations for the visible bbox load through `httpResource`/`resource` using the SDK. No hand-written API types.
- [ ] Create and edit forms use Signal Forms, show server `ProblemDetail` errors by code, and send `If-Match` on edit.
- [ ] Smart components fetch, presentational components use inputs and outputs. Cross-feature imports go through `public-api`.
- [ ] Vitest tests for form validation, error mapping and the resource wiring. Lint, format and build are green.
- [ ] `docker compose up` still runs everything.

## Out of scope

- Delete and archive flows, authentication.
