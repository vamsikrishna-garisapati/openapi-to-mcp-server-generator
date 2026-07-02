import type { ApiModel } from "../ir/types.js";
import type { RawDocument, Result } from "../utils/result.js";
import { failure, success } from "../utils/result.js";
import type { Logger } from "../utils/logger.js";
import { createLogger } from "../utils/logger.js";
import { createStatistics } from "../utils/statistics.js";
import { extractAuthentication } from "./authentication.js";
import { extractEndpoints } from "./endpoints.js";
import { buildApiModel } from "./ir-builder.js";
import { extractMetadata } from "./metadata.js";
import { assignNames } from "./naming.js";
import { assignPrimaryResponses } from "./responses.js";
import { resolveReferences } from "./resolver.js";
import { extractComponentSchemas } from "./schemas.js";
import { extractServers } from "./servers.js";
import {
  collectMissingDescriptionWarnings,
  parseDocument,
} from "./validator.js";

export interface Parser {
  parse(document: RawDocument): Promise<Result<ApiModel>>;
}

export function createParser(logger: Logger = createLogger("Parser")): Parser {
  return {
    async parse(document: RawDocument): Promise<Result<ApiModel>> {
      const stats = createStatistics();
      stats.start("parse");
      const allWarnings = [];

      logger.info("Parsing specification...");

      const parsed = parseDocument(document);
      allWarnings.push(...parsed.warnings);
      if (parsed.errors.length > 0) {
        stats.end("parse");
        return failure(parsed.errors, allWarnings);
      }

      const { spec: resolved, errors: resolveErrors } = await resolveReferences(
        document,
        parsed.spec!,
      );
      allWarnings.push(...collectMissingDescriptionWarnings(parsed.spec!));
      if (resolveErrors.length > 0) {
        stats.end("parse");
        return failure(resolveErrors, allWarnings);
      }

      const spec = resolved!;
      const info = extractMetadata(spec);
      const { server, warnings: serverWarnings } = extractServers(spec);
      allWarnings.push(...serverWarnings);

      const { authentication, warnings: authWarnings } = extractAuthentication(spec);
      allWarnings.push(...authWarnings);

      const authIds = new Set(authentication.map((a) => a.id));
      const { endpoints: rawEndpoints, warnings: endpointWarnings } =
        extractEndpoints(spec, authIds);
      allWarnings.push(...endpointWarnings);

      const { schemas, warnings: schemaWarnings } = extractComponentSchemas(spec);
      allWarnings.push(...schemaWarnings);

      const withPrimary = assignPrimaryResponses(rawEndpoints);
      const endpoints = assignNames(withPrimary);

      const apiModel = buildApiModel({
        info,
        server,
        authentication,
        endpoints,
        schemas,
      });

      stats.increment("endpointCount", endpoints.length);
      stats.increment("schemaCount", schemas.length);
      stats.increment("warningCount", allWarnings.length);
      stats.end("parse");

      logger.info(
        `Parsing complete (${endpoints.length} endpoints, ${allWarnings.length} warnings)`,
      );

      return success(apiModel, allWarnings, stats.snapshot());
    },
  };
}
