import type { Endpoint } from "../ir/types.js";
import { deriveEndpointName, toSnakeCase } from "./types.js";
import type { ExtractedEndpoint } from "./types.js";

export function assignNames(endpoints: readonly ExtractedEndpoint[]): Endpoint[] {
  const usedNames = new Set<string>();
  const result: Endpoint[] = [];

  for (const endpoint of endpoints) {
    let baseName: string;
    if (endpoint.operationId) {
      baseName = toSnakeCase(endpoint.operationId);
    } else {
      baseName = deriveEndpointName(endpoint.method, endpoint.path);
    }

    let name = baseName;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${baseName}_${suffix}`;
      suffix += 1;
    }
    usedNames.add(name);

    const { operationId: _opId, ...rest } = endpoint;
    result.push({
      ...(rest as Omit<Endpoint, "id" | "name">),
      id: name,
      name,
    });
  }

  result.sort((a, b) => a.id.localeCompare(b.id));
  return result;
}
