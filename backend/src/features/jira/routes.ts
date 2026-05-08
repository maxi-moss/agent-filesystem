import { Hono } from "hono";
import { JiraPayloadError } from "./errors.js";
import { handleJiraWebhook, verifyJiraSignature } from "./service.js";

export const jiraRoutes = new Hono();

jiraRoutes.post("/webhook", async (context) => {
  const rawBody = await context.req.text();
  verifyJiraSignature(rawBody, context.req.header("x-hub-signature") ?? null);
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new JiraPayloadError("invalid JSON body");
  }
  await handleJiraWebhook(payload);
  return context.body(null, 204);
});
