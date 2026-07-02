# Product Requirements Document (PRD)

# Project Name

**MCP Studio** (working title)

---

# Version

v1.0 (MVP)

---

# 1. Executive Summary

MCP Studio is a developer tool that converts OpenAPI specifications into production-ready Model Context Protocol (MCP) servers.

Instead of manually implementing MCP tools, authentication, validation, and deployment files, users upload an OpenAPI specification (JSON or YAML), and MCP Studio generates a complete, deployable MCP server.

The primary objective is to reduce the time required to build an MCP server from several days to a few minutes.

---



# 2. Problem Statement

As MCP adoption grows, API providers increasingly need MCP servers so AI applications can interact with their services.

Building an MCP server currently requires developers to:

- Learn the MCP protocol
- Read the API documentation
- Understand authentication
- Create tool definitions
- Implement API calls
- Handle errors
- Package the server
- Write documentation
- Prepare deployment files

For most APIs this work is repetitive.

The process should be automated.

---



# 3. Vision

Enable any REST API to become AI-ready with a single generation process.

Input:

OpenAPI Specification

Output:

A production-ready MCP server.

---



# 4. Goals

The MVP should:

- Accept OpenAPI JSON files
- Accept OpenAPI YAML files
- Validate specifications
- Generate TypeScript MCP servers
- Generate MCP tool definitions
- Support API Key authentication
- Support Bearer Token authentication
- Generate Dockerfile
- Generate README
- Generate `.env.example`
- Package everything into a downloadable ZIP

---



# 5. Non-Goals (MVP)

The following features are intentionally excluded from Version 1:

- OAuth 2.0
- GraphQL
- SOAP
- gRPC
- AsyncAPI
- WebSockets
- Server-Sent Events
- Hosted deployment
- AI-generated descriptions
- Documentation scraping
- Postman collections
- Incremental regeneration
- Python server generation

These may be implemented in future versions.

---



# 6. Target Users



## Primary Users



### SaaS Companies

Organizations with REST APIs that want AI assistants to access their services.

### Enterprise Developers

Internal platform teams exposing company APIs to AI tools.

### Integration Engineers

Developers creating connectors between APIs and AI systems.

### Apify Developers

Developers who want to expose Actors through MCP.

> **Version 1 note:** MCP Studio itself runs as an Apify Actor (the generator is hosted on Apify). The future feature "Apify Actor wrapper mode" (PRD §14) is different — it would generate MCP servers that wrap existing Apify Actors as tools.

---



# 7. User Stories



## Story 1

As an API developer,

I want to upload an OpenAPI specification,

so that I receive a working MCP server.

---



## Story 2

As a SaaS founder,

I want to expose my API to AI assistants,

without learning the MCP protocol.

---



## Story 3

As an enterprise engineer,

I want generated authentication support,

so I don't have to implement it manually.

---



## Story 4

As a developer,

I want deployment files automatically generated,

so I can deploy immediately.

---



# 8. Functional Requirements



## FR-1 Input

The system shall accept:

- OpenAPI JSON
- OpenAPI YAML

---



## FR-2 Validation

The system shall:

- Validate the specification
- Resolve references
- Report validation errors
- Stop generation if the specification is invalid

---



## FR-3 Parsing

The parser shall extract:

- API information
- Servers
- Authentication
- Endpoints
- Parameters
- Request bodies
- Response schemas
- Components

---



## FR-4 MCP Tool Generation

Each supported endpoint shall become one MCP tool.

Each tool shall include:

- Name
- Description
- Input schema
- Execution handler

---



## FR-5 Authentication

Supported authentication:

- API Key
- Bearer Token

Generated servers shall read secrets from environment variables.

---



## FR-6 Error Handling

Generated servers shall:

- Validate inputs
- Handle HTTP errors
- Return readable error messages
- Catch unexpected exceptions

---



## FR-7 Documentation

Generate:

- README.md
- Installation guide
- Environment variable documentation
- Example usage

---



## FR-8 Deployment

Generate:

- Dockerfile
- package.json
- tsconfig.json
- `.env.example`

---



## FR-9 Packaging

Output shall be a ZIP archive containing the generated project.

---



# 9. Non-Functional Requirements

The generated project shall:

- Compile successfully
- Follow TypeScript best practices
- Use the official MCP SDK
- Produce formatted code
- Be production-ready
- Be readable and maintainable

---



# 10. Expected Output Structure

```
generated-server/

├── package.json
├── tsconfig.json
├── README.md
├── Dockerfile
├── .env.example
├── src/
│   ├── index.ts
│   ├── auth/
│   ├── tools/
│   ├── client.ts
│   └── utils/
└── ...
```

---



# 11. Success Criteria

The MVP is considered successful if it can:

- Parse valid OpenAPI specifications
- Generate compilable TypeScript MCP servers
- Successfully call supported APIs
- Produce readable documentation
- Package the output into a ZIP
- Work without manual code modifications for standard REST APIs

---



# 12. Constraints

- Only OpenAPI 3.x specifications are supported.
- Only REST APIs are supported.
- Only JSON request/response bodies are supported.
- Authentication is limited to API Key and Bearer Token.
- Generation must be deterministic and must not require an LLM.

---



# 13. Risks

- Invalid or incomplete OpenAPI specifications
- Large API specifications with hundreds of endpoints
- Complex schemas (`oneOf`, `anyOf`, `allOf`)
- File upload/download endpoints
- APIs that rely on unsupported authentication mechanisms

These risks should be documented and surfaced clearly to users.

---



# 14. Future Enhancements

Future versions may include:

- OAuth 2.0 support
- Python MCP server generation
- Postman collection import
- Documentation URL parsing
- AI-assisted tool naming
- Automatic OpenAPI repair
- Incremental regeneration
- Hosted MCP deployment
- Apify Actor wrapper mode
- API monitoring and update detection

---



# 15. Definition of Done

Version 1 is complete when:

- Users can upload a valid OpenAPI JSON or YAML specification.
- A complete TypeScript MCP server is generated using the official MCP SDK.
- The generated project builds successfully without manual edits.
- Authentication via API Key and Bearer Token is supported.
- Dockerfile, README, and `.env.example` are included.
- The output is packaged into a downloadable ZIP.
- The generator has automated tests covering parsing and generation for representative OpenAPI specifications (see RFC-006).
- The Apify Actor accepts the defined input schema and returns a ZIP or structured errors (see RFC-006).

