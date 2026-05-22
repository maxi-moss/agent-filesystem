import { tool } from "ai";
import { z } from "zod";
import { filesystemTools } from "../../lib/tools/filesystem-tools.js";
import { formatAsyncToolResult } from "../../lib/utils/formatting.js";
import { postSlackMessage } from "../../features/slack/api.js";

const AGENT_NAME = "slack-agent";

export interface ReplyContext {
  channel: string;
  threadTs: string;
}

/**
 * Build the slack-agent's tool set for a single invocation. The returned set
 * captures `replyContext` in a closure so each parallel run posts to its own
 * thread without cross-talk.
 */
export function createSlackTools(replyContext: ReplyContext) {
  return {
    cat: filesystemTools.cat(AGENT_NAME),
    ls: filesystemTools.ls(AGENT_NAME),
    find: filesystemTools.find(AGENT_NAME),
    grep: filesystemTools.grep(AGENT_NAME),
    write: filesystemTools.write(AGENT_NAME),
    replyToSlack: tool({
      description:
        "Post a short prose message back to the Slack thread that invoked you. Call this exactly once, as your final action, summarising what you saved.",
      inputSchema: z.object({
        text: z
          .string()
          .min(1)
          .describe("A short prose message to post in the Slack thread."),
      }),
      execute: ({ text }) =>
        formatAsyncToolResult(async () => {
          await postSlackMessage(replyContext.channel, replyContext.threadTs, text);
          return "Reply posted.";
        }),
    }),
  };
}
