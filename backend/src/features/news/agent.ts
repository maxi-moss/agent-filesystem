import { generateText, stepCountIs } from "ai";
import { newsAgentConfig } from "../../lib/config.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { newsTools } from "./tools.js";

const AGENT_NAME = "news-agent";
const DEFAULT_PROMPT =
  "Discover today's most important news and store the key items under /news/.";

export function runNewsAgent(topic?: string): void {
  const filetree = buildFiletree(AGENT_NAME);
  const today = new Date().toISOString().slice(0, 10);
  const system = buildSystemPrompt(filetree, today);
  const userMessage = topic ? `${DEFAULT_PROMPT} Focus on: ${topic}.` : DEFAULT_PROMPT;

  generateText({
    model: newsAgentConfig.model,
    system,
    messages: [{ role: "user", content: userMessage }],
    tools: newsTools,
    stopWhen: stepCountIs(newsAgentConfig.maxSteps),
  }).catch((err) => console.error("[news-agent]", err));
}
