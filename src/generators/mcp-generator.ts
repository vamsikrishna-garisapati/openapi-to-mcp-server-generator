import type { ApiModel } from "../ir/types.js";
import type { GeneratedFiles, Result } from "../utils/result.js";
import { failure, success } from "../utils/result.js";
import type { Logger } from "../utils/logger.js";
import { createLogger } from "../utils/logger.js";
import { createStatistics } from "../utils/statistics.js";
import { buildToolDescription } from "./viewmodels/index.js";
import {
  generateAuth,
  generateClient,
  generateConfig,
  generateDockerfile,
  generateEnvExample,
  generateIndex,
  generatePackage,
  generateReadme,
  generateTsConfig,
  resolveProjectSlug,
} from "./sub-generators/project-files-generator.js";
import {
  generateToolTypes,
  generateTools,
} from "./sub-generators/tool-generator.js";
import { ERROR_CODES, error } from "../utils/warning-codes.js";

export interface Generator {
  generate(api: ApiModel, options?: { projectName?: string }): Promise<Result<GeneratedFiles>>;
}

export function createMcpGenerator(
  logger: Logger = createLogger("Generator"),
): Generator {
  return {
    async generate(
      api: ApiModel,
      options?: { projectName?: string },
    ): Promise<Result<GeneratedFiles>> {
      const stats = createStatistics();
      stats.start("generate");
      logger.info("Generating MCP server project...");

      try {
        const projectSlug = resolveProjectSlug(api, options?.projectName);
        const toolFiles = await generateTools(api);
        const toolTypes = await generateToolTypes();

        const toolsMeta = [...api.endpoints]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((e) => ({
            id: e.id,
            name: e.name,
            description: buildToolDescription(e),
          }));

        const files = [
          await generatePackage(api, projectSlug),
          await generateTsConfig(),
          await generateDockerfile(),
          await generateReadme(api, projectSlug, toolsMeta),
          await generateEnvExample(api),
          await generateIndex(api, projectSlug, toolsMeta),
          await generateClient(),
          await generateConfig(api),
          await generateAuth(api),
          toolTypes,
          ...toolFiles,
        ];

        const paths = files.map((f) => f.path);
        const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i);
        if (duplicates.length > 0) {
          return failure([
            error(
              ERROR_CODES.E003,
              `Duplicate generated filenames: ${[...new Set(duplicates)].join(", ")}`,
            ),
          ]);
        }

        files.sort((a, b) => a.path.localeCompare(b.path));

        stats.increment("endpointCount", api.endpoints.length);
        stats.increment("toolCount", toolFiles.length);
        stats.increment("fileCount", files.length);
        stats.end("generate");

        logger.info(`Generated ${files.length} files (${toolFiles.length} tools)`);

        return success({ files }, [], stats.snapshot());
      } catch (e) {
        return failure([
          error(
            ERROR_CODES.E003,
            e instanceof Error ? e.message : String(e),
          ),
        ]);
      }
    },
  };
}
