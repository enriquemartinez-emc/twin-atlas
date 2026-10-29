# 011 — Security and integrations

**Status:** Paused | **Branch:** `feat/security-and-integrations`

## Description

> Paused on 2026-10-29 by the owner: too complex for a demo project. Nothing here is started, and it should not be proposed again unprompted. It would also lock the write endpoints, which the screen (no login) relies on.

Make the API usable by outside systems: JWT resource server, API versioning, and a small example integration that uses only the generated SDK. This is the "APIs and SDKs with developer feedback" story.

## Acceptance criteria

- [ ] Spring Security OAuth2 resource server (JWT) protects write endpoints. Read endpoints' policy is stated in an ADR.
- [ ] A local issuer for development is chosen with my approval (library or image named, with alternatives) before it is added.
- [ ] API is versioned (path or header, decided in an ADR) and the OpenAPI spec reflects it.
- [ ] An example integration (client-credentials flow, SDK only, no hand-written API types) reads and enriches annotations. It lives in its own folder with a README.
- [ ] Endpoint tests cover 401, 403 and a valid-token path for each protected endpoint.
- [ ] `docs/` has an API changelog and a short "feedback" section describing how consumers report issues.
- [ ] SDK regenerated with no manual edits. All builds, formatters and tests are green. `docker compose up` still runs everything.

## Out of scope

- User management, UI login flows, multi-tenancy.
