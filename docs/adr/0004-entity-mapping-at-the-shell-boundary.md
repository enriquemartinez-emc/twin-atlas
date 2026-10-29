# 0004 — Entities stay in the shell; MapStruct maps at the boundary

**Status:** Accepted · 2026-10-28

## Context

JPA entities carry persistence concerns (identity, `@Version`, lazy proxies, mutability). Letting them reach the core or the API couples business rules and the contract to the table layout, and Hibernate 7 disallows re-attaching a detached rebuilt entity.

## Decision

- Entities are package-private classes inside their slice. They are never returned from endpoints, never part of a DTO and never passed into the core.
- The core works on immutable records (`Draft`, `Shape`...). The shell maps domain records to entities and entities to response DTOs with MapStruct (`AnnotationMapper`).
- Updates load the entity and change it. Nothing rebuilds a detached entity and merges it.
- `@Version` provides optimistic locking and is exposed as the `ETag` (and `If-Match` on updates).
- Request and response DTOs are separate records. Geometry crosses the API as GeoJSON through the `jackson-datatype-jts` module.

## Alternatives

- **Use entities as domain objects.** Less mapping code, but the core then depends on JPA and rules become hard to test.
- **Hand-written mappers.** Fine for tiny cases. MapStruct gives compile-time checked mappings that fail the build when a field is added and not mapped.

## Consequences

- A mapping layer to maintain. MapStruct keeps it declarative, and mappings with sealed types use small expressions.
- JPA needs accessors that MapStruct can see, so entities have public getters and setters while the class itself stays package-private.
- Only the mappings a use case needs exist: create maps domain to entity and entity to response. Entity to domain arrives with the first use case that loads state (update and publish).
