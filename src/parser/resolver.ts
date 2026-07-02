import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI } from "openapi-types";
import type { RawDocument } from "../utils/result.js";
import type { GenerationError } from "../utils/result.js";
import { ERROR_CODES, error } from "../utils/warning-codes.js";
import type { ParsedSpec } from "./types.js";

export async function resolveReferences(
  document: RawDocument,
  spec: ParsedSpec,
): Promise<{ spec: ParsedSpec | null; errors: GenerationError[] }> {
  const errors: GenerationError[] = [];

  try {
    const api = await SwaggerParser.validate(spec as unknown as OpenAPI.Document, {
      validate: { schema: true },
    });
    const dereferenced = (await SwaggerParser.dereference(
      api as OpenAPI.Document,
    )) as ParsedSpec;
    return { spec: dereferenced, errors };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const code = message.includes("$ref") || message.includes("reference")
      ? ERROR_CODES.E004
      : ERROR_CODES.E001;
    errors.push(error(code, message, document.source));
    return { spec: null, errors };
  }
}
