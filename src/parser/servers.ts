import type { ServerConfig } from "../ir/types.js";
import type { Warning } from "../utils/result.js";
import { WARNING_CODES, warning } from "../utils/warning-codes.js";
import type { ParsedSpec } from "./types.js";

export function extractServers(spec: ParsedSpec): {
  server: ServerConfig;
  warnings: Warning[];
} {
  const warnings: Warning[] = [];
  const servers = spec.servers;

  if (!servers || servers.length === 0) {
    warnings.push(
      warning(
        WARNING_CODES.P004,
        "No servers defined; BASE_URL required at runtime",
      ),
    );
    return { server: { baseUrl: "" }, warnings };
  }

  return { server: { baseUrl: servers[0].url }, warnings };
}
