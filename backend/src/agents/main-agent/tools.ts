import { tool } from "ai";
import { z } from "zod";
import * as commands from "../../filesystem/commands.js";
import { runMemoryAgent } from "../memory-agent/index.js";

const AGENT_NAME = "main-agent";

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

export const fsTools = {
  cat: tool({
    description: "Read the contents of a file at PATH.",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatError(() => commands.cat(path, AGENT_NAME)),
  }),

  ls: tool({
    description: "List direct children of a directory. Defaults to the current working directory.",
    inputSchema: z.object({ path: z.string().optional() }),
    execute: ({ path }) =>
      formatError(() => commands.ls(path ?? commands.getCwd(), AGENT_NAME)),
  }),

  cd: tool({
    description: "Change the current working directory.",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatError(() => commands.cd(path, AGENT_NAME)),
  }),

  grep: tool({
    description: 'Search file contents. args mirror "grep [-i] [-l] PATTERN [PATH]".',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => formatError(() => commands.grep(args, AGENT_NAME)),
  }),

  find: tool({
    description: 'Find files by name. args mirror "find PATH [-name PATTERN]".',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => formatError(() => commands.find(args, AGENT_NAME)),
  }),

  write: tool({
    description: "Create or overwrite a file at PATH with CONTENT.",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      formatError(() => commands.write(path, content, AGENT_NAME)),
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
