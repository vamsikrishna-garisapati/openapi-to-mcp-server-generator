import { Actor, log } from "apify";
import { createOrchestrator } from "../orchestrator/index.js";
import type { GenerationError, Warning } from "../utils/result.js";

export interface ActorInput {
  openApiSpec: string;
  format: "json" | "yaml";
  projectName?: string;
}

/** Maximum OpenAPI spec size accepted by the Actor (10 MB). */
export const MAX_SPEC_BYTES = 10 * 1024 * 1024;

export function normalizeActorInput(
  input: Partial<ActorInput> | null | undefined,
): { ok: true; input: ActorInput } | { ok: false; errors: GenerationError[] } {
  const raw = input ?? {};

  if (!raw.openApiSpec || !raw.format) {
    return {
      ok: false,
      errors: [
        {
          code: "E001",
          message: "openApiSpec and format are required",
        },
      ],
    };
  }

  const openApiSpec = raw.openApiSpec.trim();
  if (!openApiSpec) {
    return {
      ok: false,
      errors: [
        {
          code: "E001",
          message: "openApiSpec must not be empty",
        },
      ],
    };
  }

  if (raw.format !== "json" && raw.format !== "yaml") {
    return {
      ok: false,
      errors: [
        {
          code: "E001",
          message: 'format must be "json" or "yaml"',
        },
      ],
    };
  }

  const specBytes = Buffer.byteLength(openApiSpec, "utf-8");
  if (specBytes > MAX_SPEC_BYTES) {
    return {
      ok: false,
      errors: [
        {
          code: "E001",
          message: `openApiSpec exceeds maximum size of ${MAX_SPEC_BYTES} bytes`,
        },
      ],
    };
  }

  return {
    ok: true,
    input: {
      openApiSpec,
      format: raw.format,
      projectName: raw.projectName,
    },
  };
}

export async function pushFailureOutput(
  errors: GenerationError[],
  warnings: Warning[] = [],
): Promise<void> {
  for (const err of errors) {
    log.error(`[${err.code}] ${err.message}${err.location ? ` (${err.location})` : ""}`);
  }

  try {
    await Actor.setStatusMessage(
      errors[0]?.message ?? "Generation failed",
      { isStatusMessageTerminal: true, level: "ERROR" },
    );
  } catch {
    // Status message is best-effort; do not crash the Actor.
  }

  try {
    await Actor.pushData({
      success: false,
      errors,
      warnings,
    });
  } catch (pushErr) {
    log.error(
      `Failed to push failure output: ${pushErr instanceof Error ? pushErr.message : String(pushErr)}`,
    );
  }
}

export async function runActor(): Promise<void> {
  try {
    const rawInput = await Actor.getInput<ActorInput>();
    const normalized = normalizeActorInput(rawInput);

    if (!normalized.ok) {
      await pushFailureOutput(normalized.errors);
      return;
    }

    const input = normalized.input;
    const orchestrator = createOrchestrator();
    const result = await orchestrator.run(
      {
        type: "string",
        content: input.openApiSpec,
        format: input.format,
      },
      { projectName: input.projectName },
    );

    if (!result.success || !result.data) {
      await pushFailureOutput(result.errors, result.warnings);
      return;
    }

    await Actor.setValue("mcp-server.zip", result.data.buffer, {
      contentType: "application/zip",
    });

    let downloadUrl: string | undefined;
    try {
      const store = await Actor.openKeyValueStore();
      const url = store.getPublicUrl("mcp-server.zip");
      downloadUrl = url || undefined;
    } catch {
      downloadUrl = undefined;
    }

    await Actor.pushData({
      success: true,
      downloadUrl,
      statistics: result.statistics ?? {},
      warnings: result.warnings,
    });
  } catch (err) {
    await pushFailureOutput([
      {
        code: "E003",
        message: err instanceof Error ? err.message : String(err),
      },
    ]);
  }
}
