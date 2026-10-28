# Twin Atlas client

Angular 22 (zoneless, standalone, Vitest) with CesiumJS for the 3D scene and Spartan UI with Tailwind for the shell. Conventions live in [AGENTS.md](../AGENTS.md).

## Commands

| Command                | What it does                            |
| ---------------------- | --------------------------------------- |
| `npm start`            | Dev server on http://localhost:4200     |
| `npm run build`        | Production build                        |
| `npm test`             | Unit tests (Vitest), watch mode         |
| `npx ng lint`          | angular-eslint (no `any`, import rules) |
| `npm run format:check` | Prettier check (`npm run format` fixes) |

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
