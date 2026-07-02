import type { Authentication } from "../ir/types.js";
import type { Warning } from "../utils/result.js";
import { WARNING_CODES, warning } from "../utils/warning-codes.js";
import type { ParsedSpec } from "./types.js";

function envVariableForScheme(id: string, type: string): string {
  if (type === "bearer") return "ACCESS_TOKEN";
  const normalized = id.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return normalized === "API_KEY" ? "API_KEY" : normalized || "API_KEY";
}

export function extractAuthentication(spec: ParsedSpec): {
  authentication: Authentication[];
  warnings: Warning[];
} {
  const warnings: Warning[] = [];
  const schemes = spec.components?.securitySchemes ?? {};
  const authentication: Authentication[] = [];

  for (const [id, schemeRaw] of Object.entries(schemes)) {
    if (!schemeRaw || typeof schemeRaw !== "object") continue;
    const scheme = schemeRaw as Record<string, unknown>;

    if (scheme.type === "apiKey") {
      const location = scheme.in as Authentication["location"];
      if (!["header", "query", "cookie"].includes(location)) {
        warnings.push(
          warning(WARNING_CODES.P003, `Unsupported apiKey location: ${location}`, id),
        );
        continue;
      }
      authentication.push({
        id,
        type: "apiKey",
        location,
        parameterName: String(scheme.name ?? id),
        envVariable: envVariableForScheme(id, "apiKey"),
      });
      continue;
    }

    if (scheme.type === "http" && scheme.scheme === "bearer") {
      authentication.push({
        id,
        type: "bearer",
        location: "header",
        parameterName: "Authorization",
        envVariable: "ACCESS_TOKEN",
      });
      continue;
    }

    warnings.push(
      warning(
        WARNING_CODES.P003,
        `Unsupported authentication scheme: ${String(scheme.type)}`,
        id,
      ),
    );
  }

  authentication.sort((a, b) => a.id.localeCompare(b.id));
  return { authentication, warnings };
}

export function resolveEndpointAuthentication(
  operationSecurity: Array<Record<string, string[]>> | undefined,
  globalSecurity: Array<Record<string, string[]>> | undefined,
  availableAuthIds: Set<string>,
): string[] {
  let securityReqs: Array<Record<string, string[]>> | undefined;

  if (operationSecurity !== undefined) {
    if (operationSecurity.length === 0) {
      return [];
    }
    securityReqs = operationSecurity;
  } else if (globalSecurity !== undefined) {
    securityReqs = globalSecurity;
  } else {
    return [];
  }

  const authIds = new Set<string>();
  for (const req of securityReqs) {
    for (const schemeName of Object.keys(req)) {
      if (availableAuthIds.has(schemeName)) {
        authIds.add(schemeName);
      }
    }
  }

  return [...authIds].sort();
}
