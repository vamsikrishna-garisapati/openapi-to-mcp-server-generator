import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function getTemplatesDir(fromModuleUrl: string): string {
  const currentDir = dirname(fileURLToPath(fromModuleUrl));
  const segments = currentDir.split(/[/\\]/);
  const generatorsIndex = segments.lastIndexOf("generators");

  if (generatorsIndex === -1) {
    return join(currentDir, "templates");
  }

  const root = segments.slice(0, generatorsIndex).join("/");
  return join(root, "templates");
}
