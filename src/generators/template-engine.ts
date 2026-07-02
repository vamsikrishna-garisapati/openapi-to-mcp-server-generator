import Handlebars from "handlebars";
import { getTemplatesDir } from "./templates-path.js";

export interface TemplateEngine {
  render(template: string, model: unknown): Promise<string>;
}

export function createTemplateEngine(): TemplateEngine {
  return {
    async render(template: string, model: unknown): Promise<string> {
      const compiled = Handlebars.compile(template, { noEscape: true });
      return compiled(model);
    },
  };
}

export async function loadTemplate(path: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const templateDir = getTemplatesDir(import.meta.url);
  return readFile(join(templateDir, path), "utf-8");
}
