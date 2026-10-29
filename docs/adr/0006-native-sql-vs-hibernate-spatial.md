# 0006 — Native SQL for reads, Hibernate Spatial for writes

**Status:** Accepted · 2026-10-28

## Context

Hibernate Spatial maps JTS geometries to PostGIS columns and exposes spatial functions in HQL and the Criteria API. The reads need PostGIS operators that HQL does not cover well: `&&`, the KNN `<->` ordering, `ST_Expand`, geography casts, `ST_AsGeoJSON`, row-value keyset comparisons.

## Decision

- **Writes** use Hibernate Spatial: `Geometry` fields on package-private entities, `ddl-auto=validate` against Flyway-owned tables. JTS geometries are parsed from GeoJSON at the edge and carry SRID 4326.
- **Reads** use native SQL with named parameters. Geometry is produced in the database with `ST_AsGeoJSON` and returned as a JSON tree, so no JTS object is built per row.
- Zones sent by clients are bound as WKB (`ST_GeomFromWKB(:zone, 4326)`), never concatenated into SQL. Only fixed fragments are composed in Java (`listSql`, `nearestSql`).

## Alternatives

- **HQL/Criteria spatial functions for reads.** Portable and typed, but no `&&`, no KNN, and the generated SQL is harder to tune and to `EXPLAIN`.
- **jOOQ.** Typed SQL, but another dependency and code generation for a handful of queries.

## Consequences

- The SQL strings are the contract with the planner. Tests assert that the plans use `ix_annotation_geom` and `ix_annotation_scene_created`.
- The nearest-N radius filter pre-filters with an expanded box in degrees. That box does not wrap the antimeridian, so a radius search near ±180° can miss matches on the other side. Acceptable for city-scale scenes, and documented here.
- KNN with a `scene_id` filter relies on the planner. With many large scenes a composite index (for example `btree_gist` on `(scene_id, geom)`) may be needed: measure in the benchmark task before adding it.
