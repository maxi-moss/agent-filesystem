import { filesystemTools } from "../../lib/tools/filesystem-tools.js";

const AGENT_NAME = "memory-agent";

export const memoryTools = {
  cat: filesystemTools.cat(AGENT_NAME),
  grep: filesystemTools.grep(AGENT_NAME),
  write: filesystemTools.write(AGENT_NAME),
};
