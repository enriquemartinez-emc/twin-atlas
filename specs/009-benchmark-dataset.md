# 009 — Benchmark dataset

**Status:** Done | **Branch:** `chore/benchmark-dataset`

## Description

Prove the data layer scales: a reproducible SQL seed of 1M point annotations (and 100k–250k polygons), query plans before and after GiST, and a benchmark ADR.

## Acceptance criteria

- [x] A seed script generates 1M points and 100k–250k polygons with `generate_series` and a fixed seed. It runs from a documented command and finishes in a few minutes.
- [x] The Compose Postgres has documented memory settings (`shared_buffers`, container limit) that keep it small enough to run beside the server and client.
- [x] `EXPLAIN (ANALYZE, BUFFERS)` plans for bbox, nearest-N and intersects are captured without the GiST index (sequential scan) and with it.
- [x] p50 and p95 latencies for each read query are measured over a stated number of runs.
- [x] The benchmark ADR records the container limit, row counts, Postgres settings, plans and results. If 1M isn't sustainable, the 500k fallback is used and stated.
- [x] The seed data is never committed. Only the script is.
- [x] Spotless and tests remain green.

## Notes

- Measured first: a throwaway 1M-point table with a spatial index built in under 3 s, so the full run was safe.
- Full run: 1,000,000 points and 200,000 outlines, seeded in 30 s; the whole run took under 3 minutes. Results in `docs/benchmark/`, summary in ADR 0009 and the docs page.
- Also measured: keyset paging (page 500 costs the same as page 1) and the cost of wide views, which follows how many rows are in view.
- Not measured: concurrent load, many scenes, cold cache, other environments.

## Out of scope

- Query tuning beyond indexing, partitioning.
