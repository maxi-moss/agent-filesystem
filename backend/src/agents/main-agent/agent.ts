import { streamText, stepCountIs, type ModelMessage } from "ai";
import { fsTools } from "./tools.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { mainAgentConfig } from "../../config.js";

export function runMainAgent(messages: ModelMessage[]) {
  return streamText({
    model: mainAgentConfig.model,
    system: SYSTEM_PROMPT,
    messages,
    tools: fsTools,
    stopWhen: stepCountIs(mainAgentConfig.maxSteps),
  });
}
