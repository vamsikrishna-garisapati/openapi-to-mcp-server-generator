import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import type {
  GeneratedFiles,
  ProjectDirectory,
  Result,
} from "../utils/result.js";
import { failure, success } from "../utils/result.js";
import type { Logger } from "../utils/logger.js";
import { createLogger } from "../utils/logger.js";
import { ERROR_CODES, error } from "../utils/warning-codes.js";

export interface ProjectBuilder {
  build(files: GeneratedFiles): Promise<Result<ProjectDirectory>>;
}

export function createProjectBuilder(
  logger: Logger = createLogger("Builder"),
): ProjectBuilder {
  return {
    async build(files: GeneratedFiles): Promise<Result<ProjectDirectory>> {
      logger.info("Building project directory...");

      try {
        const rootPath = await mkdtemp(join(tmpdir(), "mcp-studio-"));

        for (const file of files.files) {
          const fullPath = join(rootPath, file.path);
          await mkdir(dirname(fullPath), { recursive: true });
          await writeFile(fullPath, file.content, "utf-8");
        }

        logger.info(`Wrote ${files.files.length} files to ${rootPath}`);
        return success({ rootPath, files: files.files });
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
