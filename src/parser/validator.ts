import yaml from "js-yaml";
import type { RawDocument } from "../utils/result.js";
import type { Warning, GenerationError } from "../utils/result.js";
import { ERROR_CODES, error, WARNING_CODES, warning } from "../utils/warning-codes.js";
import type { ParsedSpec } from "./types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

export function parseDocument(document: RawDocument): {
  spec: ParsedSpec | null;
  errors: GenerationError[];
  warnings: Warning[];
} {
  const errors: GenerationError[] = [];
  const warnings: Warning[] = [];

  let raw: unknown;
  try {
    raw =
      document.format === "json"
        ? JSON.parse(document.content)
        : yaml.load(document.content);
  } catch (e) {
    errors.push(
      error(
        ERROR_CODES.E001,
        `Failed to parse document: ${e instanceof Error ? e.message : String(e)}`,
        document.source,
      ),
    );
    return { spec: null, errors, warnings };
  }

  if (!raw || typeof raw !== "object") {
    errors.push(error(ERROR_CODES.E001, "Document must be an object", document.source));
    return { spec: null, errors, warnings };
  }

  const spec = raw as Record<string, unknown>;
  const openapi = spec.openapi;
  if (typeof openapi !== "string") {
    errors.push(error(ERROR_CODES.E005, "Missing or invalid openapi version field"));
    return { spec: null, errors, warnings };
  }

  if (openapi.startsWith("2.")) {
    errors.push(error(ERROR_CODES.E005, "Swagger 2.0 is not supported"));
    return { spec: null, errors, warnings };
  }

  if (!openapi.startsWith("3.0") && !openapi.startsWith("3.1")) {
    errors.push(
      error(ERROR_CODES.E005, `Unsupported OpenAPI version: ${openapi}`),
    );
    return { spec: null, errors, warnings };
  }

  if (!spec.paths || typeof spec.paths !== "object") {
    errors.push(error(ERROR_CODES.E002, "Missing paths section"));
    return { spec: null, errors, warnings };
  }

  const operationIds = new Map<string, string>();
  const paths = spec.paths as Record<string, Record<string, unknown>>;

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") continue;
      const op = operation as Record<string, unknown>;
      const operationId = op.operationId;
      if (typeof operationId === "string") {
        const location = `${path}.${method}`;
        if (operationIds.has(operationId)) {
          errors.push(
            error(
              ERROR_CODES.E006,
              `Duplicate operationId: ${operationId}`,
              location,
            ),
          );
        } else {
          operationIds.set(operationId, location);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { spec: null, errors, warnings };
  }

  return { spec: raw as ParsedSpec, errors, warnings };
}

export function collectMissingDescriptionWarnings(
  spec: ParsedSpec,
): Warning[] {
  const warnings: Warning[] = [];
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Record<string, unknown> | undefined;
      if (!operation) continue;
      if (!operation.description && !operation.summary) {
        warnings.push(
          warning(
            WARNING_CODES.P001,
            "Missing description",
            `${path}.${method}`,
          ),
        );
      }
    }
  }
  return warnings;
}
