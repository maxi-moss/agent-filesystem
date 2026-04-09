import { generateText, stepCountIs, type ModelMessage } from "ai";
import { fsTools } from "./tools.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { agentConfig } from "../../config.js";

export function createAgent() {
  return {
    async run(messages: ModelMessage[]) {
      const { text, steps } = await generateText({
        model: agentConfig.model,
        system: SYSTEM_PROMPT,
        messages,
        tools: fsTools,
        stopWhen: stepCountIs(agentConfig.maxSteps),
      });
      return { text, steps };
    },
  };
}
