import { tool } from "ai";
import { z } from "zod";
import { getCommands } from "../../lib/commands/index.js";
import { formatToolResult } from "../../lib/utils/formatting.js";
import { runMemoryAgent } from "../../agents/memory-agent/index.js";

const AGENT_NAME = "main-agent";

export const fsTools = {
  cat: tool({
    description: "Read the contents of a file at PATH.",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => formatToolResult(() => getCommands().cat(path, AGENT_NAME)),
  }),

  ls: tool({
    description: "List direct children of a directory. Defaults to the current working directory.",
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
    description: 'Search file contents. args mirror "grep [-i] [-l] PATTERN [PATH]".',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => formatToolResult(() => getCommands().grep(args, AGENT_NAME)),
  }),

  find: tool({
    description: 'Find files by name. args mirror "find PATH [-name PATTERN]".',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => formatToolResult(() => getCommands().find(args, AGENT_NAME)),
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
