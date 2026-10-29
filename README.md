# Twin Atlas

Explore a real place in 3D in the browser, put markers, notes and outlines on it, and find things by area. A Spring Boot and PostGIS API with an Angular and CesiumJS client, built to stay fast on a million annotations.

A digital twin is a photorealistic 3D copy of a real place. Twin Atlas is the platform for exploring and managing the information attached to one, with nothing to install.

## What works today

- **A 3D map.** A globe in the browser, with Google's photorealistic 3D buildings when you paste a free Cesium ion token (otherwise an OpenStreetMap globe). The Cesium code is isolated and loaded on demand.
- **Scenes and annotations.** Create a scene from the current view, click to place a marker, note or outline, and edit or move it later. A save never silently overwrites a newer change: the server refuses a stale edit and the screen offers the latest version.
- **Find things by area.** What is in the current view, the nearest N to a point, everything inside a zone. All keyset-paginated.
- **Bulk import from OpenStreetMap.** `POST /api/scenes/{id}/imports/osm` takes an Overpass answer, imports what is usable and reports every skipped element with a stable code. There is no screen for it yet.
- **A typed API.** The server commits its OpenAPI contract, a test fails when it is stale, and the client's SDK is generated from it.

## Quick start

You need JDK 25, Node 24 and Docker.

```bash
docker compose up -d                  # PostGIS (repo root)
cd server && ./mvnw spring-boot:run   # API on http://localhost:8080
cd client && npm ci && npm start      # app on http://localhost:4200
```

The running server documents its API with springdoc's Swagger UI (default path `/swagger-ui.html`), and the committed contract is [`docs/openapi.json`](docs/openapi.json). More about the client in [`client/README.md`](client/README.md).

Run the tests (the backend needs Docker for Testcontainers):

```bash
cd server && ./mvnw verify
cd client && npm run lint && npm test -- --watch=false && npm run build
```

## How it is built

- **Functional core, imperative shell.** Rules with more than one condition are pure functions that return `Accepted` or `Rejected(code)`; the endpoint around them loads facts, calls the rule, and writes. The codes become RFC 7807 problems and appear in the API contract and the SDK ([ADR 0003](docs/adr/0003-fcis-decision-functions.md)).
- **Reads go straight to SQL.** Spatial queries use the bounding-box operator first and the exact test second, over a GiST index ([ADR 0005](docs/adr/0005-reads-bypass-the-core.md)).
- **Races are tested, not assumed.** Rules are advisory under concurrency, so the database has the last word: a unique index and a version column. Tests send eight clients at once and expect exactly one winner.
- **Boundaries are enforced.** A modular monolith packaged by feature, with ArchUnit rules that fail the build ([ADR 0013](docs/adr/0013-modular-monolith-with-feature-slices.md)).
- **Measured, not claimed.** On 1.2 million annotations on a 4-CPU laptop with 7.8 GiB of memory, a 250 m map view takes 7.5 ms at the median with the spatial index and 254 ms without it, and "10 nearest" takes 5.6 ms against 361 ms. Method, hardware and query plans are in [ADR 0009](docs/adr/0009-benchmark-one-million-rows.md) and [`docs/benchmark/`](docs/benchmark/).

| | |
| --- | --- |
| Backend | Java 25, Spring Boot 4, Hibernate 7 with Hibernate Spatial, PostgreSQL and PostGIS, Flyway, MapStruct, springdoc |
| Backend tests | JUnit 5, AssertJ, jqwik, Testcontainers, ArchUnit |
| Client | Angular 22 (zoneless, Signal Forms, Vitest), CesiumJS, Spartan UI with Tailwind, Figtree |

## Where to read more

- [`docs/index.html`](docs/index.html): the documentation site, one page per task in plain words with diagrams. Open it straight from disk.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`docs/adr/`](docs/adr/README.md): how it fits together and why.
- [`ROADMAP.md`](ROADMAP.md): what is done, what is next, what was left out on purpose.
- [`specs/`](specs/README.md): one file per task with its acceptance criteria and status.
- [`AGENTS.md`](AGENTS.md): the working rules of the project.

Map data in the OpenStreetMap import is © OpenStreetMap contributors, available under the [ODbL](https://www.openstreetmap.org/copyright).
