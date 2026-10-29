# Architecture

Twin Atlas is a modular monolith: one Spring Boot module, packaged by feature, with an Angular client ([ADR 0013](docs/adr/0013-modular-monolith-with-feature-slices.md)). Decisions are recorded in [docs/adr](docs/adr/README.md); conventions are in [AGENTS.md](AGENTS.md).

## Backend slices

```
com.twinatlas
├── annotation/   what the feature returns: kind, status, responses, summaries, pages
│   ├── core/         pure rules and transforms (no Spring, Jakarta or Hibernate)
│   ├── web/          the four endpoints and the request shapes
│   └── persistence/  entity, repository, mapper, facts, SQL reads, query inputs
├── importing/    OpenStreetMap import: one bulk endpoint, judged element by element
│   └── core/     pure OSM → annotation transforms and the batch rules
├── scene/        plain CRUD: the area an annotation must fall inside
├── asset/        (planned) plain CRUD
├── platform/     problems and the error handler
│   ├── config/   clock, id and geometry beans, JSON, OpenAPI
│   └── kernel/   Decision and Rejection: the vocabulary every core shares (not a feature core)
└── geo/          WGS 84: the SRID, the geometry factory and the rule for a usable geometry
```

A feature splits into role folders once its package passes about 8 files: `annotation` has, `scene` (6 files) and `importing` (4) have not. Inside a split feature the dependencies run one way, `web` to `persistence` to the base package and `core` ([ADR 0013](docs/adr/0013-modular-monolith-with-feature-slices.md)).

ArchUnit enforces the boundaries: `..core..`, `platform.kernel` and `geo` are pure, a slice may only use another slice's `core`, `platform` depends on no slice, and `kernel` and `geo` depend on neither a slice nor the shell around them (ADR 0012).

## Writes: functional core, imperative shell

```
HTTP ──▶ endpoint (shell) ───────────────────────────────────────────────┐
         1. load facts      AnnotationFacts ──SQL──▶ PostGIS             │
         2. evaluate        CreateAnnotationRules.evaluate(command, ctx)  │ pure
         3. reject?         if Rejected(reason) → Problems.from(reason)   │
         4. transform       Annotation.create(id, now, command)           │ pure
         5. persist         MapStruct → entity → JPA                      │
                            DB constraint violation → same Rejection ─────┘
```

Updates add a version check: the ETag is the version, an update sends it as `If-Match`, and a stale one is a pure rule (`STALE_VERSION`, 412) with the database version column as the last guard ([ADR 0010](docs/adr/0010-version-check-is-a-rule.md)). A core decision is advisory under concurrency. The unique index on `(scene_id, lower(title))` is the final enforcer, and `PersistenceConflicts` turns its violation into `TITLE_ALREADY_USED`. See [ADR 0003](docs/adr/0003-fcis-decision-functions.md) and [ADR 0004](docs/adr/0004-entity-mapping-at-the-shell-boundary.md).

## Reads: straight to SQL

Spatial reads have no rules, so they skip the core ([ADR 0005](docs/adr/0005-reads-bypass-the-core.md)). `AnnotationQueries` runs native SQL (`&&` first, then the exact predicate) and maps rows to response records, timed with Micrometer:

| Endpoint | Query |
| --- | --- |
| `GET /api/scenes/{id}/annotations?bbox=&limit=&cursor=` | what is visible in the view, keyset-paginated |
| `GET /api/scenes/{id}/annotations/nearest?longitude=&latitude=&limit=&maxDistanceMeters=` | N closest by KNN, distance in metres |
| `POST /api/scenes/{id}/annotations/search` | everything that intersects a zone, keyset-paginated |

See [ADR 0006](docs/adr/0006-native-sql-vs-hibernate-spatial.md) and [ADR 0007](docs/adr/0007-keyset-pagination.md).

## Errors

Every error is an RFC 7807 problem with a stable `code`. Domain rejections map exhaustively in `Problems.from(Rejection)`. Framework and infrastructure failures use `ApiError`. Both lists are published as an enum in the OpenAPI `ProblemResponse` schema, so SDKs get typed codes.

## Data

PostgreSQL with PostGIS. Flyway owns the schema, Hibernate only validates it (`ddl-auto=validate`). Geometry is stored as `geometry(…, 4326)` with GiST indexes ([ADR 0001](docs/adr/0001-geometry-vs-geography.md)). Local development uses `./dev.sh` (the database through `docker compose`, then the API and the client); tests use Testcontainers with the same image. Performance at scale is measured, not assumed: `scripts/benchmark/run.sh` seeds 1.2 million annotations and records query plans and API latency with and without the spatial index ([ADR 0009](docs/adr/0009-benchmark-one-million-rows.md), results in `docs/benchmark/`).

## Client

Angular 22: zoneless, standalone, signals, single-file components. Feature folders mirror the backend slices.

```
client/src/app
├── api/                 generated SDK (from docs/openapi.json), never edited
├── core/problems/       server error code → message, the Outcome type (app-wide, no UI)
├── map/                 the only code that touches Cesium: MapViewer, feature layer, pure descriptors, GeoJSON helpers
├── app.ts, app.config.ts, app.routes.ts, not-found.ts
├── features/
│   ├── scene/           scene.ts (the route-level page), scene.routes.ts, scene-data.ts,
│   │                    ion-token-store.ts, components/ (scene bar, tool rail, status bar, token panel)
│   └── annotation/      annotation-data.ts (httpResource), annotation-draft.ts (pure logic),
│                        components/ (form with Signal Forms, editor, list)
└── shared/              components/ (problem alert, badge), forms/,
                         ui/ (Spartan Helm components, path set by the CLI)
```

Routes: `/` goes to `/scenes`, `/scenes` shows the scene used last, `/scenes/:sceneId` shows that scene (one route with a custom matcher, so the page and its map survive choosing another scene), `?annotation=<id>` selects an annotation, and anything else shows a not-found page. Route values arrive as signal inputs ([task page](docs/tasks/019-angular-structure.html)).

The UI is built from Spartan components and the Figtree font, and templates keep to a few classes ([ADR 0014](docs/adr/0014-spartan-ui.md)).

- **Contract first.** The server commits `docs/openapi.json`; a test fails when it is stale. The SDK is generated from it, with typed GeoJSON and a typed enum of error codes ([ADR 0008](docs/adr/0008-contract-first-sdk.md)).
- **Smart and presentational.** `Scene` owns the state and talks to the services. The form, editor, list, scene bar, tool rail and token panel only take inputs and emit outputs. The annotation data is a function fed with the scene, the map view and the selection as signals, so there is nothing to keep in sync.
- **Reads** use `httpResource` over the SDK's request builders. The list keeps the previous result while a new view loads, so the map does not flicker.
- **The map is isolated.** Components never import `cesium`. `MapViewer` is lazy-loaded with `injectAsync` (Cesium is a separate 5 MB chunk), draws annotations and the draft through a `FeatureLayer`, reports clicks and the visible bbox as signals, and releases everything on destroy.

See [client/README.md](client/README.md) for running it.
