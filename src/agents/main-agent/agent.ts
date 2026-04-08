import { generateText, stepCountIs, type ModelMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { fsTools } from "./tools.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { agentConfig } from "../../config.js";

export function createAgent() {
  const model = anthropic(agentConfig.model);

  return {
    async run(messages: ModelMessage[]) {
      const { text, steps } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        messages,
        tools: fsTools,
        stopWhen: stepCountIs(agentConfig.maxSteps),
      });
      return { text, steps };
    },
  };
}
