# Roadmap

Where Twin Atlas is, what comes next, and what was left out on purpose. Each task has a spec with its acceptance criteria in [`specs/`](specs/README.md) and a page on the [documentation site](docs/index.html).

## Done

- **Foundation.** A strict Angular 22 client, a Spring Boot 4 server on PostGIS, one set of working rules, formatters and architecture tests.
- **Creating annotations.** The reference example of the pure-rules design, with a race proven against the database.
- **Finding annotations by area.** What is in view, what is nearest, what is inside a zone, page by page.
- **A 3D map viewer.** Loads on demand, falls back to OpenStreetMap without a token.
- **Annotations on screen.** Pick a scene, click the map, save, edit, move. Built on a typed API client.
- **Editing with a version check.** A stale edit is refused, never overwritten.
- **A benchmark.** 1.2 million annotations on a laptop, with query plans and latencies ([ADR 0009](docs/adr/0009-benchmark-one-million-rows.md)).
- **OpenStreetMap import.** A bulk endpoint that imports what it can and reports every problem.
- **Shared-kernel cleanup.** The shared parts are named for what they are and every framework error carries a code.
- **Figtree and Spartan.** One font and real components, with no piles of style classes.
- **A first look at the running app.** Verified in a real browser: creating, editing, moving, a refused stale edit and an imported extract on the map. Three screenshots in the README.
- **Documentation.** This repository's README, architecture notes, 14 decision records and a site with a page per task.

## Next

- **A short recording** of the running app for the README. There are screenshots already.
- **Browser tests.** Playwright is the approved tool. The tests are written but never run without the owner's approval, and live in their own folder with their own script.
- **An import screen.** The OpenStreetMap import has no screen, so it can only be used through the API. It would also show the required attribution on the map.
- **Paging for the scene list.** `GET /api/scenes` returns the newest 100, which breaks the keyset rule used everywhere else.
- **The asset slice.** Plain CRUD for files attached to a place. Planned in the architecture, not built.

## Paused

- **Sign-in for outside systems** and an example integration through the SDK. Paused on 2026-10-29 as too much for a demo project. It would also lock the write endpoints that the screen, which has no login, relies on ([spec](specs/011-security-and-integrations.md)).

## Left out on purpose

- **Multi-tenancy and user management.** One owner, one database.
- **Separate services.** One deployable is enough for one developer ([ADR 0013](docs/adr/0013-modular-monolith-with-feature-slices.md)).
- **Offset pagination.** Page 500 costs the same as page 1 with keyset cursors ([ADR 0007](docs/adr/0007-keyset-pagination.md)).
- **Relations, streaming and scheduled OpenStreetMap imports.** Relations are skipped. Large extracts are sent in several requests ([ADR 0011](docs/adr/0011-import-judges-each-element.md)).
- **Spartan's native select.** It needs an icon library, which is a new dependency.
