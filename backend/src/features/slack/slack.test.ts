import { createHmac } from "node:crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    signingSecret: "shh-slack-secret" as string | undefined,
    botToken: "xoxb-token" as string | undefined,
    botUserId: "UBOT123" as string | undefined,
  },
  fetch: vi.fn(),
  runSlackAgentForThread: vi.fn(),
}));

vi.mock("../../lib/config.js", () => ({
  slackConfig: mocks.config,
}));

vi.mock("../../agents/slack-agent/index.js", () => ({
  runSlackAgentForThread: mocks.runSlackAgentForThread,
}));

vi.stubGlobal("fetch", mocks.fetch);

import {
  buildThreadPayload,
  handleSlackEvent,
  handleUrlVerification,
  replaceUserMentions,
  stripBotMention,
  unixToISO,
  verifySlackSignature,
  type ReadableMessage,
} from "./service.js";
import { SlackSignatureError } from "./errors.js";

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.runSlackAgentForThread.mockReset();
  mocks.config.signingSecret = "shh-slack-secret";
  mocks.config.botToken = "xoxb-token";
  mocks.config.botUserId = "UBOT123";
});

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function signSlack(
  rawBody: string,
  timestamp: number,
  secret = mocks.config.signingSecret ?? "",
): string {
  return `v0=${createHmac("sha256", secret)
    .update(`v0:${timestamp}:${rawBody}`, "utf8")
    .digest("hex")}`;
}

describe("verifySlackSignature", () => {
  it("accepts a correctly signed body", () => {
    const body = '{"hello":"world"}';
    const timestamp = nowSeconds();
    expect(() =>
      verifySlackSignature(body, String(timestamp), signSlack(body, timestamp)),
    ).not.toThrow();
  });

  it("throws when the signing secret is unconfigured", () => {
    mocks.config.signingSecret = undefined;
    expect(() =>
      verifySlackSignature("{}", String(nowSeconds()), "v0=abc"),
    ).toThrow(SlackSignatureError);
  });

  it("throws when the timestamp header is missing", () => {
    expect(() => verifySlackSignature("{}", null, "v0=abc")).toThrow(
      SlackSignatureError,
    );
  });

  it("throws when the signature header is missing", () => {
    expect(() =>
      verifySlackSignature("{}", String(nowSeconds()), null),
    ).toThrow(SlackSignatureError);
  });

  it("throws when the timestamp is malformed", () => {
    expect(() => verifySlackSignature("{}", "not-a-number", "v0=abc")).toThrow(
      SlackSignatureError,
    );
  });

  it("throws when the timestamp is outside the replay window", () => {
    const body = "{}";
    const stale = nowSeconds() - 60 * 10;
    expect(() =>
      verifySlackSignature(body, String(stale), signSlack(body, stale)),
    ).toThrow(SlackSignatureError);
  });

  it("throws when the signature does not match", () => {
    const timestamp = nowSeconds();
    expect(() =>
      verifySlackSignature(
        '{"a":1}',
        String(timestamp),
        signSlack('{"a":2}', timestamp),
      ),
    ).toThrow(SlackSignatureError);
  });
});

describe("handleUrlVerification", () => {
  it("returns the challenge for a url_verification payload", () => {
    expect(
      handleUrlVerification({ type: "url_verification", challenge: "abc" }),
    ).toBe("abc");
  });

  it("returns null for any other shape", () => {
    expect(handleUrlVerification({ type: "event_callback" })).toBeNull();
    expect(handleUrlVerification(null)).toBeNull();
    expect(handleUrlVerification("nope")).toBeNull();
  });
});

describe("unixToISO", () => {
  it("converts a Slack timestamp to ISO 8601", () => {
    expect(unixToISO("1716210334.123456")).toBe(
      new Date(1716210334123).toISOString(),
    );
  });
});

describe("replaceUserMentions", () => {
  it("replaces all <@U…> tokens with display names", () => {
    const names = new Map([
      ["U1", "Alice"],
      ["U2", "Bob"],
    ]);
    expect(replaceUserMentions("hey <@U1> and <@U2>", names)).toBe(
      "hey Alice and Bob",
    );
  });

  it("leaves unknown user IDs as the raw ID", () => {
    expect(replaceUserMentions("ping <@U9>", new Map())).toBe("ping U9");
  });
});

describe("stripBotMention", () => {
  it("removes the bot's mention token", () => {
    expect(stripBotMention("<@UBOT123> remember this", "UBOT123")).toBe(
      " remember this",
    );
  });

  it("returns the text unchanged when bot id is undefined", () => {
    expect(stripBotMention("<@UBOT123> hi", undefined)).toBe("<@UBOT123> hi");
  });
});

