import { generateText, stepCountIs } from "ai";
import { memoryTools } from "./tools.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { buildFiletree } from "./buildFiletree.js";
import { memoryAgentConfig } from "../../config.js";

export function runMemoryAgent(info: string): void {
  const filetree = buildFiletree();
  const system = buildSystemPrompt(filetree);

  generateText({
    model: memoryAgentConfig.model,
    system,
    messages: [{ role: "user", content: info }],
    tools: memoryTools,
    stopWhen: stepCountIs(memoryAgentConfig.maxSteps),
  }).catch((err) => console.error("[memory-agent]", err));
}
