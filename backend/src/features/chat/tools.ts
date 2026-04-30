import { tool } from "ai";
import { z } from "zod";
import { filesystemTools } from "../../lib/tools/filesystem-tools.js";
import { runMemoryAgent } from "../../agents/memory-agent/index.js";

const AGENT_NAME = "main-agent";

export const fsTools = {
  cat: filesystemTools.cat(AGENT_NAME),
  ls: filesystemTools.ls(AGENT_NAME),
  cd: filesystemTools.cd(AGENT_NAME),
  find: filesystemTools.find(AGENT_NAME),
  grep: filesystemTools.grep(AGENT_NAME),
  write: filesystemTools.write(AGENT_NAME),

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
