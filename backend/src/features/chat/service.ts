import { generateText, type ModelMessage } from "ai";
import { summarizerConfig } from "../../lib/config.js";
import { runAgent } from "../../lib/agents/index.js";
import { formatConversationForSummary } from "../../lib/utils/formatting.js";
import { mainAgent } from "./agent.js";
import { SUMMARIZER_PROMPT } from "./prompts.js";

export function runMainAgent(messages: ModelMessage[], runId?: string) {
  return runAgent(mainAgent, messages, { runId });
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
