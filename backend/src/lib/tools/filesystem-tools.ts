import { tool } from "ai";
import { z } from "zod";
import { getCommands } from "../commands/index.js";
import { formatToolResult } from "../utils/formatting.js";

const grepSchema = z.object({
  pattern: z.string(),
  path: z.string().optional(),
  "-i": z.boolean().optional(),
  "-A": z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Lines of context to show after each match. Omit for no context. e.g. 3"),
  "-B": z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Lines of context to show before each match. Omit for no context. e.g. 3"),
  "-C": z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Lines of context before and after each match; shorthand for -A and -B together. Cannot be combined with -A or -B. Omit for no context. e.g. 3",
    ),
  output_mode: z.enum(["content", "files_with_matches", "count"]).optional(),
  head_limit: z.number().int().positive().optional(),
});

const findSchema = z.object({
  path: z.string(),
  namePattern: z.string().optional(),
  mtimeWithinDays: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Keep files modified within the last N days. Mutually exclusive with mtimeOlderThanDays. Omit to not filter by time. e.g. 7",
    ),
  mtimeOlderThanDays: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Keep files older than N days. Mutually exclusive with mtimeWithinDays. Omit to not filter by time. e.g. 30",
    ),
});

/**
 * Factories for the filesystem-backed agent tools. Each factory takes the
 * calling agent's name and returns an AI-SDK `tool` bound to that namespace.
 * Each agent's `tools.ts` picks the subset it needs by calling these directly.
 */
export const filesystemTools = {
  cat: (agent: string) =>
    tool({
      description: "Read the contents of a file at PATH (absolute path).",
      inputSchema: z.object({ path: z.string() }),
      execute: ({ path }) => formatToolResult(() => getCommands().cat(path, agent)),
    }),

  ls: (agent: string) =>
    tool({
      description:
        "List direct children of a directory (absolute path). Each line is `{updated-iso}  {name}`, sorted by most-recently-updated first. Subdirectory timestamps reflect the freshest file inside the subtree. Defaults to the current working directory.",
      inputSchema: z.object({ path: z.string().optional() }),
      execute: ({ path }) =>
        formatToolResult(() => {
          const commands = getCommands();
          return commands.ls(path ?? commands.getCwd(), agent);
        }),
    }),

  find: (agent: string) =>
    tool({
      description:
        "Find files under PATH (absolute path). Each line is `{updated-iso}  {path}`. `namePattern` filters basenames by glob (`*.md`, `caching*`). `mtimeWithinDays: N` keeps files updated within the last N days; `mtimeOlderThanDays: N` keeps files older than N days (mutually exclusive).",
      inputSchema: findSchema,
      execute: (opts) => formatToolResult(() => getCommands().find(opts, agent)),
    }),

  grep: (agent: string) =>
    tool({
      description:
        "Search file contents for PATTERN under PATH (absolute path). Returns matched lines as `path:line:content`. Set `-i` for case-insensitive search. `-A`/`-B`/`-C` add N lines of after/before/around context (rendered with `-` separators). `output_mode` can be `content` (default), `files_with_matches`, or `count`. `head_limit` caps the number of output lines.",
      inputSchema: grepSchema,
      execute: (opts) => formatToolResult(() => getCommands().grep(opts, agent)),
    }),

  write: (agent: string) =>
    tool({
      description:
        "Create or overwrite a file at PATH with CONTENT (absolute path).",
      inputSchema: z.object({ path: z.string(), content: z.string() }),
      execute: ({ path, content }) =>
        formatToolResult(() => getCommands().write(path, content, agent)),
    }),

  cd: (agent: string) =>
    tool({
      description: "Change the current working directory.",
      inputSchema: z.object({ path: z.string() }),
      execute: ({ path }) => formatToolResult(() => getCommands().cd(path, agent)),
    }),
};

