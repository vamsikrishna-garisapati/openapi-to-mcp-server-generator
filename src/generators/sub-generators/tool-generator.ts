import prettier from "prettier";
import type { ApiModel } from "../../ir/types.js";
import type { GeneratedFile } from "../../utils/result.js";
import { buildToolInputSchema } from "../schema-converter.js";
import { buildToolViewModel } from "../viewmodels/index.js";
import { createTemplateEngine, loadTemplate } from "../template-engine.js";
import { getTemplatesDir } from "../templates-path.js";

function toPascalCase(id: string): string {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function getAuthParamNames(api: ApiModel): string[] {
  const names = new Set<string>();
  for (const auth of api.authentication) {
    if (auth.type === "apiKey" && auth.location === "header") {
      names.add(auth.parameterName);
    }
  }
  return [...names];
}

function getBodyFields(endpoint: ApiModel["endpoints"][number]): string[] {
  if (!endpoint.requestBody?.schema) return [];
  if (
    endpoint.requestBody.schema.type === "object" &&
    endpoint.requestBody.schema.properties
  ) {
    return endpoint.requestBody.schema.properties.map((p) => p.name);
  }
  return [];
}

async function formatTs(content: string): Promise<string> {
  return prettier.format(content, { parser: "typescript", singleQuote: false });
}

export async function generateTools(api: ApiModel): Promise<GeneratedFile[]> {
  const engine = createTemplateEngine();
  const template = await loadTemplate("tool.hbs");
  const authParamNames = getAuthParamNames(api);
  const files: GeneratedFile[] = [];

  const sortedEndpoints = [...api.endpoints].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  for (const endpoint of sortedEndpoints) {
    const inputSchema = buildToolInputSchema(
      endpoint.parameters,
      endpoint.requestBody,
      authParamNames,
    );
    const vm = buildToolViewModel(endpoint, inputSchema, authParamNames);
    const bodyFields = getBodyFields(endpoint);

    const raw = await engine.render(template, {
      ...vm,
      pascalId: toPascalCase(endpoint.id),
      bodyFields,
    });
    const content = await formatTs(raw);
    files.push({ path: `src/tools/${endpoint.id}.ts`, content });
  }

  return files;
}

export async function generateToolTypes(): Promise<GeneratedFile> {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const templateDir = getTemplatesDir(import.meta.url);
  const content = await readFile(join(templateDir, "tool-types.ts"), "utf-8");
  return { path: "src/tools/types.ts", content };
}
