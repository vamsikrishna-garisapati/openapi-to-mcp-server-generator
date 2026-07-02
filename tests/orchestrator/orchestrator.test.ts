import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLoad = vi.fn();
const mockParse = vi.fn();
const mockGenerate = vi.fn();
const mockBuild = vi.fn();
const mockPackage = vi.fn();

vi.mock("../../src/loader/index.js", () => ({
  createLoader: () => ({ load: mockLoad }),
}));

vi.mock("../../src/parser/index.js", () => ({
  createParser: () => ({ parse: mockParse }),
}));

vi.mock("../../src/generators/index.js", () => ({
  createMcpGenerator: () => ({ generate: mockGenerate }),
}));

vi.mock("../../src/builder/index.js", () => ({
  createProjectBuilder: () => ({ build: mockBuild }),
}));

vi.mock("../../src/packager/index.js", () => ({
  createPackager: () => ({ package: mockPackage }),
}));

const { createOrchestrator } = await import("../../src/orchestrator/orchestrator.js");

describe("Orchestrator", () => {
  beforeEach(() => {
    mockLoad.mockClear();
    mockParse.mockClear();
    mockGenerate.mockClear();
    mockBuild.mockClear();
    mockPackage.mockClear();
  });

  it("converts thrown loader error to failure Result", async () => {
    mockLoad.mockRejectedValue(new Error("disk read failed"));

    const orchestrator = createOrchestrator();
    const result = await orchestrator.run({
      type: "string",
      content: "openapi: 3.0.0",
      format: "yaml",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      { code: "E003", message: "disk read failed" },
    ]);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("converts thrown parser error to failure Result", async () => {
    mockLoad.mockResolvedValue({
      success: true,
      data: { content: "{}", format: "json" },
      errors: [],
      warnings: [],
    });
    mockParse.mockRejectedValue(new Error("parser exploded"));

    const orchestrator = createOrchestrator();
    const result = await orchestrator.run({
      type: "string",
      content: "{}",
      format: "json",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      { code: "E003", message: "parser exploded" },
    ]);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
