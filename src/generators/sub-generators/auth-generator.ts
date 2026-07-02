import type { Authentication } from "../../ir/types.js";

export function generateAuthSource(authSchemes: readonly Authentication[]): string {
  if (authSchemes.length === 0) {
    return `import type { InternalAxiosRequestConfig } from "axios";

export function applyAuthentication(_config: InternalAxiosRequestConfig): void {
  // No authentication configured
}
`;
  }

  const lines: string[] = [
    `import type { InternalAxiosRequestConfig } from "axios";`,
    ``,
    `function getEnv(name: string): string {`,
    `  const value = process.env[name];`,
    `  if (!value) {`,
    `    throw new Error(\`Missing required environment variable: \${name}\`);`,
    `  }`,
    `  return value;`,
    `}`,
    ``,
    `export function applyAuthentication(config: InternalAxiosRequestConfig): void {`,
    `  if (!config.headers) {`,
    `    config.headers = {} as InternalAxiosRequestConfig["headers"];`,
    `  }`,
  ];

  for (const auth of authSchemes) {
    if (auth.type === "bearer") {
      lines.push(
        `  config.headers["Authorization"] = \`Bearer \${getEnv("${auth.envVariable}")}\`;`,
      );
    } else if (auth.location === "header") {
      lines.push(
        `  config.headers["${auth.parameterName}"] = getEnv("${auth.envVariable}");`,
      );
    } else if (auth.location === "query") {
      lines.push(
        `  config.params = { ...config.params, ${auth.parameterName}: getEnv("${auth.envVariable}") };`,
      );
    } else if (auth.location === "cookie") {
      lines.push(
        `  const existing = config.headers["Cookie"] ?? "";`,
        `  config.headers["Cookie"] = \`\${existing}; ${auth.parameterName}=\${getEnv("${auth.envVariable}")}\`;`,
      );
    }
  }

  lines.push(`}`);
  return lines.join("\n");
}
