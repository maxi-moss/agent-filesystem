import { memoryAgentConfig } from "../../lib/config.js";
import { namespacesFor } from "../../lib/filesystem/namespaces.js";
import type { Agent } from "../../lib/agents/index.js";
import { runAgentInBackground } from "../../lib/agents/index.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";
import { buildSystemPrompt } from "./prompts.js";
import { memoryTools } from "./tools.js";

const AGENT_NAME = "memory-agent";

export const memoryAgent = {
  name: AGENT_NAME,
  model: memoryAgentConfig.model,
  maxSteps: memoryAgentConfig.maxSteps,
  namespaces: namespacesFor(AGENT_NAME),
  tools: memoryTools,
  buildSystem: () => buildSystemPrompt(buildFiletree(AGENT_NAME)),
} satisfies Agent;

export function runMemoryAgent(info: string): void {
  runAgentInBackground(memoryAgent, [{ role: "user", content: info }]);
}
