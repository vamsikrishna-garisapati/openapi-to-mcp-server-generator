import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPushData = vi.fn();
const mockSetValue = vi.fn();
const mockGetInput = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockOpenKeyValueStore = vi.fn();
const mockRun = vi.fn();

vi.mock("apify", () => ({
  Actor: {
    getInput: (...args: unknown[]) => mockGetInput(...args),
    pushData: (...args: unknown[]) => mockPushData(...args),
    setValue: (...args: unknown[]) => mockSetValue(...args),
    openKeyValueStore: (...args: unknown[]) => mockOpenKeyValueStore(...args),
  },
}));

vi.mock("../../src/orchestrator/index.js", () => ({
  createOrchestrator: () => ({ run: mockRun }),
}));

const { runActor } = await import("../../src/actor/handler.js");

describe("Actor handler", () => {
  beforeEach(() => {
    mockPushData.mockClear();
    mockSetValue.mockClear();
    mockGetInput.mockClear();
    mockGetPublicUrl.mockClear();
    mockOpenKeyValueStore.mockClear();
    mockRun.mockClear();
    mockOpenKeyValueStore.mockResolvedValue({
      getPublicUrl: mockGetPublicUrl,
    });
  });

  it("maps missing input to validation error output", async () => {
    mockGetInput.mockResolvedValue({});

    await runActor();

    expect(mockPushData).toHaveBeenCalledOnce();
    expect(mockPushData).toHaveBeenCalledWith({
      success: false,
      errors: [
        {
          code: "E001",
          message: "openApiSpec and format are required",
        },
      ],
      warnings: [],
    });
    expect(mockSetValue).not.toHaveBeenCalled();
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("maps orchestrator failure to error output", async () => {
    mockGetInput.mockResolvedValue({
      openApiSpec: "{ invalid json",
      format: "json",
    });
    mockRun.mockResolvedValue({
      success: false,
      errors: [{ code: "E001", message: "Invalid JSON syntax" }],
      warnings: [],
    });

    await runActor();

    expect(mockRun).toHaveBeenCalledOnce();
    expect(mockPushData).toHaveBeenCalledOnce();
    expect(mockPushData).toHaveBeenCalledWith({
      success: false,
      errors: [{ code: "E001", message: "Invalid JSON syntax" }],
      warnings: [],
    });
    expect(mockSetValue).not.toHaveBeenCalled();
  });

  it("maps successful generation to output with downloadUrl", async () => {
    mockGetInput.mockResolvedValue({
      openApiSpec: "openapi: 3.0.3\ninfo:\n  title: Test\n  version: 1.0.0\npaths: {}",
      format: "yaml",
      projectName: "petstore-mcp",
    });
    mockRun.mockResolvedValue({
      success: true,
      data: { buffer: Buffer.from("zip"), filename: "petstore-mcp-mcp-server.zip" },
      errors: [],
      warnings: [{ code: "P004", message: "Example warning" }],
      statistics: { endpointCount: 5, durationMs: 120 },
    });
    mockGetPublicUrl.mockReturnValue(
      "https://api.apify.com/v2/key-value-stores/store123/records/mcp-server.zip",
    );

    await runActor();

    expect(mockRun).toHaveBeenCalledWith(
      {
        type: "string",
        content: "openapi: 3.0.3\ninfo:\n  title: Test\n  version: 1.0.0\npaths: {}",
        format: "yaml",
      },
      { projectName: "petstore-mcp" },
    );
    expect(mockSetValue).toHaveBeenCalledOnce();
    expect(mockSetValue).toHaveBeenCalledWith(
      "mcp-server.zip",
      expect.any(Buffer),
      { contentType: "application/zip" },
    );
    expect(mockOpenKeyValueStore).toHaveBeenCalledOnce();
    expect(mockGetPublicUrl).toHaveBeenCalledWith("mcp-server.zip");
    expect(mockPushData).toHaveBeenCalledWith({
      success: true,
      downloadUrl:
        "https://api.apify.com/v2/key-value-stores/store123/records/mcp-server.zip",
      statistics: { endpointCount: 5, durationMs: 120 },
      warnings: [{ code: "P004", message: "Example warning" }],
    });
  });

  it("omits downloadUrl when key-value store URL is unavailable", async () => {
    mockGetInput.mockResolvedValue({
      openApiSpec: "openapi: 3.0.3\ninfo:\n  title: Test\n  version: 1.0.0\npaths: {}",
      format: "yaml",
    });
    mockRun.mockResolvedValue({
      success: true,
      data: { buffer: Buffer.from("zip"), filename: "test-mcp-server.zip" },
      errors: [],
      warnings: [],
      statistics: { endpointCount: 0 },
    });
    mockOpenKeyValueStore.mockRejectedValue(new Error("store unavailable"));

    await runActor();

    expect(mockPushData).toHaveBeenCalledWith({
      success: true,
      downloadUrl: undefined,
      statistics: { endpointCount: 0 },
      warnings: [],
    });
  });
});
