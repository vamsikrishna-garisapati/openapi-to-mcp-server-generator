import type { Schema, SchemaProperty } from "../ir/types.js";
import type { Warning } from "../utils/result.js";
import { WARNING_CODES, warning } from "../utils/warning-codes.js";

let schemaCounter = 0;

export function resetSchemaCounter(): void {
  schemaCounter = 0;
}

function nextSchemaId(prefix: string): string {
  schemaCounter += 1;
  return `${prefix}_${schemaCounter}`;
}

function hasUnsupportedConstructs(raw: Record<string, unknown>): boolean {
  return (
    "oneOf" in raw ||
    "anyOf" in raw ||
    "allOf" in raw ||
    "discriminator" in raw ||
    "xml" in raw
  );
}

function mapOpenApiType(raw: Record<string, unknown>): Schema["type"] | null {
  if (raw.type === "integer") return "integer";
  if (raw.type === "number") return "number";
  if (raw.type === "boolean") return "boolean";
  if (raw.type === "string") return "string";
  if (raw.type === "array") return "array";
  if (raw.type === "object" || raw.properties) return "object";
  return null;
}

export function normalizeSchema(
  raw: unknown,
  idPrefix = "schema",
  location?: string,
): { schema: Schema | null; warnings: Warning[] } {
  const warnings: Warning[] = [];

  if (!raw || typeof raw !== "object") {
    return { schema: null, warnings };
  }

  const obj = raw as Record<string, unknown>;

  if (hasUnsupportedConstructs(obj)) {
    warnings.push(
      warning(WARNING_CODES.P002, "Unsupported schema construct", location),
    );
    return { schema: null, warnings };
  }

  const type = mapOpenApiType(obj);
  if (!type) {
    warnings.push(
      warning(WARNING_CODES.P002, "Unknown or missing schema type", location),
    );
    return { schema: null, warnings };
  }

  const schema: Schema = {
    id: nextSchemaId(idPrefix),
    type,
    nullable: obj.nullable === true,
    description: typeof obj.description === "string" ? obj.description : undefined,
    format: typeof obj.format === "string" ? obj.format : undefined,
    default: obj.default,
    enum: Array.isArray(obj.enum) ? [...obj.enum] : undefined,
    examples: Array.isArray(obj.examples)
      ? [...obj.examples]
      : obj.example !== undefined
        ? [obj.example]
        : undefined,
  };

  if (type === "object") {
    const properties: SchemaProperty[] = [];
    const props = (obj.properties as Record<string, unknown>) ?? {};
    for (const [name, propRaw] of Object.entries(props).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const { schema: propSchema, warnings: propWarnings } = normalizeSchema(
        propRaw,
        `${idPrefix}_${name}`,
        location ? `${location}.${name}` : name,
      );
      warnings.push(...propWarnings);
      if (propSchema) {
        properties.push({ name, schema: propSchema });
      }
    }
    if (properties.length > 0) {
      (schema as { properties?: SchemaProperty[] }).properties = properties;
    }
    if (Array.isArray(obj.required)) {
      (schema as { required?: string[] }).required = [...obj.required].sort();
    }
  }

  if (type === "array" && obj.items) {
    const { schema: itemsSchema, warnings: itemWarnings } = normalizeSchema(
      obj.items,
      `${idPrefix}_items`,
      location,
    );
    warnings.push(...itemWarnings);
    if (itemsSchema) {
      (schema as { items?: Schema }).items = itemsSchema;
    }
  }

  return { schema, warnings };
}

export function extractComponentSchemas(
  spec: { components?: { schemas?: Record<string, unknown> } },
): { schemas: Schema[]; warnings: Warning[] } {
  resetSchemaCounter();
  const warnings: Warning[] = [];
  const schemas: Schema[] = [];
  const componentSchemas = spec.components?.schemas ?? {};

  for (const [name, raw] of Object.entries(componentSchemas).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const { schema, warnings: schemaWarnings } = normalizeSchema(
      raw,
      name,
      `#/components/schemas/${name}`,
    );
    warnings.push(...schemaWarnings);
    if (schema) {
      schemas.push({ ...schema, id: name });
    }
  }

  return { schemas, warnings };
}
