import { tool } from "ai";
import { z } from "zod";
import { getFilesystem } from "../../lib/filesystem/index.js";
import { formatToolResult } from "../../lib/utils/formatting.js";

const AGENT_NAME = "memory-agent";

export const memoryTools = {
  cat: tool({
    description: "Read the contents of a file at PATH (absolute path).",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatToolResult(() => getFilesystem().cat(path, AGENT_NAME)),
  }),

  grep: tool({
    description:
      'Search file contents. args mirror "grep [-i] [-l] PATTERN [PATH]". Always use absolute paths.',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => formatToolResult(() => getFilesystem().grep(args, AGENT_NAME)),
  }),

  write: tool({
    description:
      "Create or overwrite a file at PATH with CONTENT (absolute path).",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      formatToolResult(() => getFilesystem().write(path, content, AGENT_NAME)),
  }),
};
