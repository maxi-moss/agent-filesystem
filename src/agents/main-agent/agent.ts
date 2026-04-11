import { generateText, stepCountIs, type ModelMessage } from "ai";
import { fsTools } from "./tools.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { mainAgentConfig } from "../../config.js";

export function createAgent() {
  return {
    async run(messages: ModelMessage[]) {
      const { text, steps } = await generateText({
        model: mainAgentConfig.model,
        system: SYSTEM_PROMPT,
        messages,
        tools: fsTools,
        stopWhen: stepCountIs(mainAgentConfig.maxSteps),
      });
      return { text, steps };
    },
  };
}
