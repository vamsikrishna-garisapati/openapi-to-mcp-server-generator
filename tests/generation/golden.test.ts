import { describe, it, expect } from "vitest";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { createOrchestrator } from "../../src/orchestrator/index.js";
import { createMcpGenerator } from "../../src/generators/index.js";
import { createLoader } from "../../src/loader/index.js";
import { createParser } from "../../src/parser/index.js";

const fixturesDir = join(import.meta.dirname, "../fixtures/openapi");

describe("Generation golden tests", () => {
  it("generates deterministic file tree from petstore", async () => {
    const loader = createLoader();
    const loadResult = await loader.load({
      type: "file",
      path: join(fixturesDir, "petstore.yaml"),
    });
    const parser = createParser();
    const parseResult = await parser.parse(loadResult.data!);
    expect(parseResult.success).toBe(true);

    const generator = createMcpGenerator();
    const genResult = await generator.generate(parseResult.data!);
    expect(genResult.success).toBe(true);

    const paths = genResult.data!.files.map((f) => f.path).sort();
    expect(paths).toMatchSnapshot("petstore-file-paths");
  });

  it("full pipeline produces buildable project", async () => {
    const orchestrator = createOrchestrator();
    const tmpDir = await mkdtemp(join(tmpdir(), "mcp-gen-test-"));
    const zipPath = join(tmpDir, "out.zip");

    try {
      const result = await orchestrator.run(
        { type: "file", path: join(fixturesDir, "petstore.yaml") },
        { outputPath: zipPath },
      );
      expect(result.success).toBe(true);
      expect(result.data?.size).toBeGreaterThan(0);

      const extractDir = join(tmpDir, "extracted");
      await execSync(`mkdir -p "${extractDir}" && unzip -q "${zipPath}" -d "${extractDir}"`);

      execSync("pnpm install", { cwd: extractDir, stdio: "pipe" });
      execSync("pnpm run build", { cwd: extractDir, stdio: "pipe" });
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }, 120000);

  it("end-to-end orchestrator from petstore", async () => {
    const orchestrator = createOrchestrator();
    const result = await orchestrator.run({
      type: "file",
      path: join(fixturesDir, "petstore.yaml"),
    });
    expect(result.success).toBe(true);
    expect(result.data?.filename).toMatch(/mcp-server\.zip$/);
    expect(result.statistics?.endpointCount).toBeGreaterThan(0);
  });
});

describe("Schema converter", () => {
  it("builds tool input schema from parameters", async () => {
    const { buildToolInputSchema } = await import("../../src/generators/schema-converter.js");
    const schema = buildToolInputSchema(
      [
        {
          name: "id",
          location: "path",
          required: true,
          schema: { id: "s1", type: "string", nullable: false },
        },
      ],
      undefined,
    );
    expect(schema.required).toContain("id");
    expect(schema.properties?.id?.type).toBe("string");
  });
});
