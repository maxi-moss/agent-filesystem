import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { slackConfig } from "../../lib/config.js";
import { runSlackAgentForThread } from "../../agents/slack-agent/index.js";
import {
  fetchSlackPermalink,
  fetchSlackThread,
  fetchSlackUser,
  type SlackMessage,
} from "./api.js";
import { SlackSignatureError } from "./errors.js";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const slackAppMentionEvent = z.object({
  type: z.literal("app_mention"),
  user: z.string(),
  text: z.string(),
  ts: z.string(),
  channel: z.string(),
  thread_ts: z.string().optional(),
});

const slackUrlVerification = z.object({
  type: z.literal("url_verification"),
  challenge: z.string(),
});

const slackEventCallback = z.object({
  type: z.literal("event_callback"),
  event: z.unknown(),
});

export interface ReadableMessage {
  user: string;
  timestamp: string;
  text: string;
}

export interface SlackThreadInvocation {
  channel: string;
  threadTs: string;
  permalink: string;
  invokerInstruction: string;
  thread: readonly ReadableMessage[];
}

/**
 * Verify an inbound Slack request signature. Slack signs with HMAC-SHA256 over
 * `v0:{timestamp}:{rawBody}` using the signing secret. Throws on missing
 * config/headers, replay-window violation, or signature mismatch.
 */
export function verifySlackSignature(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
): void {
  const secret = slackConfig.signingSecret;
  if (!secret) throw new SlackSignatureError("signing secret is not configured");
  if (!timestampHeader) {
    throw new SlackSignatureError("missing X-Slack-Request-Timestamp");
  }
  if (!signatureHeader) {
    throw new SlackSignatureError("missing X-Slack-Signature");
  }

  const timestampSeconds = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestampSeconds)) {
    throw new SlackSignatureError("malformed X-Slack-Request-Timestamp");
  }
  if (Math.abs(Date.now() - timestampSeconds * 1000) > FIVE_MINUTES_MS) {
    throw new SlackSignatureError("timestamp outside replay window");
  }

  const expected = `v0=${createHmac("sha256", secret)
    .update(`v0:${timestampHeader}:${rawBody}`, "utf8")
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signatureHeader);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new SlackSignatureError("signature mismatch");
  }
}

/**
 * Return the challenge string if the payload is a `url_verification` event, or
 * null otherwise. Slack sends this once on URL registration, unsigned, and
 * expects the challenge echoed back. Must be handled before signature
 * verification.
 */
export function handleUrlVerification(payload: unknown): string | null {
  const parsed = slackUrlVerification.safeParse(payload);
  return parsed.success ? parsed.data.challenge : null;
}

/**
 * Dispatch a verified Slack event payload. Only `event_callback` envelopes
 * carrying an `app_mention` event are acted on; anything else is ignored.
 */
export async function handleSlackEvent(payload: unknown): Promise<void> {
  const envelope = slackEventCallback.safeParse(payload);
  if (!envelope.success) return;

  const event = slackAppMentionEvent.safeParse(envelope.data.event);
  if (!event.success) return;

  await handleAppMention(event.data);
}

async function handleAppMention(
  event: z.infer<typeof slackAppMentionEvent>,
): Promise<void> {
  const threadTs = event.thread_ts ?? event.ts;
  try {
    const invocation = await buildInvocation(event, threadTs);
    runSlackAgentForThread(invocation);
  } catch (error) {
    console.error("[slack] app_mention handling failed", error);
  }
}

async function buildInvocation(
  event: z.infer<typeof slackAppMentionEvent>,
  threadTs: string,
): Promise<SlackThreadInvocation> {
  const [messages, permalink] = await Promise.all([
    fetchSlackThread(event.channel, threadTs),
    fetchSlackPermalink(event.channel, event.ts),
  ]);
  const userNames = await resolveUserNames(collectUserIds(messages));
  const thread = buildThreadPayload(messages, slackConfig.botUserId, userNames);
  const invokerInstruction = stripBotMention(
    event.text,
    slackConfig.botUserId,
  ).trim();
  return {
    channel: event.channel,
    threadTs,
    permalink,
    invokerInstruction,
    thread,
  };
}

/** Convert a Slack Unix-decimal timestamp (e.g. "1716210334.123456") to ISO 8601. */
export function unixToISO(ts: string): string {
  const [seconds, micros = "0"] = ts.split(".");
  const millis =
    Number.parseInt(seconds!, 10) * 1000 +
    Math.floor(Number.parseInt(micros, 10) / 1000);
  return new Date(millis).toISOString();
}

/** Replace `<@U…>` user-mention tokens in a Slack message body with display names. */
export function replaceUserMentions(
  text: string,
  userNames: ReadonlyMap<string, string>,
): string {
  return text.replace(
    /<@([A-Z0-9]+)>/g,
    (_, userId: string) => userNames.get(userId) ?? userId,
  );
}

/** Remove the bot's own mention token from a message body. */
export function stripBotMention(
  text: string,
  botUserId: string | undefined,
): string {
  if (!botUserId) return text;
  return text.replace(new RegExp(`<@${botUserId}>`, "g"), "");
}

/**
 * Build the cleaned, agent-ready thread payload. Filters out messages posted
 * by the bot itself, resolves `<@U…>` mentions inside bodies, attaches ISO
 * timestamps. Preserves order.
 */
export function buildThreadPayload(
  messages: readonly SlackMessage[],
  botUserId: string | undefined,
  userNames: ReadonlyMap<string, string>,
): ReadableMessage[] {
  return messages
    .filter((message) => !isBotMessage(message, botUserId))
    .map((message) => ({
      user: message.user
        ? userNames.get(message.user) ?? message.user
        : "(unknown)",
      timestamp: unixToISO(message.ts),
      text: replaceUserMentions(message.text ?? "", userNames),
    }));
}

function isBotMessage(
  message: SlackMessage,
  botUserId: string | undefined,
): boolean {
  if (message.bot_id !== undefined) return true;
  if (botUserId && message.user === botUserId) return true;
  return false;
}

function collectUserIds(messages: readonly SlackMessage[]): string[] {
  const ids = new Set<string>();
  for (const message of messages) {
    if (message.user) ids.add(message.user);
    for (const match of (message.text ?? "").matchAll(/<@([A-Z0-9]+)>/g)) {
      ids.add(match[1]!);
    }
  }
  return [...ids];
}

async function resolveUserNames(
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    userIds.map(async (id) => [id, await fetchSlackUser(id)] as const),
  );
  return new Map(entries);
}

