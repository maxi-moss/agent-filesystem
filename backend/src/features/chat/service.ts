import { streamText, generateText, stepCountIs, type ModelMessage } from "ai";
import { mainAgentConfig, summarizerConfig } from "../../lib/config.js";
import { formatConversationForSummary } from "../../lib/utils/formatting.js";
import { fsTools } from "./tools.js";
import { MAIN_AGENT_PROMPT, SUMMARIZER_PROMPT } from "./prompts.js";

export function runMainAgent(messages: ModelMessage[]) {
  return streamText({
    model: mainAgentConfig.model,
    system: MAIN_AGENT_PROMPT,
    messages,
    tools: fsTools,
    stopWhen: stepCountIs(mainAgentConfig.maxSteps),
  });
}

/** Generate a summary of a conversation for long-term storage. */
export async function summarizeConversation(
  messages: ModelMessage[],
): Promise<string> {
  const transcript = formatConversationForSummary(messages);
  const { text } = await generateText({
    model: summarizerConfig.model,
    system: SUMMARIZER_PROMPT,
    prompt: transcript,
  });
  return text;
}
