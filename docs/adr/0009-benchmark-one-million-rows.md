# 0009 — Benchmark: 1.2 million annotations on a laptop

**Status:** Accepted · 2026-10-29

## Context

The project claims to handle large amounts of location data. That is only worth saying if it is measured, on the hardware the project is developed on, through the real API, with the plans to explain the numbers.

## Decision

Measure it with scripts anyone can rerun (`scripts/benchmark/run.sh`), and keep the results in the repository (`docs/benchmark/results.md` and `plans.txt`). Only the scripts are committed, never the seeded data.

- **Data:** one scene, 1,000,000 points (800,000 markers and 200,000 notes) and 200,000 square outlines. 80% of rows fall near one of 25 hot spots, 20% are uniform, with a fixed random seed. Seeding took 30 s with all indexes in place.
- **Plans:** `EXPLAIN (ANALYZE, BUFFERS)` of the four read queries, with the GiST index and without it.
- **Latency:** a Node script (built-ins only) calls the API, one request at a time, 10 warm-up requests then 200 timed per operation (50 without the index), and reports p50, p95, p99 and the maximum.
- **Machine:** 4 CPUs, 7.8 GiB visible to Docker, database container capped at 1.5 GiB (`effective_cache_size=1310728kB, maintenance_work_mem=131072kB, max_connections=50, shared_buffers=655368kB, work_mem=16384kB`), server heap 512 MB.

## Results

| Operation | With index p50 / p95 | Without index p50 / p95 |
| --- | ---: | ---: |
| View 250 m wide (bbox) | 7.5 / 11.5 ms | 254.5 / 457 ms |
| View 3 km wide (bbox) | 47.4 / 92.3 ms | 217 / 298.1 ms |
| 10 nearest | 5.6 / 8.8 ms | 361.4 / 405 ms |
| 10 nearest within 200 m | 5.3 / 7.2 ms | 308.2 / 407.9 ms |
| Zone 170 m wide (search) | 7.6 / 12.2 ms | 257.1 / 298.2 ms |
| List, page 1 | 5.6 / 9.7 ms | 5.9 / 9.8 ms |
| List, page 500 | 6.2 / 9 ms | 6.1 / 9.6 ms |

Plans, one run each (execution time and buffers touched):

| Query | With the GiST index | Without |
| --- | --- | --- |
| What is in view (250 m box) | 3.092 ms, 281 buffers, Index Scan using ix_annotation_geom | 331.179 ms, 23,368 buffers, Parallel Seq Scan |
| 10 nearest (KNN) | 9.561 ms, 362 buffers, Index Scan using ix_annotation_geom | 300.759 ms, 25,095 buffers, Parallel Seq Scan |
| Zone (170 m) | 0.503 ms, 144 buffers, Index Scan using ix_annotation_geom | 269.719 ms, 23,362 buffers, Parallel Seq Scan |
| List page after 500,000 rows | 0.151 ms, 9 buffers, Index Scan using ix_annotation_scene_created | 0.148 ms, 9 buffers, Index Scan using ix_annotation_scene_created |

Memory: the database container reached 800.9 MiB of its 1.5 GiB cap, the server process 345 MB. On disk: table 183 MB, GiST index 49 MB, list index 69 MB, unique title index 94 MB.

## What it showed

- **A million rows is comfortable on this laptop.** Nothing came near a memory or disk limit.
- **The spatial index is the difference.** Without it, view, nearest and zone queries scan about 23,000 buffers (the whole table) and take 5 to 65 times longer. With it they touch a few hundred.
- **Keyset paging stays flat.** Page 500 costs the same as page 1, which is what [ADR 0007](0007-keyset-pagination.md) promised.
- **Cost follows the rows in view, not the dataset.** A 3 km-wide view holds 36,391 annotations. Because the list is ordered by time, all of them are fetched and sorted to return the first 200 (39 ms in isolation, 47.4 ms median and 92.3 ms p95 through the API). A 250 m view holds 246.

## Alternatives

- **pgbench.** Fine for raw SQL throughput, but percentiles need per-transaction logs and it skips the API, serialization and JSON. The question here is what a client sees.
- **k6 or Gatling.** Better for concurrent load, but they add tooling the project has not approved. Concurrency is listed below as unmeasured.

## Consequences

- Rerunning `scripts/benchmark/run.sh` after a query change shows its effect in minutes, and the plans file shows why.
- Not measured, and worth doing before any production claim: concurrent requests, many scenes at once, cold caches, other hardware.
- If wide views matter, the fix is on the client and API contract (a zoom-aware limit, or clustering), not in the index. It is not built.
- The planner underestimated the wide view by about 35 times (it expected about 1,000 rows): clustered data skews its statistics. The chosen plans were still good, so no change was made.
