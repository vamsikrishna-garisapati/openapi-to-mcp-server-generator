import { Actor } from "apify";
import { createOrchestrator } from "../orchestrator/index.js";

export interface ActorInput {
  openApiSpec: string;
  format: "json" | "yaml";
  projectName?: string;
}

export async function runActor(): Promise<void> {
  const input = (await Actor.getInput<ActorInput>()) ?? ({} as ActorInput);

  if (!input.openApiSpec || !input.format) {
    await Actor.pushData({
      success: false,
      errors: [
        {
          code: "E001",
          message: "openApiSpec and format are required",
        },
      ],
      warnings: [],
    });
    return;
  }

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
    await Actor.pushData({
      success: false,
      errors: result.errors,
      warnings: result.warnings,
    });
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
}
