import { generateText, stepCountIs } from "ai";
import { memoryAgentConfig } from "../../lib/config.js";
import { memoryTools } from "./tools.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";

const AGENT_NAME = "memory-agent";

export function runMemoryAgent(info: string): void {
  const filetree = buildFiletree(AGENT_NAME);
  const system = buildSystemPrompt(filetree);

  generateText({
    model: memoryAgentConfig.model,
    system,
    messages: [{ role: "user", content: info }],
    tools: memoryTools,
    stopWhen: stepCountIs(memoryAgentConfig.maxSteps),
  }).catch((err) => console.error("[memory-agent]", err));
}