describe("buildThreadPayload", () => {
  it("filters out bot_id messages", () => {
    const result = buildThreadPayload(
      [
        { ts: "1.000000", user: "U1", text: "hi" },
        { ts: "2.000000", bot_id: "B1", text: "ignore" },
      ],
      "UBOT123",
      new Map([["U1", "Alice"]]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.user).toBe("Alice");
  });

  it("filters out messages whose user matches botUserId", () => {
    const result = buildThreadPayload(
      [
        { ts: "1.000000", user: "U1", text: "hi" },
        { ts: "2.000000", user: "UBOT123", text: "bot reply" },
      ],
      "UBOT123",
      new Map([["U1", "Alice"]]),
    );
    expect(result.map((m) => m.text)).toEqual(["hi"]);
  });

  it("replaces <@U…> tokens in bodies", () => {
    const result = buildThreadPayload(
      [{ ts: "1.000000", user: "U1", text: "ping <@U2>" }],
      "UBOT123",
      new Map([
        ["U1", "Alice"],
        ["U2", "Bob"],
      ]),
    );
    expect(result[0]?.text).toBe("ping Bob");
  });

  it("attaches ISO timestamps", () => {
    const result = buildThreadPayload(
      [{ ts: "1716210334.000000", user: "U1", text: "hi" }],
      "UBOT123",
      new Map([["U1", "Alice"]]),
    );
    expect(result[0]?.timestamp).toBe(new Date(1716210334000).toISOString());
  });

  it("preserves message order", () => {
    const result = buildThreadPayload(
      [
        { ts: "1.000000", user: "U1", text: "first" },
        { ts: "2.000000", user: "U2", text: "second" },
        { ts: "3.000000", user: "U1", text: "third" },
      ],
      "UBOT123",
      new Map([
        ["U1", "Alice"],
        ["U2", "Bob"],
      ]),
    );
    expect(result.map((m) => m.text)).toEqual(["first", "second", "third"]);
  });
});

describe("handleSlackEvent", () => {
  function appMentionEnvelope(overrides: Record<string, unknown> = {}): unknown {
    return {
      type: "event_callback",
      event: {
        type: "app_mention",
        user: "U1",
        text: "<@UBOT123> remember the auth decision",
        ts: "1716210334.000100",
        channel: "C1",
        thread_ts: "1716210000.000000",
        ...overrides,
      },
    };
  }

  function mockSlackFetchSequence({
    messages,
    permalink,
    users,
  }: {
    messages: Array<{ user?: string; bot_id?: string; text?: string; ts: string }>;
    permalink: string;
    users: Array<{
      id: string;
      profile?: { display_name?: string; real_name?: string };
      real_name?: string;
      name?: string;
    }>;
  }): void {
    mocks.fetch.mockImplementation(async (url: string) => {
      const target = String(url);
      if (target.includes("conversations.replies")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ ok: true, messages, has_more: false }),
        } as unknown as Response;
      }
      if (target.includes("chat.getPermalink")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ ok: true, permalink }),
        } as unknown as Response;
      }
      if (target.includes("users.info")) {
        const match = target.match(/[?&]user=([^&]+)/);
        const id = match?.[1] ?? "";
        const user = users.find((u) => u.id === id);
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ ok: true, user }),
        } as unknown as Response;
      }
      throw new Error(`unexpected fetch: ${target}`);
    });
  }

  it("builds an invocation and runs the slack-agent on app_mention", async () => {
    mockSlackFetchSequence({
      messages: [
        { ts: "1716210000.000000", user: "U1", text: "Started conversation" },
        { ts: "1716210100.000000", user: "U2", text: "Reply with <@U1> tag" },
        {
          ts: "1716210200.000000",
          user: "UBOT123",
          text: "(previous bot reply)",
        },
        {
          ts: "1716210334.000100",
          user: "U1",
          text: "<@UBOT123> remember the auth decision",
        },
      ],
      permalink: "https://slack.example/permalink",
      users: [
        { id: "U1", profile: { display_name: "Alice" } },
        { id: "U2", profile: { display_name: "Bob" } },
        { id: "UBOT123", profile: { display_name: "bot" } },
      ],
    });

    await handleSlackEvent(appMentionEnvelope());

    expect(mocks.runSlackAgentForThread).toHaveBeenCalledOnce();
    const [invocation] = mocks.runSlackAgentForThread.mock.calls[0]! as [
      {
        channel: string;
        threadTs: string;
        permalink: string;
        invokerInstruction: string;
        thread: ReadableMessage[];
      },
    ];
    expect(invocation.channel).toBe("C1");
    expect(invocation.threadTs).toBe("1716210000.000000");
    expect(invocation.permalink).toBe("https://slack.example/permalink");
    expect(invocation.invokerInstruction).toBe("remember the auth decision");
    expect(invocation.thread.map((m) => m.user)).toEqual([
      "Alice",
      "Bob",
      "Alice",
    ]);
    expect(invocation.thread[1]?.text).toBe("Reply with Alice tag");
    expect(invocation.thread[2]?.text).toBe("bot remember the auth decision");
    for (const message of invocation.thread) {
      expect(message.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("defaults threadTs to event.ts when no thread_ts is present", async () => {
    mockSlackFetchSequence({
      messages: [
        {
          ts: "1716210334.000100",
          user: "U1",
          text: "<@UBOT123> save this",
        },
      ],
      permalink: "https://slack.example/p2",
      users: [{ id: "U1", profile: { display_name: "Alice" } }],
    });

    await handleSlackEvent(appMentionEnvelope({ thread_ts: undefined }));

    expect(mocks.runSlackAgentForThread).toHaveBeenCalledOnce();
    const [invocation] = mocks.runSlackAgentForThread.mock.calls[0]! as [
      { threadTs: string },
    ];
    expect(invocation.threadTs).toBe("1716210334.000100");
  });

  it("ignores envelopes that aren't event_callback", async () => {
    await handleSlackEvent({ type: "something_else" });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.runSlackAgentForThread).not.toHaveBeenCalled();
  });

  it("ignores event_callback envelopes whose inner event isn't app_mention", async () => {
    await handleSlackEvent({
      type: "event_callback",
      event: { type: "message", text: "hi", ts: "1.0", channel: "C1" },
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.runSlackAgentForThread).not.toHaveBeenCalled();
  });

  it("swallows errors raised during Slack API calls", async () => {
    mocks.fetch.mockRejectedValue(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(handleSlackEvent(appMentionEnvelope())).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0]?.[0]).toBe(
        "[slack] app_mention handling failed",
      );
      expect(mocks.runSlackAgentForThread).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});

