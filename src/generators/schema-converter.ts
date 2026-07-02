import type { Schema } from "../ir/types.js";

export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  nullable?: boolean;
  examples?: unknown[];
  format?: string;
}

export interface SchemaConverter {
  convert(schema: Schema): JsonSchema;
}

export function createSchemaConverter(): SchemaConverter {
  return {
    convert(schema: Schema): JsonSchema {
      const result: JsonSchema = {
        type: schema.type,
        description: schema.description,
        nullable: schema.nullable || undefined,
        format: schema.format,
        default: schema.default,
        enum: schema.enum ? [...schema.enum] : undefined,
        examples: schema.examples ? [...schema.examples] : undefined,
      };

      if (schema.type === "object" && schema.properties) {
        result.properties = {};
        for (const prop of schema.properties) {
          result.properties[prop.name] = createSchemaConverter().convert(prop.schema);
        }
        if (schema.required && schema.required.length > 0) {
          result.required = [...schema.required];
        }
      }

      if (schema.type === "array" && schema.items) {
        result.items = createSchemaConverter().convert(schema.items);
      }

      return result;
    },
  };
}

export function buildToolInputSchema(
  parameters: readonly {
    name: string;
    location: string;
    required: boolean;
    description?: string;
    schema: Schema;
  }[],
  requestBody?: { required: boolean; schema: Schema },
  authParamNames: readonly string[] = [],
): JsonSchema {
  const converter = createSchemaConverter();
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const param of parameters) {
    if (param.location === "cookie") continue;
    if (authParamNames.includes(param.name)) continue;

    properties[param.name] = {
      ...converter.convert(param.schema),
      description: param.description,
    };
    if (param.required || param.location === "path") {
      required.push(param.name);
    }
  }

  if (requestBody?.schema) {
    const bodySchema = converter.convert(requestBody.schema);
    if (bodySchema.type === "object" && bodySchema.properties) {
      for (const [name, propSchema] of Object.entries(bodySchema.properties)) {
        properties[name] = propSchema;
      }
      if (bodySchema.required) {
        required.push(...bodySchema.required);
      }
    } else {
      properties["body"] = bodySchema;
      if (requestBody.required) {
        required.push("body");
      }
    }
  }

  const schema: JsonSchema = {
    type: "object",
    properties,
  };
  if (required.length > 0) {
    schema.required = [...new Set(required)].sort();
  }
  return schema;
}
