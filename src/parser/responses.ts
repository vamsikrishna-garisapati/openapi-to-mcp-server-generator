import { selectPrimaryResponse } from "./types.js";
import type { ExtractedEndpoint } from "./types.js";

export function assignPrimaryResponses(
  endpoints: ExtractedEndpoint[],
): ExtractedEndpoint[] {
  return endpoints.map((endpoint) => ({
    ...endpoint,
    primaryResponse: selectPrimaryResponse([...endpoint.responses]),
  }));
}
