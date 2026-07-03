# System Design Document (SDD)

# Project

OpenAPI MCP Server Compiler

Version 2.0 (Architecture Freeze)

---

# 1. Overview

OpenAPI MCP Server Compiler is designed as a **compiler pipeline**, not a CRUD application.

The system transforms an OpenAPI specification into a production-ready MCP server through a series of deterministic stages.

Every stage has a single responsibility.

---

# 2. High-Level Architecture

```text
                User Input
                     │
                     ▼
                  Loader
                     │
                     ▼
                  Parser
        ┌─────────────────────┐
        │  Parse JSON/YAML    │
        │  Validate           │
        │  Resolve $ref        │
        │  Normalize          │
        │  Build IR           │
        └─────────────────────┘
                     │
                     ▼
               ApiModel (IR)
                     │
      ┌──────────────┼───────────────┐
      ▼              ▼               ▼
 MCP Generator   Docs Generator   Docker Generator
      │              │               │
      └──────────────┼───────────────┘
                     ▼
              Project Builder
                     │
                     ▼
                 ZIP Packager
                     │
                     ▼
                  Final Output
```

Validator, Resolver, Normalizer, and IR Builder are **internal components of the Parser**. They are not public modules.

---



# 3. Design Principles

The architecture follows these principles:

- Single Responsibility
- One-way data flow
- Plugin-based generators
- Deterministic generation
- No business logic inside templates
- Internal Representation as the system contract
- Encapsulation: OpenAPI transformation stays inside the Parser

---



# 4. Component Overview

The system contains five public modules.

| Module          | Public? | Responsibility              |
| --------------- | ------- | --------------------------- |
| Loader          | Yes     | Read input                  |
| Parser          | Yes     | Convert OpenAPI → IR        |
| Generators      | Yes     | Generate files from IR      |
| Project Builder | Yes     | Assemble project            |
| Packager        | Yes     | Create ZIP                  |

The Parser owns four internal components. These are implementation details, not public modules:

| Component         | Public? | Responsibility        |
| ----------------- | ------- | --------------------- |
| Validator         | No      | Validate OpenAPI      |
| Reference Resolver| No      | Resolve `$ref`        |
| Schema Normalizer | No      | Normalize schemas     |
| IR Builder        | No      | Build `ApiModel`      |

No module outside the Parser may call Validator, Resolver, Normalizer, or IR Builder directly.

---



# 5. Loader Module



## Responsibility

Read user input.

Supported inputs:

- OpenAPI JSON
- OpenAPI YAML

Output:

JavaScript object.

The loader performs no validation.

---



# 6. Parser Module



## Responsibility

Transform a raw OpenAPI document into `ApiModel` (IR).

The Parser is the **only public module** allowed to understand OpenAPI. It owns the entire OpenAPI transformation pipeline internally.

Public interface:

```ts
parse(document: RawDocument): Promise<Result<ApiModel>>
```

Output:

`ApiModel` — the Internal Representation.

The Parser must not generate MCP code, templates, README files, or ZIP archives.

---



# 7. Parser Internal Pipeline

These stages run inside the Parser. They are not exposed as public modules. Full implementation details are in RFC-005.

```text
Raw Document
      │
      ▼
JSON/YAML Parse
      │
      ▼
OpenAPI Validation
      │
      ▼
Reference Resolution
      │
      ▼
Extract Metadata / Servers / Auth / Endpoints / Schemas
      │
      ▼
Assign Tool Names
      │
      ▼
Select Primary Responses
      │
      ▼
Build ApiModel
```

Each stage must complete successfully before the next begins.

## Validator

Verify specification correctness.

Checks include:

- Required OpenAPI fields
- Invalid schemas
- Invalid paths
- Duplicate operationIds (fatal)
- Invalid parameter definitions

Fatal validation errors stop parsing. Warnings are collected separately.

## Reference Resolver

OpenAPI commonly uses `$ref`. The resolver replaces all references with concrete objects.

The rest of the system never sees unresolved references.

## Extractors

Metadata, server, authentication, endpoint, and schema extractors normalize OpenAPI into intermediate structures per RFC-002 and IR.md.

## Naming Engine

Assigns `Endpoint.id` and `Endpoint.name` using RFC-002 §12 rules. Deduplicates derived-name collisions only; duplicate `operationId` is fatal in validation.

## Response Selector

Sets `Endpoint.primaryResponse` using priority: 200 → 201 → default → first available.

## IR Builder

Assembles the final immutable `ApiModel` defined in IR.md.

---



# 8. Internal Representation

The IR becomes the only format used by generators.

