import { generateText, stepCountIs } from "ai";
import { newsAgentConfig } from "../../lib/config.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";
import {
  buildGeneralDiscoveryPrompt,
  buildSystemPrompt,
  buildTopicDiscoveryPrompt,
} from "./prompts.js";
import { newsTools } from "./tools.js";

const AGENT_NAME = "news-agent";

/**
 * Run the news agent in daily-discovery mode: surface the day's most important
 * stories across all categories and persist them to /news/. Intended for
 * scheduled or general runs (e.g. once per morning).
 */
export function runNewsAgentForDaily(): void {
  invokeNewsAgent(buildGeneralDiscoveryPrompt());
}

/**
 * Run the news agent in topic-discovery mode: surface today's most important
 * stories about `topic` and persist them to /news/. Intended for ad-hoc,
 * subject-specific runs (e.g. "OpenAI", "EU AI Act").
 */
export function runNewsAgentForTopic(topic: string): void {
  invokeNewsAgent(buildTopicDiscoveryPrompt(topic));
}

function invokeNewsAgent(userMessage: string): void {
  const filetree = buildFiletree(AGENT_NAME);
  const today = new Date().toISOString().slice(0, 10);
  const system = buildSystemPrompt(filetree, today);

  generateText({
    model: newsAgentConfig.model,
    system,
    messages: [{ role: "user", content: userMessage }],
    tools: newsTools,
    stopWhen: stepCountIs(newsAgentConfig.maxSteps),
  }).catch((err) => console.error("[news-agent]", err));
}
