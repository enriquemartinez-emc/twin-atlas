# 0010 — The version check is a pure rule

**Status:** Accepted · 2026-10-29

## Context

Two people can edit the same annotation. Without a check, the second save silently overwrites the first. HTTP has a standard for this: the server labels each version with an `ETag`, and an update sends it back in `If-Match`.

## Decision

- The ETag is the optimistic-lock version (`@Version`) in quotes, for example `"3"`. Every response that returns an annotation carries one.
- An update must send `If-Match`. Missing: **428** `PRECONDITION_REQUIRED`. Not an ETag from us: **400** `REQUEST_INVALID`.
- Whether the sent version is still the stored one is a **rule in the functional core**: `STALE_VERSION` (**412**), checked right after "the annotation exists" and before any field rule. The shell loads the stored version as a fact and passes the caller's version in the command, so the rule is a plain comparison with a table-driven test.
- The database stays the last guard. The managed entity is changed inside one transaction, so if two requests read the same version and save at the same moment, Hibernate's version check fails the second as **409** `CONCURRENT_MODIFICATION`. The unique title index still decides two renames to the same title (**409** `TITLE_ALREADY_USED`).
- On a 412 or a lost race the screen offers "Load latest version": it drops the edits, reads the annotation again, and the next save uses the new ETag.

## Alternatives

- **Compare versions in the controller.** Fewer types, but the check would be invisible to the rule tests and its order against the other rules would be an accident of the code.
- **Spring's `ShallowEtagHeaderFilter` or `checkNotModified`.** Built for caching reads, not for guarding writes.
- **Last write wins.** Simple, and it loses people's work.
- **Pessimistic locking.** Holds a database lock while a person thinks. Wrong for a web screen.

## Consequences

- The three guards each cover one case: the rule covers the normal stale save, the version column covers a true overlap, the unique index covers duplicate titles. Race tests exercise the last two directly.
- A client must read before it writes, and must keep the ETag it read. The generated client makes `If-Match` a required typed header.
- Weak ETags (`W/"3"`) are accepted. `If-Match: *` is not.
