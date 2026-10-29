# 0012 — A shared kernel for what every core shares

**Status:** Accepted · 2026-10-29

## Context

Every feature core returns the same `Decision` and speaks the same `Rejection` codes, and `Problems.from` maps each code once. Those types lived in `platform/core`, next to the HTTP code in `platform`. The name was misleading: a `core` package elsewhere is the pure rules of one feature, and this one held no rules. It also held `Wgs84`, the only real logic there, which belongs to the geometry, not to the platform. The reference system itself (SRID 4326 and its geometry factory) was declared in three places.

## Decision

- **`platform/kernel`** holds `Decision` and `Rejection`, nothing else. A package comment says it is a shared kernel and not a feature core.
- **`geo`** holds `Wgs84`: the SRID, the geometry factory and the one definition of a usable geometry. Everything that builds a WGS 84 geometry uses `Wgs84.FACTORY`.
- Both are plain Java. ArchUnit checks that they use no Spring, Jakarta or Hibernate, and that neither depends on a feature slice or on the server code in `platform`. A slice may use them freely.
- SQL keeps writing `4326` literally, as the migrations do. A constant in a SQL string would hide what the statement does.

## Alternatives

- **Keep `platform/core` and document it.** Cheapest, but the name keeps lying to the next reader.
- **One `Rejection` enum per feature.** Removes the shared file, and with it the single exhaustive mapping in `Problems` and the single list of codes in the contract. Not worth it at 11 codes.
- **Put `Wgs84` in `annotation/core`.** The import slice may use another slice's core, but "what a usable geometry is" would then belong to annotations, and the import would depend on them for it.
- **Duplicate the rule where needed.** Two definitions of "valid" drift apart.

## Consequences

- The kernel still couples the features a little: `Rejection` lists every feature's codes, so a new feature edits that enum and `Problems`. That is the price of one exhaustive mapping and a typed code list in the OpenAPI contract. Revisit it if the enum grows far beyond today's 11 codes, or if features become separate modules.
- A new shared rule belongs in `geo` only if it is about geometry. Anything else shared between cores goes in the kernel, and needs a reason.
