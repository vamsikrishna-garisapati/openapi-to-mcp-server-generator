export interface Warning {
  code: string;
  message: string;
  location?: string;
}

export interface GenerationError {
  code: string;
  message: string;
  location?: string;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  warnings: Warning[];
  errors: GenerationError[];
  statistics?: Record<string, number>;
}

export interface RawDocument {
  content: string;
  format: "json" | "yaml";
  source?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratedFiles {
  files: GeneratedFile[];
}

export interface ProjectDirectory {
  rootPath: string;
  files: GeneratedFile[];
}

export interface Archive {
  buffer: Buffer;
  filename: string;
  size: number;
}

export type InputSource =
  | { type: "file"; path: string }
  | { type: "string"; content: string; format?: "json" | "yaml" }
  | { type: "url"; url: string };

export function success<T>(
  data: T,
  warnings: Warning[] = [],
  statistics?: Record<string, number>,
): Result<T> {
  return { success: true, data, warnings, errors: [], statistics };
}

export function failure<T>(
  errors: GenerationError[],
  warnings: Warning[] = [],
): Result<T> {
  return { success: false, warnings, errors };
}

export function mergeResults<T>(
  results: Result<unknown>[],
): { warnings: Warning[]; errors: GenerationError[]; statistics: Record<string, number> } {
  const warnings: Warning[] = [];
  const errors: GenerationError[] = [];
  const statistics: Record<string, number> = {};

  for (const result of results) {
    warnings.push(...result.warnings);
    errors.push(...result.errors);
    if (result.statistics) {
      for (const [key, value] of Object.entries(result.statistics)) {
        statistics[key] = (statistics[key] ?? 0) + value;
      }
    }
  }

  return { warnings, errors, statistics };
}
