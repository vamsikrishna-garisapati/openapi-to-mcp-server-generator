import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createLoader } from "../../src/loader/index.js";
import { createParser } from "../../src/parser/index.js";

const fixturesDir = join(import.meta.dirname, "../fixtures/openapi");

async function parseFixture(name: string) {
  const loader = createLoader();
  const loadResult = await loader.load({
    type: "file",
    path: join(fixturesDir, name),
  });
  expect(loadResult.success).toBe(true);
  const parser = createParser();
  return parser.parse(loadResult.data!);
}

describe("Parser integration", () => {
  it("parses petstore.yaml", async () => {
    const result = await parseFixture("petstore.yaml");
    expect(result.success).toBe(true);
    expect(result.data?.info.title).toBe("Swagger Petstore");
    expect(result.data?.endpoints.length).toBeGreaterThan(0);
    expect(result.data?.endpoints.every((e) => e.id && e.name)).toBe(true);
    expect(result.data?.endpoints.every((e) => e.primaryResponse)).toBe(true);
    expect({ data: result.data, warnings: result.warnings }).toMatchSnapshot();
  });

  it("parses auth-api-key.yaml", async () => {
    const result = await parseFixture("auth-api-key.yaml");
    expect(result.success).toBe(true);
    expect(result.data?.authentication).toHaveLength(2);
    expect(result.data?.authentication.some((a) => a.type === "apiKey")).toBe(true);
    expect({ data: result.data, warnings: result.warnings }).toMatchSnapshot();
  });

  it("parses auth-bearer.yaml", async () => {
    const result = await parseFixture("auth-bearer.yaml");
    expect(result.success).toBe(true);
    const bearer = result.data?.authentication.find((a) => a.type === "bearer");
    expect(bearer).toMatchObject({
      location: "header",
      parameterName: "Authorization",
      envVariable: "ACCESS_TOKEN",
    });
    const publicEndpoint = result.data?.endpoints.find((e) => e.id === "update_settings");
    expect(publicEndpoint?.authentication).toEqual([]);
    expect({ data: result.data, warnings: result.warnings }).toMatchSnapshot();
  });

  it("parses no-servers.yaml with P004", async () => {
    const result = await parseFixture("no-servers.yaml");
    expect(result.success).toBe(true);
    expect(result.data?.server.baseUrl).toBe("");
    expect(result.warnings.some((w) => w.code === "P004")).toBe(true);
    expect({ data: result.data, warnings: result.warnings }).toMatchSnapshot();
  });

  it("parses deprecated-endpoint.yaml with P005", async () => {
    const result = await parseFixture("deprecated-endpoint.yaml");
    expect(result.success).toBe(true);
    const deprecated = result.data?.endpoints.find((e) => e.deprecated);
    expect(deprecated).toBeDefined();
    expect(result.warnings.some((w) => w.code === "P005")).toBe(true);
    expect({ data: result.data, warnings: result.warnings }).toMatchSnapshot();
  });
});

describe("Parser validation", () => {
  it("rejects duplicate operationId with E006", async () => {
    const spec = `
openapi: 3.0.3
info:
  title: Dup
  version: 1.0.0
paths:
  /a:
    get:
      operationId: same
      responses:
        '200':
          description: OK
  /b:
    get:
      operationId: same
      responses:
        '200':
          description: OK
`;
    const loader = createLoader();
    const loadResult = await loader.load({ type: "string", content: spec, format: "yaml" });
    const parser = createParser();
    const result = await parser.parse(loadResult.data!);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.code === "E006")).toBe(true);
  });
});
