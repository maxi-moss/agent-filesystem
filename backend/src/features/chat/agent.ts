import { mainAgentConfig } from "../../lib/config.js";
import { namespacesFor } from "../../lib/filesystem/namespaces.js";
import type { Agent } from "../../lib/agents/index.js";
import { MAIN_AGENT_PROMPT } from "./prompts.js";
import { fsTools } from "./tools.js";

const AGENT_NAME = "main-agent";

export const mainAgent = {
  name: AGENT_NAME,
  model: mainAgentConfig.model,
  maxSteps: mainAgentConfig.maxSteps,
  namespaces: namespacesFor(AGENT_NAME),
  tools: fsTools,
  buildSystem: () => MAIN_AGENT_PROMPT,
} satisfies Agent;
