import { Hono } from "hono";
import { JiraPayloadError } from "./errors.js";
import { handleJiraIssueEvent, verifyJiraSignature } from "./service.js";

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
  handleJiraIssueEvent(payload);
  return context.body(null, 204);
});
