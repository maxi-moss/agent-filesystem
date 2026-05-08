import { createHmac } from "node:crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    apiToken: "jira-token",
    assigneeAccountId: "acct-watched",
    baseUrl: "https://example.atlassian.net",
    email: "watcher@example.com",
    webhookSecret: "shh-secret",
  },
  commands: {
    write: vi.fn(),
  },
  runJiraAgentForIssue: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("../../lib/config.js", () => ({
  jiraConfig: mocks.config,
}));

vi.mock("../../lib/commands/index.js", () => ({
  getCommands: () => mocks.commands,
}));

vi.mock("../../agents/jira-agent/index.js", () => ({
  runJiraAgentForIssue: mocks.runJiraAgentForIssue,
}));

vi.stubGlobal("fetch", mocks.fetch);

import {
  handleJiraCommentEvent,
  handleJiraIssueEvent,
  handleJiraWebhook,
  verifyJiraSignature,
} from "./service.js";
import { JiraPayloadError, JiraSignatureError } from "./errors.js";

beforeEach(() => {
  mocks.commands.write.mockReset();
  mocks.runJiraAgentForIssue.mockReset();
  mocks.fetch.mockReset();
  mocks.config.apiToken = "jira-token";
  mocks.config.assigneeAccountId = "acct-watched";
  mocks.config.baseUrl = "https://example.atlassian.net";
  mocks.config.email = "watcher@example.com";
  mocks.config.webhookSecret = "shh-secret";
});

function sign(rawBody: string, secret = mocks.config.webhookSecret): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

function createdPayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    webhookEvent: "jira:issue_created",
    issue: {
      key: "ABC-1",
      fields: {
        summary: "Make it go",
        description: "Plain text description.",
        status: { name: "To Do" },
        assignee: { accountId: "acct-watched", displayName: "Watched User" },
      },
    },
    ...overrides,
  };
}

function updatedPayloadWithAssigneeChange(
  toAccountId: string | null = "acct-watched",
): unknown {
  return {
    webhookEvent: "jira:issue_updated",
    issue: {
      key: "ABC-2",
      fields: {
        summary: "Already in flight",
        description: null,
        status: { name: "In Progress" },
        assignee: toAccountId
          ? { accountId: toAccountId, displayName: "Watched User" }
          : null,
      },
    },
    changelog: {
      items: [
        { field: "assignee", to: toAccountId, toString: "Watched User" },
      ],
    },
  };
}

function commentPayload(issueKey = "ABC-1", event = "comment_created"): unknown {
  return {
    webhookEvent: event,
    issue: { key: issueKey },
    comment: {
      id: "10001",
      body: "anything — webhook payload comment is ignored",
      author: { displayName: "Someone" },
      created: "2026-05-08T12:00:00.000Z",
    },
  };
}

function mockJiraCommentsResponse(
  comments: Array<{
    id?: string;
    author?: { displayName?: string; accountId?: string } | null;
    body?: unknown;
    created?: string;
  }>,
): void {
  mocks.fetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      comments: comments.map((comment, index) => ({
        id: comment.id ?? String(10000 + index),
        author: comment.author ?? null,
        body: comment.body ?? null,
        created: comment.created ?? "2026-05-08T12:00:00.000Z",
      })),
    }),
  } as unknown as Response);
}

describe("verifyJiraSignature", () => {
  it("accepts a correctly signed body", () => {
    const body = '{"hello":"world"}';
    expect(() => verifyJiraSignature(body, sign(body))).not.toThrow();
  });

  it("throws when the secret is unconfigured", () => {
    mocks.config.webhookSecret = undefined as unknown as string;
    expect(() => verifyJiraSignature("{}", sign("{}", "anything"))).toThrow(
      JiraSignatureError,
    );
  });

  it("throws when the header is missing", () => {
    expect(() => verifyJiraSignature("{}", null)).toThrow(JiraSignatureError);
  });

  it("throws when the signature does not match", () => {
    expect(() => verifyJiraSignature('{"a":1}', sign('{"a":2}'))).toThrow(
      JiraSignatureError,
    );
  });
});

