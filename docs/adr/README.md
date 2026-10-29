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
| 0008 | [Contract-first SDK from a committed OpenAPI spec](0008-contract-first-sdk.md) | Accepted |
| 0009 | [Benchmark: 1.2 million annotations on a laptop](0009-benchmark-one-million-rows.md) | Accepted |
| 0010 | [The version check is a pure rule](0010-version-check-is-a-rule.md) | Accepted |
| 0011 | [An import judges each element on its own](0011-import-judges-each-element.md) | Accepted |
| 0012 | [A shared kernel for what every core shares](0012-shared-kernel.md) | Accepted |
| 0013 | [A modular monolith, packaged by feature](0013-modular-monolith-with-feature-slices.md) | Accepted |
| 0014 | [Spartan UI for the client's components](0014-spartan-ui.md) | Accepted |
