import type { Endpoint, Response } from "../ir/types.js";
import { toSnakeCase } from "../utils/strings.js";

export interface RawEndpoint {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  deprecated: boolean;
  security?: Array<Record<string, string[]>>;
  parameters: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
}

export interface ParsedSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string }>;
  security?: Array<Record<string, string[]>>;
  components?: {
    securitySchemes?: Record<string, unknown>;
    schemas?: Record<string, unknown>;
  };
  paths: Record<string, Record<string, unknown>>;
}

export interface ExtractedEndpoint
  extends Omit<Endpoint, "id" | "name"> {
  operationId?: string;
}

export function selectPrimaryResponse(responses: Response[]): Response | undefined {
  const priority = ["200", "201", "default"];
  for (const code of priority) {
    const found = responses.find((r) => r.statusCode === code);
    if (found) return found;
  }
  return responses[0];
}

export function deriveEndpointName(method: string, path: string): string {
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/[{}]/g, ""))
    .join("_");
  return toSnakeCase(`${method}_${segments || "root"}`);
}

export { toSnakeCase } from "../utils/strings.js";
