#!/usr/bin/env node
import { Command } from "commander";
import { createOrchestrator } from "./orchestrator/index.js";

const program = new Command();

program
  .name("openapi-mcp-gen")
  .description("Compile MCP server projects from OpenAPI specifications (OpenAPI MCP Server Compiler)")
  .version("1.0.0");

program
  .command("generate")
  .description("Generate an MCP server ZIP from an OpenAPI spec")
  .requiredOption("-i, --input <path>", "Path to OpenAPI JSON or YAML file")
  .option("-o, --output <path>", "Output ZIP file path", "./mcp-server.zip")
  .option("-n, --project-name <name>", "Override generated project name")
  .action(async (options: { input: string; output: string; projectName?: string }) => {
    const orchestrator = createOrchestrator();
    const result = await orchestrator.run(
      { type: "file", path: options.input },
      { projectName: options.projectName, outputPath: options.output },
    );

    if (!result.success) {
      for (const err of result.errors) {
        console.error(`[${err.code}] ${err.message}${err.location ? ` (${err.location})` : ""}`);
      }
      process.exit(1);
    }

    for (const warn of result.warnings) {
      console.warn(`[${warn.code}] ${warn.message}${warn.location ? ` (${warn.location})` : ""}`);
    }

    console.log(`Generated: ${options.output} (${result.data!.size} bytes)`);
  });

program.parse();
