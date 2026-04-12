import { tool } from "ai";
import { z } from "zod";
import * as commands from "../../filesystem/commands.js";

const AGENT_NAME = "memory-agent";

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
    execute: ({ path }) => formatError(() => commands.cat(path, AGENT_NAME)),
  }),

  grep: tool({
    description:
      'Search file contents. args mirror "grep [-i] [-l] PATTERN [PATH]". Always use absolute paths.',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => formatError(() => commands.grep(args, AGENT_NAME)),
  }),

  write: tool({
    description:
      "Create or overwrite a file at PATH with CONTENT (absolute path).",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      formatError(() => commands.write(path, content, AGENT_NAME)),
  }),
};
