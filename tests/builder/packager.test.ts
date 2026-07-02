import { describe, it, expect } from "vitest";
import { createProjectBuilder } from "../../src/builder/index.js";
import { createPackager } from "../../src/packager/index.js";
import { rm } from "node:fs/promises";

describe("ProjectBuilder and Packager", () => {
  it("writes files and creates ZIP", async () => {
    const builder = createProjectBuilder();
    const files = {
      files: [
        { path: "package.json", content: '{"name":"test"}' },
        { path: "src/index.ts", content: "export {};\n" },
      ],
    };

    const buildResult = await builder.build(files);
    expect(buildResult.success).toBe(true);

    const packager = createPackager();
    const packageResult = await packager.package(buildResult.data!, "test-api");
    expect(packageResult.success).toBe(true);
    expect(packageResult.data?.filename).toBe("test-api-mcp-server.zip");
    expect(packageResult.data?.buffer.length).toBeGreaterThan(0);

    await rm(buildResult.data!.rootPath, { recursive: true, force: true });
  });
});
