# 009 — Benchmark dataset

**Status:** Proposed | **Branch:** `chore/benchmark-dataset`

## Description

Prove the data layer scales on the dev machine: a reproducible SQL seed of 1M point annotations (and 100k–250k polygons), query plans before and after GiST, and a benchmark ADR.

## Acceptance criteria

- [ ] A seed script generates 1M points and 100k–250k polygons with `generate_series` and a fixed seed. It runs from a documented command and finishes in a few minutes.
- [ ] The Compose Postgres has documented memory settings (`shared_buffers`, container limit) that fit the dev machine.
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` plans for bbox, nearest-N and intersects are captured without the GiST index (sequential scan) and with it.
- [ ] p50 and p95 latencies for each read query are measured over a stated number of runs.
- [ ] The benchmark ADR records hardware, WSL/Docker memory, row counts, Postgres settings, plans and results. If 1M isn't sustainable, the 500k fallback is used and stated.
- [ ] The seed data is never committed. Only the script is.
- [ ] Spotless and tests remain green.

## Out of scope

- Query tuning beyond indexing, partitioning.
