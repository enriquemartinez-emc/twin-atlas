# 0008 — Contract-first SDK from a committed OpenAPI spec

**Status:** Accepted · 2026-10-29

## Context

The client must not hand-write API types: they drift from the server. Other systems also need a documented interface. springdoc can serve the spec from the running app, but generating from a live server makes client builds depend on it.

## Decision

- The server's contract is committed at `docs/openapi.json`. `OpenApiSpecTest` regenerates it from the running app (Testcontainers) and fails when the committed copy is stale. `-Dopenapi.update=true` rewrites it, so changing the API and the contract is one visible diff.
- The spec is made useful to generators: explicit `operationId`s (`createAnnotation`, `listScenes`...), required response fields via `@NotNull`, real GeoJSON schemas (`GeoJsonPoint`, `GeoJsonPolygon` and a `GeoJsonGeometry` oneOf discriminated on `type`), and a `ProblemResponse` whose `code` is an enum of every stable error code.
- The client SDK is generated from that file with `@hey-api/openapi-ts` (pinned exactly, it is pre-1.0) into `client/src/app/api`, using its Angular client and its `@angular/common` plugin, which emits `HttpRequest` builders for `httpResource`. The folder is never edited by hand and is excluded from lint and formatting.
- Dev traffic goes through the dev server's `/api` proxy, so the API is same-origin and needs no CORS configuration.

## Alternatives

- **Generate from the running server at client build time.** Always fresh, but the client build then needs the backend and a database.
- **`openapi-generator` (typescript-angular).** Established, but needs a JVM runner and produces heavier class-based code with no `httpResource` support.
- **Hand-written types.** Fast to start, and exactly the drift this avoids.

## Consequences

- A new error code in the server stops the client from compiling until `shared/problems/problem-message.ts` has a message for it, because that map is typed over the generated `code` enum.
- Regenerating is deterministic (springdoc writes keys in order), so a regeneration with no API change leaves no diff.
- The generated runtime contains two `any` types. They are generated, not ours, and the folder is excluded from the no-`any` lint rule.
