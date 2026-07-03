# OpenAPI MCP Server Compiler — Documentation Index

**Architecture freeze:** v2.0

| Document  | Status   | Purpose                                      |
| --------- | -------- | -------------------------------------------- |
| PRD.md    | Product  | MVP scope, users, success criteria           |
| SDD.md    | Approved | System architecture                          |
| IR.md     | Approved | `ApiModel` data contract (source of truth)   |
| RFC-001   | Approved | Generation rules (IR → MCP server)           |
| RFC-002   | Approved | Parser behavioral specification              |
| RFC-003   | Approved | MCP Generator modules and project layout     |
| RFC-004   | Approved | Public module interfaces and shared types      |
| RFC-005   | Approved | Parser implementation details                |
| RFC-006   | Approved | Orchestrator, Apify Actor I/O, golden tests  |

## Reading order for implementers

1. PRD → scope
2. SDD → architecture
3. IR → data types
4. RFC-004 → interfaces
5. RFC-002 + RFC-005 → parser
6. RFC-001 + RFC-003 → generator
7. RFC-006 → wiring and deployment
