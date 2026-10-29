-- EXPLAIN (ANALYZE, BUFFERS) for the four read queries, exactly the SQL the API runs (see AnnotationQueries).
-- Run by run.sh once with the GiST index and once without. :label names the run.
\set ON_ERROR_STOP on
\pset pager off
\set scene '00000000-0000-4000-8000-0000000000b1'

-- A place and a point in time: the 500,000th point by creation time (or the middle one on a small dataset).
SELECT ST_X(geom) AS lon, ST_Y(geom) AS lat, created_at::text AS at, id::text AS rid
FROM annotation WHERE scene_id = :'scene' AND kind <> 'OUTLINE'
ORDER BY created_at, id
OFFSET (SELECT least(500000, count(*) / 2) FROM annotation WHERE scene_id = :'scene' AND kind <> 'OUTLINE')
LIMIT 1 \gset

\echo
\echo ==================================================================
\echo :label
\echo ==================================================================

\echo
\echo -- 1. What is in view: a box about 250 m by 220 m, first page of 200 (&& first, then ST_Intersects)
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.id, a.scene_id, a.kind, a.title, a.body, a.status, a.created_at, ST_AsGeoJSON(a.geom) AS geojson
FROM annotation a
WHERE a.scene_id = :'scene'
  AND (a.geom && ST_MakeEnvelope(:lon - 0.0015, :lat - 0.001, :lon + 0.0015, :lat + 0.001, 4326)
       AND ST_Intersects(a.geom, ST_MakeEnvelope(:lon - 0.0015, :lat - 0.001, :lon + 0.0015, :lat + 0.001, 4326)))
ORDER BY a.created_at, a.id
LIMIT 201;

\echo
\echo -- 2. The 10 nearest to a point (KNN with the <-> operator)
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.id, a.scene_id, a.kind, a.title, a.body, a.status, a.created_at, ST_AsGeoJSON(a.geom) AS geojson,
       ST_Distance(a.geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS distance_m
FROM annotation a
WHERE a.scene_id = :'scene'
ORDER BY a.geom <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
LIMIT 10;

\echo
\echo -- 3. Everything that intersects a zone about 170 m across, first page of 200
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.id, a.scene_id, a.kind, a.title, a.body, a.status, a.created_at, ST_AsGeoJSON(a.geom) AS geojson
FROM annotation a
WHERE a.scene_id = :'scene'
  AND (a.geom && ST_MakeEnvelope(:lon - 0.001, :lat - 0.0008, :lon + 0.001, :lat + 0.0008, 4326)
       AND ST_Intersects(a.geom, ST_MakeEnvelope(:lon - 0.001, :lat - 0.0008, :lon + 0.001, :lat + 0.0008, 4326)))
ORDER BY a.created_at, a.id
LIMIT 201;

\echo
\echo -- 4. One page of the list after 500,000 rows (keyset: continue after a position, no OFFSET)
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.id, a.scene_id, a.kind, a.title, a.body, a.status, a.created_at, ST_AsGeoJSON(a.geom) AS geojson
FROM annotation a
WHERE a.scene_id = :'scene'
  AND (a.created_at, a.id) > (:'at'::timestamptz, :'rid'::uuid)
ORDER BY a.created_at, a.id
LIMIT 201;
