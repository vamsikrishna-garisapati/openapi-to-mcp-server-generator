import type { ApiModel } from "../ir/types.js";
import { freezeApiModel } from "../ir/types.js";

export function buildApiModel(partial: Omit<ApiModel, never>): ApiModel {
  const sortedEndpoints = [...partial.endpoints].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const sortedSchemas = [...partial.schemas].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const sortedAuth = [...partial.authentication].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  return freezeApiModel({
    info: partial.info,
    server: partial.server,
    authentication: sortedAuth,
    endpoints: sortedEndpoints,
    schemas: sortedSchemas,
  });
}
