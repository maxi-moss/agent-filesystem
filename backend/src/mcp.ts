import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { dbConfig } from "./lib/config.js";
import { createFilesystem } from "./lib/filesystem/index.js";
import { createCommands } from "./lib/commands/index.js";
import { createMcpServer } from "./features/mcp/index.js";

createCommands(createFilesystem(dbConfig.path));

async function main(): Promise<void> {
  const server: McpServer = createMcpServer();
  await server.connect(new StdioServerTransport());
  console.error("[mcp] agent-filesystem MCP server ready on stdio");
}

main().catch((error: unknown) => {
  console.error("[mcp] failed to start", error);
  process.exit(1);
});
