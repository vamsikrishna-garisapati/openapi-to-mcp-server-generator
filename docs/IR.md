# Internal Representation (IR) Specification (Revised)

**Project:** MCP Studio

**Version:** 2.0 (Architecture Freeze)

**Status:** Approved

---

# 1. Purpose

The Internal Representation (IR) is the canonical data model used throughout MCP Studio.

After parsing completes, **no module is allowed to access the original OpenAPI document**.

Every downstream component (generators, documentation, packaging, testing) consumes only the IR.

The IR is immutable.

---

# 2. Design Principles

The IR must be:

* Independent of OpenAPI
* Independent of MCP
* Language agnostic
* Serializable
* Deterministic
* Immutable
* Backward compatible whenever possible

---

# 3. Pipeline Ownership

```text
OpenAPI
    │
    ▼
Loader
    │
    ▼
Parser
    ├── Validation
    ├── Reference Resolution
    ├── Schema Normalization
    ├── Naming
    ├── Primary Response Selection
    └── IR Builder
    │
    ▼
ApiModel (IR)
    │
    ▼
Generators
```

The **Parser owns all OpenAPI-specific decisions**.

Generators never inspect OpenAPI metadata.

---

# 4. Root Object

```ts
interface ApiModel {

    info: ApiInfo;

    server: ServerConfig;

    authentication: Authentication[];

    endpoints: Endpoint[];

    schemas: Schema[];

}
```

---

# 5. ApiInfo

```ts
interface ApiInfo {

    title: string;

    version: string;

    description?: string;

}
```

---

# 6. Server Configuration

Version 1 supports one server only.

The parser always selects the first OpenAPI server.

```ts
interface ServerConfig {

    baseUrl: string;

}
```

Selection rules:

* The parser always uses `servers[0].url` when servers are defined.
* If `servers` is missing or empty, `baseUrl` is set to `""` and the parser emits warning **P004** (Missing Server).
* The generated project treats `BASE_URL` as a required runtime environment variable when `baseUrl` is empty.

Future versions may support multiple servers.

---

# 7. Endpoint

Each OpenAPI operation becomes exactly one Endpoint.

```ts
interface Endpoint {

    id: string;

    name: string;

    method: HttpMethod;

    path: string;

    summary?: string;

    description?: string;

    tags: string[];

    deprecated: boolean;

    authentication: string[];

    parameters: Parameter[];

    requestBody?: RequestBody;

    responses: Response[];

    primaryResponse?: Response;

}
```

### Security assignment

`authentication` holds `Authentication.id` values required by the endpoint.

Rules:

1. If the OpenAPI document defines global `security`, it applies to all operations by default.
2. If an operation defines its own `security`, that list replaces the global security for that operation only.
3. If an operation defines `security: []`, the endpoint requires no authentication (`authentication` is `[]`).
4. If neither global nor operation security is defined, `authentication` is `[]`.

---

# 8. Endpoint Naming

The parser owns tool naming.

Generation rules:

1. Use operationId if available.
2. Otherwise derive from HTTP method + path.
3. Convert to snake_case.
4. Deduplicate derived-name collisions automatically.

Set both `Endpoint.id` and `Endpoint.name` to the same value in Version 1.

### Duplicate `operationId` (validation)

Two operations sharing the same OpenAPI `operationId` is a **fatal validation error** (**E006**). Parsing stops before naming runs.

### Derived name collisions (naming engine)

When `operationId` is absent and two endpoints produce the same derived name, the parser suffixes the later endpoint: `create_user`, `create_user_2`, `create_user_3`.

Example

```
POST /users

↓

create_user
```

Definitions:

* **id** → Stable internal identifier (never changes during generation)
* **name** → MCP tool name (same as id in Version 1)

Generators must use `Endpoint.id`.

They never inspect OpenAPI operationId.

---

# 9. Parameter

```ts
interface Parameter {

    name: string;

    location:
        | "path"
        | "query"
        | "header"
        | "cookie";

    required: boolean;

    description?: string;

    schema: Schema;

}
```

---

# 10. Request Body

```ts
interface RequestBody {

    required: boolean;

    contentType: string;

    schema: Schema;

}
```

Only JSON request bodies are supported in Version 1.

---

# 11. Response

```ts
interface Response {

    statusCode: string;

    description?: string;

    schema?: Schema;

}
```

The parser determines `primaryResponse` using this priority:

1. 200
2. 201
3. default
4. First available response

Generators always use `primaryResponse`.

---

# 12. Authentication

```ts
interface Authentication {

    id: string;

    type:
        | "apiKey"
        | "bearer";

    location:
        | "header"
        | "query"
        | "cookie";

    parameterName: string;

    envVariable: string;

}
```

Examples

Header API Key

```
location = "header"

parameterName = "X-API-Key"
```

Query API Key

```
location = "query"

parameterName = "api_key"
```

Bearer

For `type: "bearer"`, the parser always normalizes to:

* `location = "header"`
* `parameterName = "Authorization"`
* `envVariable = "ACCESS_TOKEN"` (unless overridden by a future naming policy)

The generator sends `Authorization: Bearer ${ACCESS_TOKEN}` and never infers authentication behavior.

It uses this model directly.

---

# 13. Schema

```ts
interface Schema {

    id: string;

    type:
        | "object"
        | "array"
        | "string"
        | "integer"
        | "number"
        | "boolean";

    description?: string;

    nullable: boolean;

    format?: string;

    default?: unknown;

    enum?: unknown[];

    examples?: unknown[];

    required?: string[];

    properties?: SchemaProperty[];

    items?: Schema;

}
```

---

# 14. Schema Property

```ts
interface SchemaProperty {

    name: string;

    schema: Schema;

}
```

---

# 15. Supported Schema Features

Version 1 supports:

* Objects
* Arrays
* Strings
* Numbers
* Integers
* Booleans
* Nullable values
* Enums
* Default values
* Examples

Unsupported features (such as `oneOf`, `anyOf`, `allOf`, discriminators, and XML metadata) are preserved as parser warnings but are not represented in the IR.

---

# 16. Parser Responsibilities

The parser is responsible for:

* Validation
* Reference resolution
* Schema normalization
* Endpoint naming
* Authentication normalization
* Primary response selection
* Building the IR

No generator performs these tasks.

---

# 17. Generator Contract

Generators receive only:

```ts
ApiModel
```

Generators must never:

* Read OpenAPI
* Rename endpoints
* Choose authentication
* Choose primary responses
* Resolve references
* Validate schemas

Their responsibility is only to transform the IR into output files.

---

# 18. Determinism

Given identical input specifications, the parser must always produce an identical IR.

The IR contains **no timestamps**, random identifiers, or environment-specific values.

Operational data (parse duration, generation time, execution timestamp, warning counts) belongs to runtime statistics, not the IR.

---

# 19. Versioning

Breaking changes to any IR interface require a new IR version.

Existing generators must continue to work with previous IR versions or explicitly reject unsupported versions.

---

# 20. Deprecated Endpoints

Deprecated operations are included in the IR with `deprecated: true`.

The parser emits warning **P005** (Deprecated Endpoint).

The generator still creates a tool file and appends `(Deprecated)` to the tool description. Deprecated endpoints are never skipped in Version 1.

---

# 21. Definition of Done

The IR is considered complete when:

* Every supported OpenAPI construct has a defined mapping.
* Authentication is fully normalized.
* Endpoint names are deterministic.
* Primary responses are selected.
* Schemas preserve enums, defaults, examples, arrays, and object requirements.
* No generator requires access to the original OpenAPI document.
