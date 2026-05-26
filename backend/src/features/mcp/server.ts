import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runQuery, getFullFileContents } from "./service.js";

const QUERY_DESCRIPTION =
  "Answer a natural-language question by searching and synthesizing the organization's accumulated knowledge. Covers Jira tickets (status, assignees, descriptions, curated comments), Slack thread context and decisions, long-term memories, curated news, and free-form notes. Returns a concise prose answer followed by a '## Sources' section listing the file paths used. Use this first for any open-ended question. Do NOT use it when you already have exact file paths and need verbatim content — use get_full_file_contents instead.";

const GET_FILES_DESCRIPTION =
  "Return the full, verbatim contents of files by exact path. Use this when a query answer's Sources section (or a prior result) referenced files whose complete detail you now need. Input is an array of exact absolute file paths; directories are not expanded. Returns each file's path, full content, and last-updated timestamp. For open-ended questions, use query instead.";

/**
 * Build the MCP server with the query and get_full_file_contents tools
 * registered. Caller is responsible for connecting a transport.
 */
export function createMcpServer() {
  const server = new McpServer({ name: "agent-filesystem", version: "1.0.0" });

  server.registerTool(
    "query",
    {
      title: "Search & synthesize knowledge base",
      description: QUERY_DESCRIPTION,
      inputSchema: {
        query: z
          .string()
          .describe(
            "A natural-language question, e.g. 'What did we decide about the caching system?' or 'What is assigned to John Doe right now?'",
          ),
      },
    },
    async ({ query }) => {
      try {
        const answer = await runQuery(query);
        return { content: [{ type: "text", text: answer }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `query failed: ${describeError(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_full_file_contents",
    {
      title: "Fetch full file contents",
      description: GET_FILES_DESCRIPTION,
      inputSchema: {
        paths: z
          .array(z.string())
          .describe(
            "Exact absolute file paths, typically taken from the Sources section of a query answer.",
          ),
      },
      outputSchema: {
        files: z.array(
          z.object({
            path: z.string(),
            content: z.string(),
            updated: z.string(),
          }),
        ),
      },
    },
    async ({ paths }) => {
      try {
        const files = getFullFileContents(paths);
        return {
          content: [{ type: "text", text: JSON.stringify({ files }) }],
          structuredContent: { files },
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `get_full_file_contents failed: ${describeError(error)}` },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
