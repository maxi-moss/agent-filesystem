import { filesystemTools } from "../../lib/tools/filesystem-tools.js";

const AGENT_NAME = "jira-agent";

export const jiraTools = {
  cat: filesystemTools.cat(AGENT_NAME),
  ls: filesystemTools.ls(AGENT_NAME),
  write: filesystemTools.write(AGENT_NAME),
};
