import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { jiraConfig } from "../../lib/config.js";
import { getCommands } from "../../lib/commands/index.js";
import { JiraPayloadError, JiraSignatureError } from "./errors.js";

const WRITER_AGENT = "jira-webhook";

type AdfNode = {
  type?: string | undefined;
  text?: string | undefined;
  content?: AdfNode[] | undefined;
};

const adfNode: z.ZodType<AdfNode> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    text: z.string().optional(),
    content: z.array(adfNode).optional(),
  }),
);

const jiraIssuePayload = z.object({
  webhookEvent: z.enum(["jira:issue_created", "jira:issue_updated"]),
  issue: z.object({
    key: z.string().min(1),
    fields: z.object({
      summary: z.string().nullish(),
      description: z.unknown().nullish(),
      status: z.object({ name: z.string() }).nullish(),
      assignee: z
        .object({
          accountId: z.string(),
          displayName: z.string().nullish(),
        })
        .nullish(),
    }),
  }),
  changelog: z
    .object({
      items: z.array(
        z.object({
          field: z.string(),
          to: z.string().nullable(),
          toString: z.string().nullable(),
        }),
      ),
    })
    .optional(),
});

type JiraIssuePayload = z.infer<typeof jiraIssuePayload>;
type JiraIssue = JiraIssuePayload["issue"];

/**
 * Verify the HMAC-SHA256 signature on a Jira webhook delivery. Throws
 * `JiraSignatureError` when the secret is unconfigured, the header is
 * missing, or the digest does not match.
 */
export function verifyJiraSignature(
  rawBody: string,
  signatureHeader: string | null,
): void {
  const secret = jiraConfig.webhookSecret;
  if (!secret) {
    throw new JiraSignatureError("webhook secret is not configured");
  }
  if (!signatureHeader) {
    throw new JiraSignatureError("missing X-Hub-Signature header");
  }
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signatureHeader);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new JiraSignatureError("signature mismatch");
  }
}

/**
 * Process a verified Jira issue webhook payload, writing a markdown file
 * to `/jira/{ISSUE-KEY}.md` when the event represents an assignment to
 * the watched user. Throws `JiraPayloadError` for malformed payloads.
 */
export function handleJiraIssueEvent(payload: unknown): void {
  const parsed = jiraIssuePayload.safeParse(payload);
  if (!parsed.success) {
    throw new JiraPayloadError("malformed Jira webhook payload");
  }
  const event = parsed.data;
  if (!shouldWriteFile(event)) return;

  const body = renderIssueMarkdown(event.issue, event.webhookEvent);
  getCommands().write(`/jira/${event.issue.key}.md`, body, WRITER_AGENT);
}

function shouldWriteFile(event: JiraIssuePayload): boolean {
  if (event.webhookEvent === "jira:issue_created") return true;
  const watchedAccountId = jiraConfig.assigneeAccountId;
  if (!watchedAccountId) return false;
  const items = event.changelog?.items ?? [];
  return items.some(
    (item) => item.field === "assignee" && item.to === watchedAccountId,
  );
}

function renderIssueMarkdown(issue: JiraIssue, webhookEvent: string): string {
  const summary = issue.fields.summary ?? "(no summary)";
  const status = issue.fields.status?.name ?? "unknown";
  const assignee =
    issue.fields.assignee?.displayName ??
    issue.fields.assignee?.accountId ??
    "unassigned";
  const description = renderDescription(issue.fields.description);
  const lines = [
    `# ${issue.key}: ${summary}`,
    "",
    `- **Status:** ${status}`,
    `- **Assignee:** ${assignee}`,
  ];
  const link = buildIssueLink(issue.key);
  if (link) lines.push(`- **Link:** ${link}`);
  lines.push(`- **Last event:** ${webhookEvent}`);
  lines.push(`- **Synced at:** ${new Date().toISOString()}`);
  lines.push("", "## Description", "", description);
  return lines.join("\n");
}

function buildIssueLink(key: string): string | null {
  const baseUrl = jiraConfig.baseUrl;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, "")}/browse/${key}`;
}

function renderDescription(description: unknown): string {
  if (description === null || description === undefined) return "(no description)";
  if (typeof description === "string") return description;
  const adf = adfNode.safeParse(description);
  if (adf.success) {
    const text = extractAdfText(adf.data).trim();
    if (text !== "") return text;
  }
  return "```\n" + JSON.stringify(description, null, 2) + "\n```";
}

function extractAdfText(node: AdfNode): string {
  if (node.type === "text" && typeof node.text === "string") return node.text;
  const children = node.content ?? [];
  const childTexts = children.map(extractAdfText);
  if (node.type === "paragraph" || node.type === "heading") {
    return childTexts.join("") + "\n\n";
  }
  return childTexts.join("");
}
