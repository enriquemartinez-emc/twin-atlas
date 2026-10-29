# 0007 — Keyset pagination with opaque cursors

**Status:** Accepted · 2026-10-28

## Context

Scenes can hold a million annotations. `OFFSET n` gets slower the deeper the page and skips or repeats rows when data changes between requests.

## Decision

Lists and zone searches are keyset-paginated over `(created_at, id)`:

```sql
WHERE ... AND (a.created_at, a.id) > (:cursorAt, :cursorId)
ORDER BY a.created_at, a.id
LIMIT :limit + 1
```

- The extra row tells us whether another page exists, so there is no count query.
- The cursor is the last row's position, base64url of `epochMicros:uuid`. Clients treat it as opaque. An unparsable cursor is `INVALID_CURSOR` (400).
- `id` breaks ties, so rows with the same timestamp are neither skipped nor repeated (covered by a test that inserts identical timestamps).
- The index `ix_annotation_scene_created (scene_id, created_at, id)` serves the unfiltered list. When a spatial filter applies, the planner can choose the GiST index and sort the few matches.
- Page size is 1..200 (default 50). Nearest-N is not paginated: it takes a limit of 1..100.

## Alternatives

- **Offset/limit.** Simple, but deep pages are slow and unstable under writes.
- **Ordering by distance with a cursor.** Needs a stable distance key and breaks down with ties; nearest-N with a small limit does not need it.

## Consequences

- No "jump to page 40" and no total count. A client that needs a count asks for one explicitly (not built).
- New rows are ordered after existing ones, so a client walking pages while others write sees every row that existed at the start exactly once, plus any added later.
