import { Hono } from "hono";
import { SlackPayloadError } from "./errors.js";
import {
  handleSlackEvent,
  handleUrlVerification,
  verifySlackSignature,
} from "./service.js";

export const slackRoutes = new Hono();

slackRoutes.post("/events", async (context) => {
  const rawBody = await context.req.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new SlackPayloadError("invalid JSON body");
  }

  const challenge = handleUrlVerification(payload);
  if (challenge !== null) {
    return context.text(challenge);
  }

  verifySlackSignature(
    rawBody,
    context.req.header("x-slack-request-timestamp") ?? null,
    context.req.header("x-slack-signature") ?? null,
  );

  await handleSlackEvent(payload);
  return context.body(null, 204);
});
