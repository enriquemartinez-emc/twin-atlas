# Twin Atlas client

Angular 22 (zoneless, standalone, Vitest) with CesiumJS for the 3D scene and Spartan UI with Tailwind for the shell. Conventions live in [AGENTS.md](../AGENTS.md).

## Commands

| Command                | What it does                               |
| ---------------------- | ------------------------------------------ |
| `npm start`            | Dev server on http://localhost:4200        |
| `npm run build`        | Production build                           |
| `npm test`             | Unit tests (Vitest), watch mode            |
| `npm run lint`         | angular-eslint, plus the class-bloat check |
| `npm run format:check` | Prettier check (`npm run format` fixes)    |
| `npm run api:generate` | Regenerate the SDK in `src/app/api`        |

## Run the whole app

From the repository root, one command starts the database, the API and this client, and Ctrl+C stops them all:

```bash
./dev.sh
```

Or by hand:

```bash
docker compose up -d                     # database (repo root)
cd server && ./mvnw spring-boot:run      # API on :8080
cd client && npm start                   # UI on :4200, proxies /api to :8080
```

The dev server forwards `/api` to the backend (`proxy.conf.json`), so there is no CORS setup and the client calls the API on its own origin (`environment.apiBaseUrl` is empty).

## Using it

1. **Scene.** Fly the map to a place and create a scene from the current view. Annotations must fall inside their scene. Pick any existing scene from the list.
2. **Add.** Choose Marker, Note or Outline, click the map (an outline takes three or more corners), give it a title and save. The server's rules come back as readable messages, for example when a title is already used in the scene.
3. **Browse.** The list and the map show the annotations that are in the current view. Click one in the list to fly to it, or click it on the map in Select mode.

## The API SDK

`src/app/api` is generated from the contract the server commits ([`docs/openapi.json`](../docs/openapi.json)) with `@hey-api/openapi-ts`. Never edit it by hand.

```bash
# after changing the API: refresh the contract, then the SDK
cd server && ./mvnw test -Dtest=OpenApiSpecTest -Dopenapi.update=true
cd client && npm run api:generate
```

A server test fails when the committed spec is stale, and a new error `code` in the spec stops `shared/problems/problem-message.ts` from compiling until it has a message. The generated runtime contains two `any` types that we cannot change; our own code has none.

## The 3D scene and where its data comes from

The viewer lives in `src/app/features/scene`. Cesium is only touched in `src/app/map` and is loaded lazily, so it never weighs on the first page load.

| Mode                | When                          | Data                                                                  |
| ------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Photorealistic      | A Cesium ion token is saved   | Google Photorealistic 3D Tiles, streamed through Cesium ion           |
| OpenStreetMap globe | No token, or the token failed | OpenStreetMap raster tiles draped on the globe (development fallback) |

### Using photorealistic tiles

1. Create a free account at https://ion.cesium.com and copy an access token.
2. Open the app and paste it in the "Cesium ion token" panel.

The token is kept in this browser's `localStorage` only. It is never committed, never sent to the Twin Atlas API, and can be removed with "Forget token". If ion rejects it, the viewer falls back to the OpenStreetMap globe and says so.

### Terms and attribution

- **Google Photorealistic 3D Tiles** are subject to the Google Maps Platform Terms of Service and Cesium ion's terms. Cesium shows the required credits in the bottom bar: do not hide them. Google's terms only allow its own geocoder to be used alongside these tiles, and the viewer has no geocoder. Review the current terms before any public deployment.
- **OpenStreetMap** data is © OpenStreetMap contributors under the ODbL. The public tile server (`tile.openstreetmap.org`) has a usage policy that does not allow heavy or production traffic, so the OSM fallback is for local development only. Use a hosted tile provider or your own tiles for anything public.
- **Cesium ion**: the free tier has usage limits. Check your account's terms.

## Notes

- Spartan Helm components are copied into `src/app/shared/ui` (config in `components.json`). They keep upstream conventions, so ESLint relaxes the selector-prefix and non-null rules in that folder only.
- `src/app/api` will hold the generated SDK (task 008) and is never edited by hand.
