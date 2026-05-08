import { jiraAgentConfig } from "../../lib/config.js";
import { namespacesFor } from "../../lib/filesystem/namespaces.js";
import type { Agent } from "../../lib/agents/index.js";
import { runAgentInBackground } from "../../lib/agents/index.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";
import {
  buildIssueCommentPrompt,
  buildSystemPrompt,
  type CommentInput,
} from "./prompts.js";
import { jiraTools } from "./tools.js";

const AGENT_NAME = "jira-agent";

export const jiraAgent = {
  name: AGENT_NAME,
  model: jiraAgentConfig.model,
  maxSteps: jiraAgentConfig.maxSteps,
  namespaces: namespacesFor(AGENT_NAME),
  tools: jiraTools,
  buildSystem: () => buildSystemPrompt(buildFiletree(AGENT_NAME)),
} satisfies Agent;

/**
 * Run the Jira agent for a single issue, handing it the full current comment
 * thread. The agent decides how to curate /jira/{issueKey}/comments.md.
 */
export function runJiraAgentForIssue(input: {
  issueKey: string;
  commentThread: readonly CommentInput[];
}): void {
  runAgentInBackground(jiraAgent, [
    { role: "user", content: buildIssueCommentPrompt(input) },
  ]);
}
