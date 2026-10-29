-- Seeds one scene with a realistic, clustered dataset. Run through run.sh, or by hand:
--   docker compose exec -T db psql -U twinatlas -d twinatlas_bench -v points=1000000 -v polygons=200000 -f - < scripts/benchmark/seed.sql
-- Reproducible: a fixed random seed, so two runs produce the same distribution. The data is never committed.
\set ON_ERROR_STOP on
\timing on
SELECT setseed(0.2026);

-- One scene covering roughly 30 km by 22 km around Barcelona.
DELETE FROM annotation WHERE scene_id = '00000000-0000-4000-8000-0000000000b1';
DELETE FROM scene WHERE id = '00000000-0000-4000-8000-0000000000b1';
INSERT INTO scene (id, name, extent, version, created_at)
VALUES ('00000000-0000-4000-8000-0000000000b1', 'Benchmark scene',
        ST_GeomFromText('POLYGON((2.0 41.3, 2.4 41.3, 2.4 41.5, 2.0 41.5, 2.0 41.3))', 4326), 0, now());

-- Real places cluster. 25 hot spots, each with its own spread; 80% of annotations fall near one, 20% anywhere.
CREATE TEMP TABLE centers AS
SELECT i, 2.02 + random() * 0.36 AS lon, 41.32 + random() * 0.16 AS lat, 0.002 + random() * 0.015 AS spread
FROM generate_series(1, 25) i;

-- Markers and notes (one in five has text).
INSERT INTO annotation (id, scene_id, kind, title, body, geom, status, version, created_at)
SELECT gen_random_uuid(), '00000000-0000-4000-8000-0000000000b1',
       CASE WHEN s.g % 5 = 0 THEN 'NOTE' ELSE 'MARKER' END,
       'Point ' || s.g,
       CASE WHEN s.g % 5 = 0 THEN 'Note text for point ' || s.g END,
       ST_SetSRID(ST_MakePoint(
         LEAST(2.399, GREATEST(2.001, CASE WHEN s.r < 0.8 THEN c.lon + (s.a + s.b + s.c - 1.5) * c.spread * 2 ELSE 2.0 + s.d * 0.4 END)),
         LEAST(41.499, GREATEST(41.301, CASE WHEN s.r < 0.8 THEN c.lat + (s.e + s.f + s.h - 1.5) * c.spread * 2 ELSE 41.3 + s.k * 0.2 END))
       ), 4326),
       'DRAFT', 0,
       TIMESTAMPTZ '2026-01-01 00:00:00+00' + s.g * interval '1 second'
FROM (SELECT g, random() AS r, 1 + floor(random() * 25)::int AS ci,
             random() AS a, random() AS b, random() AS c, random() AS d,
             random() AS e, random() AS f, random() AS h, random() AS k
      FROM generate_series(1, :points) g) s
JOIN centers c ON c.i = s.ci;

-- Outlines: small squares, 40 to 200 metres across.
INSERT INTO annotation (id, scene_id, kind, title, body, geom, status, version, created_at)
SELECT gen_random_uuid(), '00000000-0000-4000-8000-0000000000b1', 'OUTLINE', 'Area ' || s.g, NULL,
       ST_MakeEnvelope(s.x - s.size / 2, s.y - s.size / 2, s.x + s.size / 2, s.y + s.size / 2, 4326),
       'DRAFT', 0,
       TIMESTAMPTZ '2026-01-01 00:00:00+00' + (:points + s.g) * interval '1 second'
FROM (SELECT g, 0.0004 + random() * 0.0016 AS size,
             LEAST(2.398, GREATEST(2.002, c.lon + (random() + random() + random() - 1.5) * c.spread * 2)) AS x,
             LEAST(41.498, GREATEST(41.302, c.lat + (random() + random() + random() - 1.5) * c.spread * 2)) AS y
      FROM generate_series(1, :polygons) g
      JOIN centers c ON c.i = 1 + (g % 25)) s;

ANALYZE annotation;
\timing off

SELECT kind, count(*) FROM annotation WHERE scene_id = '00000000-0000-4000-8000-0000000000b1' GROUP BY kind ORDER BY kind;
SELECT relname AS relation, pg_size_pretty(pg_relation_size(oid)) AS size
FROM pg_class WHERE relname IN ('annotation', 'ix_annotation_geom', 'ix_annotation_scene_created', 'ux_annotation_scene_title', 'annotation_pkey')
ORDER BY relname;
