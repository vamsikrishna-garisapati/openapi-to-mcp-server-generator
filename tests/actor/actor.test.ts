import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPushData = vi.fn();
const mockSetValue = vi.fn();
const mockGetInput = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockOpenKeyValueStore = vi.fn();
const mockSetStatusMessage = vi.fn();
const mockRun = vi.fn();
const mockLogError = vi.fn();

vi.mock("apify", () => ({
  Actor: {
    getInput: (...args: unknown[]) => mockGetInput(...args),
    pushData: (...args: unknown[]) => mockPushData(...args),
    setValue: (...args: unknown[]) => mockSetValue(...args),
    openKeyValueStore: (...args: unknown[]) => mockOpenKeyValueStore(...args),
    setStatusMessage: (...args: unknown[]) => mockSetStatusMessage(...args),
  },
  log: {
    error: (...args: unknown[]) => mockLogError(...args),
  },
}));

vi.mock("../../src/orchestrator/index.js", () => ({
  createOrchestrator: () => ({ run: mockRun }),
}));

const { runActor, normalizeActorInput } = await import("../../src/actor/handler.js");

describe("normalizeActorInput", () => {
  it("rejects whitespace-only openApiSpec", () => {
    const result = normalizeActorInput({ openApiSpec: "   ", format: "yaml" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("E001");
      expect(result.errors[0]?.message).toBe("openApiSpec must not be empty");
    }
  });

  it("rejects invalid format", () => {
    const result = normalizeActorInput({
      openApiSpec: "openapi: 3.0.0",
      format: "xml" as "json",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe('format must be "json" or "yaml"');
    }
  });

  it("trims openApiSpec on success", () => {
    const result = normalizeActorInput({
      openApiSpec: "  openapi: 3.0.0\n",
      format: "yaml",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.openApiSpec).toBe("openapi: 3.0.0");
    }
  });
});

describe("Actor handler", () => {
  beforeEach(() => {
    mockPushData.mockClear();
    mockSetValue.mockClear();
    mockGetInput.mockClear();
    mockGetPublicUrl.mockClear();
    mockOpenKeyValueStore.mockClear();
    mockSetStatusMessage.mockClear();
    mockRun.mockClear();
    mockLogError.mockClear();
    mockPushData.mockResolvedValue(undefined);
    mockSetStatusMessage.mockResolvedValue(undefined);
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

  it("maps null input to validation error output", async () => {
    mockGetInput.mockResolvedValue(null);

    await runActor();

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
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only openApiSpec without calling orchestrator", async () => {
    mockGetInput.mockResolvedValue({ openApiSpec: "   ", format: "yaml" });

    await runActor();

    expect(mockRun).not.toHaveBeenCalled();
    expect(mockPushData).toHaveBeenCalledWith({
      success: false,
      errors: [{ code: "E001", message: "openApiSpec must not be empty" }],
      warnings: [],
    });
  });

  it("rejects invalid format without calling orchestrator", async () => {
    mockGetInput.mockResolvedValue({
      openApiSpec: "openapi: 3.0.0",
      format: "xml",
    });

    await runActor();

    expect(mockRun).not.toHaveBeenCalled();
    expect(mockPushData).toHaveBeenCalledWith({
      success: false,
      errors: [{ code: "E001", message: 'format must be "json" or "yaml"' }],
      warnings: [],
    });
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

  it("maps orchestrator throw to error output without rethrowing", async () => {
    mockGetInput.mockResolvedValue({
      openApiSpec: "openapi: 3.0.0",
      format: "yaml",
    });
    mockRun.mockRejectedValue(new Error("unexpected pipeline failure"));

    await expect(runActor()).resolves.toBeUndefined();

    expect(mockPushData).toHaveBeenCalledWith({
      success: false,
      errors: [{ code: "E003", message: "unexpected pipeline failure" }],
      warnings: [],
    });
  });

  it("completes without throwing when pushData fails on failure path", async () => {
    mockGetInput.mockResolvedValue({});
    mockPushData.mockRejectedValue(new Error("dataset unavailable"));

    await expect(runActor()).resolves.toBeUndefined();

    expect(mockLogError).toHaveBeenCalled();
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
    expect(mockSetStatusMessage).toHaveBeenCalledWith(
      "Generated MCP server (5 tools)",
      { isStatusMessageTerminal: true },
    );
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
