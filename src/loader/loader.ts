import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import {
  type InputSource,
  type RawDocument,
  type Result,
  success,
  failure,
} from "../utils/result.js";
import { ERROR_CODES, error } from "../utils/warning-codes.js";
import type { Logger } from "../utils/logger.js";
import { createLogger } from "../utils/logger.js";

function detectFormat(
  content: string,
  hint?: "json" | "yaml",
  filePath?: string,
): "json" | "yaml" {
  if (hint) return hint;
  if (filePath) {
    const ext = filePath.toLowerCase();
    if (ext.endsWith(".json")) return "json";
    if (ext.endsWith(".yaml") || ext.endsWith(".yml")) return "yaml";
  }
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return "json";
  return "yaml";
}

function validateSyntax(content: string, format: "json" | "yaml"): string | null {
  try {
    if (format === "json") {
      JSON.parse(content);
    } else {
      yaml.load(content);
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export interface Loader {
  load(source: InputSource): Promise<Result<RawDocument>>;
}

export function createLoader(logger: Logger = createLogger("Loader")): Loader {
  return {
    async load(source: InputSource): Promise<Result<RawDocument>> {
      logger.info("Loading specification...");

      try {
        let content: string;
        let sourceLabel: string | undefined;
        let formatHint: "json" | "yaml" | undefined;

        switch (source.type) {
          case "file": {
            try {
              content = await readFile(source.path, "utf-8");
            } catch {
              return failure([
                error(ERROR_CODES.E001, `File not found: ${source.path}`, source.path),
              ]);
            }
            sourceLabel = source.path;
            break;
          }
          case "string": {
            content = source.content;
            formatHint = source.format;
            sourceLabel = "string";
            break;
          }
          case "url":
            return failure([
              error(
                ERROR_CODES.E001,
                "URL input is not supported in v1",
                source.url,
              ),
            ]);
        }

        const format = detectFormat(content, formatHint, sourceLabel);
        const syntaxError = validateSyntax(content, format);
        if (syntaxError) {
          return failure([
            error(
              ERROR_CODES.E001,
              `Invalid ${format.toUpperCase()} syntax: ${syntaxError}`,
              sourceLabel,
            ),
          ]);
        }

        const doc: RawDocument = { content, format, source: sourceLabel };
        logger.info(`Loaded ${format.toUpperCase()} document`);
        return success(doc);
      } catch (e) {
        return failure([
          error(
            ERROR_CODES.E001,
            e instanceof Error ? e.message : String(e),
          ),
        ]);
      }
    },
  };
}
