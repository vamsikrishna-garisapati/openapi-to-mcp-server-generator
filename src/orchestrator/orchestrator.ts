import { rm, writeFile } from "node:fs/promises";
import type { Archive, InputSource, Result } from "../utils/result.js";
import { failure, mergeResults, success } from "../utils/result.js";
import type { Logger } from "../utils/logger.js";
import { createLogger } from "../utils/logger.js";
import { createStatistics } from "../utils/statistics.js";
import { createLoader } from "../loader/index.js";
import { createParser } from "../parser/index.js";
import { createMcpGenerator } from "../generators/index.js";
import { createProjectBuilder } from "../builder/index.js";
import { createPackager } from "../packager/index.js";
import { ERROR_CODES, error } from "../utils/warning-codes.js";

export interface PipelineOrchestrator {
  run(input: InputSource, options?: { projectName?: string; outputPath?: string }): Promise<Result<Archive>>;
}

export function createOrchestrator(
  logger: Logger = createLogger("Orchestrator"),
): PipelineOrchestrator {
  const loader = createLoader(createLogger("Loader"));
  const parser = createParser(createLogger("Parser"));
  const generator = createMcpGenerator(createLogger("Generator"));
  const builder = createProjectBuilder(createLogger("Builder"));
  const packager = createPackager(createLogger("Packager"));

  return {
    async run(
      input: InputSource,
      options?: { projectName?: string; outputPath?: string },
    ): Promise<Result<Archive>> {
      const stats = createStatistics();
      stats.start("total");
      let workspacePath: string | undefined;

      try {
        logger.info("Loading specification...");
        stats.start("load");
        const loadResult = await loader.load(input);
        stats.end("load");
        if (!loadResult.success || !loadResult.data) {
          return failure(loadResult.errors, loadResult.warnings);
        }

        logger.info("Parsing specification...");
        stats.start("parse");
        const parseResult = await parser.parse(loadResult.data);
        stats.end("parse");
        if (!parseResult.success || !parseResult.data) {
          const merged = mergeResults([loadResult, parseResult]);
          return failure(merged.errors, merged.warnings);
        }

        logger.info("Generating project...");
        stats.start("generate");
        const genResult = await generator.generate(parseResult.data, {
          projectName: options?.projectName,
        });
        stats.end("generate");
        if (!genResult.success || !genResult.data) {
          const merged = mergeResults([loadResult, parseResult, genResult]);
          return failure(merged.errors, merged.warnings);
        }

        logger.info("Building project...");
        stats.start("build");
        const buildResult = await builder.build(genResult.data);
        stats.end("build");
        if (!buildResult.success || !buildResult.data) {
          const merged = mergeResults([
            loadResult,
            parseResult,
            genResult,
            buildResult,
          ]);
          return failure(merged.errors, merged.warnings);
        }

        workspacePath = buildResult.data.rootPath;

        logger.info("Packaging ZIP...");
        stats.start("package");
        const packageResult = await packager.package(
          buildResult.data,
          options?.projectName ?? parseResult.data.info.title,
        );
        stats.end("package");
        if (!packageResult.success || !packageResult.data) {
          const merged = mergeResults([
            loadResult,
            parseResult,
            genResult,
            buildResult,
            packageResult,
          ]);
          return failure(merged.errors, merged.warnings);
        }

        if (options?.outputPath) {
          await writeFile(options.outputPath, packageResult.data.buffer);
        }

        const merged = mergeResults([
          loadResult,
          parseResult,
          genResult,
          buildResult,
          packageResult,
        ]);
        stats.end("total");
        const snapshot = {
          ...stats.snapshot(),
          ...merged.statistics,
          endpointCount: parseResult.data.endpoints.length,
          toolCount: parseResult.data.endpoints.length,
          fileCount: genResult.data.files.length,
          warningCount: merged.warnings.length,
          durationMs: stats.snapshot().totalDurationMs ?? 0,
        };

        logger.info(`Done (${snapshot.durationMs}ms)`);

        return success(packageResult.data, merged.warnings, snapshot);
      } catch (e) {
        return failure([
          error(
            ERROR_CODES.E003,
            e instanceof Error ? e.message : String(e),
          ),
        ]);
      } finally {
        if (workspacePath) {
          await rm(workspacePath, { recursive: true, force: true }).catch(() => {});
        }
      }
    },
  };
}
