import { tool } from "ai";
import { z } from "zod";
import { getCommands } from "../commands/index.js";
import { formatToolResult } from "../utils/formatting.js";

const grepSchema = z.object({
  pattern: z.string().describe("Regular expression matched against each line of file content."),
  path: z
    .string()
    .optional()
    .describe("Directory or file to search at or under. Defaults to the current directory."),
  "-i": z.boolean().optional().describe("Case-insensitive match. Omit for case-sensitive."),
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
  output_mode: z
    .enum(["content", "files_with_matches", "count"])
    .optional()
    .describe(
      "`content` (default) returns matching lines, `files_with_matches` returns paths only, `count` returns per-file match counts.",
    ),
  head_limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Cap the number of output lines. Omit for no cap."),
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
      description:
        "Read and return the full text contents of a single file at PATH (absolute, or relative to the current directory). Use when you already have a file's path and need its contents.",
      inputSchema: z.object({ path: z.string() }),
      execute: ({ path }) => formatToolResult(() => getCommands().cat(path, agent)),
    }),

  ls: (agent: string) =>
    tool({
      description:
        "List the direct children of the directory at PATH (absolute, or relative to the current directory; defaults to the current directory). Each line is `{updated-iso}  {name}`, most-recently-updated first; child directories end in `/` and show the freshest timestamp anywhere in their subtree. Use to see what exists one level under a directory.",
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
        "Recursively list files at or under PATH (absolute, or relative to the current directory), one `{updated-iso}  {path}` per line, most-recently-updated first. `namePattern` filters basenames by glob (e.g. `*.md`, `caching*`); `mtimeWithinDays`/`mtimeOlderThanDays` filter by recency (mutually exclusive). Use to locate files across a subtree by name or recency.",
      inputSchema: findSchema,
      execute: (opts) => formatToolResult(() => getCommands().find(opts, agent)),
    }),

  grep: (agent: string) =>
    tool({
      description:
        "Search file contents for PATTERN (a regular expression) at or under PATH (absolute, or relative to the current directory; defaults to the current directory). Returns matching lines as `path:line:content`. Use to find files by what they contain when you don't know their paths.",
      inputSchema: grepSchema,
      execute: (opts) => formatToolResult(() => getCommands().grep(opts, agent)),
    }),

  write: (agent: string) =>
    tool({
      description:
        "Create a new file or overwrite an existing one at PATH (absolute, or relative to the current directory) with CONTENT. Overwrites the entire file, so include everything it should contain. Returns a confirmation.",
      inputSchema: z.object({ path: z.string(), content: z.string() }),
      execute: ({ path, content }) =>
        formatToolResult(() => getCommands().write(path, content, agent)),
    }),

  cd: (agent: string) =>
    tool({
      description:
        "Change the current working directory to PATH (absolute, or relative to the current directory) so later relative paths resolve against it. Throws if the directory does not exist.",
      inputSchema: z.object({ path: z.string() }),
      execute: ({ path }) => formatToolResult(() => getCommands().cd(path, agent)),
    }),
};

