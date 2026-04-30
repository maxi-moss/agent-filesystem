import { tool } from "ai";
import { z } from "zod";
import { getCommands } from "../../lib/commands/index.js";
import { formatToolResult } from "../../lib/utils/formatting.js";

const AGENT_NAME = "memory-agent";

const grepSchema = z.object({
  pattern: z.string(),
  path: z.string().optional(),
  "-i": z.boolean().optional(),
  "-A": z.number().int().nonnegative().optional(),
  "-B": z.number().int().nonnegative().optional(),
  "-C": z.number().int().nonnegative().optional(),
  output_mode: z.enum(["content", "files_with_matches", "count"]).optional(),
  head_limit: z.number().int().positive().optional(),
});

export const memoryTools = {
  cat: tool({
    description: "Read the contents of a file at PATH (absolute path).",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatToolResult(() => getCommands().cat(path, AGENT_NAME)),
  }),

  grep: tool({
    description:
      "Search file contents for PATTERN under PATH (absolute path). Returns matched lines as `path:line:content`. Set `-i` for case-insensitive search. `-A`/`-B`/`-C` add N lines of after/before/around context. `output_mode` can be `content` (default), `files_with_matches`, or `count`. `head_limit` caps output lines.",
    inputSchema: grepSchema,
    execute: (opts) => formatToolResult(() => getCommands().grep(opts, AGENT_NAME)),
  }),

  write: tool({
    description:
      "Create or overwrite a file at PATH with CONTENT (absolute path).",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      formatToolResult(() => getCommands().write(path, content, AGENT_NAME)),
  }),
};
