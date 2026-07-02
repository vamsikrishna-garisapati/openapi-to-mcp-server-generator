import type { ApiInfo } from "../ir/types.js";
import type { ParsedSpec } from "./types.js";

export function extractMetadata(spec: ParsedSpec): ApiInfo {
  return {
    title: spec.info?.title ?? "Untitled API",
    version: spec.info?.version ?? "1.0.0",
    description: spec.info?.description,
  };
}
