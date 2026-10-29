# Architecture decision records

Short records of decisions that are costly to reverse. Format: context, decision, alternatives, consequences.

| #    | Decision                                                | Status   |
| ---- | ------------------------------------------------------- | -------- |
| 0001 | [Store geometry in SRID 4326, not geography](0001-geometry-vs-geography.md) | Accepted |
| 0002 | [Maven as the backend build tool](0002-maven-build-tool.md)                 | Accepted |
| 0003 | [Functional core with decision functions and explicit context](0003-fcis-decision-functions.md) | Accepted |
| 0004 | [Entities stay in the shell; MapStruct maps at the boundary](0004-entity-mapping-at-the-shell-boundary.md) | Accepted |
| 0005 | [Spatial reads bypass the core](0005-reads-bypass-the-core.md) | Accepted |
| 0006 | [Native SQL for reads, Hibernate Spatial for writes](0006-native-sql-vs-hibernate-spatial.md) | Accepted |
| 0007 | [Keyset pagination with opaque cursors](0007-keyset-pagination.md) | Accepted |
