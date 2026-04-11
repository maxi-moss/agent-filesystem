import { tool } from "ai";
import { z } from "zod";
import * as commands from "../../filesystem/commands.js";
import * as db from "../../filesystem/db.js";

type ToolResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

function formatError(fn: () => string): ToolResult {
  try {
    return { ok: true, output: fn() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export const memoryTools = {
  cat: tool({
    description: "Read the contents of a file at PATH (absolute path).",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatError(() => commands.cat(path)),
  }),

  grep: tool({
    description:
      'Search file contents. args mirror "grep [-i] [-l] PATTERN [PATH]". Always use absolute paths.',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => formatError(() => commands.grep(args)),
  }),

  write: tool({
    description:
      "Create or overwrite a file at PATH with CONTENT (absolute path).",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      formatError(() => {
        db.upsert(path, content);
        return `Wrote to ${path}`;
      }),
  }),
};
