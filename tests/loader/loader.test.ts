import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createLoader } from "../../src/loader/index.js";

const fixturesDir = join(import.meta.dirname, "../fixtures/openapi");

describe("Loader", () => {
  const loader = createLoader();

  it("loads valid YAML file", async () => {
    const result = await loader.load({
      type: "file",
      path: join(fixturesDir, "petstore.yaml"),
    });
    expect(result.success).toBe(true);
    expect(result.data?.format).toBe("yaml");
    expect(result.data?.content).toContain("openapi:");
  });

  it("loads valid JSON string", async () => {
    const json = JSON.stringify({ openapi: "3.0.0", info: { title: "T", version: "1" }, paths: {} });
    const result = await loader.load({ type: "string", content: json, format: "json" });
    expect(result.success).toBe(true);
    expect(result.data?.format).toBe("json");
  });

  it("returns error for missing file", async () => {
    const result = await loader.load({ type: "file", path: "/nonexistent/spec.yaml" });
    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe("E001");
  });

  it("returns error for invalid syntax", async () => {
    const result = await loader.load({ type: "string", content: "{ invalid json", format: "json" });
    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe("E001");
  });

  it("rejects URL input in v1", async () => {
    const result = await loader.load({ type: "url", url: "https://example.com/spec.yaml" });
    expect(result.success).toBe(false);
  });
});

describe("Loader YAML content", () => {
  it("loads petstore content", async () => {
    const content = await readFile(join(fixturesDir, "petstore.yaml"), "utf-8");
    const result = await createLoader().load({ type: "string", content, format: "yaml" });
    expect(result.success).toBe(true);
  });
});
