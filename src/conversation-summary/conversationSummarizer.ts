import { generateText, type ModelMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { summarizerConfig } from "../config.js";
import { SUMMARIZER_SYSTEM_PROMPT } from "./systemPrompt.js";
import { formatConversationForSummary } from "./formatConversation.js";

/** Generate a summary of a conversation. */
export async function summarizeConversation(
  messages: ModelMessage[],
): Promise<string> {
  const transcript = formatConversationForSummary(messages);

  const { text } = await generateText({
    model: anthropic(summarizerConfig.model),
    system: SUMMARIZER_SYSTEM_PROMPT,
    prompt: transcript,
  });
  return text;
}
