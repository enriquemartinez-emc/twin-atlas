# Architecture

Twin Atlas is a modular monolith: one Spring Boot module, packaged by feature, with an Angular client. Decisions are recorded in [docs/adr](docs/adr/README.md); conventions are in [AGENTS.md](AGENTS.md).

## Backend slices

```
com.twinatlas
├── annotation/   markers, notes, outlines on a scene
│   └── core/     pure rules and transforms (no Spring, Jakarta or Hibernate)
├── scene/        plain CRUD: the area an annotation must fall inside
├── platform/     problems, clock/id/geometry beans, JSON, OpenAPI
│   └── core/     Decision and Rejection, shared by every core
├── asset/        (planned) plain CRUD
└── importing/    (planned) pure OSM → annotation transforms
```

ArchUnit enforces the boundaries: `..core..` is pure, a slice may only use another slice's `core`, and `platform` depends on no slice.

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

A core decision is advisory under concurrency. The unique index on `(scene_id, lower(title))` is the final enforcer, and `PersistenceConflicts` turns its violation into `TITLE_ALREADY_USED`. See [ADR 0003](docs/adr/0003-fcis-decision-functions.md) and [ADR 0004](docs/adr/0004-entity-mapping-at-the-shell-boundary.md).

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

PostgreSQL with PostGIS. Flyway owns the schema, Hibernate only validates it (`ddl-auto=validate`). Geometry is stored as `geometry(…, 4326)` with GiST indexes ([ADR 0001](docs/adr/0001-geometry-vs-geography.md)). Local development uses `docker compose up` (database only); tests use Testcontainers with the same image.

## Client

Angular 22 (zoneless, standalone, signals). The 3D scene is CesiumJS behind a lazily loaded `MapService` in `client/src/app/map`. See [client/README.md](client/README.md).
