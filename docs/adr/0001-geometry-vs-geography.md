# 0001 — Store geometry in SRID 4326, not geography

**Status:** Accepted · 2026-10-28

## Context

Annotations (markers, notes, outlines) and scene extents are stored in PostGIS and exchanged as GeoJSON, which is WGS 84 (EPSG:4326) by definition. PostGIS offers two column types for that data:

- `geometry(…, 4326)`: planar functions over coordinates in degrees, the full function set, optional Z.
- `geography`: spheroidal functions in metres, a smaller function set, 2D only for most operations.

The app needs bbox ("visible in view"), nearest-N, within-zone and metric radius queries on up to a million rows, all backed by GiST indexes (see the benchmark task).

## Decision

Store everything as `geometry(Geometry, 4326)` with a GiST index. Use the bbox operator `&&` first, then the exact predicate.

- **Containment and intersection** (`ST_Covers`, `ST_Intersects`) run on geometry. They are correct in degrees at any latitude.
- **Metric distance** (radius filters, the distance returned to clients) casts to `geography` at the predicate only: `ST_DWithin(a::geography, b::geography, metres)`, preceded by an index-friendly `&&` against an expanded bbox. The stored column and its index are never cast.
- **Nearest-N** orders by the geometry KNN operator `<->` (an index scan, distance in degrees). Degrees distort ordering away from the equator, which is acceptable at city and neighbourhood scale. The reported distance is computed in metres on the returned rows.

## Alternatives

- **`geography` columns.** Metres everywhere and no distortion. Rejected: loses Z (annotations sit at heights on a 3D scene), has fewer functions (several containment and validity helpers are geometry-only), and Hibernate Spatial plus JTS work in planar coordinates anyway.
- **A projected SRID (for example UTM).** Metric and fast, but a twin can sit in any zone and the API contract is WGS 84. Rejected: two SRIDs to maintain.
- **Both columns.** Rejected: duplicated storage and indexes for little gain.

## Consequences

- Queries must cast deliberately. A cast on the column side defeats the index, so the cast goes on the argument.
- KNN ordering is approximate far from the equator. If a use case needs exact metric ranking, re-rank the top candidates by `ST_Distance` on geography.
- JTS geometries carry SRID 4326 at every boundary (`PlatformConfig` sets it for parsed GeoJSON).
