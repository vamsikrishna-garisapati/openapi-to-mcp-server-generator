import type { Parameter, RequestBody, Response } from "../ir/types.js";
import type { Warning } from "../utils/result.js";
import { WARNING_CODES, warning } from "../utils/warning-codes.js";
import { resolveEndpointAuthentication } from "./authentication.js";
import { normalizeSchema } from "./schemas.js";
import type { ExtractedEndpoint, ParsedSpec } from "./types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

function extractParameter(
  raw: unknown,
  location?: string,
): { parameter: Parameter | null; warnings: Warning[] } {
  const warnings: Warning[] = [];
  if (!raw || typeof raw !== "object") {
    return { parameter: null, warnings };
  }
  const obj = raw as Record<string, unknown>;
  const name = String(obj.name ?? "");
  const paramLocation = obj.in as Parameter["location"];
  const { schema, warnings: schemaWarnings } = normalizeSchema(
    obj.schema ?? { type: "string" },
    `param_${name}`,
    location,
  );
  warnings.push(...schemaWarnings);
  if (!schema) return { parameter: null, warnings };

  return {
    parameter: {
      name,
      location: paramLocation,
      required: obj.required === true,
      description: typeof obj.description === "string" ? obj.description : undefined,
      schema,
    },
    warnings,
  };
}

function extractRequestBody(
  raw: unknown,
  location?: string,
): { requestBody: RequestBody | null; warnings: Warning[] } {
  const warnings: Warning[] = [];
  if (!raw || typeof raw !== "object") {
    return { requestBody: null, warnings };
  }
  const obj = raw as Record<string, unknown>;
  const content = obj.content as Record<string, unknown> | undefined;
  if (!content) return { requestBody: null, warnings };

  const jsonContent = content["application/json"];
  if (!jsonContent) {
    warnings.push(
      warning(WARNING_CODES.P002, "Non-JSON request body omitted", location),
    );
    return { requestBody: null, warnings };
  }

  const jsonObj = jsonContent as Record<string, unknown>;
  const { schema, warnings: schemaWarnings } = normalizeSchema(
    jsonObj.schema,
    "body",
    location,
  );
  warnings.push(...schemaWarnings);
  if (!schema) return { requestBody: null, warnings };

  return {
    requestBody: {
      required: obj.required === true,
      contentType: "application/json",
      schema,
    },
    warnings,
  };
}

function extractResponses(
  raw: Record<string, unknown>,
  location?: string,
): { responses: Response[]; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const responses: Response[] = [];

  for (const [statusCode, responseRaw] of Object.entries(raw).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!responseRaw || typeof responseRaw !== "object") continue;
    const resp = responseRaw as Record<string, unknown>;
    let schema: Response["schema"];

    const content = resp.content as Record<string, unknown> | undefined;
    if (content?.["application/json"]) {
      const jsonContent = content["application/json"] as Record<string, unknown>;
      const result = normalizeSchema(jsonContent.schema, `response_${statusCode}`, location);
      warnings.push(...result.warnings);
      schema = result.schema ?? undefined;
    }

    responses.push({
      statusCode,
      description: typeof resp.description === "string" ? resp.description : undefined,
      schema,
    });
  }

  return { responses, warnings };
}

export function extractEndpoints(
  spec: ParsedSpec,
  authIds: Set<string>,
): { endpoints: ExtractedEndpoint[]; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const endpoints: ExtractedEndpoint[] = [];
  const globalSecurity = spec.security;

  for (const [path, pathItem] of Object.entries(spec.paths).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!pathItem || typeof pathItem !== "object") continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") continue;

      const op = operation as Record<string, unknown>;
      const location = `${path}.${method}`;

      if (op.deprecated === true) {
        warnings.push(
          warning(WARNING_CODES.P005, "Deprecated endpoint", location),
        );
      }

      const parameters: Parameter[] = [];
      const paramList = op.parameters as unknown[] | undefined;
      if (paramList) {
        for (const paramRaw of paramList) {
          const { parameter, warnings: paramWarnings } = extractParameter(
            paramRaw,
            location,
          );
          warnings.push(...paramWarnings);
          if (parameter) parameters.push(parameter);
        }
      }

      const { requestBody, warnings: bodyWarnings } = extractRequestBody(
        op.requestBody,
        location,
      );
      warnings.push(...bodyWarnings);

      const { responses, warnings: responseWarnings } = extractResponses(
        (op.responses as Record<string, unknown>) ?? {},
        location,
      );
      warnings.push(...responseWarnings);

      const endpointAuth = resolveEndpointAuthentication(
        op.security as Array<Record<string, string[]>> | undefined,
        globalSecurity,
        authIds,
      );

      endpoints.push({
        operationId:
          typeof op.operationId === "string" ? op.operationId : undefined,
        method: method as ExtractedEndpoint["method"],
        path,
        summary: typeof op.summary === "string" ? op.summary : undefined,
        description:
          typeof op.description === "string" ? op.description : undefined,
        tags: Array.isArray(op.tags) ? [...op.tags] : [],
        deprecated: op.deprecated === true,
        authentication: endpointAuth,
        parameters,
        requestBody: requestBody ?? undefined,
        responses,
      });
    }
  }

  return { endpoints, warnings };
}
