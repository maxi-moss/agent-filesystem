import { z } from "zod";
import { slackConfig } from "../../lib/config.js";

const SLACK_API_BASE = "https://slack.com/api";

const slackMessage = z.object({
  user: z.string().optional(),
  bot_id: z.string().optional(),
  text: z.string().optional(),
  ts: z.string(),
  thread_ts: z.string().optional(),
  subtype: z.string().optional(),
});

const conversationsRepliesResponse = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  messages: z.array(slackMessage).optional(),
  has_more: z.boolean().optional(),
  response_metadata: z.object({ next_cursor: z.string().optional() }).optional(),
});

const usersInfoResponse = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  user: z
    .object({
      id: z.string(),
      profile: z
        .object({
          display_name: z.string().optional(),
          real_name: z.string().optional(),
        })
        .optional(),
      real_name: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

const chatGetPermalinkResponse = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  permalink: z.string().optional(),
});

const chatPostMessageResponse = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  ts: z.string().optional(),
});

export type SlackMessage = z.infer<typeof slackMessage>;

/**
 * Fetch all replies in a Slack thread, following pagination. Throws when the
 * bot token is unconfigured or when the API responds with `ok: false`.
 */
export async function fetchSlackThread(
  channel: string,
  threadTs: string,
): Promise<SlackMessage[]> {
  const messages: SlackMessage[] = [];
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams({ channel, ts: threadTs, limit: "200" });
    if (cursor) params.set("cursor", cursor);
    const parsed = conversationsRepliesResponse.parse(
      await slackGet("conversations.replies", params),
    );
    if (!parsed.ok) {
      throw new Error(`conversations.replies failed: ${parsed.error}`);
    }
    messages.push(...(parsed.messages ?? []));
    cursor = parsed.has_more ? parsed.response_metadata?.next_cursor : undefined;
  } while (cursor);
  return messages;
}

/** Look up a Slack user's display/real name by user ID. */
export async function fetchSlackUser(userId: string): Promise<string> {
  const params = new URLSearchParams({ user: userId });
  const parsed = usersInfoResponse.parse(await slackGet("users.info", params));
  if (!parsed.ok) {
    throw new Error(`users.info failed for ${userId}: ${parsed.error}`);
  }
  const profile = parsed.user?.profile;
  return (
    profile?.display_name?.trim() ||
    profile?.real_name?.trim() ||
    parsed.user?.real_name?.trim() ||
    parsed.user?.name?.trim() ||
    userId
  );
}

/** Build a permalink URL for a Slack message. */
export async function fetchSlackPermalink(
  channel: string,
  messageTs: string,
): Promise<string> {
  const params = new URLSearchParams({ channel, message_ts: messageTs });
  const parsed = chatGetPermalinkResponse.parse(
    await slackGet("chat.getPermalink", params),
  );
  if (!parsed.ok || !parsed.permalink) {
    throw new Error(`chat.getPermalink failed: ${parsed.error ?? "no permalink"}`);
  }
  return parsed.permalink;
}

/** Post a message to a Slack channel, optionally as a reply in a thread. */
export async function postSlackMessage(
  channel: string,
  threadTs: string,
  text: string,
): Promise<void> {
  const parsed = chatPostMessageResponse.parse(
    await slackPost("chat.postMessage", { channel, thread_ts: threadTs, text }),
  );
  if (!parsed.ok) throw new Error(`chat.postMessage failed: ${parsed.error}`);
}

async function slackGet(method: string, params: URLSearchParams): Promise<unknown> {
  const token = requireToken();
  const response = await fetch(`${SLACK_API_BASE}/${method}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Slack ${method} HTTP ${response.status}`);
  }
  return response.json();
}

async function slackPost(method: string, body: object): Promise<unknown> {
  const token = requireToken();
  const response = await fetch(`${SLACK_API_BASE}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Slack ${method} HTTP ${response.status}`);
  }
  return response.json();
}

function requireToken(): string {
  if (!slackConfig.botToken) {
    throw new Error("Slack bot token is not configured (SLACK_BOT_TOKEN)");
  }
  return slackConfig.botToken;
}
