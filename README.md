Turn any **OpenAPI 3.x** specification into a **production-ready MCP server** you can connect to Cursor, Claude Desktop, or any MCP-compatible AI assistant. Paste your spec, run the Actor, and download a complete deployable ZIP — no manual tool definitions, auth wiring, or boilerplate.

## What can this OpenAPI MCP Server Compiler do?

- **Generate a full MCP server project** from OpenAPI JSON or YAML — one MCP tool per REST endpoint
- **Include auth setup** — API Key and Bearer Token via environment variables
- **Ship deployment files** — Dockerfile, `.env.example`, and a project README
- **Run from Apify Console** — paste a spec in the input form, no local setup required
- **Call via API** — trigger runs programmatically with the [Apify API](https://docs.apify.com/api/v2) or [JavaScript client](https://docs.apify.com/api/client/js)
- **Schedule and monitor** — re-generate when your API spec changes

## What do you get in the output?

| Output | Location | Description |
| ------ | -------- | ----------- |
| `mcp-server.zip` | Key-Value Store | Complete TypeScript MCP server project |
| Run summary | Dataset | Success status, statistics, warnings, download URL |

Each generated ZIP includes:

- MCP tool files mapped from your OpenAPI paths and operations
- TypeScript source, `package.json`, and build scripts
- Authentication helpers for API Key and Bearer Token
- `.env.example` with required secrets
- `Dockerfile` for container deployment
- README with install and run instructions

**Supported today:** OpenAPI 3.x, JSON request/response bodies, REST APIs.

## How to compile an MCP server from OpenAPI

1. Open this Actor in [Apify Console](https://console.apify.com) and click **Start**.
2. Paste your full OpenAPI document into **OpenAPI Specification**.
3. Select **Format** — `yaml` or `json`.
4. Optionally set **Project Name** for the generated folder.
5. Click **Run** and wait for completion (typically under a minute).
6. Open the run's **Key-Value Store** and download **`mcp-server.zip`**.
7. Unzip, configure `.env`, build, and connect the server to your AI client.

### Example input (Petstore API)

```json
{
  "openApiSpec": "openapi: 3.0.0\ninfo:\n  title: Petstore\n  version: 1.0.0\npaths:\n  /pets:\n    get:\n      operationId: listPets\n      summary: List pets\n      responses:\n        '200':\n          description: OK",
  "format": "yaml",
  "projectName": "petstore-mcp"
}
```

## How much does it cost to compile an MCP server?

Pricing depends on your Actor's monetization settings in the [Publication tab](https://console.apify.com/actors). On the free Apify plan you can test runs with platform credits before committing to paid usage.

Each successful run produces **one MCP server ZIP** regardless of endpoint count (within supported limits). Complex specs with many endpoints use more compute time but still yield a single downloadable package.

## Input

See the **Input** tab in Apify Console for the full schema and field tooltips.

| Field | Required | Description |
| ----- | -------- | ----------- |
| `openApiSpec` | Yes* | Full OpenAPI document as a JSON or YAML string |
| `format` | Yes* | `"json"` or `"yaml"` — must match the spec you pasted |
| `projectName` | No | Override name for the generated project folder |

\* **API default behavior:** If you omit fields when starting via API, CLI, or scheduler, the platform injects the Petstore sample spec from the input schema `default` values. Always pass your own `openApiSpec` and `format` in production API calls. The Console UI uses `prefill` as an editable example only.

**Tips:**

- Paste the entire spec — not a file path. For URL-hosted specs, fetch the content first or use the Apify API to pass it as a string.
- If your spec has no `servers` entry, set `BASE_URL` in the generated `.env` after download.
- Generation warnings are non-fatal (e.g. unsupported content types) — check the dataset output for details.

## Output

### Key-Value Store

- **`mcp-server.zip`** — deployable MCP server project (download this)

### Dataset example

```json
{
  "success": true,
  "downloadUrl": "https://api.apify.com/v2/key-value-stores/.../records/mcp-server.zip",
  "statistics": {
    "endpoints": 5,
    "tools": 5,
    "files": 15,
    "durationMs": 181
  },
  "warnings": []
}
```

On failure, `success` is `false` and `errors` describes what went wrong (e.g. invalid OpenAPI).

You can download dataset results as **JSON, CSV, Excel, HTML, or XML** from the run page.

## How to use your generated MCP server

1. **Unzip** `mcp-server.zip`
2. **Copy** `.env.example` to `.env` and set your API base URL and credentials
3. **Install and build:**

   ```bash
   pnpm install
   pnpm run build
   ```

4. **Start the server** (see the generated project's README)
5. **Add to your AI client** — configure stdio transport in Cursor, Claude Desktop, or another MCP host

Your assistant can then call your REST API through the MCP tools generated from your OpenAPI spec.

## FAQ

### What is an MCP server?

A [Model Context Protocol](https://modelcontextprotocol.io) server exposes **tools** that AI assistants can call. This Actor generates those tools automatically from your OpenAPI operations.

### Do I need to write code?

No code is required to **generate** the server — paste your spec and download the ZIP. Basic command-line steps are needed to **run** the generated project (install, build, start).

### What OpenAPI features are supported?

OpenAPI 3.x with JSON request/response bodies, API Key auth, and Bearer Token auth. Complex schemas (`oneOf`, file uploads, OAuth flows) may be skipped with a warning in v1.

### Can I run this Actor via API?

Yes. Use the [Apify REST API](https://docs.apify.com/api/v2#tag/ActorsRun-collection/operation/act_runs_post) or `apify-client` to trigger runs from CI/CD when your API spec changes.

### Something failed — where do I look?

| Problem | What to try |
| ------- | ----------- |
| Invalid spec error | Validate your file as OpenAPI 3.x JSON or YAML |
| Missing `BASE_URL` at runtime | Add `servers` to your spec or set `BASE_URL` in `.env` |
| Auth errors at runtime | Match `API_KEY` or `ACCESS_TOKEN` in `.env` to your API |
| Generation warnings | Check the dataset `warnings` array — non-fatal issues are listed there |

Found a bug or need a feature? Open an issue from the **Issues** tab on this Actor's page.

## Integrations

- **Apify API** — automate generation in pipelines
- **Webhooks** — trigger downstream deploys when a run succeeds
- **Schedules** — re-generate when your API spec is updated

## For developers

Architecture and design docs: [docs/](docs/) in the [GitHub repository](https://github.com/vamsikrishna-garisapati/openapi-to-mcp-server-generator).

Local CLI (without Apify):

```bash
pnpm install && pnpm run build
pnpm run generate -- --input path/to/spec.yaml --output ./out.zip
# or: pnpm exec openapi-mcp-gen generate --input path/to/spec.yaml --output ./out.zip
```

Apify Actor (local):

```bash
pnpm install && pnpm run build
pnpm actor                    # syncs test input, then apify run
pnpm validate:actor           # validate all .actor schemas
pnpm sync:actor-input         # refresh prefill/default from petstore fixture
```

Before deploying:

```bash
pnpm sync:actor-input && pnpm test && pnpm validate:actor && apify push
```
