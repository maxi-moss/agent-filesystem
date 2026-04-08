import { tool } from "ai";
import { z } from "zod";
import * as commands from "../../filesystem/commands.js";
import * as db from "../../filesystem/db.js";

type ToolResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

function wrap(fn: () => string): ToolResult {
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
    execute: ({ path }) => wrap(() => commands.cat(path)),
  }),

  ls: tool({
    description: "List direct children of a directory. Defaults to the current working directory.",
    inputSchema: z.object({ path: z.string().optional() }),
    execute: ({ path }) => wrap(() => commands.ls(path ?? commands.getCwd())),
  }),

  cd: tool({
    description: "Change the current working directory.",
    inputSchema: z.object({ path: z.string() }),
    execute: ({ path }) => wrap(() => commands.cd(path)),
  }),

  grep: tool({
    description: 'Search file contents. args mirror "grep [-i] [-l] PATTERN [PATH]".',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => wrap(() => commands.grep(args)),
  }),

  find: tool({
    description: 'Find files by name. args mirror "find PATH [-name PATTERN]".',
    inputSchema: z.object({ args: z.array(z.string()) }),
    execute: ({ args }) => wrap(() => commands.find(args)),
  }),

  write: tool({
    description: "Create or overwrite a file at PATH with CONTENT.",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
    execute: ({ path, content }) =>
      wrap(() => {
        db.upsert(path, content);
        return `Wrote to ${path}`;
      }),
  }),
};
