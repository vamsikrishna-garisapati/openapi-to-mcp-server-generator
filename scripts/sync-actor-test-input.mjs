#!/usr/bin/env node
/**
 * Sync Apify automated-test input from the Petstore fixture into:
 * - .actor/input_schema.json (prefill + default for platform/API runs)
 * - storage/key_value_stores/default/INPUT.json (local apify run)
 *
 * prefill  → Console UI only
 * default  → injected when a field is omitted (API, scheduler, automated tests)
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const petstorePath = join(root, "tests/fixtures/openapi/petstore.yaml");
const schemaPath = join(root, ".actor/input_schema.json");
const inputPath = join(root, "storage/key_value_stores/default/INPUT.json");

const openApiSpec = await readFile(petstorePath, "utf-8");
const testInput = {
  openApiSpec,
  format: "yaml",
  projectName: "petstore-mcp",
};

const schema = JSON.parse(await readFile(schemaPath, "utf-8"));

schema.properties.openApiSpec.prefill = openApiSpec;
schema.properties.openApiSpec.default = openApiSpec;
schema.properties.openApiSpec.example = openApiSpec;

schema.properties.format.prefill = "yaml";
schema.properties.format.default = "yaml";
schema.properties.format.example = "yaml";

schema.properties.projectName.prefill = "petstore-mcp";
schema.properties.projectName.default = "petstore-mcp";
schema.properties.projectName.example = "petstore-mcp";

// Defaults satisfy automated tests; handler still rejects empty user-provided values.
delete schema.required;

await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
await writeFile(inputPath, `${JSON.stringify(testInput, null, 2)}\n`);

console.log("Synced Apify test input from tests/fixtures/openapi/petstore.yaml");
