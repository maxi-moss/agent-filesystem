import { createHmac } from "node:crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    assigneeAccountId: "acct-watched",
    baseUrl: "https://example.atlassian.net",
    webhookSecret: "shh-secret",
  },
  commands: {
    write: vi.fn(),
  },
}));

vi.mock("../../lib/config.js", () => ({
  jiraConfig: mocks.config,
}));

vi.mock("../../lib/commands/index.js", () => ({
  getCommands: () => mocks.commands,
}));

import {
  handleJiraIssueEvent,
  verifyJiraSignature,
} from "./service.js";
import { JiraPayloadError, JiraSignatureError } from "./errors.js";

beforeEach(() => {
  mocks.commands.write.mockReset();
  mocks.config.assigneeAccountId = "acct-watched";
  mocks.config.baseUrl = "https://example.atlassian.net";
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
  it("writes a markdown file for a created issue", () => {
    handleJiraIssueEvent(createdPayload());

    expect(mocks.commands.write).toHaveBeenCalledOnce();
    const [path, body, agent] = mocks.commands.write.mock.calls[0]!;
    expect(path).toBe("/jira/ABC-1.md");
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

  it("writes a markdown file for an updated issue when assignee changed to the watched user", () => {
    handleJiraIssueEvent(updatedPayloadWithAssigneeChange("acct-watched"));

    expect(mocks.commands.write).toHaveBeenCalledOnce();
    const [path] = mocks.commands.write.mock.calls[0]!;
    expect(path).toBe("/jira/ABC-2.md");
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
