import type { ApiModel } from "../../ir/types.js";
import type { GeneratedFile } from "../../utils/result.js";
import { createTemplateEngine, loadTemplate } from "../template-engine.js";
import { generateAuthSource } from "./auth-generator.js";
import { DEPENDENCY_VERSIONS, NODE_VERSION } from "../dependency-versions.js";
import { buildEnvVariables } from "../viewmodels/index.js";
import { slugify } from "../../utils/strings.js";

function toPascalCase(id: string): string {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export async function generateIndex(
  api: ApiModel,
  projectSlug: string,
  tools: { id: string; name: string }[],
): Promise<GeneratedFile> {
  const engine = createTemplateEngine();
  const template = await loadTemplate("index.hbs");
  const sortedTools = [...tools].sort((a, b) => a.id.localeCompare(b.id));
  const content = await engine.render(template, {
    projectSlug,
    version: api.info.version,
    tools: sortedTools.map((t) => ({
      ...t,
      pascalId: toPascalCase(t.id),
    })),
    firstToolPascalId: sortedTools.length > 0 ? toPascalCase(sortedTools[0].id) : "Tool",
  });
  const prettier = await import("prettier");
  return {
    path: "src/index.ts",
    content: await prettier.default.format(content, { parser: "typescript" }),
  };
}

export async function generateClient(): Promise<GeneratedFile> {
  const engine = createTemplateEngine();
  const template = await loadTemplate("client.hbs");
  const content = await engine.render(template, {});
  const prettier = await import("prettier");
  return {
    path: "src/client.ts",
    content: await prettier.default.format(content, { parser: "typescript" }),
  };
}

export async function generateAuth(api: ApiModel): Promise<GeneratedFile> {
  const content = generateAuthSource(api.authentication);
  const prettier = await import("prettier");
  return {
    path: "src/auth/auth.ts",
    content: await prettier.default.format(content, { parser: "typescript" }),
  };
}

export async function generateConfig(api: ApiModel): Promise<GeneratedFile> {
  const requiresBaseUrl = api.server.baseUrl === "";
  const baseUrlExpression = requiresBaseUrl
    ? 'requireEnv("BASE_URL")'
    : JSON.stringify(api.server.baseUrl);
  const engine = createTemplateEngine();
  const template = await loadTemplate("config.hbs");
  const content = await engine.render(template, { baseUrlExpression });
  const prettier = await import("prettier");
  return {
    path: "src/config.ts",
    content: await prettier.default.format(content, { parser: "typescript" }),
  };
}

export async function generatePackage(
  api: ApiModel,
  projectSlug: string,
): Promise<GeneratedFile> {
  const engine = createTemplateEngine();
  const template = await loadTemplate("package.hbs");
  const content = await engine.render(template, {
    projectSlug,
    description: api.info.description ?? api.info.title,
    nodeVersion: NODE_VERSION,
    mcpSdkVersion: DEPENDENCY_VERSIONS["@modelcontextprotocol/sdk"],
    axiosVersion: DEPENDENCY_VERSIONS.axios,
    typescriptVersion: DEPENDENCY_VERSIONS.typescript,
    typesNodeVersion: DEPENDENCY_VERSIONS["@types/node"],
    prettierVersion: DEPENDENCY_VERSIONS.prettier,
  });
  return { path: "package.json", content };
}

export async function generateTsConfig(): Promise<GeneratedFile> {
  const engine = createTemplateEngine();
  const template = await loadTemplate("tsconfig.hbs");
  const content = await engine.render(template, {});
  return { path: "tsconfig.json", content };
}

export async function generateDockerfile(): Promise<GeneratedFile> {
  const engine = createTemplateEngine();
  const template = await loadTemplate("dockerfile.hbs");
  const content = await engine.render(template, { nodeVersion: NODE_VERSION });
  return { path: "Dockerfile", content };
}

export async function generateReadme(
  api: ApiModel,
  projectSlug: string,
  tools: { id: string; name: string; description: string }[],
): Promise<GeneratedFile> {
  const engine = createTemplateEngine();
  const template = await loadTemplate("readme.hbs");
  const requiresBaseUrl = api.server.baseUrl === "";
  const envVariables = buildEnvVariables(api.authentication, requiresBaseUrl);
  const content = await engine.render(template, {
    title: api.info.title,
    description: api.info.description ?? api.info.title,
    projectSlug,
    envVariables,
    tools: [...tools].sort((a, b) => a.name.localeCompare(b.name)),
  });
  return { path: "README.md", content };
}

export async function generateEnvExample(api: ApiModel): Promise<GeneratedFile> {
  const engine = createTemplateEngine();
  const template = await loadTemplate("env.hbs");
  const requiresBaseUrl = api.server.baseUrl === "";
  const envVariables = buildEnvVariables(api.authentication, requiresBaseUrl);
  const content = await engine.render(template, { envVariables });
  return { path: ".env.example", content };
}

export function resolveProjectSlug(api: ApiModel, override?: string): string {
  return slugify(override ?? api.info.title);
}
