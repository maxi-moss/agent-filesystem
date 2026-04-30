import { tool } from "ai";
import { z } from "zod";
import { getCommands } from "../../lib/commands/index.js";
import { formatToolResult } from "../../lib/utils/formatting.js";
import { runMemoryAgent } from "../../agents/memory-agent/index.js";

const AGENT_NAME = "main-agent";

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

const findSchema = z.object({
  path: z.string(),
  namePattern: z.string().optional(),
  mtimeWithinDays: z.number().int().nonnegative().optional(),
  mtimeOlderThanDays: z.number().int().nonnegative().optional(),
});

export const fsTools = {
  cat: tool({
    description: "Read the contents of a file at PATH.",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatToolResult(() => getCommands().cat(path, AGENT_NAME)),
  }),

  ls: tool({
    description:
      "List direct children of a directory. Each line is `{updated-iso}  {name}`, sorted by most-recently-updated first. Subdirectory timestamps reflect the freshest file inside the subtree. Defaults to the current working directory.",
    inputSchema: z.object({ path: z.string().optional() }),
    execute: ({ path }) =>
      formatToolResult(() => {
        const commands = getCommands();
        return commands.ls(path ?? commands.getCwd(), AGENT_NAME);
      }),
  }),

  cd: tool({
    description: "Change the current working directory.",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatToolResult(() => getCommands().cd(path, AGENT_NAME)),
  }),

  grep: tool({
    description:
      "Search file contents for PATTERN under PATH. Returns matched lines as `path:line:content`. Set `-i` for case-insensitive search. `-A`/`-B`/`-C` add N lines of after/before/around context (rendered with `-` separators). `output_mode` can be `content` (default), `files_with_matches`, or `count`. `head_limit` caps the number of output lines.",
    inputSchema: grepSchema,
    execute: (opts) => formatToolResult(() => getCommands().grep(opts, AGENT_NAME)),
  }),

  find: tool({
    description:
      "Find files under PATH. Each line is `{updated-iso}  {path}`. `namePattern` filters basenames by glob (`*.md`, `caching*`). `mtimeWithinDays: N` keeps files updated within the last N days; `mtimeOlderThanDays: N` keeps files older than N days (mutually exclusive).",
    inputSchema: findSchema,
    execute: (opts) => formatToolResult(() => getCommands().find(opts, AGENT_NAME)),
  }),

  write: tool({
    description: "Create or overwrite a file at PATH with CONTENT.",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      formatToolResult(() => getCommands().write(path, content, AGENT_NAME)),
  }),

  memorize: tool({
    description:
      "Store information to long-term memory. A background agent deduplicates and cross-links automatically. Fire-and-forget — returns immediately.",
    inputSchema: z.object({
      info: z.string().describe("Natural-language statement of what to remember."),
    }),
    execute: ({ info }) => {
      runMemoryAgent(info);
      return { ok: true as const, output: "Memorizing in background." };
    },
  }),
};
