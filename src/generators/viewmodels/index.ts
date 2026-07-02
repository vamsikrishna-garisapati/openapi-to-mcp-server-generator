import type { Authentication, Endpoint } from "../../ir/types.js";
import type { JsonSchema } from "../schema-converter.js";

export interface ToolViewModel {
  id: string;
  name: string;
  description: string;
  method: string;
  path: string;
  inputSchemaJson: string;
  hasRequestBody: boolean;
  pathParams: string[];
  queryParams: string[];
  headerParams: string[];
  bodyParam: string | null;
  authentication: string[];
}

export interface ProjectViewModel {
  projectName: string;
  projectSlug: string;
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  requiresBaseUrl: boolean;
  tools: ToolViewModel[];
  authSchemes: Authentication[];
  envVariables: EnvVariableViewModel[];
}

export interface EnvVariableViewModel {
  name: string;
  description: string;
}

export function buildToolDescription(endpoint: Endpoint): string {
  let desc =
    endpoint.description ??
    endpoint.summary ??
    `${endpoint.method.toUpperCase()} ${endpoint.path}`;
  if (endpoint.deprecated) {
    desc = `${desc} (Deprecated)`;
  }
  return desc;
}

export function buildToolViewModel(
  endpoint: Endpoint,
  inputSchema: JsonSchema,
  authParamNames: readonly string[],
): ToolViewModel {
  const pathParams = endpoint.parameters
    .filter((p) => p.location === "path")
    .map((p) => p.name);
  const queryParams = endpoint.parameters
    .filter((p) => p.location === "query" && !authParamNames.includes(p.name))
    .map((p) => p.name);
  const headerParams = endpoint.parameters
    .filter((p) => p.location === "header" && !authParamNames.includes(p.name))
    .map((p) => p.name);

  return {
    id: endpoint.id,
    name: endpoint.name,
    description: buildToolDescription(endpoint),
    method: endpoint.method,
    path: endpoint.path,
    inputSchemaJson: JSON.stringify(inputSchema, null, 2),
    hasRequestBody: !!endpoint.requestBody,
    pathParams,
    queryParams,
    headerParams,
    bodyParam: endpoint.requestBody ? "body" : null,
    authentication: [...endpoint.authentication],
  };
}

export function buildEnvVariables(
  authentication: readonly Authentication[],
  requiresBaseUrl: boolean,
): EnvVariableViewModel[] {
  const vars: EnvVariableViewModel[] = [];
  if (requiresBaseUrl) {
    vars.push({ name: "BASE_URL", description: "API base URL" });
  }
  const seen = new Set<string>();
  for (const auth of authentication) {
    if (!seen.has(auth.envVariable)) {
      seen.add(auth.envVariable);
      vars.push({
        name: auth.envVariable,
        description: `${auth.type} credential for ${auth.id}`,
      });
    }
  }
  return vars.sort((a, b) => a.name.localeCompare(b.name));
}
