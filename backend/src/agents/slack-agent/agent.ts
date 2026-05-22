import { slackAgentConfig } from "../../lib/config.js";
import { namespacesFor } from "../../lib/filesystem/namespaces.js";
import type { Agent } from "../../lib/agents/index.js";
import { runAgentInBackground } from "../../lib/agents/index.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";
import type { SlackThreadInvocation } from "../../features/slack/service.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { createSlackTools, type ReplyContext } from "./tools.js";

const AGENT_NAME = "slack-agent";

function createSlackAgent(replyContext: ReplyContext): Agent {
  return {
    name: AGENT_NAME,
    model: slackAgentConfig.model,
    maxSteps: slackAgentConfig.maxSteps,
    namespaces: namespacesFor(AGENT_NAME),
    tools: createSlackTools(replyContext),
    buildSystem: () => buildSystemPrompt(buildFiletree(AGENT_NAME)),
  };
}

/**
 * Run the slack-agent in the background for a single Slack thread mention.
 * Builds a per-invocation agent with a replyToSlack tool bound to this
 * thread's channel + threadTs, then fires the agent and returns immediately.
 */
export function runSlackAgentForThread(invocation: SlackThreadInvocation): void {
  const agent = createSlackAgent({
    channel: invocation.channel,
    threadTs: invocation.threadTs,
  });
  runAgentInBackground(agent, [
    { role: "user", content: buildUserPrompt(invocation) },
  ]);
}