Every future feature depends on the IR rather than OpenAPI.

Examples:

- MCP generation
- Documentation
- Tests
- Docker
- Python
- GitHub Actions

---



# 9. Generator Layer

The Generator layer contains independent plugins.

Current plugins:

- MCP Generator
- README Generator
- Docker Generator
- Package Generator

Future plugins:

- Python Generator
- Test Generator
- GitHub Action Generator
- Kubernetes Generator

Each generator consumes only the IR.

Generators never read OpenAPI directly.

---



# 10. Template Engine

Templates are responsible only for rendering files.

Templates contain minimal logic.

Examples:

server.hbs

tool.hbs

dockerfile.hbs

readme.hbs

package.hbs

All decisions happen before rendering.

---



# 11. Project Builder

The builder assembles generated files.

Responsibilities:

- Create folders
- Copy templates
- Generate files
- Write configuration
- Prepare output directory

The builder performs no parsing.

---



# 12. Packager

The packager converts the generated project into a ZIP archive.

Responsibilities:

- Compress files
- Preserve folder structure
- Return archive

---



# 13. Error Handling

Every module returns:

Success

or

Failure

Example

```text
Loader

↓

Success

↓

Parser

↓

Failure

↓

Generation Stops
```

Errors propagate upward.

Warnings are collected and displayed at completion.

---



# 14. Logging

Every stage logs:

- Start
- Finish
- Duration
- Errors
- Warnings

Example

```
Loading specification...

Validation complete.

Resolved 34 references.

Generated 18 tools.

Packaging project...

Done.
```

---



# 15. Folder Structure

```
src/

loader/

parser/
    parser.ts
    validator.ts
    resolver.ts
    metadata.ts
    servers.ts
    authentication.ts
    endpoints.ts
    schemas.ts
    responses.ts
    naming.ts
    ir-builder.ts
    types.ts

ir/

generators/

templates/

builder/

packager/

orchestrator/

utils/
```

Public modules each have a top-level directory. Parser internals live inside `parser/` per RFC-005 and must not be imported by other public modules.

---



# 16. Data Flow

The complete execution flow is:

```
Load                          (Loader — public)

↓

Parse OpenAPI → IR            (Parser — public)
  ├── Validate                (internal)
  ├── Resolve References      (internal)
  ├── Extract                 (internal)
  ├── Assign Names            (internal)
  ├── Select Primary Response (internal)
  └── Build IR                (internal)

↓

Generate Files                (Generators — public)

↓

Build Project                 (Project Builder — public)

↓

Package ZIP                   (Packager — public)
```

The **Pipeline Orchestrator** (RFC-006) invokes these stages in order. Data never flows backward.

---



# 17. Generator Flow

```
IR

↓

MCP Generator

↓

Template Renderer

↓

Generated Files

↓

Builder

↓

Output
```

Every generator follows this exact process.

---



# 18. Extension Strategy

New features should never require parser changes.

Example:

Adding Python support should only require:

Python Generator

Python Templates

Nothing else.

Similarly,

Adding GitHub Actions

requires only another generator.

---



# 19. Performance Goals

Target performance:

Small API

- under 2 seconds

Medium API

- under 5 seconds

Large API (300+ endpoints)

- under 20 seconds

Memory usage should remain proportional to specification size.

---



# 20. Security Considerations

The generator never stores user credentials.

Generated projects read secrets from environment variables.

The generator never embeds secrets into generated code.

Generated code validates required credentials before making API requests.

---



# 21. Deployment Architecture

Version 1 runs as an **Apify Actor** that hosts the OpenAPI MCP Server Compiler itself.

> **Note:** This is distinct from the PRD future feature "Apify Actor wrapper mode", which would generate MCP servers that wrap existing Apify Actors. Version 1 uses Apify only as the runtime for the generator.

Execution flow and Actor I/O are specified in RFC-006.

---



# 22. Future Architecture

Future versions may add:

- Hosted generation service
- Incremental regeneration
- AI optimization engine
- OpenAPI repair engine
- Version comparison
- Deployment service

These components will consume the existing IR and will not modify the parser pipeline.

---



# 23. Architecture Rules

The following rules must never be violated:

1. OpenAPI parsing occurs only inside the Parser module.
2. Parser internal components are private — no other module may import them (RFC-005).
3. Generators never read raw OpenAPI.
4. Templates contain no business logic.
5. The IR is the single source of truth after the Parser completes.
6. Public modules communicate only through interfaces defined in RFC-004.
7. The Pipeline Orchestrator (RFC-006) is the only module that invokes the full pipeline.
8. All generated output must be deterministic for the same input.

