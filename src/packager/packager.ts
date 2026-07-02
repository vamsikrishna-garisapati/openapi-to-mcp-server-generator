import { createWriteStream } from "node:fs";
import { join } from "node:path";
import archiver from "archiver";
import { readFile, rm } from "node:fs/promises";
import type { Archive, ProjectDirectory, Result } from "../utils/result.js";
import { failure, success } from "../utils/result.js";
import type { Logger } from "../utils/logger.js";
import { createLogger } from "../utils/logger.js";
import { ERROR_CODES, error } from "../utils/warning-codes.js";
import { slugify } from "../utils/strings.js";

export interface Packager {
  package(project: ProjectDirectory, projectName?: string): Promise<Result<Archive>>;
}

function archiveDirectory(
  sourceDir: string,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

export function createPackager(
  logger: Logger = createLogger("Packager"),
): Packager {
  return {
    async package(
      project: ProjectDirectory,
      projectName = "mcp-server",
    ): Promise<Result<Archive>> {
      logger.info("Packaging ZIP archive...");

      try {
        const filename = `${slugify(projectName)}-mcp-server.zip`;
        const zipPath = join(project.rootPath, "..", filename);

        await archiveDirectory(project.rootPath, zipPath);
        const buffer = await readFile(zipPath);
        await rm(zipPath, { force: true });

        logger.info(`Created archive ${filename} (${buffer.length} bytes)`);

        return success({
          buffer,
          filename,
          size: buffer.length,
        });
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