describe("handleJiraIssueEvent", () => {
  it("writes description.md under the issue's directory for a created issue", () => {
    handleJiraIssueEvent(createdPayload());

    expect(mocks.commands.write).toHaveBeenCalledOnce();
    const [path, body, agent] = mocks.commands.write.mock.calls[0]!;
    expect(path).toBe("/jira/ABC-1/description.md");
    expect(agent).toBe("jira-webhook");
    expect(body).toContain("# ABC-1: Make it go");
    expect(body).toContain("**Status:** To Do");
    expect(body).toContain("**Assignee:** Watched User");
    expect(body).toContain(
      "**Link:** https://example.atlassian.net/browse/ABC-1",
    );
    expect(body).toContain("**Last event:** jira:issue_created");
    expect(body).toContain("Plain text description.");
  });

  it("writes description.md for an updated issue when assignee changed to the watched user", () => {
    handleJiraIssueEvent(updatedPayloadWithAssigneeChange("acct-watched"));

    expect(mocks.commands.write).toHaveBeenCalledOnce();
    const [path] = mocks.commands.write.mock.calls[0]!;
    expect(path).toBe("/jira/ABC-2/description.md");
  });

  it("ignores updates whose changelog has no assignee item", () => {
    handleJiraIssueEvent({
      webhookEvent: "jira:issue_updated",
      issue: {
        key: "ABC-3",
        fields: {
          summary: "Comment churn",
          description: null,
          status: { name: "In Progress" },
          assignee: { accountId: "acct-watched" },
        },
      },
      changelog: {
        items: [
          { field: "description", to: null, toString: "edited" },
        ],
      },
    });

    expect(mocks.commands.write).not.toHaveBeenCalled();
  });

  it("ignores updates whose assignee changelog targets a different user", () => {
    handleJiraIssueEvent(updatedPayloadWithAssigneeChange("acct-other"));

    expect(mocks.commands.write).not.toHaveBeenCalled();
  });

  it("renders ADF descriptions to plain text", () => {
    handleJiraIssueEvent(
      createdPayload({
        issue: {
          key: "ABC-4",
          fields: {
            summary: "ADF body",
            description: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Hello world" }],
                },
              ],
            },
            status: { name: "To Do" },
            assignee: { accountId: "acct-watched" },
          },
        },
      }),
    );

    const [, body] = mocks.commands.write.mock.calls[0]!;
    expect(body).toContain("Hello world");
  });

  it("throws JiraPayloadError on a malformed payload", () => {
    expect(() => handleJiraIssueEvent({ wrong: "shape" })).toThrow(
      JiraPayloadError,
    );
    expect(mocks.commands.write).not.toHaveBeenCalled();
  });

  it("omits the link when no base url is configured", () => {
    mocks.config.baseUrl = undefined as unknown as string;

    handleJiraIssueEvent(createdPayload());

    const [, body] = mocks.commands.write.mock.calls[0]!;
    expect(body).not.toContain("**Link:**");
  });
});

describe("handleJiraCommentEvent", () => {
  it("fetches the full comment thread and runs the jira-agent", async () => {
    mockJiraCommentsResponse([
      {
        id: "1",
        author: { displayName: "Alice" },
        body: "First comment",
        created: "2026-05-08T10:00:00.000Z",
      },
      {
        id: "2",
        author: { displayName: "Bob" },
        body: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Second" }] },
          ],
        },
        created: "2026-05-08T11:00:00.000Z",
      },
    ]);

    await handleJiraCommentEvent(commentPayload("ABC-9"));

    expect(mocks.fetch).toHaveBeenCalledOnce();
    const [url, init] = mocks.fetch.mock.calls[0]!;
    expect(url).toBe(
      "https://example.atlassian.net/rest/api/3/issue/ABC-9/comment",
    );
    expect(init.headers.Authorization).toMatch(/^Basic /);

    expect(mocks.runJiraAgentForIssue).toHaveBeenCalledOnce();
    const [arg] = mocks.runJiraAgentForIssue.mock.calls[0]!;
    expect(arg.issueKey).toBe("ABC-9");
    expect(arg.commentThread).toEqual([
      {
        author: "Alice",
        created: "2026-05-08T10:00:00.000Z",
        body: "First comment",
      },
      {
        author: "Bob",
        created: "2026-05-08T11:00:00.000Z",
        body: "Second",
      },
    ]);
  });

  it("throws JiraPayloadError on a malformed payload", async () => {
    await expect(handleJiraCommentEvent({ wrong: "shape" })).rejects.toThrow(
      JiraPayloadError,
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.runJiraAgentForIssue).not.toHaveBeenCalled();
  });

  it("throws when the Jira API returns a non-2xx status", async () => {
    mocks.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({}),
    } as unknown as Response);

    await expect(handleJiraCommentEvent(commentPayload("ABC-9"))).rejects.toThrow(
      /401/,
    );
    expect(mocks.runJiraAgentForIssue).not.toHaveBeenCalled();
  });

  it("throws when API auth is unconfigured", async () => {
    mocks.config.apiToken = undefined as unknown as string;

    await expect(handleJiraCommentEvent(commentPayload("ABC-9"))).rejects.toThrow(
      /not configured/,
    );
    expect(mocks.runJiraAgentForIssue).not.toHaveBeenCalled();
  });
});

describe("handleJiraWebhook dispatch", () => {
  it("routes issue events to the issue handler", async () => {
    await handleJiraWebhook(createdPayload());
    expect(mocks.commands.write).toHaveBeenCalledOnce();
    expect(mocks.runJiraAgentForIssue).not.toHaveBeenCalled();
  });

  it("routes comment events to the comment handler", async () => {
    mockJiraCommentsResponse([]);
    await handleJiraWebhook(commentPayload("ABC-9"));
    expect(mocks.runJiraAgentForIssue).toHaveBeenCalledOnce();
    expect(mocks.commands.write).not.toHaveBeenCalled();
  });

  it("ignores unknown event types", async () => {
    await handleJiraWebhook({ webhookEvent: "something_else" });
    expect(mocks.commands.write).not.toHaveBeenCalled();
    expect(mocks.runJiraAgentForIssue).not.toHaveBeenCalled();
  });

  it("throws JiraPayloadError when the payload has no event field", async () => {
    await expect(handleJiraWebhook({})).rejects.toThrow(JiraPayloadError);
  });
});
